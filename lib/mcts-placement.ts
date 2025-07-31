
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
  private maxIterations = 200
  private maxDepth = 10

  constructor(
    private truckDimensions: { width: number; length: number; height: number },
    private constraints: any = {}
  ) {}

  findOptimalPlacement(boxes: Box[]): Box[] {
    const root = this.buildRootNode(boxes)
    
    for (let i = 0; i < this.maxIterations; i++) {
      const leaf = this.select(root)
      const expandedNode = this.expand(leaf)
      const reward = this.simulate(expandedNode)
      this.backpropagate(expandedNode, reward)
    }

    // Select best child based on visit count
    const bestChild = root.children.reduce((best, child) => 
      child.visits > best.visits ? child : best, root.children[0]
    )

    return bestChild ? this.reconstructSolution(bestChild) : boxes
  }

  private buildRootNode(boxes: Box[]): MCTSNode {
    const graph = new GraphStateEncoder()
    
    return {
      graph,
      stateBoxes: [],
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
    
    // Create child for first untried position
    for (const position of candidatePositions) {
      const actionKey = `${nextBox.id}_${position.x}_${position.y}_${position.z}`
      const alreadyTried = node.children.some(child => 
        child.action?.box.id === nextBox.id &&
        child.action?.position.x === position.x &&
        child.action?.position.y === position.y &&
        child.action?.position.z === position.z
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
    const gridSize = 0.5
    
    // Generate positions on floor and on top of existing boxes
    for (let x = -this.truckDimensions.width/2 + box.width/2; 
         x <= this.truckDimensions.width/2 - box.width/2; 
         x += gridSize) {
      for (let z = -this.truckDimensions.length/2 + box.length/2; 
           z <= this.truckDimensions.length/2 - box.length/2; 
           z += gridSize) {
        
        // Floor position
        positions.push({ x, y: box.height/2, z })
        
        // Positions on top of existing boxes
        for (const placedBox of node.stateBoxes) {
          const stackY = placedBox.position.y + placedBox.height/2 + box.height/2
          
          if (stackY + box.height/2 <= this.truckDimensions.height) {
            positions.push({ 
              x: placedBox.position.x, 
              y: stackY, 
              z: placedBox.position.z 
            })
          }
        }
      }
    }
    
    // Filter valid positions
    return positions.filter(pos => this.isValidPosition(node, box, pos))
      .sort((a, b) => this.evaluatePosition(node, box, b) - this.evaluatePosition(node, box, a))
      .slice(0, 10) // Limit to top 10 positions
  }

  private isValidPosition(node: MCTSNode, box: Box, position: { x: number; y: number; z: number }): boolean {
    // Check bounds
    if (position.x - box.width/2 < -this.truckDimensions.width/2 ||
        position.x + box.width/2 > this.truckDimensions.width/2 ||
        position.y - box.height/2 < 0 ||
        position.y + box.height/2 > this.truckDimensions.height ||
        position.z - box.length/2 < -this.truckDimensions.length/2 ||
        position.z + box.length/2 > this.truckDimensions.length/2) {
      return false
    }

    // Check collisions with existing boxes
    for (const existingBox of node.stateBoxes) {
      if (this.boxesOverlap(box, position, existingBox, existingBox.position)) {
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

    return true
  }

  private boxesOverlap(box1: Box, pos1: { x: number; y: number; z: number }, 
                      box2: Box, pos2: { x: number; y: number; z: number }): boolean {
    return !(pos1.x + box1.width/2 <= pos2.x - box2.width/2 ||
             pos1.x - box1.width/2 >= pos2.x + box2.width/2 ||
             pos1.y + box1.height/2 <= pos2.y - box2.height/2 ||
             pos1.y - box1.height/2 >= pos2.y + box2.height/2 ||
             pos1.z + box1.length/2 <= pos2.z - box2.length/2 ||
             pos1.z - box1.length/2 >= pos2.z + box2.length/2)
  }

  private evaluatePosition(node: MCTSNode, box: Box, position: { x: number; y: number; z: number }): number {
    let score = 0
    
    // Prefer lower positions (stability)
    score += (this.truckDimensions.height - position.y) * 10
    
    // Prefer positions with support
    if (position.y > box.height/2 + 0.1) {
      const supportArea = this.calculateSupportArea(node, box, position)
      score += supportArea * 20
    }
    
    // Prefer accessible positions (closer to truck opening)
    const accessDistance = Math.sqrt(position.x**2 + (position.z + this.truckDimensions.length/2)**2)
    score += (20 - accessDistance) * 5
    
    // Temperature zone bonus
    if (box.temperatureRequirement === 'frozen' && 
        position.x >= 2 && position.x <= 5 && position.z >= -4 && position.z <= -2) {
      score += 50
    } else if (box.temperatureRequirement === 'cold' && 
               position.x >= -5 && position.x <= -2 && position.z >= -4 && position.z <= -2) {
      score += 50
    }
    
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
    
    // Copy parent state
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
    
    while (remainingBoxes.length > 0 && simulatedBoxes.length < node.stateBoxes.length + this.maxDepth) {
      const box = remainingBoxes.shift()!
      const bestPosition = this.findBestPositionGreedy(simulatedBoxes, box)
      
      if (bestPosition) {
        simulatedBoxes.push({ ...box, position: bestPosition })
      }
    }

    return this.evaluateBoxConfiguration(simulatedBoxes)
  }

  private findBestPositionGreedy(placedBoxes: Box[], box: Box): { x: number; y: number; z: number } | null {
    const candidates = this.generateCandidatePositions(
      { stateBoxes: placedBoxes, remainingBoxes: [], graph: new GraphStateEncoder() } as MCTSNode, 
      box
    )
    
    if (candidates.length === 0) return null
    
    return candidates.reduce((best, pos) => 
      this.evaluatePosition({ stateBoxes: placedBoxes } as MCTSNode, box, pos) > 
      this.evaluatePosition({ stateBoxes: placedBoxes } as MCTSNode, box, best) ? pos : best
    )
  }

  private evaluateState(node: MCTSNode): number {
    return this.evaluateBoxConfiguration(node.stateBoxes)
  }

  private evaluateBoxConfiguration(boxes: Box[]): number {
    let score = 0
    
    // Volume utilization
    const totalVolume = boxes.reduce((sum, box) => sum + box.width * box.height * box.length, 0)
    const efficiency = totalVolume / (this.truckDimensions.width * this.truckDimensions.length * this.truckDimensions.height)
    score += efficiency * 1000
    
    // Stability score
    let stabilityScore = 100
    for (const box of boxes) {
      if (box.position.y > box.height/2 + 0.1) {
        const supportArea = this.calculateSupportArea(
          { stateBoxes: boxes } as MCTSNode, 
          box, 
          box.position
        )
        if (supportArea < 0.7) {
          stabilityScore -= 20
        }
      }
    }
    score += stabilityScore * 5
    
    // Accessibility penalty for hard-to-reach boxes
    for (const box of boxes) {
      const accessDistance = Math.sqrt(box.position.x**2 + (box.position.z + this.truckDimensions.length/2)**2)
      score -= accessDistance * 2
    }
    
    // Zone compliance bonus
    for (const box of boxes) {
      if (box.temperatureRequirement === 'frozen' && 
          box.position.x >= 2 && box.position.x <= 5 && 
          box.position.z >= -4 && box.position.z <= -2) {
        score += 100
      } else if (box.temperatureRequirement === 'cold' && 
                 box.position.x >= -5 && box.position.x <= -2 && 
                 box.position.z >= -4 && box.position.z <= -2) {
        score += 100
      }
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

  private reconstructSolution(node: MCTSNode): Box[] {
    const path: MCTSNode[] = []
    let current: MCTSNode | undefined = node
    
    while (current && current.parent) {
      path.unshift(current)
      current = current.parent
    }
    
    const solution: Box[] = []
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
