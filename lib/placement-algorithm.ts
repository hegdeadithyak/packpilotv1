
import { PhysicsEngine, BoxPhysicsData } from './physics-engine'
import type { Box } from '@/types/box'

export interface PlacementConstraints {
  truckDimensions: { width: number; length: number; height: number }
  maxWeight: number
  fragileZones: { x: number; y: number; z: number; width: number; height: number; length: number }[]
  temperatureZones: { cold: any; frozen: any; regular: any }
  lifoOrder: boolean
  perishableAreas: { x: number; y: number; z: number; width: number; height: number; length: number }[]
}

export interface PlacementScore {
  stability: number
  accessibility: number
  safety: number
  spaceEfficiency: number
  overall: number
}

export interface PlacementSolution {
  boxes: Box[]
  score: PlacementScore
  physicsStats: any
  metadata: {
    totalWeight: number
    utilization: number
    centerOfGravity: { x: number; y: number; z: number }
    violations: string[]
  }
}

export class PlacementAlgorithm {
  private physicsEngine: PhysicsEngine
  private constraints: PlacementConstraints
  private bestSolutions: PlacementSolution[] = []
  private maxSolutions = 5

  constructor(physicsEngine: PhysicsEngine, constraints: PlacementConstraints) {
    this.physicsEngine = physicsEngine
    this.constraints = constraints
  }

  async findOptimalPlacements(boxes: Box[]): Promise<PlacementSolution[]> {
    this.bestSolutions = []
    
    // Sort boxes by priority (fragile, heavy, large first)
    const sortedBoxes = this.sortBoxesByPriority(boxes)
    
    // Start recursive placement
    await this.recursivePlacement([], sortedBoxes, 0)
    
    return this.bestSolutions.sort((a, b) => b.score.overall - a.score.overall)
  }

  private async recursivePlacement(
    placedBoxes: Box[],
    remainingBoxes: Box[],
    depth: number
  ): Promise<void> {
    // Base case: all boxes placed
    if (remainingBoxes.length === 0) {
      const solution = await this.evaluatePlacement(placedBoxes)
      this.addSolution(solution)
      return
    }

    // Pruning: if current partial solution is worse than best, skip
    if (depth > 0 && this.bestSolutions.length > 0) {
      const partialScore = await this.evaluatePartialPlacement(placedBoxes)
      if (partialScore < this.bestSolutions[0].score.overall * 0.8) {
        return
      }
    }

    const currentBox = remainingBoxes[0]
    const restBoxes = remainingBoxes.slice(1)

    // Try different valid positions for current box
    const validPositions = this.generateValidPositions(currentBox, placedBoxes)
    
    for (const position of validPositions) {
      const boxWithPosition = { ...currentBox, position }
      
      // Check if placement is valid
      if (await this.isValidPlacement(boxWithPosition, placedBoxes)) {
        await this.recursivePlacement(
          [...placedBoxes, boxWithPosition],
          restBoxes,
          depth + 1
        )
      }
    }
  }

  private sortBoxesByPriority(boxes: Box[]): Box[] {
    return boxes.sort((a, b) => {
      // Priority factors
      let scoreA = 0, scoreB = 0
      
      // Fragile items first
      if (a.isFragile) scoreA += 1000
      if (b.isFragile) scoreB += 1000
      
      // Heavy items next
      scoreA += a.weight
      scoreB += b.weight
      
      // Large items next
      const volumeA = a.width * a.height * a.length
      const volumeB = b.width * b.height * b.length
      scoreA += volumeA * 10
      scoreB += volumeB * 10
      
      // Temperature sensitive items
      if (a.temperatureZone === 'frozen') scoreA += 500
      if (b.temperatureZone === 'frozen') scoreB += 500
      if (a.temperatureZone === 'cold') scoreA += 300
      if (b.temperatureZone === 'cold') scoreB += 300
      
      return scoreB - scoreA
    })
  }

  private generateValidPositions(box: Box, placedBoxes: Box[]): { x: number; y: number; z: number }[] {
    const positions: { x: number; y: number; z: number }[] = []
    const { width, length, height } = this.constraints.truckDimensions
    
    // Grid resolution for position sampling
    const resolution = 0.5
    
    // Generate grid positions
    for (let x = -width/2 + box.width/2; x <= width/2 - box.width/2; x += resolution) {
      for (let z = -length/2 + box.length/2; z <= length/2 - box.length/2; z += resolution) {
        for (let y = box.height/2; y <= height - box.height/2; y += resolution) {
          positions.push({ x, y, z })
        }
      }
    }
    
    // Add positions on top of existing boxes
    placedBoxes.forEach(placedBox => {
      if (placedBox.stackLimit && placedBox.stackLimit > 0) {
        const supportY = placedBox.position.y + placedBox.height/2 + box.height/2
        if (supportY <= height - box.height/2) {
          positions.push({
            x: placedBox.position.x,
            y: supportY,
            z: placedBox.position.z
          })
        }
      }
    })
    
    return positions
  }

  private async isValidPlacement(box: Box, placedBoxes: Box[]): Promise<boolean> {
    // Check truck boundaries
    if (!this.isWithinTruckBounds(box)) return false
    
    // Check collision with other boxes
    if (this.hasCollision(box, placedBoxes)) return false
    
    // Check weight constraints
    const totalWeight = placedBoxes.reduce((sum, b) => sum + b.weight, 0) + box.weight
    if (totalWeight > this.constraints.maxWeight) return false
    
    // Check temperature zone compatibility
    if (!this.isTemperatureZoneValid(box)) return false
    
    // Check fragile zone constraints
    if (box.isFragile && !this.isInFragileZone(box)) return false
    
    // Check support requirements
    if (!this.hasAdequateSupport(box, placedBoxes)) return false
    
    // Run physics simulation to check stability
    return await this.isPhysicallyStable(box, placedBoxes)
  }

  private isWithinTruckBounds(box: Box): boolean {
    const { width, length, height } = this.constraints.truckDimensions
    const { x, y, z } = box.position
    
    return (
      x - box.width/2 >= -width/2 &&
      x + box.width/2 <= width/2 &&
      y - box.height/2 >= 0 &&
      y + box.height/2 <= height &&
      z - box.length/2 >= -length/2 &&
      z + box.length/2 <= length/2
    )
  }

  private hasCollision(box: Box, placedBoxes: Box[]): boolean {
    return placedBoxes.some(placedBox => {
      return (
        Math.abs(box.position.x - placedBox.position.x) < (box.width + placedBox.width) / 2 &&
        Math.abs(box.position.y - placedBox.position.y) < (box.height + placedBox.height) / 2 &&
        Math.abs(box.position.z - placedBox.position.z) < (box.length + placedBox.length) / 2
      )
    })
  }

  private isTemperatureZoneValid(box: Box): boolean {
    // Implement temperature zone validation logic
    return true // Simplified for now
  }

  private isInFragileZone(box: Box): boolean {
    // Check if fragile box is in designated fragile zone
    return this.constraints.fragileZones.some(zone => {
      return (
        box.position.x >= zone.x - zone.width/2 &&
        box.position.x <= zone.x + zone.width/2 &&
        box.position.y >= zone.y - zone.height/2 &&
        box.position.y <= zone.y + zone.height/2 &&
        box.position.z >= zone.z - zone.length/2 &&
        box.position.z <= zone.z + zone.length/2
      )
    })
  }

  private hasAdequateSupport(box: Box, placedBoxes: Box[]): boolean {
    // Box on floor is always supported
    if (box.position.y <= box.height/2 + 0.1) return true
    
    // Check if box is supported by other boxes
    const supportingBoxes = placedBoxes.filter(placedBox => {
      const verticalGap = box.position.y - box.height/2 - (placedBox.position.y + placedBox.height/2)
      const horizontalOverlap = (
        Math.abs(box.position.x - placedBox.position.x) < (box.width + placedBox.width) / 2 &&
        Math.abs(box.position.z - placedBox.position.z) < (box.length + placedBox.length) / 2
      )
      
      return verticalGap < 0.1 && verticalGap > -0.1 && horizontalOverlap
    })
    
    // Calculate support area
    const totalSupportArea = supportingBoxes.reduce((area, supportBox) => {
      const overlapWidth = Math.max(0, Math.min(
        box.position.x + box.width/2,
        supportBox.position.x + supportBox.width/2
      ) - Math.max(
        box.position.x - box.width/2,
        supportBox.position.x - supportBox.width/2
      ))
      
      const overlapLength = Math.max(0, Math.min(
        box.position.z + box.length/2,
        supportBox.position.z + supportBox.length/2
      ) - Math.max(
        box.position.z - box.length/2,
        supportBox.position.z - supportBox.length/2
      ))
      
      return area + overlapWidth * overlapLength
    }, 0)
    
    const boxArea = box.width * box.length
    return totalSupportArea >= boxArea * 0.7 // 70% support required
  }

  private async isPhysicallyStable(box: Box, placedBoxes: Box[]): Promise<boolean> {
    // Create temporary physics simulation
    const tempEngine = new PhysicsEngine()
    await tempEngine.initialize()
    tempEngine.createTruckContainer(this.constraints.truckDimensions)
    
    // Add all placed boxes
    placedBoxes.forEach(placedBox => tempEngine.addBox(placedBox))
    
    // Add new box
    tempEngine.addBox(box)
    
    // Run simulation for a few steps
    let stable = true
    for (let i = 0; i < 60; i++) { // 1 second at 60fps
      const stats = tempEngine.step(1/60)
      if (stats.stability < 50) {
        stable = false
        break
      }
    }
    
    tempEngine.destroy()
    return stable
  }

  private async evaluatePlacement(boxes: Box[]): Promise<PlacementSolution> {
    // Run full physics simulation
    const tempEngine = new PhysicsEngine()
    await tempEngine.initialize()
    tempEngine.createTruckContainer(this.constraints.truckDimensions)
    
    boxes.forEach(box => tempEngine.addBox(box))
    
    // Simulate different force scenarios
    const scenarios = [
      { acceleration: 0.3, braking: 0.6, turning: 0.4, gravity: 1.0 },
      { acceleration: 0.6, braking: 1.2, turning: 0.8, gravity: 1.0 },
      { acceleration: 0.8, braking: 1.5, turning: 1.0, gravity: 1.0 }
    ]
    
    let totalStability = 0
    let physicsStats: any = {}
    
    for (const forces of scenarios) {
      tempEngine.applyForces(forces)
      for (let i = 0; i < 120; i++) { // 2 seconds simulation
        const stats = tempEngine.step(1/60)
        totalStability += stats.stability
        physicsStats = stats
      }
    }
    
    const avgStability = totalStability / (scenarios.length * 120)
    
    // Calculate scores
    const score = this.calculatePlacementScore(boxes, avgStability)
    
    // Calculate metadata
    const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)
    const utilization = this.calculateSpaceUtilization(boxes)
    const centerOfGravity = this.calculateCenterOfGravity(boxes)
    
    tempEngine.destroy()
    
    return {
      boxes,
      score,
      physicsStats,
      metadata: {
        totalWeight,
        utilization,
        centerOfGravity,
        violations: []
      }
    }
  }

  private async evaluatePartialPlacement(boxes: Box[]): Promise<number> {
    if (boxes.length === 0) return 0
    
    const stability = 80 // Simplified estimation
    const spaceEff = this.calculateSpaceUtilization(boxes)
    return (stability + spaceEff) / 2
  }

  private calculatePlacementScore(boxes: Box[], stability: number): PlacementScore {
    const spaceEfficiency = this.calculateSpaceUtilization(boxes)
    const accessibility = this.calculateAccessibility(boxes)
    const safety = this.calculateSafety(boxes)
    
    const overall = (stability * 0.3 + spaceEfficiency * 0.25 + accessibility * 0.25 + safety * 0.2)
    
    return {
      stability,
      accessibility,
      safety,
      spaceEfficiency,
      overall
    }
  }

  private calculateSpaceUtilization(boxes: Box[]): number {
    const totalBoxVolume = boxes.reduce((vol, box) => 
      vol + box.width * box.height * box.length, 0)
    const truckVolume = this.constraints.truckDimensions.width * 
                       this.constraints.truckDimensions.height * 
                       this.constraints.truckDimensions.length
    return (totalBoxVolume / truckVolume) * 100
  }

  private calculateAccessibility(boxes: Box[]): number {
    // Simple accessibility score based on LIFO constraints
    let score = 100
    if (this.constraints.lifoOrder) {
      // Check if boxes can be unloaded in reverse order
      boxes.forEach((box, index) => {
        const blockedBy = boxes.slice(index + 1).filter(laterBox =>
          this.blocksAccess(box, laterBox))
        score -= blockedBy.length * 5
      })
    }
    return Math.max(0, score)
  }

  private calculateSafety(boxes: Box[]): number {
    let score = 100
    
    // Check fragile item safety
    boxes.forEach(box => {
      if (box.isFragile) {
        const boxesAbove = boxes.filter(otherBox =>
          otherBox.position.y > box.position.y &&
          Math.abs(otherBox.position.x - box.position.x) < box.width &&
          Math.abs(otherBox.position.z - box.position.z) < box.length
        )
        score -= boxesAbove.length * 10
      }
    })
    
    return Math.max(0, score)
  }

  private calculateCenterOfGravity(boxes: Box[]): { x: number; y: number; z: number } {
    const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)
    
    if (totalWeight === 0) return { x: 0, y: 0, z: 0 }
    
    return {
      x: boxes.reduce((sum, box) => sum + box.position.x * box.weight, 0) / totalWeight,
      y: boxes.reduce((sum, box) => sum + box.position.y * box.weight, 0) / totalWeight,
      z: boxes.reduce((sum, box) => sum + box.position.z * box.weight, 0) / totalWeight
    }
  }

  private blocksAccess(targetBox: Box, blockingBox: Box): boolean {
    // Simplified blocking check - box blocks if it's closer to truck opening
    return blockingBox.position.z > targetBox.position.z &&
           Math.abs(blockingBox.position.x - targetBox.position.x) < targetBox.width &&
           Math.abs(blockingBox.position.y - targetBox.position.y) < targetBox.height
  }

  private addSolution(solution: PlacementSolution): void {
    this.bestSolutions.push(solution)
    this.bestSolutions.sort((a, b) => b.score.overall - a.score.overall)
    
    if (this.bestSolutions.length > this.maxSolutions) {
      this.bestSolutions = this.bestSolutions.slice(0, this.maxSolutions)
    }
  }
}
