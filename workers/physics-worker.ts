
import { PhysicsEngine } from '../lib/physics-engine'
import { PlacementAlgorithm, PlacementConstraints } from '../lib/placement-algorithm'
import type { Box } from '../types/box'

interface WorkerMessage {
  type: string
  payload: any
  id: string
}

interface WorkerResponse {
  type: string
  payload: any
  id: string
}

class PhysicsWorker {
  private engine: PhysicsEngine
  private algorithm: PlacementAlgorithm | null = null
  private isRunning = false
  private simulationInterval: number | null = null

  constructor() {
    this.engine = new PhysicsEngine()
  }

  async handleMessage(message: WorkerMessage): Promise<WorkerResponse> {
    try {
      switch (message.type) {
        case 'INITIALIZE':
          await this.engine.initialize()
          return {
            type: 'INITIALIZED',
            payload: { success: true },
            id: message.id
          }

        case 'CREATE_TRUCK':
          this.engine.createTruckContainer(message.payload.dimensions)
          return {
            type: 'TRUCK_CREATED',
            payload: { success: true },
            id: message.id
          }

        case 'ADD_BOX':
          this.engine.addBox(message.payload.box)
          return {
            type: 'BOX_ADDED',
            payload: { success: true, boxId: message.payload.box.id },
            id: message.id
          }

        case 'REMOVE_BOX':
          this.engine.removeBox(message.payload.boxId)
          return {
            type: 'BOX_REMOVED',
            payload: { success: true, boxId: message.payload.boxId },
            id: message.id
          }

        case 'APPLY_FORCES':
          this.engine.applyForces(message.payload.forces)
          return {
            type: 'FORCES_APPLIED',
            payload: { success: true },
            id: message.id
          }

        case 'APPLY_FORCE_EVENT':
          const { forceType, magnitude } = message.payload
          const eventForces = {
            acceleration: forceType === 'acceleration' ? magnitude : 0,
            braking: forceType === 'braking' ? magnitude : 0,
            turning: forceType === 'turning' ? magnitude : 0,
            gravity: 1.0
          }
          this.engine.applyForces(eventForces)
          
          // Apply force for short duration
          setTimeout(() => {
            this.engine.applyForces({ acceleration: 0, braking: 0, turning: 0, gravity: 1.0 })
          }, 500)
          
          return {
            type: 'FORCE_EVENT_APPLIED',
            payload: { success: true, forceType, magnitude },
            id: message.id
          }

        case 'START_CONTINUOUS_SIMULATION':
          this.startContinuousSimulation(message.payload.forces)
          return {
            type: 'SIMULATION_STARTED',
            payload: { success: true },
            id: message.id
          }

        case 'STOP_SIMULATION':
          this.stopSimulation()
          return {
            type: 'SIMULATION_STOPPED',
            payload: { success: true },
            id: message.id
          }

        case 'STEP_SIMULATION':
          const deltaTime = message.payload.deltaTime || 1/60
          const stats = this.engine.step(deltaTime)
          const boxData = this.engine.getBoxData()
          
          return {
            type: 'SIMULATION_STEP',
            payload: { stats, boxData },
            id: message.id
          }

        case 'FIND_OPTIMAL_PLACEMENT':
          return await this.findOptimalPlacement(message.payload)

        case 'GET_BOX_DATA':
          const currentBoxData = this.engine.getBoxData()
          return {
            type: 'BOX_DATA',
            payload: { boxData: currentBoxData },
            id: message.id
          }

        case 'DESTROY':
          this.destroy()
          return {
            type: 'DESTROYED',
            payload: { success: true },
            id: message.id
          }

        default:
          throw new Error(`Unknown message type: ${message.type}`)
      }
    } catch (error) {
      return {
        type: 'ERROR',
        payload: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          originalType: message.type 
        },
        id: message.id
      }
    }
  }

  private startContinuousSimulation(forces: any): void {
    if (this.isRunning) {
      this.stopSimulation()
    }

    this.isRunning = true
    this.engine.startContinuousSimulation()

    // Apply initial forces
    if (forces) {
      this.engine.applyForces(forces)
    }

    // Start simulation loop
    this.simulationInterval = setInterval(() => {
      if (!this.isRunning) return

      const stats = this.engine.step(1/60) // 60 FPS
      const boxData = this.engine.getBoxData()

      // Send update to main thread
      self.postMessage({
        type: 'SIMULATION_UPDATE',
        payload: {
          stats,
          boxData,
          timestamp: Date.now()
        },
        id: 'continuous_update'
      })

      // Re-apply forces if still active
      if (forces && (forces.acceleration > 0.1 || forces.braking > 0.1 || forces.turning > 0.1)) {
        this.engine.applyForces(forces)
      }

    }, 16) // ~60 FPS
  }

  private stopSimulation(): void {
    this.isRunning = false
    this.engine.stopSimulation()

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval)
      this.simulationInterval = null
    }
  }

  private async findOptimalPlacement(payload: any): Promise<WorkerResponse> {
    try {
      const { boxes, constraints } = payload

      // Initialize algorithm if not exists
      if (!this.algorithm) {
        this.algorithm = new PlacementAlgorithm(this.engine, constraints)
      }

      // Progress callback
      this.algorithm.onPlacementUpdate((placedBoxes, progress) => {
        self.postMessage({
          type: 'PLACEMENT_PROGRESS',
          payload: {
            placedBoxes,
            progress,
            total: boxes.length
          },
          id: 'placement_progress'
        })
      })

      // Find optimal placements
      const optimizedBoxes = await this.algorithm.findOptimalPlacements(boxes)

      return {
        type: 'OPTIMAL_PLACEMENT_FOUND',
        payload: {
          solutions: optimizedBoxes,
          stats: {
            totalBoxes: boxes.length,
            placedBoxes: optimizedBoxes.length,
            efficiency: (optimizedBoxes.length / boxes.length) * 100
          }
        },
        id: 'placement_result'
      }

    } catch (error) {
      throw new Error(`Placement optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private destroy(): void {
    this.stopSimulation()
    this.engine.destroy()
    this.algorithm = null
  }
}

// Initialize worker
const worker = new PhysicsWorker()

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const response = await worker.handleMessage(event.data)
  self.postMessage(response)
}

// Handle worker errors
self.onerror = (error) => {
  console.error('Physics worker error:', error)
  self.postMessage({
    type: 'ERROR',
    payload: { error: 'Worker error occurred' },
    id: 'worker_error'
  })
}

export {}
