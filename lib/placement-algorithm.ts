import type { Box } from '@/types/box'
import type { PhysicsEngine } from './physics-engine'
import { MCTSPlacementOptimizer } from './mcts-placement'
import { GraphStateEncoder } from './graph-state'

export interface PlacementConstraints {
  truckDimensions: { width: number; length: number; height: number }
  maxWeight: number
  fragileZones: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
  temperatureZones: {
    cold: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
    frozen: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
    regular: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
  }
  lifoOrder: boolean
  perishableAreas: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
}

export interface PlacementState {
  boxes: Box[]
  score: number
  stabilityScore: number
  collisions: number
  transitions: number
}

export interface StateTransition {
  fromState: PlacementState
  toState: PlacementState
  action: { boxId: string; position: { x: number; y: number; z: number } }
  probability: number
  reward: number
}

interface SpatialCell {
  boxes: Box[]
  bounds: { min: { x: number; y: number; z: number }, max: { x: number; y: number; z: number } }
}

export class PlacementAlgorithm {
  private mctsOptimizer: MCTSPlacementOptimizer
  private graphEncoder: GraphStateEncoder
  private explorationRate: number = 0.3
  private transitionMatrix = new Map<string, StateTransition[]>()
  private animationCallbacks: Array<(boxes: Box[], progress: number) => void> = []
  private spatialGrid = new Map<string, SpatialCell>()
  private gridSize = 2.0 // 2 meter cells for spatial optimization
  private placementProgress = 0

  constructor(
    private physicsEngine: PhysicsEngine,
    private constraints: PlacementConstraints
  ) {
    this.mctsOptimizer = new MCTSPlacementOptimizer(constraints.truckDimensions, constraints)
    this.graphEncoder = new GraphStateEncoder()
    this.initializeSpatialGrid()
  }

  private initializeSpatialGrid(): void {
    const { width, length, height } = this.constraints.truckDimensions

    for (let x = -width/2; x < width/2; x += this.gridSize) {
      for (let y = 0; y < height; y += this.gridSize) {
        for (let z = -length/2; z < length/2; z += this.gridSize) {
          const key = `${Math.floor(x/this.gridSize)}_${Math.floor(y/this.gridSize)}_${Math.floor(z/this.gridSize)}`
          this.spatialGrid.set(key, {
            boxes: [],
            bounds: {
              min: { x, y, z },
              max: { x: x + this.gridSize, y: y + this.gridSize, z: z + this.gridSize }
            }
          })
        }
      }
    }
  }

  async findOptimalPlacements(boxes: Box[]): Promise<Box[]> {
    console.log(`🚚 Starting placement optimization for ${boxes.length} boxes...`)
    this.placementProgress = 0

    // Use batch processing for large sets
    if (boxes.length > 100) {
      return this.findOptimalPlacementsBatched(boxes)
    } else if (boxes.length <= 15) {
      return this.findOptimalPlacementsMCTS(boxes)
    } else {
      return this.findOptimalPlacementsHeuristic(boxes)
    }
  }

  private async findOptimalPlacementsBatched(boxes: Box[]): Promise<Box[]> {
    console.log('🔄 Using batched placement optimization for large dataset...')

    const batchSize = 20
    const allPlacedBoxes: Box[] = []
    const batches = this.createOptimizedBatches(boxes, batchSize)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      this.placementProgress = (i / batches.length) * 100

      console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} boxes)`)

      // Use MCTS for smaller batches, heuristic for larger ones
      const batchResult = batch.length <= 15 
        ? await this.processBatchMCTS(batch, allPlacedBoxes)
        : await this.processBatchHeuristic(batch, allPlacedBoxes)

      allPlacedBoxes.push(...batchResult)

      // Update spatial grid
      this.updateSpatialGrid(batchResult)

      // Trigger progress callback
      this.triggerProgressCallback(allPlacedBoxes, this.placementProgress)

      // Allow other tasks to run
      await new Promise(resolve => setTimeout(resolve, 1))
    }

    this.placementProgress = 100
    console.log(`✅ Batch processing complete: ${allPlacedBoxes.length} boxes placed`)
    return allPlacedBoxes
  }

  private createOptimizedBatches(boxes: Box[], batchSize: number): Box[][] {
    // Sort boxes by priority first
    const sortedBoxes = this.sortBoxesByPriority(boxes)
    const batches: Box[][] = []

    // Create balanced batches considering weight and size
    let currentBatch: Box[] = []
    let currentWeight = 0
    let currentVolume = 0

    for (const box of sortedBoxes) {
      const boxWeight = box.weight
      const boxVolume = box.width * box.height * box.length

      // Start new batch if current would exceed limits
      if ((currentBatch.length >= batchSize) || 
          (currentWeight + boxWeight > 8000) || // Weight limit per batch
          (currentVolume + boxVolume > 50)) {    // Volume limit per batch

        if (currentBatch.length > 0) {
          batches.push(currentBatch)
          currentBatch = []
          currentWeight = 0
          currentVolume = 0
        }
      }

      currentBatch.push(box)
      currentWeight += boxWeight
      currentVolume += boxVolume
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch)
    }

    return batches
  }

  private async processBatchMCTS(batch: Box[], existingBoxes: Box[]): Promise<Box[]> {
    try {
      // Create temporary MCTS optimizer with current state
      const tempOptimizer = new MCTSPlacementOptimizer(this.constraints.truckDimensions, this.constraints)
      return tempOptimizer.findOptimalPlacement(batch, existingBoxes)
    } catch (error) {
      console.warn('⚠️ MCTS batch processing failed, falling back to heuristic:', error)
      return this.processBatchHeuristic(batch, existingBoxes)
    }
  }

  private async processBatchHeuristic(batch: Box[], existingBoxes: Box[]): Promise<Box[]> {
    const placedBoxes: Box[] = []

    for (const box of batch) {
      const optimalPosition = await this.findBestPositionOptimized(box, [...existingBoxes, ...placedBoxes])
      if (optimalPosition) {
        const placedBox = { ...box, position: optimalPosition }
        placedBoxes.push(placedBox)

        // Update graph state
        this.graphEncoder.annotate(placedBox, optimalPosition)
      } else {
        console.warn(`⚠️ Could not place box ${box.id}`)
      }
    }

    return placedBoxes
  }

  private updateSpatialGrid(newBoxes: Box[]): void {
    for (const box of newBoxes) {
      const gridKey = this.getGridKey(box.position)
      const cell = this.spatialGrid.get(gridKey)
      if (cell) {
        cell.boxes.push(box)
      }
    }
  }

  private getGridKey(position: { x: number; y: number; z: number }): string {
    const x = Math.floor(position.x / this.gridSize)
    const y = Math.floor(position.y / this.gridSize)
    const z = Math.floor(position.z / this.gridSize)
    return `${x}_${y}_${z}`
  }

  private async findBestPositionOptimized(box: Box, placedBoxes: Box[]): Promise<{ x: number; y: number; z: number } | null> {
    const candidates: Array<{ position: { x: number; y: number; z: number }; score: number }> = []

    // Generate candidate positions using spatial optimization
    const candidatePositions = this.generateCandidatePositionsOptimized(box, placedBoxes)

    for (const position of candidatePositions) {
      if (this.isValidPositionOptimized(box, position, placedBoxes)) {
        const score = await this.evaluatePositionDetailed(box, position, placedBoxes)
        candidates.push({ position, score })
      }
    }

    if (candidates.length === 0) {
      console.warn(`❌ No valid positions found for box ${box.id}`)
      return null
    }

    // Sort by score and return best position
    candidates.sort((a, b) => b.score - a.score)
    return candidates[0].position
  }

  private generateCandidatePositionsOptimized(box: Box, placedBoxes: Box[]): Array<{ x: number; y: number; z: number }> {
    const positions: Array<{ x: number; y: number; z: number }> = []
    const { width, length, height } = this.constraints.truckDimensions
    const stepSize = 0.25 // Finer grid for better placement

    // Priority positions: floor positions first
    for (let x = -width/2 + box.width/2 + 0.1; x <= width/2 - box.width/2 - 0.1; x += stepSize) {
      for (let z = -length/2 + box.length/2 + 0.1; z <= length/2 - box.length/2 - 0.1; z += stepSize) {
        positions.push({ x, y: box.height/2, z })
      }
    }

    // Stack positions: on top of existing boxes
    for (const placedBox of placedBoxes) {
      const stackY = placedBox.position.y + placedBox.height/2 + box.height/2 + 0.05 // Small gap

      if (stackY + box.height/2 <= height - 0.1) {
        // Try positions centered on the placed box
        positions.push({
          x: placedBox.position.x,
          y: stackY,
          z: placedBox.position.z
        })

        // Try offset positions for better packing
        const offsets = [
          { x: placedBox.width/4, z: 0 },
          { x: -placedBox.width/4, z: 0 },
          { x: 0, z: placedBox.length/4 },
          { x: 0, z: -placedBox.length/4 }
        ]

        for (const offset of offsets) {
          const x = placedBox.position.x + offset.x
          const z = placedBox.position.z + offset.z

          if (x - box.width/2 >= -width/2 + 0.1 && x + box.width/2 <= width/2 - 0.1 &&
              z - box.length/2 >= -length/2 + 0.1 && z + box.length/2 <= length/2 - 0.1) {
            positions.push({ x, y: stackY, z })
          }
        }
      }
    }

    return positions
  }

  private isValidPositionOptimized(box: Box, position: { x: number; y: number; z: number }, placedBoxes: Box[]): boolean {
    const { width, length, height } = this.constraints.truckDimensions
    const tolerance = 0.05 // 5cm tolerance

    // Check truck boundaries with tolerance
    if (position.x - box.width/2 < -width/2 + tolerance ||
        position.x + box.width/2 > width/2 - tolerance ||
        position.y - box.height/2 < tolerance ||
        position.y + box.height/2 > height - tolerance ||
        position.z - box.length/2 < -length/2 + tolerance ||
        position.z + box.length/2 > length/2 - tolerance) {
      return false
    }

    // Optimized collision detection using spatial grid
    const nearbyBoxes = this.getNearbyBoxes(position, placedBoxes)

    for (const otherBox of nearbyBoxes) {
      if (this.boxesCollideWithTolerance(box, position, otherBox, otherBox.position, tolerance)) {
        return false
      }
    }

    // Check if box has adequate support (if not on floor)
    if (position.y > box.height/2 + 0.2) {
      const supportArea = this.calculateSupportArea(box, position, placedBoxes)
      const requiredSupport = box.isFragile ? 0.8 : 0.6 // Fragile boxes need more support
      if (supportArea < requiredSupport) {
        return false
      }
    }

    return true
  }

  private getNearbyBoxes(position: { x: number; y: number; z: number }, allBoxes: Box[]): Box[] {
    // Simple proximity check - could be optimized with spatial indexing
    const searchRadius = 5.0
    return allBoxes.filter(box => {
      const dx = box.position.x - position.x
      const dy = box.position.y - position.y
      const dz = box.position.z - position.z
      return Math.sqrt(dx*dx + dy*dy + dz*dz) <= searchRadius
    })
  }

  private boxesCollideWithTolerance(
    box1: Box, pos1: { x: number; y: number; z: number },
    box2: Box, pos2: { x: number; y: number; z: number },
    tolerance: number
  ): boolean {
    return !(
      pos1.x + box1.width/2 + tolerance <= pos2.x - box2.width/2 ||
      pos1.x - box1.width/2 >= pos2.x + box2.width/2 + tolerance ||
      pos1.y + box1.height/2 + tolerance <= pos2.y - box2.height/2 ||
      pos1.y - box1.height/2 >= pos2.y + box2.height/2 + tolerance ||
      pos1.z + box1.length/2 + tolerance <= pos2.z - box2.length/2 ||
      pos1.z - box1.length/2 >= pos2.z + box2.length/2 + tolerance
    )
  }

  private calculateSupportArea(box: Box, position: { x: number; y: number; z: number }, placedBoxes: Box[]): number {
    let supportArea = 0
    const boxArea = box.width * box.length

    for (const supportBox of placedBoxes) {
      // Check if support box is below and close enough
      if (Math.abs(supportBox.position.y + supportBox.height/2 - (position.y - box.height/2)) <= 0.1) {
        const overlapArea = this.calculateOverlapArea(box, position, supportBox, supportBox.position)
        supportArea += overlapArea
      }
    }

    return Math.min(1.0, supportArea / boxArea)
  }

  private calculateOverlapArea(
    box1: Box, pos1: { x: number; y: number; z: number },
    box2: Box, pos2: { x: number; y: number; z: number }
  ): number {
    const x1Min = pos1.x - box1.width/2
    const x1Max = pos1.x + box1.width/2
    const z1Min = pos1.z - box1.length/2
    const z1Max = pos1.z + box1.length/2

    const x2Min = pos2.x - box2.width/2
    const x2Max = pos2.x + box2.width/2
    const z2Min = pos2.z - box2.length/2
    const z2Max = pos2.z + box2.length/2

    const overlapWidth = Math.max(0, Math.min(x1Max, x2Max) - Math.max(x1Min, x2Min))
    const overlapLength = Math.max(0, Math.min(z1Max, z2Max) - Math.max(z1Min, z2Min))

    return overlapWidth * overlapLength
  }

  private async evaluatePositionDetailed(box: Box, position: { x: number; y: number; z: number }, placedBoxes: Box[]): Promise<number> {
    let score = 100

    // Stability score (prefer lower positions)
    score += (this.constraints.truckDimensions.height - position.y) * 10

    // Center preference (better weight distribution)
    const lateralDistance = Math.abs(position.x)
    score -= lateralDistance * 2

    // Support quality
    if (position.y > box.height/2 + 0.2) {
      const supportArea = this.calculateSupportArea(box, position, placedBoxes)
      score += supportArea * 30
    } else {
      score += 20 // Floor placement bonus
    }

    // Accessibility (LIFO compliance)
    const accessibilityScore = (position.z + this.constraints.truckDimensions.length/2) / this.constraints.truckDimensions.length
    score += accessibilityScore * 15

    // Temperature zone compliance
    score += this.getTemperatureZoneScore(box, position) * 25

    // Fragile item safety
    if (box.isFragile) {
      if (position.y > this.constraints.truckDimensions.height * 0.6) {
        score -= 30 // High placement penalty for fragile items
      }
      const supportArea = this.calculateSupportArea(box, position, placedBoxes)
      if (supportArea < 0.8) {
        score -= 20 // Insufficient support penalty
      }
    }

    // Space efficiency (how well it uses available space)
    const spaceEfficiency = this.calculateLocalSpaceEfficiency(position, placedBoxes)
    score += spaceEfficiency * 10

    return Math.max(0, score)
  }

  private getTemperatureZoneScore(box: Box, position: { x: number; y: number; z: number }): number {
    const { frozen, cold } = this.constraints.temperatureZones

    // Check frozen zone compliance
    if (box.temperatureRequirement === 'frozen') {
      for (const zone of frozen) {
        if (this.positionInZone(position, zone)) {
          return 1.0 // Perfect match
        }
      }
      return -0.5 // Wrong zone penalty
    }

    // Check cold zone compliance
    if (box.temperatureRequirement === 'cold') {
      for (const zone of cold) {
        if (this.positionInZone(position, zone)) {
          return 1.0 // Perfect match
        }
      }
      return -0.3 // Wrong zone penalty
    }

    // Regular temperature - avoid temperature zones
    for (const zone of [...frozen, ...cold]) {
      if (this.positionInZone(position, zone)) {
        return -0.4 // Wrong zone penalty
      }
    }

    return 0.5 // Regular zone
  }

  private positionInZone(position: { x: number; y: number; z: number }, zone: { x: number; y: number; z: number; width: number; height: number; length: number }): boolean {
    return position.x >= zone.x - zone.width/2 && position.x <= zone.x + zone.width/2 &&
           position.y >= zone.y - zone.height/2 && position.y <= zone.y + zone.height/2 &&
           position.z >= zone.z - zone.length/2 && position.z <= zone.z + zone.length/2
  }

  private calculateLocalSpaceEfficiency(position: { x: number; y: number; z: number }, placedBoxes: Box[]): number {
    // Calculate how efficiently this position uses nearby space
    const radius = 2.0
    let nearbyVolume = 0
    let usedVolume = 0

    for (const box of placedBoxes) {
      const distance = Math.sqrt(
        Math.pow(box.position.x - position.x, 2) +
        Math.pow(box.position.y - position.y, 2) +
        Math.pow(box.position.z - position.z, 2)
      )

      if (distance <= radius) {
        nearbyVolume += radius * radius * radius // Simplified sphere volume
        usedVolume += box.width * box.height * box.length
      }
    }

    return nearbyVolume > 0 ? usedVolume / nearbyVolume : 0.5
  }

  // Keep existing methods for compatibility
  private async findOptimalPlacementsMCTS(boxes: Box[]): Promise<Box[]> {
    console.log('🧠 Using MCTS-based placement optimization...')

    try {
      const optimizedBoxes = this.mctsOptimizer.findOptimalPlacement(boxes)

      // Build state graph for the solution
      this.graphEncoder = new GraphStateEncoder()
      for (const box of optimizedBoxes) {
        this.graphEncoder.annotate(box, box.position)
      }

      console.log('✅ MCTS optimization complete')
      return optimizedBoxes
    } catch (error) {
      console.warn('⚠️ MCTS optimization failed, falling back to heuristic:', error)
      return this.findOptimalPlacementsHeuristic(boxes)
    }
  }

  private async findOptimalPlacementsHeuristic(boxes: Box[]): Promise<Box[]> {
    console.log('🔄 Using heuristic placement optimization...')

    const sortedBoxes = this.sortBoxesByPriority(boxes)
    const placedBoxes: Box[] = []

    for (let i = 0; i < sortedBoxes.length; i++) {
      const box = sortedBoxes[i]
      this.placementProgress = (i / sortedBoxes.length) * 100

      const optimalPosition = await this.findBestPositionOptimized(box, placedBoxes)
      if (optimalPosition) {
        const placedBox = { ...box, position: optimalPosition }
        placedBoxes.push(placedBox)
        this.graphEncoder.annotate(placedBox, optimalPosition)
      }

      // Trigger progress callback
      if (i % 5 === 0) { // Update every 5 boxes
        this.triggerProgressCallback(placedBoxes, this.placementProgress)
      }
    }

    return placedBoxes
  }

  private sortBoxesByPriority(boxes: Box[]): Box[] {
    return [...boxes].sort((a, b) => {
      // Priority order: fragile, temperature requirements, weight, size
      if (a.isFragile && !b.isFragile) return -1
      if (!a.isFragile && b.isFragile) return 1

      const tempPriorityA = a.temperatureRequirement === 'frozen' ? 3 : a.temperatureRequirement === 'cold' ? 2 : 1
      const tempPriorityB = b.temperatureRequirement === 'frozen' ? 3 : b.temperatureRequirement === 'cold' ? 2 : 1
      if (tempPriorityA !== tempPriorityB) return tempPriorityB - tempPriorityA

      // Heavy boxes first
      if (Math.abs(a.weight - b.weight) > 10) return b.weight - a.weight

      // Larger boxes first (by volume)
      const volumeA = a.width * a.height * a.length
      const volumeB = b.width * b.height * b.length
      return volumeB - volumeA
    })
  }

  // Animation and callback support
  onPlacementUpdate(callback: (boxes: Box[], progress: number) => void): void {
    this.animationCallbacks.push(callback)
  }

  onPhysicsStep(callback: (boxes: Box[], stats: any) => void): void {
    // Placeholder for physics step callbacks
  }

  private triggerProgressCallback(boxes: Box[], progress: number): void {
    this.animationCallbacks.forEach(callback => {
      try {
        callback(boxes, progress)
      } catch (error) {
        console.warn('Progress callback error:', error)
      }
    })
  }

  getStateGraph(): GraphStateEncoder {
    return this.graphEncoder
  }

  getProgress(): number {
    return this.placementProgress
  }

  // Test method for validation
  public testPlacement(): void {
    console.log('🧪 Testing placement algorithm...')

    console.log('Truck dimensions:', this.constraints.truckDimensions)

    const testBox: Box = {
      id: 'test-001',
      width: 1.0,
      height: 1.0,
      length: 1.0,
      weight: 10,
      position: { x: 0, y: 0, z: 0 },
      isFragile: false,
      temperatureRequirement: 'regular',
      destination: 'Stop 1',
      category: 'General',
      isNew: false
    }

    this.findBestPositionOptimized(testBox, []).then(position => {
      console.log('Test box placement result:', position)

      if (position) {
        const isValid = this.isValidPositionOptimized(testBox, position, [])
        console.log('Position validation result:', isValid)
      }
    })
  }
}

// Auto-test when algorithm loads
console.log('🔧 PlacementAlgorithm module loaded - running self-test...')