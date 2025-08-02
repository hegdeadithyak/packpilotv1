import PhysicsEngine from '../lib/physics-engine'
import type { Box } from '../types/box'

let physicsEngine: PhysicsEngine | null = null
let isInitialized = false

self.onmessage = async (event) => {
  const { type, payload, id } = event.data

  try {
    switch (type) {
      case 'INITIALIZE':
        await initializePhysics()
        break

      case 'CREATE_TRUCK':
        if (physicsEngine && payload.dimensions) {
          physicsEngine.createTruckContainer(payload.dimensions)
          self.postMessage({ type: 'TRUCK_CREATED', payload: {}, id })
        }
        break

      case 'ADD_BOX':
        if (physicsEngine && payload.box) {
          physicsEngine.addBox(payload.box)
          self.postMessage({ type: 'BOX_ADDED', payload: { boxId: payload.box.id }, id })
        }
        break

      case 'START_CONTINUOUS_SIMULATION':
        if (physicsEngine) {
          startContinuousSimulation(payload.forces || {})
        }
        break

      case 'STOP_SIMULATION':
        stopContinuousSimulation()
        break

      case 'APPLY_FORCE_EVENT':
        if (physicsEngine) {
          const forces = { acceleration: 0, braking: 0, turning: 0, gravity: 1.0 }
          forces[payload.forceType as keyof typeof forces] = payload.magnitude
          physicsEngine.applyForces(forces)

          // Run simulation for a short duration
          setTimeout(() => {
            if (physicsEngine) {
              const stats = physicsEngine.step()
              self.postMessage({ type: 'SIMULATION_UPDATE', payload: { stats }, id })
            }
          }, 100)
        }
        break

      case 'FIND_OPTIMAL_PLACEMENT':
        await findOptimalPlacement(payload.boxes, payload.constraints)
        break

      case 'DESTROY':
        if (physicsEngine) {
          physicsEngine.destroy()
          physicsEngine = null
          isInitialized = false
        }
        break

      default:
        console.warn('Unknown message type:', type)
    }
  } catch (error) {
    console.error('Physics worker error:', error)
    self.postMessage({ type: 'ERROR', payload: { error: error.message }, id })
  }
}

async function initializePhysics() {
  try {
    console.log('🔧 Initializing physics engine in worker...')
    physicsEngine = new PhysicsEngine()
    await physicsEngine.initialize()
    isInitialized = true

    self.postMessage({ 
      type: 'PHYSICS_INITIALIZED', 
      payload: { success: true }, 
      id: 'init' 
    })
    console.log('✅ Physics engine initialized in worker')
  } catch (error) {
    console.error('❌ Failed to initialize physics in worker:', error)
    self.postMessage({ 
      type: 'ERROR', 
      payload: { error: error.message }, 
      id: 'init' 
    })
  }
}

let simulationInterval: NodeJS.Timeout | null = null

function startContinuousSimulation(forces: any) {
  if (!physicsEngine || !isInitialized) return

  stopContinuousSimulation() // Stop any existing simulation

  simulationInterval = setInterval(() => {
    if (physicsEngine) {
      // Apply forces if provided
      if (forces) {
        physicsEngine.applyForces(forces)
      }

      // Step the simulation
      const stats = physicsEngine.step()

      // Get updated positions
      const positions = physicsEngine.getBoxPositions()

      // Send update
      self.postMessage({
        type: 'SIMULATION_UPDATE',
        payload: {
          stats,
          positions: Array.from(positions.entries()).map(([id, pos]) => ({ id, position: pos }))
        },
        id: 'continuous'
      })
    }
  }, 16) // ~60 FPS
}

function stopContinuousSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }
}

async function findOptimalPlacement(boxes: Box[], constraints: any) {
  try {
    // Import placement algorithm
    const { PlacementAlgorithm } = await import('../lib/placement-algorithm')

    console.log('🧠 Starting MCTS-based placement optimization in worker...')

    const algorithm = new PlacementAlgorithm(constraints)
    const optimizedBoxes = await algorithm.findOptimalPlacement(boxes)

    self.postMessage({
      type: 'OPTIMAL_PLACEMENT_FOUND',
      payload: {
        solutions: optimizedBoxes,
        stats: {
          totalBoxes: boxes.length,
          placedBoxes: optimizedBoxes.length,
          successRate: (optimizedBoxes.length / boxes.length) * 100
        }
      },
      id: 'placement'
    })

    console.log(`✅ Placement optimization complete: ${optimizedBoxes.length}/${boxes.length} boxes placed`)
  } catch (error) {
    console.error('❌ Placement optimization failed:', error)
    self.postMessage({
      type: 'ERROR',
      payload: { error: error.message },
      id: 'placement'
    })
  }
}