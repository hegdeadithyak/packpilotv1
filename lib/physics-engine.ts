
import RAPIER from '@dimforge/rapier3d'

export interface PhysicsWorld {
  world: RAPIER.World
  eventQueue: RAPIER.EventQueue
  bodies: Map<string, RAPIER.RigidBody>
  colliders: Map<string, RAPIER.Collider>
}

export interface PhysicsStats {
  collisions: number
  contacts: number
  forces: Map<string, RAPIER.Vector3>
  velocities: Map<string, RAPIER.Vector3>
  stability: number
}

export interface BoxPhysicsData {
  id: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number; w: number }
  velocity: { x: number; y: number; z: number }
  angularVelocity: { x: number; y: number; z: number }
  forces: { x: number; y: number; z: number }
  isStable: boolean
  supportedBy: string[]
  supporting: string[]
}

export class PhysicsEngine {
  private world: RAPIER.World | null = null
  private eventQueue: RAPIER.EventQueue | null = null
  private bodies = new Map<string, RAPIER.RigidBody>()
  private colliders = new Map<string, RAPIER.Collider>()
  private initialized = false
  private gravity = { x: 0, y: -9.81, z: 0 }
  private stats: PhysicsStats = {
    collisions: 0,
    contacts: 0,
    forces: new Map(),
    velocities: new Map(),
    stability: 100
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    await RAPIER.init()
    this.world = new RAPIER.World(this.gravity)
    this.eventQueue = new RAPIER.EventQueue(true)
    this.initialized = true
  }

  setGravity(gravity: { x: number; y: number; z: number }): void {
    if (!this.world) return
    this.gravity = gravity
    this.world.gravity = gravity
  }

  createTruckContainer(dimensions: { width: number; length: number; height: number }): void {
    if (!this.world) return

    const { width, length, height } = dimensions

    // Floor
    const floorBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.05, 0)
    const floorBody = this.world.createRigidBody(floorBodyDesc)
    const floorColliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, 0.05, length / 2)
      .setFriction(0.8)
      .setRestitution(0.1)
    this.world.createCollider(floorColliderDesc, floorBody)

    // Walls
    const walls = [
      { pos: [-width / 2 - 0.05, height / 2, 0], size: [0.05, height / 2, length / 2] },
      { pos: [width / 2 + 0.05, height / 2, 0], size: [0.05, height / 2, length / 2] },
      { pos: [0, height / 2, -length / 2 - 0.05], size: [width / 2, height / 2, 0.05] }
    ]

    walls.forEach((wall, index) => {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(...wall.pos)
      const body = this.world!.createRigidBody(bodyDesc)
      const colliderDesc = RAPIER.ColliderDesc.cuboid(...wall.size)
        .setFriction(0.6)
        .setRestitution(0.2)
      this.world!.createCollider(colliderDesc, body)
    })
  }

  addBox(box: {
    id: string
    width: number
    height: number
    length: number
    weight: number
    position: { x: number; y: number; z: number }
    isFragile: boolean
  }): void {
    if (!this.world) return

    // Create rigid body
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(box.position.x, box.position.y, box.position.z)
    const body = this.world.createRigidBody(bodyDesc)

    // Set mass based on weight
    const density = box.weight / (box.width * box.height * box.length)
    
    // Create collider
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      box.width / 2,
      box.height / 2,
      box.length / 2
    )
      .setDensity(density)
      .setFriction(box.isFragile ? 0.9 : 0.7)
      .setRestitution(box.isFragile ? 0.1 : 0.3)

    const collider = this.world.createCollider(colliderDesc, body)
    
    this.bodies.set(box.id, body)
    this.colliders.set(box.id, collider)
  }

  removeBox(boxId: string): void {
    if (!this.world) return

    const body = this.bodies.get(boxId)
    const collider = this.colliders.get(boxId)

    if (body) {
      this.world.removeRigidBody(body)
      this.bodies.delete(boxId)
    }
    if (collider) {
      this.colliders.delete(boxId)
    }
  }

  applyForces(forces: {
    acceleration: number
    braking: number
    turning: number
    gravity: number
  }): void {
    if (!this.world) return

    // Apply vehicle dynamics forces to all boxes with realistic magnitude
    this.bodies.forEach((body, boxId) => {
      const mass = body.mass()
      const position = body.translation()
      
      // Acceleration/braking force (forward/backward) - increased magnitude for visibility
      const accelerationMagnitude = forces.acceleration * mass * 15.0 // Increased from 9.81
      const brakingMagnitude = forces.braking * mass * 20.0 // Even stronger braking
      
      if (forces.acceleration > 0.1) {
        body.addForce({ x: 0, y: 0, z: -accelerationMagnitude }, true)
        // Add slight upward force to simulate weight transfer
        body.addForce({ x: 0, y: mass * 2.0, z: 0 }, true)
      }
      
      if (forces.braking > 0.1) {
        body.addForce({ x: 0, y: 0, z: brakingMagnitude }, true)
        // Forward weight transfer
        body.addForce({ x: 0, y: -mass * 1.5, z: 0 }, true)
      }

      // Turning force (lateral) - with centrifugal effect based on height
      const heightMultiplier = Math.max(1.0, position.y / 2.0) // Higher boxes tip more
      const turningMagnitude = forces.turning * mass * 12.0 * heightMultiplier
      
      if (forces.turning > 0.1) {
        body.addForce({ x: turningMagnitude, y: 0, z: 0 }, true)
        // Add rotational torque for tipping effect
        body.addTorque({ x: 0, y: 0, z: turningMagnitude * 0.5 }, true)
      }

      // Apply air resistance to prevent infinite acceleration
      const velocity = body.linvel()
      const dampingForce = {
        x: -velocity.x * mass * 0.1,
        y: -velocity.y * mass * 0.05,
        z: -velocity.z * mass * 0.1
      }
      body.addForce(dampingForce, true)
    })

    // Update gravity with enhanced effect
    this.setGravity({
      x: forces.turning * 2.0, // Lateral gravity during turns
      y: -9.81 * forces.gravity * 1.5, // Enhanced gravity effect
      z: forces.acceleration * 1.5 - forces.braking * 2.0 // Forward/backward pseudo-gravity
    })
  }

  step(deltaTime: number): PhysicsStats {
    if (!this.world || !this.eventQueue) return this.stats

    this.world.step(this.eventQueue)

    // Update statistics
    this.updateStats()
    
    return this.stats
  }

  private updateStats(): void {
    if (!this.world || !this.eventQueue) return

    this.stats.collisions = 0
    this.stats.contacts = 0
    this.stats.forces.clear()
    this.stats.velocities.clear()

    // Process collision events
    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      if (started) {
        this.stats.collisions++
      }
    })

    // Process contact events
    this.eventQueue.drainContactForceEvents((event) => {
      this.stats.contacts++
    })

    // Calculate forces and velocities
    this.bodies.forEach((body, boxId) => {
      const velocity = body.linvel()
      const force = body.mass() * 9.81 // Simplified force calculation

      this.stats.velocities.set(boxId, velocity)
      this.stats.forces.set(boxId, { x: 0, y: force, z: 0 })
    })

    // Calculate stability score
    this.stats.stability = this.calculateStabilityScore()
  }

  private calculateStabilityScore(): number {
    if (this.bodies.size === 0) return 100

    let stabilityScore = 100
    let unstableBoxes = 0

    this.bodies.forEach((body, boxId) => {
      const velocity = body.linvel()
      const angularVel = body.angvel()
      
      // Check if box is moving too much
      const linearSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)
      const angularSpeed = Math.sqrt(angularVel.x ** 2 + angularVel.y ** 2 + angularVel.z ** 2)

      if (linearSpeed > 0.5 || angularSpeed > 0.3) {
        unstableBoxes++
      }
    })

    stabilityScore -= (unstableBoxes / this.bodies.size) * 50
    return Math.max(0, Math.min(100, stabilityScore))
  }

  getBoxData(): Map<string, BoxPhysicsData> {
    const boxData = new Map<string, BoxPhysicsData>()

    this.bodies.forEach((body, boxId) => {
      const translation = body.translation()
      const rotation = body.rotation()
      const velocity = body.linvel()
      const angularVelocity = body.angvel()

      boxData.set(boxId, {
        id: boxId,
        position: { x: translation.x, y: translation.y, z: translation.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
        velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
        angularVelocity: { x: angularVelocity.x, y: angularVelocity.y, z: angularVelocity.z },
        forces: { x: 0, y: body.mass() * 9.81, z: 0 },
        isStable: this.isBoxStable(body),
        supportedBy: [],
        supporting: []
      })
    })

    return boxData
  }

  private isBoxStable(body: RAPIER.RigidBody): boolean {
    const velocity = body.linvel()
    const angularVel = body.angvel()
    
    const linearSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)
    const angularSpeed = Math.sqrt(angularVel.x ** 2 + angularVel.y ** 2 + angularVel.z ** 2)

    return linearSpeed < 0.1 && angularSpeed < 0.05
  }

  destroy(): void {
    if (this.world) {
      this.world.free()
      this.world = null
    }
    if (this.eventQueue) {
      this.eventQueue.free()
      this.eventQueue = null
    }
    this.bodies.clear()
    this.colliders.clear()
    this.initialized = false
  }
}
