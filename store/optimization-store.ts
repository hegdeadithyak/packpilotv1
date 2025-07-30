"use client"

import { create } from "zustand"
import type { Box } from "@/types/box"
import { sampleBoxes } from "@/data/sample-boxes"

interface PhysicsStats {
  collisions: number
  contacts: number
  totalForce: number
}

interface SimulationForces {
  acceleration: number
  braking: number
  turning: number
  gravity: number
}

interface OptimizationState {
  boxes: Box[]
  truckDimensions: {
    width: number
    length: number
    height: number
  }
  physicsEnabled: boolean
  stabilityScore: number
  safetyScore: number
  optimizationScore: number
  loadingSequence: string[]
  temperatureZones: {
    regular: string[]
    cold: string[]
    frozen: string[]
  }
  physicsStats: PhysicsStats | null
  isSimulationRunning: boolean
  simulationSpeed: number
  simulationForces: SimulationForces

  // Actions
  addBox: (box: Box) => void
  removeBox: (id: string) => void
  updateBox: (id: string, updates: Partial<Box>) => void
  updateBoxPosition: (id: string, position: { x: number; y: number; z: number }) => void
  setTruckDimensions: (dimensions: { width: number; length: number; height: number }) => void
  setPhysicsEnabled: (enabled: boolean) => void
  optimizeLayout: () => void
  resetLayout: () => void
  initializePhysics: () => void
  updatePhysics: () => void
  checkCollisions: (boxId: string) => string[]
  loadSampleData: () => void
  resetToEmpty: () => void
  runSimulation: () => void
  stopSimulation: () => void
  resetSimulation: () => void
  setSimulationSpeed: (speed: number) => void
  setSimulationForces: (forces: SimulationForces) => void
}

export const useOptimizationStore = create<OptimizationState>((set, get) => ({
  boxes: [],
  truckDimensions: {
    width: 8,
    length: 28,
    height: 9,
  },
  physicsEnabled: true,
  stabilityScore: 0,
  safetyScore: 0,
  optimizationScore: 0,
  loadingSequence: [],
  temperatureZones: {
    regular: [],
    cold: [],
    frozen: [],
  },
  physicsStats: null,
  isSimulationRunning: false,
  simulationSpeed: 1.0,
  simulationForces: {
    acceleration: 0.4,
    braking: 0.8,
    turning: 0.5,
    gravity: 1.0,
  },

  loadSampleData: () => {
    const optimizedBoxes = optimizeBoxPlacement(sampleBoxes, get().truckDimensions)
    const scores = calculateAllScores(optimizedBoxes, get().truckDimensions)
    const sequence = generateOptimalLoadingSequence(optimizedBoxes)
    const zones = categorizeTemperatureZones(optimizedBoxes)

    set({
      boxes: optimizedBoxes,
      stabilityScore: scores.stability,
      safetyScore: scores.safety,
      optimizationScore: scores.optimization,
      loadingSequence: sequence,
      temperatureZones: zones,
    })
  },

  resetToEmpty: () => {
    set({
      boxes: [],
      stabilityScore: 0,
      safetyScore: 0,
      optimizationScore: 0,
      loadingSequence: [],
      temperatureZones: {
        regular: [],
        cold: [],
        frozen: [],
      },
    })
  },

  initializePhysics: () => {
    const state = get()
    if (state.boxes.length > 0) {
      const scores = calculateAllScores(state.boxes, state.truckDimensions)
      const sequence = generateOptimalLoadingSequence(state.boxes)
      const zones = categorizeTemperatureZones(state.boxes)

      set({
        stabilityScore: scores.stability,
        safetyScore: scores.safety,
        optimizationScore: scores.optimization,
        loadingSequence: sequence,
        temperatureZones: zones,
      })
    }
  },

  updatePhysics: () => {
    const state = get()
    const scores = calculateAllScores(state.boxes, state.truckDimensions)

    set({
      stabilityScore: scores.stability,
      safetyScore: scores.safety,
      optimizationScore: scores.optimization,
      physicsStats: {
        collisions: detectCollisions(state.boxes).length,
        contacts: calculateContacts(state.boxes),
        totalForce: calculateTotalForce(state.boxes),
      },
    })
  },

  runSimulation: () => {
    set({ isSimulationRunning: true })

    setTimeout(() => {
      const state = get()
      if (state.isSimulationRunning) {
        get().updatePhysics()
      }
    }, 100)
  },

  stopSimulation: () => {
    set({ isSimulationRunning: false })
  },

  resetSimulation: () => {
    set({ isSimulationRunning: false })
    const state = get()
    const optimizedBoxes = optimizeBoxPlacement(state.boxes, state.truckDimensions)
    set({ boxes: optimizedBoxes })
    get().updatePhysics()
  },

  setSimulationSpeed: (speed) => {
    set({ simulationSpeed: speed })
  },

  setSimulationForces: (forces) => {
    set({ simulationForces: forces })
  },

  addBox: (box) => {
    set((state) => {
      const newBoxes = [...state.boxes, box]
      const scores = calculateAllScores(newBoxes, state.truckDimensions)
      const sequence = generateOptimalLoadingSequence(newBoxes)
      const zones = categorizeTemperatureZones(newBoxes)

      return {
        boxes: newBoxes,
        stabilityScore: scores.stability,
        safetyScore: scores.safety,
        optimizationScore: scores.optimization,
        loadingSequence: sequence,
        temperatureZones: zones,
      }
    })
  },

  removeBox: (id) => {
    set((state) => {
      const newBoxes = state.boxes.filter((box) => box.id !== id)
      const scores = calculateAllScores(newBoxes, state.truckDimensions)
      const sequence = generateOptimalLoadingSequence(newBoxes)
      const zones = categorizeTemperatureZones(newBoxes)

      return {
        boxes: newBoxes,
        stabilityScore: scores.stability,
        safetyScore: scores.safety,
        optimizationScore: scores.optimization,
        loadingSequence: sequence,
        temperatureZones: zones,
      }
    })
  },

  updateBox: (id, updates) => {
    set((state) => {
      const newBoxes = state.boxes.map((box) => (box.id === id ? { ...box, ...updates } : box))
      const scores = calculateAllScores(newBoxes, state.truckDimensions)

      return {
        boxes: newBoxes,
        stabilityScore: scores.stability,
        safetyScore: scores.safety,
        optimizationScore: scores.optimization,
      }
    })
  },

  updateBoxPosition: (id, position) => {
    set((state) => {
      const newBoxes = state.boxes.map((box) => (box.id === id ? { ...box, position, isNew: false } : box))
      const scores = calculateAllScores(newBoxes, state.truckDimensions)

      return {
        boxes: newBoxes,
        stabilityScore: scores.stability,
        safetyScore: scores.safety,
        optimizationScore: scores.optimization,
      }
    })
  },

  setTruckDimensions: (dimensions) => {
    set((state) => {
      const scores = calculateAllScores(state.boxes, dimensions)
      return {
        truckDimensions: dimensions,
        stabilityScore: scores.stability,
        safetyScore: scores.safety,
        optimizationScore: scores.optimization,
      }
    })
  },

  setPhysicsEnabled: (enabled) => {
    set({ physicsEnabled: enabled })
  },

  optimizeLayout: () => {
    set((state) => {
      const optimizedBoxes = optimizeBoxPlacement(state.boxes, state.truckDimensions)
      const scores = calculateAllScores(optimizedBoxes, state.truckDimensions)
      const sequence = generateOptimalLoadingSequence(optimizedBoxes)

      return {
        boxes: optimizedBoxes,
        stabilityScore: scores.stability,
        safetyScore: scores.safety,
        optimizationScore: scores.optimization,
        loadingSequence: sequence,
      }
    })
  },

  resetLayout: () => {
    set((state) => {
      const resetBoxes = state.boxes.map((box) => ({
        ...box,
        position: { x: 0, y: box.height / 2, z: 0 },
      }))

      return {
        boxes: resetBoxes,
        stabilityScore: 0,
        safetyScore: 0,
        optimizationScore: 0,
      }
    })
  },

  checkCollisions: (boxId) => {
    const state = get()
    const box = state.boxes.find((b) => b.id === boxId)
    if (!box) return []

    return state.boxes
      .filter((otherBox) => otherBox.id !== boxId)
      .filter((otherBox) => isBoxColliding(box, otherBox))
      .map((otherBox) => otherBox.id)
  },
}))

function calculateAllScores(boxes: Box[], truckDimensions: { width: number; length: number; height: number }) {
  const stability = calculateStabilityScore(boxes, truckDimensions)
  const safety = calculateSafetyScore(boxes, truckDimensions)
  const optimization = calculateOptimizationScore(boxes, truckDimensions)

  return { stability, safety, optimization }
}

function calculateStabilityScore(
  boxes: Box[],
  truckDimensions: { width: number; length: number; height: number },
): number {
  if (boxes.length === 0) return 100

  let score = 100
  const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)

  // Center of Gravity Analysis
  const centerOfGravity = {
    x: boxes.reduce((sum, box) => sum + box.position.x * box.weight, 0) / totalWeight,
    y: boxes.reduce((sum, box) => sum + box.position.y * box.weight, 0) / totalWeight,
    z: boxes.reduce((sum, box) => sum + box.position.z * box.weight, 0) / totalWeight,
  }

  // Penalize high center of gravity
  const maxSafeHeight = truckDimensions.height * 0.6
  if (centerOfGravity.y > maxSafeHeight) {
    const heightPenalty = ((centerOfGravity.y - maxSafeHeight) / maxSafeHeight) * 30
    score -= heightPenalty
  }

  // Lateral stability
  const lateralOffset = Math.abs(centerOfGravity.x) / (truckDimensions.width / 2)
  score -= lateralOffset * 25

  // Longitudinal stability
  const longitudinalOffset = Math.abs(centerOfGravity.z) / (truckDimensions.length / 2)
  score -= longitudinalOffset * 15

  return Math.max(0, Math.min(100, score))
}

function calculateSafetyScore(
  boxes: Box[],
  truckDimensions: { width: number; length: number; height: number },
): number {
  if (boxes.length === 0) return 100

  let score = 100

  
  const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)
  if (totalWeight > 34000) {
    score -= 25
  }

  // Fragile item safety
  boxes.forEach((box) => {
    if (box.isFragile) {
      if (box.position.y > truckDimensions.height * 0.7) {
        score -= 10
      }
    }
  })

  // Collision detection
  const collisions = detectCollisions(boxes)
  score -= collisions.length * 0.2

  return Math.max(0, Math.min(100, score))
}

function calculateOptimizationScore(
  boxes: Box[],
  truckDimensions: { width: number; length: number; height: number },
): number {
  if (boxes.length === 0) return 0

  const totalTruckVolume = truckDimensions.width * truckDimensions.length * truckDimensions.height
  const totalBoxVolume = boxes.reduce((sum, box) => sum + box.width * box.height * box.length, 0)
  const volumeUtilization = (totalBoxVolume / totalTruckVolume) * 100

  const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)
  const weightUtilization = Math.min((totalWeight / 34000) * 100, 100)

  return Math.max(0, Math.min(100, volumeUtilization * 0.6 + weightUtilization * 0.4))
}

function detectCollisions(boxes: Box[]): Array<{ box1: string; box2: string }> {
  const collisions: Array<{ box1: string; box2: string }> = []

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (isBoxColliding(boxes[i], boxes[j])) {
        collisions.push({
          box1: boxes[i].id,
          box2: boxes[j].id,
        })
      }
    }
  }

  return collisions
}

function isBoxColliding(box1: Box, box2: Box): boolean {
  const dx = Math.abs(box1.position.x - box2.position.x)
  const dy = Math.abs(box1.position.y - box2.position.y)
  const dz = Math.abs(box1.position.z - box2.position.z)

  const minDistanceX = (box1.width + box2.width) / 2
  const minDistanceY = (box1.height + box2.height) / 2
  const minDistanceZ = (box1.length + box2.length) / 2

  return dx < minDistanceX && dy < minDistanceY && dz < minDistanceZ
}

function calculateContacts(boxes: Box[]): number {
  let contacts = 0
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const distance = getDistance(boxes[i].position, boxes[j].position)
      const minDistance = (boxes[i].width + boxes[j].width) / 2
      if (distance <= minDistance + 0.1) {
        contacts++
      }
    }
  }
  return contacts
}

function calculateTotalForce(boxes: Box[]): number {
  return boxes.reduce((total, box) => {
    const gravitationalForce = (box.weight * 9.81) / 100
    const heightFactor = box.position.y / 10
    return total + gravitationalForce * (1 + heightFactor)
  }, 0)
}

function getDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
  const dx = pos1.x - pos2.x
  const dy = pos1.y - pos2.y
  const dz = pos1.z - pos2.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function optimizeBoxPlacement(boxes: Box[], truckDimensions: { width: number; length: number; height: number }): Box[] {
  const optimizedBoxes = [...boxes]

  // Sort by priority
  optimizedBoxes.sort((a, b) => {
    const stopOrder = { "Stop 4": 0, "Stop 3": 1, "Stop 2": 2, "Stop 1": 3 }
    const aStop = stopOrder[a.destination as keyof typeof stopOrder] || 4
    const bStop = stopOrder[b.destination as keyof typeof stopOrder] || 4

    if (aStop !== bStop) return aStop - bStop
    if (a.isFragile !== b.isFragile) return a.isFragile ? 1 : -1
    return b.weight - a.weight
  })

  // Advanced 3D bin packing with physics constraints
  const placedBoxes: Box[] = []

  optimizedBoxes.forEach((box) => {
    const bestPosition = findBestPosition(box, placedBoxes, truckDimensions)

    if (bestPosition) {
      box.position = bestPosition
      placedBoxes.push(box)
    }
  })

  return optimizedBoxes
}

function findBestPosition(
  box: Box,
  placedBoxes: Box[],
  truckDimensions: { width: number; length: number; height: number },
): { x: number; y: number; z: number } | null {
  const candidates: Array<{ position: { x: number; y: number; z: number }; score: number }> = []

  // Generate candidate positions
  for (let x = -truckDimensions.width / 2 + box.width / 2; x <= truckDimensions.width / 2 - box.width / 2; x += 0.5) {
    for (
      let z = -truckDimensions.length / 2 + box.length / 2;
      z <= truckDimensions.length / 2 - box.length / 2;
      z += 0.5
    ) {
      for (let y = box.height / 2; y <= truckDimensions.height - box.height / 2; y += 0.5) {
        const position = { x, y, z }

        if (isValidPosition(box, position, placedBoxes, truckDimensions)) {
          const score = evaluatePosition(box, position, placedBoxes, truckDimensions)
          candidates.push({ position, score })
        }
      }
    }
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => b.score - a.score)
  return candidates[0].position
}

function isValidPosition(
  box: Box,
  position: { x: number; y: number; z: number },
  placedBoxes: Box[],
  truckDimensions: { width: number; length: number; height: number },
): boolean {
  // Check truck boundaries
  if (
    position.x - box.width / 2 < -truckDimensions.width / 2 ||
    position.x + box.width / 2 > truckDimensions.width / 2 ||
    position.y - box.height / 2 < 0 ||
    position.y + box.height / 2 > truckDimensions.height ||
    position.z - box.length / 2 < -truckDimensions.length / 2 ||
    position.z + box.length / 2 > truckDimensions.length / 2
  ) {
    return false
  }

  // Check collisions with placed boxes
  const testBox = { ...box, position }
  for (const placedBox of placedBoxes) {
    if (isBoxColliding(testBox, placedBox)) {
      return false
    }
  }

  return true
}

function evaluatePosition(
  box: Box,
  position: { x: number; y: number; z: number },
  placedBoxes: Box[],
  truckDimensions: { width: number; length: number; height: number },
): number {
  let score = 100

  // Prefer lower positions (stability)
  score -= position.y * 5

  // Prefer positions closer to correct temperature zone
  const zoneScore = getTemperatureZoneScore(box, position, truckDimensions)
  score += zoneScore * 20

  // Prefer positions closer to truck center (lateral stability)
  const lateralPenalty = Math.abs(position.x) * 2
  score -= lateralPenalty

  return score
}

function getTemperatureZoneScore(
  box: Box,
  position: { x: number; y: number; z: number },
  truckDimensions: { width: number; length: number; height: number },
): number {
  const zPosition = position.z

  switch (box.temperatureZone) {
    case "frozen":
      return zPosition > truckDimensions.length / 2 - 4 ? 1 : 0
    case "cold":
      return zPosition > -4 && zPosition <= truckDimensions.length / 2 - 4 ? 1 : 0
    case "regular":
      return zPosition <= -4 ? 1 : 0
    default:
      return 1
  }
}

function generateOptimalLoadingSequence(boxes: Box[]): string[] {
  const sorted = [...boxes].sort((a, b) => {
    const stopOrder = { "Stop 4": 0, "Stop 3": 1, "Stop 2": 2, "Stop 1": 3 }
    const aStop = stopOrder[a.destination as keyof typeof stopOrder] || 4
    const bStop = stopOrder[b.destination as keyof typeof stopOrder] || 4

    if (aStop !== bStop) return aStop - bStop
    if (a.isFragile !== b.isFragile) return b.isFragile ? 1 : -1
    return b.weight - a.weight
  })

  return sorted.map((box) => box.id)
}

function categorizeTemperatureZones(boxes: Box[]) {
  return {
    regular: boxes.filter((box) => box.temperatureZone === "regular").map((box) => box.id),
    cold: boxes.filter((box) => box.temperatureZone === "cold").map((box) => box.id),
    frozen: boxes.filter((box) => box.temperatureZone === "frozen").map((box) => box.id),
  }
}
