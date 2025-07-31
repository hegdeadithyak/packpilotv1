
import type { Box } from '@/types/box'
import { GraphStateEncoder, type GraphNode } from './graph-state'

interface MCTSNode {
  graph: GraphStateEncoder
  stateBoxes: Box[]
  remainingBoxes: Box[]
  parent?: MCTSNode
  action?: { box: Box; position: { x: number; y: number; z: number } }
  visits: number
  totalReward: number
  children: MCTSNode[]
  isFullyExpanded: boolean
}

export class MCTSPlacementOptimizer {
  private explorationConstant = Math.sqrt(2)
  private maxIterations = 150 // Reduced for performance
  private maxDepth = 8 // Reduced depth

  constructor(
    private truckDimensions: { width: number; length: number; height: number },
    private constraints: any = {}
  ) {}

  findOptimalPlacement(boxes: Box[], existingBoxes: Box[] = []): Box[] {
    const root = this.buildRootNode(boxes, existingBoxes)
    
    // Adaptive iteration count based on problem size
    const iterations = Math.min(this.maxIterations, Math.max(50, boxes.length * 10))
    
    for (let i = 0; i < iterations; i++) {
      const leaf = this.select(root)
      const expandedNode = this.expand(leaf)
      const reward = this.simulate(expandedNode)
      this.backpropagate(expandedNode, reward)
    }

    // Select best child based on visit count and reward
    const bestChild = root.children.reduce((best, child) => {
      const bestScore = best.visits > 0 ? best.totalReward / best.visits + best.visits * 0.1 : 0
      const childScore = child.visits > 0 ? child.totalReward / child.visits + child.visits * 0.1 : 0
      return childScore > bestScore ? child : best
    }, root.children[0])

    return bestChild ? this.reconstructSolution(bestChild, existingBoxes) : [...existingBoxes, ...boxes]
  }

  private buildRootNode(boxes: Box[], existingBoxes: Box[]): MCTSNode {
    const graph = new GraphStateEncoder()
    
    // Add existing boxes to the graph
    for (const box of existingBoxes) {
      graph.annotate(box, box.position)
    }
    
    return {
      graph,
      stateBoxes: [...existingBoxes], // Include existing boxes in initial state
      remainingBoxes: [...boxes],
      visits: 0,
      totalReward: 0,
      children: [],
      isFullyExpanded: false
    }
  }

  private select(node: MCTSNode): MCTSNode {
    while (node.children.length > 0 && node.isFullyExpanded) {
      node = this.getBestChild(node)
    }
    return node
  }

  private getBestChild(node: MCTSNode): MCTSNode {
    return node.children.reduce((best, child) => {
      const bestUCB = this.calculateUCB(best, node.visits)
      const childUCB = this.calculateUCB(child, node.visits)
      return childUCB > bestUCB ? child : best
    })
  }

  private calculateUCB(node: MCTSNode, parentVisits: number): number {
    if (node.visits === 0) return Infinity
    
    const exploitation = node.totalReward / node.visits
    const exploration = this.explorationConstant * Math.sqrt(Math.log(parentVisits) / node.visits)
    
    return exploitation + exploration
  }

  private expand(node: MCTSNode): MCTSNode {
    if (node.remainingBoxes.length === 0) {
      node.isFullyExpanded = true
      return node
    }

    const nextBox = node.remainingBoxes[0]
    const candidatePositions = this.generateCandidatePositions(node, nextBox)
    
    // Limit candidate positions for performance
    const limitedPositions = candidatePositions.slice(0, 8)
    
    // Create child for first untried position
    for (const position of limitedPositions) {
      const actionKey = `${nextBox.id}_${position.x.toFixed(1)}_${position.y.toFixed(1)}_${position.z.toFixed(1)}`
      const alreadyTried = node.children.some(child => 
        child.action?.box.id === nextBox.id &&
        Math.abs(child.action.position.x - position.x) < 0.2 &&
        Math.abs(child.action.position.y - position.y) < 0.2 &&
        Math.abs(child.action.position.z - position.z) < 0.2
      )
      
      if (!alreadyTried) {
        const childNode = this.createChildNode(node, nextBox, position)
        node.children.push(childNode)
        return childNode
      }
    }
    
    node.isFullyExpanded = true
    return node
  }

  private generateCandidatePositions(node: MCTSNode, box: Box): { x: number; y: number; z: number }[] {
    const positions: { x: number; y: number; z: number }[] = []
    const gridSize = 0.5 // Coarser grid for performance
    
    // Floor positions (higher priority)
    for (let x = -this.truckDimensions.width/2 + box.width/2; 
         x <= this.truckDimensions.width/2 - box.width/2; 
         x += gridSize) {
      for (let z = -this.truckDimensions.length/2 + box.length/2; 
           z <= this.truckDimensions.length/2 - box.length/2; 
           z += gridSize) {
        positions.push({ x, y: box.height/2, z })
      }
    }
    
    // Stack positions (only on boxes that can support)
    for (const placedBox of node.stateBoxes) {
      const stackY = placedBox.position.y + placedBox.height/2 + box.height/2 + 0.05
      
      if (stackY + box.height/2 <= this.truckDimensions.height) {
        // Check if the placed box can support this box (weight and size)
        if (placedBox.weight >= box.weight * 0.5 && // Can support at least half the weight
            placedBox.width >= box.width * 0.7 && // Adequate width support
            placedBox.length >= box.length * 0.7) { // Adequate length support
          
          positions.push({ 
            x: placedBox.position.x, 
            y: stackY, 
            z: placedBox.position.z 
          })
        }
      }
    }
    
    // Filter and sort positions by quality
    return positions
      .filter(pos => this.isValidPosition(node, box, pos))
      .sort((a, b) => this.evaluatePosition(node, box, b) - this.evaluatePosition(node, box, a))
      .slice(0, 12) // Limit to top 12 positions
  }

  private isValidPosition(node: MCTSNode, box: Box, position: { x: number; y: number; z: number }): boolean {
    const tolerance = 0.05
    
    // Check bounds
    if (position.x - box.width/2 < -this.truckDimensions.width/2 + tolerance ||
        position.x + box.width/2 > this.truckDimensions.width/2 - tolerance ||
        position.y - box.height/2 < tolerance ||
        position.y + box.height/2 > this.truckDimensions.height - tolerance ||
        position.z - box.length/2 < -this.truckDimensions.length/2 + tolerance ||
        position.z + box.length/2 > this.truckDimensions.length/2 - tolerance) {
      return false
    }

    // Check collisions with existing boxes
    for (const existingBox of node.stateBoxes) {
      if (this.boxesOverlap(box, position, existingBox, existingBox.position, tolerance)) {
        return false
      }
    }

    // Check zone constraints
    if (box.temperatureRequirement === 'frozen') {
      const inFrozenZone = position.x >= 2 && position.x <= 5 && position.z >= -4 && position.z <= -2
      if (!inFrozenZone) return false
    } else if (box.temperatureRequirement === 'cold') {
      const inColdZone = position.x >= -5 && position.x <= -2 && position.z >= -4 && position.z <= -2
      if (!inColdZone) return false
    }

    // Support check for stacked positions
    if (position.y > box.height/2 + 0.2) {
      const supportArea = this.calculateSupportArea(node, box, position)
      const minSupport = box.isFragile ? 0.8 : 0.6
      if (supportArea < minSupport) return false
    }

    return true
  }

  private boxesOverlap(box1: Box, pos1: { x: number; y: number; z: number }, 
                      box2: Box, pos2: { x: number; y: number; z: number }, tolerance: number = 0): boolean {
    return !(pos1.x + box1.width/2 + tolerance <= pos2.x - box2.width/2 ||
             pos1.x - box1.width/2 >= pos2.x + box2.width/2 + tolerance ||
             pos1.y + box1.height/2 + tolerance <= pos2.y - box2.height/2 ||
             pos1.y - box1.height/2 >= pos2.y + box2.height/2 + tolerance ||
             pos1.z + box1.length/2 + tolerance <= pos2.z - box2.length/2 ||
             pos1.z - box1.length/2 >= pos2.z + box2.length/2 + tolerance)
  }

  private evaluatePosition(node: MCTSNode, box: Box, position: { x: number; y: number; z: number }): number {
    let score = 0
    
    // Prefer lower positions (stability)
    score += (this.truckDimensions.height - position.y) * 8
    
    // Prefer positions with support
    if (position.y > box.height/2 + 0.1) {
      const supportArea = this.calculateSupportArea(node, box, position)
      score += supportArea * 25
    } else {
      score += 15 // Floor placement bonus
    }
    
    // Prefer accessible positions (closer to truck opening)
    const accessDistance = Math.sqrt(position.x**2 + (position.z + this.truckDimensions.length/2)**2)
    score += (15 - Math.min(accessDistance, 15)) * 3
    
    // Temperature zone bonus
    if (box.temperatureRequirement === 'frozen' && 
        position.x >= 2 && position.x <= 5 && position.z >= -4 && position.z <= -2) {
      score += 40
    } else if (box.temperatureRequirement === 'cold' && 
               position.x >= -5 && position.x <= -2 && position.z >= -4 && position.z <= -2) {
      score += 40
    }
    
    // Penalty for lateral offset (better weight distribution)
    score -= Math.abs(position.x) * 1.5
    
    return score
  }

  private calculateSupportArea(node: MCTSNode, box: Box, position: { x: number; y: number; z: number }): number {
    let supportArea = 0
    
    for (const supportBox of node.stateBoxes) {
      const supportPos = supportBox.position
      
      if (Math.abs(supportPos.y + supportBox.height/2 - (position.y - box.height/2)) <= 0.1) {
        const overlapWidth = Math.max(0, Math.min(
          position.x + box.width/2, supportPos.x + supportBox.width/2
        ) - Math.max(
          position.x - box.width/2, supportPos.x - supportBox.width/2
        ))
        
        const overlapLength = Math.max(0, Math.min(
          position.z + box.length/2, supportPos.z + supportBox.length/2
        ) - Math.max(
          position.z - box.length/2, supportPos.z - supportBox.length/2
        ))
        
        supportArea += overlapWidth * overlapLength
      }
    }
    
    return supportArea / (box.width * box.length)
  }

  private createChildNode(parent: MCTSNode, box: Box, position: { x: number; y: number; z: number }): MCTSNode {
    const newGraph = new GraphStateEncoder()
    
    // Copy parent state and add new box
    const newStateBoxes = [...parent.stateBoxes]
    const placedBox = { ...box, position }
    newStateBoxes.push(placedBox)
    
    // Update graph
    for (const stateBox of newStateBoxes) {
      newGraph.annotate(stateBox, stateBox.position)
    }

    return {
      graph: newGraph,
      stateBoxes: newStateBoxes,
      remainingBoxes: parent.remainingBoxes.slice(1),
      parent,
      action: { box, position },
      visits: 0,
      totalReward: 0,
      children: [],
      isFullyExpanded: false
    }
  }

  private simulate(node: MCTSNode): number {
    if (node.remainingBoxes.length === 0) {
      return this.evaluateState(node)
    }

    // Quick rollout using greedy placement
    const simulatedBoxes = [...node.stateBoxes]
    const remainingBoxes = [...node.remainingBoxes]
    let placedCount = 0
    
    while (remainingBoxes.length > 0 && placedCount < this.maxDepth) {
      const box = remainingBoxes.shift()!
      const bestPosition = this.findBestPositionGreedy(simulatedBoxes, box)
      
      if (bestPosition) {
        simulatedBoxes.push({ ...box, position: bestPosition })
        placedCount++
      } else {
        break // Can't place more boxes
      }
    }

    return this.evaluateBoxConfiguration(simulatedBoxes)
  }

  private findBestPositionGreedy(placedBoxes: Box[], box: Box): { x: number; y: number; z: number } | null {
    const mockNode = { stateBoxes: placedBoxes } as MCTSNode
    const candidates = this.generateCandidatePositions(mockNode, box)
    
    if (candidates.length === 0) return null
    
    return candidates.reduce((best, pos) => 
      this.evaluatePosition(mockNode, box, pos) > this.evaluatePosition(mockNode, box, best) ? pos : best
    )
  }

  private evaluateState(node: MCTSNode): number {
    return this.evaluateBoxConfiguration(node.stateBoxes)
  }

  private evaluateBoxConfiguration(boxes: Box[]): number {
    let score = 0
    
    // Placement completion bonus
    score += boxes.length * 10
    
    // Volume utilization
    const totalVolume = boxes.reduce((sum, box) => sum + box.width * box.height * box.length, 0)
    const efficiency = totalVolume / (this.truckDimensions.width * this.truckDimensions.length * this.truckDimensions.height)
    score += efficiency * 500
    
    // Stability score based on center of gravity
    if (boxes.length > 0) {
      const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)
      const centerY = boxes.reduce((sum, box) => sum + box.position.y * box.weight, 0) / totalWeight
      const maxSafeHeight = this.truckDimensions.height * 0.6
      
      if (centerY <= maxSafeHeight) {
        score += 100
      } else {
        score -= (centerY - maxSafeHeight) * 50
      }
    }
    
    // Zone compliance bonus
    for (const box of boxes) {
      if (box.temperatureRequirement === 'frozen' && 
          box.position.x >= 2 && box.position.x <= 5 && 
          box.position.z >= -4 && box.position.z <= -2) {
        score += 50
      } else if (box.temperatureRequirement === 'cold' && 
                 box.position.x >= -5 && box.position.x <= -2 && 
                 box.position.z >= -4 && box.position.z <= -2) {
        score += 50
      }
    }
    
    // Accessibility penalty for boxes that are hard to reach
    for (const box of boxes) {
      const accessDistance = Math.sqrt(box.position.x**2 + (box.position.z + this.truckDimensions.length/2)**2)
      score -= Math.max(0, accessDistance - 10) * 2
    }
    
    return score
  }

  private backpropagate(node: MCTSNode, reward: number): void {
    let current: MCTSNode | undefined = node
    
    while (current) {
      current.visits++
      current.totalReward += reward
      current = current.parent
    }
  }

  private reconstructSolution(node: MCTSNode, existingBoxes: Box[]): Box[] {
    const path: MCTSNode[] = []
    let current: MCTSNode | undefined = node
    
    while (current && current.parent) {
      path.unshift(current)
      current = current.parent
    }
    
    const solution: Box[] = [...existingBoxes] // Start with existing boxes
    for (const pathNode of path) {
      if (pathNode.action) {
        solution.push({
          ...pathNode.action.box,
          position: pathNode.action.position
        })
      }
    }
    
    return solution
  }
}
