
interface GraphNode {
  id: string
  box?: Box
  position?: { x: number; y: number; z: number }
  neighbors: Set<string>
  isAccessible: boolean
  isStable: boolean
  zoneMatch: boolean
  supportedBy: Set<string>
  supporting: Set<string>
}

interface StateGraph {
  nodes: Map<string, GraphNode>
  addNode(node: GraphNode): void
  addEdge(from: string, to: string): void
  annotate(box: Box, position: { x: number; y: number; z: number }): GraphNode
  generateCandidateNodes(truckDimensions: any): GraphNode[]
}

export class GraphStateEncoder implements StateGraph {
  nodes = new Map<string, GraphNode>()

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node)
  }

  addEdge(from: string, to: string): void {
    const fromNode = this.nodes.get(from)
    const toNode = this.nodes.get(to)
    if (fromNode && toNode) {
      fromNode.neighbors.add(to)
      toNode.neighbors.add(from)
    }
  }

  annotate(box: Box, position: { x: number; y: number; z: number }): GraphNode {
    const nodeId = `box_${box.id}_${position.x}_${position.y}_${position.z}`
    
    const node: GraphNode = {
      id: nodeId,
      box,
      position,
      neighbors: new Set(),
      isAccessible: this.checkAccessibility(position),
      isStable: this.checkStability(box, position),
      zoneMatch: this.checkZoneMatch(box, position),
      supportedBy: new Set(),
      supporting: new Set()
    }

    this.addNode(node)
    this.updateRelationships(node)
    return node
  }

  generateCandidateNodes(truckDimensions: any): GraphNode[] {
    const candidates: GraphNode[] = []
    const gridSize = 0.5 // Half-meter grid
    
    for (let x = -truckDimensions.width/2; x <= truckDimensions.width/2; x += gridSize) {
      for (let z = -truckDimensions.length/2; z <= truckDimensions.length/2; z += gridSize) {
        for (let y = 0; y <= truckDimensions.height; y += gridSize) {
          const position = { x, y, z }
          const nodeId = `candidate_${x}_${y}_${z}`
          
          candidates.push({
            id: nodeId,
            position,
            neighbors: new Set(),
            isAccessible: this.checkAccessibility(position),
            isStable: y <= 0.1, // Floor level is stable
            zoneMatch: true, // Will be evaluated per box
            supportedBy: new Set(),
            supporting: new Set()
          })
        }
      }
    }
    
    return candidates
  }

  private checkAccessibility(position: { x: number; y: number; z: number }): boolean {
    // Check if position is accessible from truck opening
    const truckOpening = { x: 0, y: 0, z: 8 } // Assume truck opens at back
    const distance = Math.sqrt(
      Math.pow(position.x - truckOpening.x, 2) +
      Math.pow(position.z - truckOpening.z, 2)
    )
    return distance <= 12 // Within reasonable reach
  }

  private checkStability(box: Box, position: { x: number; y: number; z: number }): boolean {
    if (position.y <= 0.1) return true // On floor
    
    // Check if there's adequate support below
    const supportArea = this.calculateSupportArea(box, position)
    return supportArea >= (box.width * box.length * 0.7) // 70% support required
  }

  private calculateSupportArea(box: Box, position: { x: number; y: number; z: number }): number {
    let supportArea = 0
    
    // Check overlapping boxes below
    for (const [_, node] of this.nodes) {
      if (!node.box || !node.position) continue
      
      const belowBox = node.box
      const belowPos = node.position
      
      if (belowPos.y < position.y - box.height/2 && 
          belowPos.y > position.y - box.height/2 - belowBox.height) {
        
        // Calculate overlap area
        const overlapWidth = Math.max(0, Math.min(
          position.x + box.width/2, belowPos.x + belowBox.width/2
        ) - Math.max(
          position.x - box.width/2, belowPos.x - belowBox.width/2
        ))
        
        const overlapLength = Math.max(0, Math.min(
          position.z + box.length/2, belowPos.z + belowBox.length/2
        ) - Math.max(
          position.z - box.length/2, belowPos.z - belowBox.length/2
        ))
        
        supportArea += overlapWidth * overlapLength
      }
    }
    
    return supportArea
  }

  private checkZoneMatch(box: Box, position: { x: number; y: number; z: number }): boolean {
    // Check temperature zone compatibility
    if (box.temperatureRequirement === 'frozen') {
      return position.x >= 2 && position.x <= 5 && position.z >= -4 && position.z <= -2
    } else if (box.temperatureRequirement === 'cold') {
      return position.x >= -5 && position.x <= -2 && position.z >= -4 && position.z <= -2
    }
    return true // Regular temperature
  }

  private updateRelationships(newNode: GraphNode): void {
    if (!newNode.position || !newNode.box) return
    
    for (const [_, node] of this.nodes) {
      if (node.id === newNode.id || !node.position || !node.box) continue
      
      const distance = Math.sqrt(
        Math.pow(newNode.position.x - node.position.x, 2) +
        Math.pow(newNode.position.y - node.position.y, 2) +
        Math.pow(newNode.position.z - node.position.z, 2)
      )
      
      // Add as neighbors if adjacent
      if (distance <= Math.max(newNode.box.width, newNode.box.height, newNode.box.length) + 0.5) {
        this.addEdge(newNode.id, node.id)
      }
      
      // Check support relationships
      if (Math.abs(newNode.position.y - node.position.y) <= (newNode.box.height + node.box.height)/2 + 0.1) {
        if (newNode.position.y > node.position.y) {
          newNode.supportedBy.add(node.id)
          node.supporting.add(newNode.id)
        } else {
          node.supportedBy.add(newNode.id)
          newNode.supporting.add(node.id)
        }
      }
    }
  }
}
