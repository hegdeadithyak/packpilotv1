
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
  error?: string
}

class PhysicsWorker {
  private engine: PhysicsEngine
  private algorithm: PlacementAlgorithm | null = null
  private isRunning = false

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
            payload: { success: true },
            id: message.id
          }

        case 'REMOVE_BOX':
          this.engine.removeBox(message.payload.boxId)
          return {
            type: 'BOX_REMOVED',
            payload: { success: true },
            id: message.id
          }

        case 'APPLY_FORCES':
          this.engine.applyForces(message.payload.forces)
          return {
            type: 'FORCES_APPLIED',
            payload: { success: true },
            id: message.id
          }

        case 'STEP_SIMULATION':
          const stats = this.engine.step(message.payload.deltaTime)
          const boxData = this.engine.getBoxData()
          return {
            type: 'SIMULATION_STEPPED',
            payload: { stats, boxData },
            id: message.id
          }

        case 'FIND_OPTIMAL_PLACEMENT':
          const { boxes, constraints } = message.payload
          this.algorithm = new PlacementAlgorithm(this.engine, constraints)
          const solutions = await this.algorithm.findOptimalPlacements(boxes)
          return {
            type: 'OPTIMAL_PLACEMENT_FOUND',
            payload: { solutions },
            id: message.id
          }

        case 'START_CONTINUOUS_SIMULATION':
          this.startContinuousSimulation(message.payload.forces, message.id)
          return {
            type: 'CONTINUOUS_SIMULATION_STARTED',
            payload: { success: true },
            id: message.id
          }

        case 'APPLY_FORCE_EVENT':
          const forceResult = this.applySpecificForce(message.payload.forceType, message.payload.magnitude)
          return {
            type: 'FORCE_EVENT_APPLIED',
            payload: forceResult,
            id: message.id
          }

        case 'GET_STATE_TRANSITION':
          const stateData = this.getCurrentStateData()
          return {
            type: 'STATE_TRANSITION_DATA',
            payload: stateData,
            id: message.id
          }

        case 'STOP_SIMULATION':
          this.isRunning = false
          return {
            type: 'SIMULATION_STOPPED',
            payload: { success: true },
            id: message.id
          }

        case 'DESTROY':
          this.engine.destroy()
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
        payload: null,
        id: message.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private startContinuousSimulation(forces: any, requestId: string): void {
    this.isRunning = true
    let frameCount = 0
    
    const simulate = () => {
      if (!this.isRunning) return
      
      this.engine.applyForces(forces)
      const stats = this.engine.step(1/60) // 60 FPS
      const boxData = this.engine.getBoxData()
      
      frameCount++
      
      // Send update to main thread with enhanced data
      self.postMessage({
        type: 'SIMULATION_UPDATE',
        payload: { 
          stats: {
            ...stats,
            frameCount,
            running: this.isRunning,
            realTime: true
          }, 
          boxData,
          forces: forces,
          timestamp: Date.now()
        },
        id: requestId
      })
      
      // Detect significant events
      if (stats.collisions > 0) {
        self.postMessage({
          type: 'COLLISION_EVENT',
          payload: { collisions: stats.collisions, frameCount },
          id: requestId
        })
      }
      
      if (stats.stability < 50) {
        self.postMessage({
          type: 'STABILITY_WARNING',
          payload: { stability: stats.stability, frameCount },
          id: requestId
        })
      }
      
      // Continue simulation
      setTimeout(simulate, 1000/60) // 60 FPS
    }
    
    simulate()
  }

  private applySpecificForce(forceType: string, magnitude: number): any {
    if (!this.engine) return { success: false, error: 'Engine not initialized' }
    
    const forceConfig = {
      acceleration: forceType === 'acceleration' ? magnitude : 0,
      braking: forceType === 'braking' ? magnitude : 0,
      turning: forceType === 'turning' ? magnitude : 0,
      gravity: 1.0
    }
    
    this.engine.applyForces(forceConfig)
    
    return {
      success: true,
      forceType,
      magnitude,
      appliedAt: Date.now()
    }
  }

  private getCurrentStateData(): any {
    if (!this.engine) return { success: false }
    
    const boxData = this.engine.getBoxData()
    const stateSignature = Array.from(boxData.values()).map(box => ({
      id: box.id,
      position: box.position,
      velocity: box.velocity,
      isStable: box.isStable
    }))
    
    return {
      success: true,
      stateSignature,
      boxCount: boxData.size,
      timestamp: Date.now()
    }
  }
}

// Worker main thread
const worker = new PhysicsWorker()

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const response = await worker.handleMessage(event.data)
  self.postMessage(response)
}

export {}
