// Enhanced 3D Box Placement Algorithm
"use client"

import type { Box } from "@/types/box"

// Position candidate for box placement
interface PlacementCandidate {
  position: { x: number; y: number; z: number }
  score: number
  supportingBoxes: string[]
  placementType: 'floor' | 'stacked' | 'adjacent'
}

// Placement constraints and preferences
interface PlacementConstraints {
  truckDimensions: { width: number; length: number; height: number }
  maxWeight: number
  temperatureZones: {
    cold: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
    frozen: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
    regular: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
  }
  fragileZones: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
  lifoOrder: boolean
  perishableAreas: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
}

// Advanced 3D Box Placement Engine
export class Advanced3DPlacementEngine {
  private constraints: PlacementConstraints
  private placementGrid: Map<string, boolean> = new Map()
  private readonly PLACEMENT_PRECISION = 0.25 // 25cm grid precision
  private readonly MIN_SUPPORT_OVERLAP = 0.7 // 70% overlap required for stacking
  private readonly STABILITY_FACTOR = 0.8 // Weight distribution factor

  constructor(constraints: PlacementConstraints) {
    this.constraints = constraints
    this.initializeGrid()
  }

  private initializeGrid(): void {
    // Initialize 3D occupation grid for fast collision detection
    this.placementGrid.clear()
    const { width, length, height } = this.constraints.truckDimensions
    
    for (let x = -width/2; x <= width/2; x += this.PLACEMENT_PRECISION) {
      for (let y = 0; y <= height; y += this.PLACEMENT_PRECISION) {
        for (let z = -length/2; z <= length/2; z += this.PLACEMENT_PRECISION) {
          this.placementGrid.set(this.getGridKey(x, y, z), false)
        }
      }
    }
  }

  private getGridKey(x: number, y: number, z: number): string {
    const gx = Math.round(x / this.PLACEMENT_PRECISION)
    const gy = Math.round(y / this.PLACEMENT_PRECISION)
    const gz = Math.round(z / this.PLACEMENT_PRECISION)
    return `${gx},${gy},${gz}`
  }

  private markBoxOccupied(box: Box, occupied: boolean): void {
    const { x, y, z } = box.position
    const { width, height, length } = box
    
    for (let dx = -width/2; dx <= width/2; dx += this.PLACEMENT_PRECISION) {
      for (let dy = -height/2; dy <= height/2; dy += this.PLACEMENT_PRECISION) {
        for (let dz = -length/2; dz <= length/2; dz += this.PLACEMENT_PRECISION) {
          const key = this.getGridKey(x + dx, y + dy, z + dz)
          this.placementGrid.set(key, occupied)
        }
      }
    }
  }

  /**
   * Find optimal placement for a single box among existing boxes
   */
  public findOptimalPlacement(newBox: Box, existingBoxes: Box[]): { x: number; y: number; z: number } | null {
    // Update grid with existing boxes
    this.initializeGrid()
    existingBoxes.forEach(box => this.markBoxOccupied(box, true))

    const candidates = this.generatePlacementCandidates(newBox, existingBoxes)
    if (candidates.length === 0) {
      console.warn('No valid placement found for box:', newBox.id)
      return this.findFallbackPosition(newBox, existingBoxes)
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score)
    return candidates[0].position
  }

  /**
   * Generate all possible placement candidates for a box
   */
  private generatePlacementCandidates(newBox: Box, existingBoxes: Box[]): PlacementCandidate[] {
    const candidates: PlacementCandidate[] = []

    // 1. Floor placement candidates
    candidates.push(...this.generateFloorCandidates(newBox, existingBoxes))

    // 2. Stacked placement candidates
    candidates.push(...this.generateStackedCandidates(newBox, existingBoxes))

    // 3. Adjacent placement candidates
    candidates.push(...this.generateAdjacentCandidates(newBox, existingBoxes))

    return candidates.filter(candidate => 
      this.isValidPlacement(newBox, candidate.position, existingBoxes)
    )
  }

  /**
   * Generate floor-level placement candidates
   */
  private generateFloorCandidates(newBox: Box, existingBoxes: Box[]): PlacementCandidate[] {
    const candidates: PlacementCandidate[] = []
    const { width, length } = this.constraints.truckDimensions
    const step = Math.max(newBox.width, newBox.length) / 4 // Adaptive step size

    for (let x = -width/2 + newBox.width/2; x <= width/2 - newBox.width/2; x += step) {
      for (let z = -length/2 + newBox.length/2; z <= length/2 - newBox.length/2; z += step) {
        const position = { x, y: newBox.height/2, z }
        
        if (this.isPositionFree(newBox, position, existingBoxes)) {
          const score = this.evaluateFloorPosition(newBox, position, existingBoxes)
          candidates.push({
            position,
            score,
            supportingBoxes: [],
            placementType: 'floor'
          })
        }
      }
    }

    return candidates
  }

  /**
   * Generate stacked placement candidates (on top of existing boxes)
   */
  private generateStackedCandidates(newBox: Box, existingBoxes: Box[]): PlacementCandidate[] {
    const candidates: PlacementCandidate[] = []

    existingBoxes.forEach(supportBox => {
      if (!this.canStackOn(newBox, supportBox)) return

      // Generate positions on top of the support box
      const supportTop = supportBox.position.y + supportBox.height/2
      const newBoxY = supportTop + newBox.height/2

      // Check if stacked box fits within truck height
      if (newBoxY + newBox.height/2 > this.constraints.truckDimensions.height) return

      // Generate multiple positions on the support box surface
      const step = Math.min(supportBox.width, supportBox.length) / 3
      
      for (let dx = -supportBox.width/2 + newBox.width/2; dx <= supportBox.width/2 - newBox.width/2; dx += step) {
        for (let dz = -supportBox.length/2 + newBox.length/2; dz <= supportBox.length/2 - newBox.length/2; dz += step) {
          const position = {
            x: supportBox.position.x + dx,
            y: newBoxY,
            z: supportBox.position.z + dz
          }

          if (this.isPositionFree(newBox, position, existingBoxes)) {
            const overlapRatio = this.calculateSupportOverlap(newBox, position, supportBox)
            if (overlapRatio >= this.MIN_SUPPORT_OVERLAP) {
              const score = this.evaluateStackedPosition(newBox, position, supportBox, existingBoxes)
              candidates.push({
                position,
                score,
                supportingBoxes: [supportBox.id],
                placementType: 'stacked'
              })
            }
          }
        }
      }
    })

    return candidates
  }

  /**
   * Generate adjacent placement candidates (next to existing boxes)
   */
  private generateAdjacentCandidates(newBox: Box, existingBoxes: Box[]): PlacementCandidate[] {
    const candidates: PlacementCandidate[] = []

    existingBoxes.forEach(adjacentBox => {
      // Generate positions adjacent to each face of the existing box
      const positions = this.getAdjacentPositions(newBox, adjacentBox)
      
      positions.forEach(position => {
        if (this.isPositionFree(newBox, position, existingBoxes)) {
          const score = this.evaluateAdjacentPosition(newBox, position, adjacentBox, existingBoxes)
          candidates.push({
            position,
            score,
            supportingBoxes: [],
            placementType: 'adjacent'
          })
        }
      })
    })

    return candidates
  }

  /**
   * Get positions adjacent to all faces of a box
   */
  private getAdjacentPositions(newBox: Box, existingBox: Box): { x: number; y: number; z: number }[] {
    const positions = []
    const { x, y, z } = existingBox.position
    const gap = 0.1 // Small gap to prevent collisions

    // Left side
    positions.push({
      x: x - existingBox.width/2 - newBox.width/2 - gap,
      y: newBox.height/2,
      z: z
    })

    // Right side
    positions.push({
      x: x + existingBox.width/2 + newBox.width/2 + gap,
      y: newBox.height/2,
      z: z
    })

    // Front side
    positions.push({
      x: x,
      y: newBox.height/2,
      z: z - existingBox.length/2 - newBox.length/2 - gap
    })

    // Back side
    positions.push({
      x: x,
      y: newBox.height/2,
      z: z + existingBox.length/2 + newBox.length/2 + gap
    })

    return positions.filter(pos => this.isWithinTruckBounds(newBox, pos))
  }

  /**
   * Check if a box can be stacked on another
   */
  private canStackOn(topBox: Box, bottomBox: Box): boolean {
    // Weight constraint
    if (topBox.weight > bottomBox.weight * 1.5) return false
    
    // Fragility constraint
    if (bottomBox.isFragile && topBox.weight > bottomBox.weight * 0.5) return false
    
    // Size constraint (top box shouldn't be much larger)
    const topArea = topBox.width * topBox.length
    const bottomArea = bottomBox.width * bottomBox.length
    if (topArea > bottomArea * 1.2) return false

    return true
  }

  /**
   * Calculate overlap ratio between stacked boxes
   */
  private calculateSupportOverlap(topBox: Box, topPosition: { x: number; y: number; z: number }, bottomBox: Box): number {
    const topLeft = topPosition.x - topBox.width/2
    const topRight = topPosition.x + topBox.width/2
    const topFront = topPosition.z - topBox.length/2
    const topBack = topPosition.z + topBox.length/2

    const bottomLeft = bottomBox.position.x - bottomBox.width/2
    const bottomRight = bottomBox.position.x + bottomBox.width/2
    const bottomFront = bottomBox.position.z - bottomBox.length/2
    const bottomBack = bottomBox.position.z + bottomBox.length/2

    const overlapWidth = Math.max(0, Math.min(topRight, bottomRight) - Math.max(topLeft, bottomLeft))
    const overlapLength = Math.max(0, Math.min(topBack, bottomBack) - Math.max(topFront, bottomFront))
    const overlapArea = overlapWidth * overlapLength
    const topBoxArea = topBox.width * topBox.length

    return overlapArea / topBoxArea
  }

  /**
   * Validate if a position is free of collisions
   */
  private isPositionFree(box: Box, position: { x: number; y: number; z: number }, existingBoxes: Box[]): boolean {
    if (!this.isWithinTruckBounds(box, position)) return false

    const testBox = { ...box, position }
    return !existingBoxes.some(existingBox => this.isBoxColliding(testBox, existingBox))
  }

  /**
   * Check if position is within truck boundaries
   */
  private isWithinTruckBounds(box: Box, position: { x: number; y: number; z: number }): boolean {
    const { width, length, height } = this.constraints.truckDimensions
    
    return (
      position.x - box.width/2 >= -width/2 &&
      position.x + box.width/2 <= width/2 &&
      position.y - box.height/2 >= 0 &&
      position.y + box.height/2 <= height &&
      position.z - box.length/2 >= -length/2 &&
      position.z + box.length/2 <= length/2
    )
  }

  /**
   * Check if two boxes are colliding
   */
  private isBoxColliding(box1: Box, box2: Box): boolean {
    const dx = Math.abs(box1.position.x - box2.position.x)
    const dy = Math.abs(box1.position.y - box2.position.y)
    const dz = Math.abs(box1.position.z - box2.position.z)

    const minDistanceX = (box1.width + box2.width) / 2
    const minDistanceY = (box1.height + box2.height) / 2
    const minDistanceZ = (box1.length + box2.length) / 2

    return dx < minDistanceX && dy < minDistanceY && dz < minDistanceZ
  }

  /**
   * Evaluate floor position score
   */
  private evaluateFloorPosition(box: Box, position: { x: number; y: number; z: number }, existingBoxes: Box[]): number {
    let score = 1000

    // Prefer positions closer to existing boxes (packing density)
    const nearbyBoxes = existingBoxes.filter(existingBox => {
      const distance = this.getDistance(position, existingBox.position)
      return distance < 5 // Within 5 units
    })
    score += nearbyBoxes.length * 100

    // Weight distribution (prefer heavier boxes on bottom)
    score += box.weight * 2

    // LIFO order (destination-based positioning)
    score += this.getDestinationScore(box, position)

    // Temperature zone compliance
    score += this.getTemperatureZoneScore(box, position)

    // Prefer positions closer to truck center for stability
    const centerDistance = Math.abs(position.x)
    score -= centerDistance * 10

    return score
  }

  /**
   * Evaluate stacked position score
   */
  private evaluateStackedPosition(box: Box, position: { x: number; y: number; z: number }, supportBox: Box, existingBoxes: Box[]): number {
    let score = 800 // Base score for stacking

    // Stability bonus for good weight distribution
    if (box.weight <= supportBox.weight) {
      score += 200
    }

    // Fragility penalty
    if (box.isFragile) {
      score -= 150
    }

    // Support quality
    const overlapRatio = this.calculateSupportOverlap(box, position, supportBox)
    score += overlapRatio * 300

    // Height penalty (prefer lower stacking)
    score -= position.y * 5

    // LIFO and temperature zone compliance
    score += this.getDestinationScore(box, position)
    score += this.getTemperatureZoneScore(box, position)

    return score
  }

  /**
   * Evaluate adjacent position score
   */
  private evaluateAdjacentPosition(box: Box, position: { x: number; y: number; z: number }, adjacentBox: Box, existingBoxes: Box[]): number {
    let score = 600 // Base score for adjacent placement

    // Prefer grouping similar boxes
    if (box.temperatureZone === adjacentBox.temperatureZone) {
      score += 150
    }

    if (box.destination === adjacentBox.destination) {
      score += 100
    }

    // Size compatibility
    const sizeDifference = Math.abs(box.height - adjacentBox.height)
    score -= sizeDifference * 10

    // LIFO and temperature zone compliance
    score += this.getDestinationScore(box, position)
    score += this.getTemperatureZoneScore(box, position)

    return score
  }

  /**
   * Get destination-based score for LIFO order
   */
  private getDestinationScore(box: Box, position: { x: number; y: number; z: number }): number {
    if (!this.constraints.lifoOrder) return 0

    const stopOrder = { "Stop 4": 0, "Stop 3": 1, "Stop 2": 2, "Stop 1": 3 }
    const boxStopOrder = stopOrder[box.destination as keyof typeof stopOrder] || 4
    
    // Earlier stops should be closer to the back (positive z)
    const idealZ = (boxStopOrder / 3) * this.constraints.truckDimensions.length - this.constraints.truckDimensions.length/2
    const distanceFromIdeal = Math.abs(position.z - idealZ)
    
    return Math.max(0, 100 - distanceFromIdeal * 10)
  }

  /**
   * Get temperature zone compliance score
   */
  private getTemperatureZoneScore(box: Box, position: { x: number; y: number; z: number }): number {
    const zones = this.constraints.temperatureZones[box.temperatureZone as keyof typeof this.constraints.temperatureZones]
    if (!zones || zones.length === 0) return 0

    // Check if position is within any designated zone
    for (const zone of zones) {
      if (this.isPositionInZone(position, zone)) {
        return 200
      }
    }

    // Penalty for being outside designated zone
    return -100
  }

  /**
   * Check if position is within a zone
   */
  private isPositionInZone(position: { x: number; y: number; z: number }, zone: { x: number; y: number; z: number; width: number; height: number; length: number }): boolean {
    return (
      position.x >= zone.x - zone.width/2 && position.x <= zone.x + zone.width/2 &&
      position.y >= zone.y - zone.height/2 && position.y <= zone.y + zone.height/2 &&
      position.z >= zone.z - zone.length/2 && position.z <= zone.z + zone.length/2
    )
  }

  /**
   * Calculate 3D distance between two positions
   */
  private getDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const dz = pos1.z - pos2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  /**
   * Validate if placement meets all constraints
   */
  private isValidPlacement(box: Box, position: { x: number; y: number; z: number }, existingBoxes: Box[]): boolean {
    // Check basic collision and bounds
    if (!this.isPositionFree(box, position, existingBoxes)) return false

    // Check weight constraints
    const totalWeight = existingBoxes.reduce((sum, b) => sum + b.weight, 0) + box.weight
    if (totalWeight > this.constraints.maxWeight) return false

    // Check if box needs support and has it
    if (position.y > box.height/2 + 0.1) {
      const hasSupport = existingBoxes.some(supportBox => {
        const supportTop = supportBox.position.y + supportBox.height/2
        const boxBottom = position.y - box.height/2
        return Math.abs(supportTop - boxBottom) < 0.1 && this.calculateSupportOverlap(box, position, supportBox) >= this.MIN_SUPPORT_OVERLAP
      })
      if (!hasSupport) return false
    }

    return true
  }

  /**
   * Find fallback position when no optimal placement is found
   */
  private findFallbackPosition(box: Box, existingBoxes: Box[]): { x: number; y: number; z: number } | null {
    // Try simple grid-based placement as fallback
    const step = 1.0
    const { width, length } = this.constraints.truckDimensions

    for (let x = -width/2 + box.width/2; x <= width/2 - box.width/2; x += step) {
      for (let z = -length/2 + box.length/2; z <= length/2 - box.length/2; z += step) {
        const position = { x, y: box.height/2, z }
        if (this.isPositionFree(box, position, existingBoxes)) {
          return position
        }
      }
    }

    console.error('No fallback position found for box:', box.id)
    return null
  }

  /**
   * Optimize entire truck layout using advanced algorithms
   */
  public optimizeCompleteLayout(boxes: Box[]): Box[] {
    if (boxes.length === 0) return []

    // Sort boxes for optimal placement order
    const sortedBoxes = this.sortBoxesForOptimalPlacement([...boxes])
    const optimizedBoxes: Box[] = []

    // Place each box using the optimal algorithm
    for (const box of sortedBoxes) {
      const optimalPosition = this.findOptimalPlacement(box, optimizedBoxes)
      if (optimalPosition) {
        const placedBox = { ...box, position: optimalPosition }
        optimizedBoxes.push(placedBox)
        this.markBoxOccupied(placedBox, true)
      } else {
        // Keep original position if no better placement found
        optimizedBoxes.push(box)
      }
    }

    return optimizedBoxes
  }

  /**
   * Sort boxes for optimal placement order
   */
  private sortBoxesForOptimalPlacement(boxes: Box[]): Box[] {
    return boxes.sort((a, b) => {
      // 1. LIFO order (destination priority)
      const stopOrder = { "Stop 4": 0, "Stop 3": 1, "Stop 2": 2, "Stop 1": 3 }
      const aStop = stopOrder[a.destination as keyof typeof stopOrder] || 4
      const bStop = stopOrder[b.destination as keyof typeof stopOrder] || 4
      if (aStop !== bStop) return aStop - bStop

      // 2. Heavy before light (stability)
      if (Math.abs(a.weight - b.weight) > 50) return b.weight - a.weight

      // 3. Large before small (base layer)
      const aVolume = a.width * a.height * a.length
      const bVolume = b.width * b.height * b.length
      if (Math.abs(aVolume - bVolume) > 1) return bVolume - aVolume

      // 4. Non-fragile before fragile
      if (a.isFragile !== b.isFragile) return a.isFragile ? 1 : -1

      // 5. Temperature zone grouping
      const tempOrder = { "frozen": 0, "cold": 1, "regular": 2 }
      const aTemp = tempOrder[a.temperatureZone as keyof typeof tempOrder] || 3
      const bTemp = tempOrder[b.temperatureZone as keyof typeof tempOrder] || 3
      return aTemp - bTemp
    })
  }
}