import * as RAPIER from '@dimforge/rapier3d-compat'

export interface PhysicsStats {
  collisions: number
  contacts: number
  totalForce: number
  running: boolean
  realTime: boolean
}

export class PhysicsEngine {
  private world: RAPIER.World | null = null
  private initialized = false
  private bodies = new Map<string, RAPIER.RigidBody>()
  private colliders = new Map<string, RAPIER.Collider>()

  async initialize(): Promise<void> {
    try {
      await RAPIER. init()

      const gravity = { x: 0.0, y: -9.81, z: 0.0 }
      this.world = new RAPIER.World(gravity)

      this.initialized = true
      console.log('✅ Physics engine initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize physics engine:', error) 
      throw error
    }
  }

  createTruckContainer(dimensions: { width: number; length: number; height: number }): void {
    if (!this.world || !this.initialized) {
      console.log(this.world);
      throw new Error('Physics engine not initialized')
    }

    const { width, length, height } = dimensions

    // Create floor
    const floorBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.05, 0)
    const floorBody = this.world.createRigidBody(floorBodyDesc)
    const floorColliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, 0.05, length / 2)
    this.world.createCollider(floorColliderDesc, floorBody)

    // Create walls
    const walls = [
      { pos: [width / 2, height / 2, 0], size: [0.05, height / 2, length / 2] },
      { pos: [-width / 2, height / 2, 0], size: [0.05, height / 2, length / 2] },
      { pos: [0, height / 2, length / 2], size: [width / 2, height / 2, 0.05] },
      { pos: [0, height / 2, -length / 2], size: [width / 2, height / 2, 0.05] }
    ]

    walls.forEach((wall, index) => {
      const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(wall.pos[0], wall.pos[1], wall.pos[2])
      const wallBody = this.world!.createRigidBody(wallBodyDesc)
      const wallColliderDesc = RAPIER.ColliderDesc.cuboid(wall.size[0], wall.size[1], wall.size[2])
      this.world!.createCollider(wallColliderDesc, wallBody)
    })
  }

  addBox(box: { id: string; position: { x: number; y: number; z: number }; width: number; height: number; length: number; weight: number }): void {
    if (!this.world || !this.initialized) {
      console.warn('Physics engine not initialized, skipping box addition')
      return
    }

    // Create dynamic rigid body for the box
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(box.position.x, box.position.y, box.position.z)

    const body = this.world.createRigidBody(bodyDesc)

    // Create collider
    const colliderDesc = RAPIER.ColliderDesc.cuboid(box.width / 2, box.height / 2, box.length / 2)
      .setDensity(box.weight / (box.width * box.height * box.length))

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

  step(deltaTime: number = 1/60): PhysicsStats {
    if (!this.world || !this.initialized) {
      return {
        collisions: 0,
        contacts: 0,
        totalForce: 0,
        running: false,
        realTime: false
      }
    }

    this.world.step()

    // Calculate stats
    let collisions = 0
    let contacts = 0
    let totalForce = 0

    this.world.forEachContactPair((collider1, collider2, manifold) => {
      contacts++
      if (manifold.numContacts() > 0) {
        collisions++
      }
    })

    this.bodies.forEach(body => {
      const velocity = body.linvel()
      totalForce += Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)
    })

    return {
      collisions,
      contacts,
      totalForce,
      running: true,
      realTime: true
    }
  }

  applyForces(forces: { acceleration: number; braking: number; turning: number; gravity: number }): void {
    if (!this.world || !this.initialized) return

    // Apply gravity multiplier
    this.world.gravity = { x: 0, y: -9.81 * forces.gravity, z: 0 }

    // Apply acceleration/braking forces to all bodies
    this.bodies.forEach(body => {
      const currentVel = body.linvel()

      // Apply braking force (opposite to velocity)
      if (forces.braking > 0) {
        body.applyImpulse({
          x: -currentVel.x * forces.braking * 0.1,
          y: 0,
          z: -currentVel.z * forces.braking * 0.1
        }, true)
      }

      // Apply acceleration force
      if (forces.acceleration > 0) {
        body.applyImpulse({
          x: 0,
          y: 0,
          z: forces.acceleration * 0.1
        }, true)
      }

      // Apply turning force
      if (forces.turning > 0) {
        body.applyTorqueImpulse({
          x: 0,
          y: forces.turning * 0.1,
          z: 0
        }, true)
      }
    })
  }

  getBoxPositions(): Map<string, { x: number; y: number; z: number }> {
    const positions = new Map<string, { x: number; y: number; z: number }>()

    this.bodies.forEach((body, id) => {
      const translation = body.translation()
      positions.set(id, {
        x: translation.x,
        y: translation.y,
        z: translation.z
      })
    })

    return positions
  }

  destroy(): void {
    if (this.world) {
      this.world.free()
      this.world = null
    }
    this.bodies.clear()
    this.colliders.clear()
    this.initialized = false
  }

  isInitialized(): boolean {
    return this.initialized
  }
}

export default PhysicsEngine