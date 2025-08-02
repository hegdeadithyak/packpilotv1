export interface Box {
  id: string
  name: string
  width: number
  height: number
  length: number
  weight: number
  position: {
    x: number
    y: number
    z: number
  }
  temperatureZone: "regular" | "cold" | "frozen"
  isFragile: boolean
  destination: string
  isNew?: boolean
  crushFactor?: number // 0-1, resistance to crushing
  stackLimit?: number // Maximum number of boxes that can be stacked on top
}

export interface TruckDimensions {
  width: number
  length: number
  height: number
}

export interface PhysicsForces {
  acceleration: number
  braking: number
  turning: number
  gravity: number
}

export interface OptimizationConstraints {
  maxWeight: number
  maxVolume: number
  temperatureZones: boolean
  fragileHandling: boolean
  multiStopRouting: boolean
}

export interface LoadingSequenceItem {
  boxId: string
  order: number
  instructions: string
  estimatedTime: number
}

export interface SafetyCheck {
  id: string
  description: string
  status: "pass" | "fail" | "warning"
  details?: string
}
