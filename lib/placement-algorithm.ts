
import { PhysicsEngine, BoxPhysicsData } from './physics-engine'
import type { Box } from '../types/box'

export interface PlacementConstraints {
  truckDimensions: { width: number; length: number; height: number }
  maxWeight: number
  fragileZones: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>
  temperatureZones: {
    cold: { x: number; y: number; z: number; width: number; height: number; length: number }[]
    frozen: { x: number; y: number; z: number; width: number; height: number; length: number }[]
    regular: { x: number; y: number; z: number; width: number; height: number; length: number }[]
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

export class PlacementAlgorithm {
  private physicsEngine: PhysicsEngine
  private constraints: PlacementConstraints
  private stateHistory: PlacementState[] = []
  private transitionMatrix: Map<string, StateTransition[]> = new Map()
  private explorationRate = 0.3
  private discountFactor = 0.95

  constructor(physicsEngine: PhysicsEngine, constraints: PlacementConstraints) {
    this.physicsEngine = physicsEngine
    this.constraints = constraints
  }

  async findOptimalPlacements(boxes: Box[], maxIterations = 1000): Promise<PlacementState[]> {
    const solutions: PlacementState[] = []
    let currentState = this.initializeState()
    
    // Monte Carlo rollouts with Markov Chain transitions
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const rolloutResult = await this.performMonteCarloRollout(currentState, boxes)
      
      if (rolloutResult.score > (currentState.score || 0)) {
        currentState = rolloutResult
        solutions.push({ ...currentState })
        
        // Update transition probabilities based on success
        this.updateTransitionProbabilities(rolloutResult)
      }
      
      // Decay exploration rate
      this.explorationRate = Math.max(0.1, this.explorationRate * 0.995)
    }

    return solutions.sort((a, b) => b.score - a.score).slice(0, 10) // Top 10 solutions
  }

  private async performMonteCarloRollout(
    initialState: PlacementState, 
    remainingBoxes: Box[], 
    maxSteps = 20
  ): Promise<PlacementState> {
    let currentState = { ...initialState }
    let steps = 0
    
    for (const box of remainingBoxes.slice(0, maxSteps)) {
      const candidatePositions = this.generateCandidatePositions(box, currentState)
      const bestTransition = await this.selectBestTransition(currentState, box, candidatePositions)
      
      if (bestTransition) {
        currentState = bestTransition.toState
        this.recordTransition(bestTransition)
        steps++
      }
    }
    
    // Final scoring with physics validation
    const finalScore = await this.evaluateStateWithPhysics(currentState)
    currentState.score = finalScore
    
    return currentState
  }

  private async selectBestTransition(
    currentState: PlacementState, 
    box: Box, 
    candidatePositions: Array<{ x: number; y: number; z: number }>
  ): Promise<StateTransition | null> {
    const transitions: StateTransition[] = []
    
    for (const position of candidatePositions) {
      // Check cold storage constraints
      if (this.violatesColdStorageConstraints(box, position)) {
        continue
      }
      
      const newState = this.createStateWithBoxPlacement(currentState, box, position)
      const reward = await this.calculateReward(currentState, newState, box, position)
      const probability = this.calculateTransitionProbability(currentState, newState, box, position)
      
      transitions.push({
        fromState: currentState,
        toState: newState,
        action: { boxId: box.id, position },
        probability,
        reward
      })
    }
    
    // Epsilon-greedy selection with exploration
    if (Math.random() < this.explorationRate) {
      // Exploration: random selection
      return transitions[Math.floor(Math.random() * transitions.length)] || null
    } else {
      // Exploitation: best reward
      return transitions.reduce((best, current) => 
        current.reward > best.reward ? current : best
      ) || null
    }
  }

  private violatesColdStorageConstraints(box: Box, position: { x: number; y: number; z: number }): boolean {
    const { frozen, cold } = this.constraints.temperatureZones
    
    // Check frozen zones
    for (const zone of frozen) {
      if (this.boxIntersectsZone(box, position, zone)) {
        return true
      }
    }
    
    // Check cold zones for non-cold boxes
    if (box.temperatureRequirement !== 'cold' && box.temperatureRequirement !== 'frozen') {
      for (const zone of cold) {
        if (this.boxIntersectsZone(box, position, zone)) {
          return true
        }
      }
    }
    
    return false
  }

  private boxIntersectsZone(
    box: Box, 
    position: { x: number; y: number; z: number }, 
    zone: { x: number; y: number; z: number; width: number; height: number; length: number }
  ): boolean {
    return !(
      position.x + box.width / 2 <= zone.x - zone.width / 2 ||
      position.x - box.width / 2 >= zone.x + zone.width / 2 ||
      position.y + box.height / 2 <= zone.y - zone.height / 2 ||
      position.y - box.height / 2 >= zone.y + zone.height / 2 ||
      position.z + box.length / 2 <= zone.z - zone.length / 2 ||
      position.z - box.length / 2 >= zone.z + zone.length / 2
    )
  }

  private generateCandidatePositions(box: Box, state: PlacementState): Array<{ x: number; y: number; z: number }> {
    const positions: Array<{ x: number; y: number; z: number }> = []
    const { width, length, height } = this.constraints.truckDimensions
    const stepSize = 0.5
    
    // Grid-based position generation with physics-aware placement
    for (let x = -width/2 + box.width/2; x <= width/2 - box.width/2; x += stepSize) {
      for (let z = -length/2 + box.length/2; z <= length/2 - box.length/2; z += stepSize) {
        for (let y = box.height/2; y <= height - box.height/2; y += stepSize) {
          if (this.isValidPosition(box, { x, y, z }, state)) {
            positions.push({ x, y, z })
          }
        }
      }
    }
    
    return positions
  }

  private isValidPosition(box: Box, position: { x: number; y: number; z: number }, state: PlacementState): boolean {
    // Check collision with existing boxes
    for (const existingBox of state.boxes) {
      if (this.boxesCollide(box, position, existingBox, existingBox.position)) {
        return false
      }
    }
    
    // Check truck boundaries
    const { width, length, height } = this.constraints.truckDimensions
    if (
      position.x - box.width/2 < -width/2 || position.x + box.width/2 > width/2 ||
      position.y - box.height/2 < 0 || position.y + box.height/2 > height ||
      position.z - box.length/2 < -length/2 || position.z + box.length/2 > length/2
    ) {
      return false
    }
    
    return true
  }

  private boxesCollide(
    box1: Box, 
    pos1: { x: number; y: number; z: number },
    box2: Box, 
    pos2: { x: number; y: number; z: number }
  ): boolean {
    return !(
      pos1.x + box1.width/2 <= pos2.x - box2.width/2 ||
      pos1.x - box1.width/2 >= pos2.x + box2.width/2 ||
      pos1.y + box1.height/2 <= pos2.y - box2.height/2 ||
      pos1.y - box1.height/2 >= pos2.y + box2.height/2 ||
      pos1.z + box1.length/2 <= pos2.z - box2.length/2 ||
      pos1.z - box1.length/2 >= pos2.z + box2.length/2
    )
  }

  private calculateTransitionProbability(
    fromState: PlacementState,
    toState: PlacementState,
    box: Box,
    position: { x: number; y: number; z: number }
  ): number {
    let probability = 0.5 // Base probability
    
    // Increase probability based on stability
    if (toState.stabilityScore > fromState.stabilityScore) {
      probability += 0.3
    }
    
    // Decrease probability for risky placements
    if (position.y > this.constraints.truckDimensions.height * 0.7) {
      probability -= 0.2 // High placement penalty
    }
    
    // Increase probability for good support
    const supportScore = this.calculateSupportScore(box, position, fromState)
    probability += supportScore * 0.2
    
    return Math.max(0.1, Math.min(0.9, probability))
  }

  private async calculateReward(
    fromState: PlacementState,
    toState: PlacementState,
    box: Box,
    position: { x: number; y: number; z: number }
  ): Promise<number> {
    let reward = 0
    
    // Stability reward
    const stabilityGain = toState.stabilityScore - fromState.stabilityScore
    reward += stabilityGain * 10
    
    // Space efficiency reward
    const spaceUtilization = this.calculateSpaceUtilization(toState)
    reward += spaceUtilization * 5
    
    // Accessibility reward (LIFO compliance)
    if (this.constraints.lifoOrder) {
      const accessibilityScore = this.calculateAccessibilityScore(box, position, toState)
      reward += accessibilityScore * 3
    }
    
    // Collision penalty
    if (toState.collisions > fromState.collisions) {
      reward -= (toState.collisions - fromState.collisions) * 5
    }
    
    // Physics-based reward
    const physicsReward = await this.calculatePhysicsReward(toState)
    reward += physicsReward
    
    return reward
  }

  private async calculatePhysicsReward(state: PlacementState): Promise<number> {
    // Simulate physics for a few steps and measure stability
    let reward = 0
    
    try {
      // Add boxes to physics simulation
      for (const box of state.boxes) {
        this.physicsEngine.addBox({
          id: box.id,
          width: box.width,
          height: box.height,
          length: box.length,
          weight: box.weight,
          position: box.position,
          isFragile: box.isFragile
        })
      }
      
      // Run simulation for a few steps
      for (let i = 0; i < 60; i++) { // 1 second at 60 FPS
        const stats = this.physicsEngine.step(1/60)
        reward += (stats.stability / 100) * 0.1 // Small reward for each stable step
        
        if (stats.collisions > 0) {
          reward -= stats.collisions * 0.5 // Penalty for collisions
        }
      }
      
      // Clean up
      for (const box of state.boxes) {
        this.physicsEngine.removeBox(box.id)
      }
      
    } catch (error) {
      console.warn('Physics simulation error:', error)
      reward = -10 // Heavy penalty for physics errors
    }
    
    return reward
  }

  private calculateSupportScore(box: Box, position: { x: number; y: number; z: number }, state: PlacementState): number {
    if (position.y <= box.height/2 + 0.1) {
      return 1.0 // On floor
    }
    
    let supportArea = 0
    const boxArea = box.width * box.length
    
    for (const existingBox of state.boxes) {
      if (existingBox.position.y < position.y) {
        const overlapArea = this.calculateOverlapArea(box, position, existingBox, existingBox.position)
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

  private calculateSpaceUtilization(state: PlacementState): number {
    const totalTruckVolume = this.constraints.truckDimensions.width * 
                           this.constraints.truckDimensions.length * 
                           this.constraints.truckDimensions.height
    
    const usedVolume = state.boxes.reduce((sum, box) => 
      sum + (box.width * box.height * box.length), 0
    )
    
    return usedVolume / totalTruckVolume
  }

  private calculateAccessibilityScore(box: Box, position: { x: number; y: number; z: number }, state: PlacementState): number {
    // LIFO compliance - boxes closer to truck opening (positive Z) should be more accessible
    const maxZ = this.constraints.truckDimensions.length / 2
    const accessibilityRatio = (position.z + maxZ) / (2 * maxZ)
    
    return accessibilityRatio
  }

  private createStateWithBoxPlacement(state: PlacementState, box: Box, position: { x: number; y: number; z: number }): PlacementState {
    const newBox = { ...box, position }
    const newBoxes = [...state.boxes, newBox]
    
    return {
      boxes: newBoxes,
      score: 0, // Will be calculated later
      stabilityScore: this.calculateStateStability(newBoxes),
      collisions: 0, // Will be calculated by physics
      transitions: state.transitions + 1
    }
  }

  private calculateStateStability(boxes: Box[]): number {
    let stability = 100
    const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)
    
    if (totalWeight === 0) return 100
    
    // Center of gravity calculation
    const centerOfGravity = {
      x: boxes.reduce((sum, box) => sum + box.position.x * box.weight, 0) / totalWeight,
      y: boxes.reduce((sum, box) => sum + box.position.y * box.weight, 0) / totalWeight,
      z: boxes.reduce((sum, box) => sum + box.position.z * box.weight, 0) / totalWeight,
    }
    
    // Penalize high center of gravity
    if (centerOfGravity.y > this.constraints.truckDimensions.height * 0.6) {
      stability -= 20
    }
    
    // Penalize off-center weight distribution
    const lateralOffset = Math.abs(centerOfGravity.x) / (this.constraints.truckDimensions.width / 2)
    stability -= lateralOffset * 15
    
    return Math.max(0, Math.min(100, stability))
  }

  private async evaluateStateWithPhysics(state: PlacementState): Promise<number> {
    const physicsReward = await this.calculatePhysicsReward(state)
    const spaceUtilization = this.calculateSpaceUtilization(state)
    const stabilityScore = state.stabilityScore
    
    return (physicsReward * 0.4) + (spaceUtilization * 100 * 0.3) + (stabilityScore * 0.3)
  }

  private initializeState(): PlacementState {
    return {
      boxes: [],
      score: 0,
      stabilityScore: 100,
      collisions: 0,
      transitions: 0
    }
  }

  private recordTransition(transition: StateTransition): void {
    const stateKey = this.generateStateKey(transition.fromState)
    if (!this.transitionMatrix.has(stateKey)) {
      this.transitionMatrix.set(stateKey, [])
    }
    this.transitionMatrix.get(stateKey)!.push(transition)
  }

  private updateTransitionProbabilities(successfulState: PlacementState): void {
    // Update transition probabilities based on successful outcomes
    // This implements the learning aspect of the RL-inspired approach
    for (const [stateKey, transitions] of this.transitionMatrix.entries()) {
      for (const transition of transitions) {
        if (transition.toState.score < successfulState.score) {
          transition.probability *= 0.95 // Decay unsuccessful transitions
        } else {
          transition.probability *= 1.05 // Reinforce successful transitions
          transition.probability = Math.min(0.9, transition.probability)
        }
      }
    }
  }

  private generateStateKey(state: PlacementState): string {
    return `${state.boxes.length}_${state.stabilityScore.toFixed(1)}_${state.transitions}`
  }
}
