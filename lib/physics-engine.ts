
import type { Box } from '@/types/box'

// Global RAPIER import
let RAPIER: any = null

interface PhysicsStats {
  collisions: number
  contacts: number
  forces: Map<string, { x: number; y: number; z: number }>
  velocities: Map<string, { x: number; y: number; z: number }>
  stability: number
  running: boolean
  realTime: boolean
}

interface BoxPhysicsData {
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
  private world: any = null
  private eventQueue: any = null
  private bodies = new Map<string, any>()
  private colliders = new Map<string, any>()
  private initialized = false
  private gravity = { x: 0, y: -9.81, z: 0 }
  private stats: PhysicsStats = {
    collisions: 0,
    contacts: 0,
    forces: new Map(),
    velocities: new Map(),
    stability: 100,
    running: false,
    realTime: true
  }
  private animationCallbacks: Array<(boxData: Map<string, BoxPhysicsData>) => void> = []
  private lastUpdateTime = 0
  private accumulator = 0
  private fixedTimeStep = 1/60 // 60 FPS

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Dynamic import to handle WASM loading properly
      RAPIER = await import('@dimforge/rapier3d')
      await RAPIER.init()
      
      this.world = new RAPIER.World(this.gravity)
      this.eventQueue = new RAPIER.EventQueue(true)
      this.initialized = true
      this.stats.running = true
      
      console.log('✅ Physics engine initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize physics engine:', error)
      throw error
    }
  }

  setGravity(gravity: { x: number; y: number; z: number }): void {
    if (!this.world) return
    this.gravity = gravity
    this.world.gravity = gravity
  }

  createTruckContainer(dimensions: { width: number; length: number; height: number }): void {
    if (!this.world || !RAPIER) return

    const { width, length, height } = dimensions

    // Floor with enhanced friction
    const floorBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.05, 0)
    const floorBody = this.world.createRigidBody(floorBodyDesc)
    const floorColliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, 0.05, length / 2)
      .setFriction(0.9)
      .setRestitution(0.1)
    this.world.createCollider(floorColliderDesc, floorBody)

    // Walls with proper collision properties
    const walls = [
      { pos: [-width / 2 - 0.05, height / 2, 0], size: [0.05, height / 2, length / 2] },
      { pos: [width / 2 + 0.05, height / 2, 0], size: [0.05, height / 2, length / 2] },
      { pos: [0, height / 2, -length / 2 - 0.05], size: [width / 2, height / 2, 0.05] }
    ]

    walls.forEach((wall, index) => {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(...wall.pos)
      const body = this.world!.createRigidBody(bodyDesc)
      const colliderDesc = RAPIER.ColliderDesc.cuboid(...wall.size)
        .setFriction(0.8)
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
    if (!this.world || !RAPIER) return

    // Remove existing box if it exists
    this.removeBox(box.id)

    try {
      // Create rigid body with proper position
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(box.position.x, box.position.y, box.position.z)
        .setCanSleep(true) // Allow sleeping for performance
      const body = this.world.createRigidBody(bodyDesc)

      // Calculate proper density and mass
      const volume = box.width * box.height * box.length
      const density = box.weight / volume / 1000 // Convert to proper density
      
      // Create collider with enhanced properties
      const colliderDesc = RAPIER.ColliderDesc.cuboid(
        box.width / 2,
        box.height / 2,
        box.length / 2
      )
        .setDensity(Math.max(density, 0.1)) // Minimum density
        .setFriction(box.isFragile ? 0.95 : 0.8)
        .setRestitution(box.isFragile ? 0.05 : 0.25)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.DEFAULT)

      const collider = this.world.createCollider(colliderDesc, body)
      
      // Store references
      this.bodies.set(box.id, body)
      this.colliders.set(box.id, collider)

      console.log(`📦 Added box ${box.id} to physics simulation`)
    } catch (error) {
      console.error(`❌ Failed to add box ${box.id}:`, error)
    }
  }

  removeBox(boxId: string): void {
    if (!this.world) return

    try {
      const body = this.bodies.get(boxId)
      if (body && this.world.getRigidBody(body.handle)) {
        this.world.removeRigidBody(body)
        this.bodies.delete(boxId)
      }
      
      this.colliders.delete(boxId)
    } catch (error) {
      console.warn(`⚠️ Failed to remove box ${boxId}:`, error)
    }
  }

  applyForces(forces: {
    acceleration: number
    braking: number
    turning: number
    gravity: number
  }): void {
    if (!this.world || this.bodies.size === 0) return

    // Apply vehicle dynamics forces with enhanced magnitude for visibility
    this.bodies.forEach((body, boxId) => {
      if (!body || body.isDynamic() === false) return

      const mass = body.mass()
      const position = body.translation()
      
      // Enhanced acceleration/braking forces
      if (forces.acceleration > 0.1) {
        const accelForce = forces.acceleration * mass * 20.0
        body.addForce({ x: 0, y: 0, z: -accelForce }, true)
        // Weight transfer simulation
        body.addForce({ x: 0, y: mass * 3.0, z: 0 }, true)
      }
      
      if (forces.braking > 0.1) {
        const brakeForce = forces.braking * mass * 25.0
        body.addForce({ x: 0, y: 0, z: brakeForce }, true)
        // Forward weight transfer
        body.addForce({ x: 0, y: -mass * 2.0, z: 0 }, true)
      }

      // Enhanced turning forces with height-based tipping
      if (forces.turning > 0.1) {
        const heightMultiplier = Math.max(1.0, position.y / 1.5)
        const turnForce = forces.turning * mass * 15.0 * heightMultiplier
        
        body.addForce({ x: turnForce, y: 0, z: 0 }, true)
        // Add rotational torque for realistic tipping
        body.addTorque({ x: 0, y: 0, z: turnForce * 0.8 }, true)
        body.addTorque({ x: turnForce * 0.3, y: 0, z: 0 }, true)
      }

      // Apply velocity damping to prevent infinite acceleration
      const velocity = body.linvel()
      const dampingFactor = 0.02
      const dampingForce = {
        x: -velocity.x * mass * dampingFactor,
        y: Math.max(-velocity.y * mass * dampingFactor * 0.5, 0), // Less Y damping
        z: -velocity.z * mass * dampingFactor
      }
      body.addForce(dampingForce, true)
    })

    // Update gravity with enhanced effects
    this.setGravity({
      x: forces.turning * 3.0, // Lateral pseudo-gravity
      y: -9.81 * forces.gravity * 1.2, // Enhanced gravity
      z: (forces.acceleration * 2.0) - (forces.braking * 2.5) // Longitudinal effects
    })
  }

  step(deltaTime: number): PhysicsStats {
    if (!this.world || !this.eventQueue) return this.stats

    // Fixed timestep physics with interpolation
    this.accumulator += Math.min(deltaTime, 0.02) // Cap delta time

    while (this.accumulator >= this.fixedTimeStep) {
      this.world.step(this.eventQueue)
      this.accumulator -= this.fixedTimeStep
    }

    // Update statistics and trigger callbacks
    this.updateStats()
    this.triggerAnimationCallbacks()
    
    return this.stats
  }

  private updateStats(): void {
    if (!this.world || !this.eventQueue) return

    let collisionCount = 0
    let contactCount = 0
    
    this.stats.forces.clear()
    this.stats.velocities.clear()

    // Process collision events
    this.eventQueue.drainCollisionEvents((handle1: number, handle2: number, started: boolean) => {
      if (started) {
        collisionCount++
      }
    })

    // Process contact events
    this.eventQueue.drainContactForceEvents((event: any) => {
      contactCount++
    })

    this.stats.collisions = collisionCount
    this.stats.contacts = contactCount

    // Calculate forces, velocities, and stability
    let totalKineticEnergy = 0
    let activeBoxes = 0

    this.bodies.forEach((body, boxId) => {
      if (!body) return

      const velocity = body.linvel()
      const mass = body.mass()
      
      // Store velocity
      this.stats.velocities.set(boxId, velocity)
      
      // Calculate applied forces (simplified)
      const force = { x: 0, y: mass * Math.abs(this.gravity.y), z: 0 }
      this.stats.forces.set(boxId, force)

      // Calculate kinetic energy for stability
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)
      totalKineticEnergy += 0.5 * mass * speed * speed
      
      if (speed > 0.1) activeBoxes++
    })

    // Calculate stability score based on kinetic energy and active boxes
    const maxStableEnergy = this.bodies.size * 10 // Arbitrary threshold
    const energyRatio = Math.min(totalKineticEnergy / maxStableEnergy, 1.0)
    const activeRatio = activeBoxes / Math.max(this.bodies.size, 1)
    
    this.stats.stability = Math.max(0, 100 - (energyRatio * 50) - (activeRatio * 30))
  }

  private triggerAnimationCallbacks(): void {
    if (this.animationCallbacks.length === 0) return

    const boxData = this.getBoxData()
    this.animationCallbacks.forEach(callback => {
      try {
        callback(boxData)
      } catch (error) {
        console.warn('Animation callback error:', error)
      }
    })
  }

  onAnimationUpdate(callback: (boxData: Map<string, BoxPhysicsData>) => void): void {
    this.animationCallbacks.push(callback)
  }

  removeAnimationCallback(callback: (boxData: Map<string, BoxPhysicsData>) => void): void {
    const index = this.animationCallbacks.indexOf(callback)
    if (index > -1) {
      this.animationCallbacks.splice(index, 1)
    }
  }

  getBoxData(): Map<string, BoxPhysicsData> {
    const boxData = new Map<string, BoxPhysicsData>()

    this.bodies.forEach((body, boxId) => {
      if (!body) return

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
        forces: this.stats.forces.get(boxId) || { x: 0, y: 0, z: 0 },
        isStable: this.isBoxStable(body),
        supportedBy: this.findSupportingBoxes(boxId),
        supporting: this.findSupportedBoxes(boxId)
      })
    })

    return boxData
  }

  private isBoxStable(body: any): boolean {
    const velocity = body.linvel()
    const angularVel = body.angvel()
    
    const linearSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)
    const angularSpeed = Math.sqrt(angularVel.x ** 2 + angularVel.y ** 2 + angularVel.z ** 2)

    return linearSpeed < 0.05 && angularSpeed < 0.02
  }

  private findSupportingBoxes(boxId: string): string[] {
    // Simplified support detection - would need proper collision manifold analysis
    return []
  }

  private findSupportedBoxes(boxId: string): string[] {
    // Simplified support detection
    return []
  }

  startContinuousSimulation(): void {
    this.stats.running = true
  }

  stopSimulation(): void {
    this.stats.running = false
  }

  destroy(): void {
    try {
      this.animationCallbacks.clear()
      
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
      this.stats.running = false
      
      console.log('🧹 Physics engine destroyed')
    } catch (error) {
      console.error('Error destroying physics engine:', error)
    }
  }
}

export type { PhysicsStats, BoxPhysicsData }
