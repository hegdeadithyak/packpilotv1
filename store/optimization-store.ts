// optimization-store.ts
"use client"

import { create } from "zustand"
import type { Box } from "@/types/box"
import { sampleBoxes } from "@/data/sample-boxes"

// Define interfaces for better type safety
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

// Define a simpler Box type for the packing algorithm to avoid circular dependencies if Box has Three.Vector3
interface PackableBox extends Omit<Box, 'position'> {
  // Position is managed by the packing algorithm, not directly stored as Vector3 here
  // We will store simple x, y, z coordinates
  position: { x: number; y: number; z: number };
  originalId: string; // Keep track of original ID for score updates
  rotation?: 'xy' | 'xz' | 'yz' | 'yx' | 'zx' | 'zy' | undefined; // For rotation awareness
}

// Interface for an empty space (void) in the truck
interface Void {
  id: string; // Unique ID for the void
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  length: number;
  volume: number;
}

interface OptimizationState {
  // Truck and Boxes
  truckDimensions: { width: number; length: number; height: number }
  boxes: Box[]
  unplaceableBoxes: Box[]
  // Physics
  physicsEnabled: boolean
  physicsStats: PhysicsStats | null

  // Simulation
  isSimulationRunning: boolean
  simulationSpeed: number
  simulationForces: SimulationForces

  // Scores
  stabilityScore: number
  safetyScore: number
  optimizationScore: number

  // Loading
  loadingSequence: Box[]
  currentLoadStep: number

  // Temperature Zones
  temperatureZones: {
    regular: string[]
    cold: string[]
    frozen: string[]
  }



  // Actions
  loadSampleData: () => void
  resetToEmpty: () => void
  initializePhysics: () => void
  updatePhysics: () => void
  updateBoxPositionPhysics: (id: string, position: { x: number; y: number; z: number }) => void
  runSimulation: () => void
  stopSimulation: () => void
  resetSimulation: () => void
  setSimulationSpeed: (speed: number) => void
  setSimulationForces: (forces: SimulationForces) => void
  addBox: (box: Box) => void
  removeBox: (id: string) => void
  updateBox: (id: string, updates: Partial<Box>) => void
  updateBoxPosition: (id: string, position: { x: number; y: number; z: number }) => void
  setTruckDimensions: (dimensions: { width: number; length: number; height: number }) => void
  setPhysicsEnabled: (enabled: boolean) => void
  optimizeLayout: () => void
  resetLayout: () => void
  checkCollisions: (boxId: string) => string[]
  calculateScores: () => void
  generateLoadingSequence: () => void
  nextLoadStep: () => void
  previousLoadStep: () => void
}

export const useOptimizationStore = create<OptimizationState>((set, get) => ({
  boxes: [],
  unplaceableBoxes: [],
  truckDimensions: {
    width: 8,
    length: 28,
    height: 9,
  },
  physicsEnabled: true,
  physicsStats: null,
  isSimulationRunning: false,
  simulationSpeed: 1.0,
  simulationForces: {
    acceleration: 0.4,
    braking: 0.8,
    turning: 0.5,
    gravity: 1.0,
  },
  stabilityScore: 0,
  safetyScore: 0,
  optimizationScore: 0,
  loadingSequence: [],
  currentLoadStep: 0,
  temperatureZones: {
    regular: [],
    cold: [],
    frozen: [],
  },

  loadSampleData: () => {
    //@ts-ignore
    const { placedBoxes, unplacedBoxes } = optimizeBoxPlacement(sampleBoxes, get().truckDimensions)
    const scores = calculateAllScores(placedBoxes, get().truckDimensions)
    const sequence = generateOptimalLoadingSequence(placedBoxes)
    const zones = categorizeTemperatureZones(placedBoxes)

    set({
      boxes: placedBoxes,
      unplaceableBoxes: unplacedBoxes,
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
      unplaceableBoxes: [],
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
  // Replace the runSimulation function in your optimization-store.ts
  // In your optimization-store.ts, update runSimulation:
  runSimulation: () => {
    console.log('🚀 Starting physics simulation with react-three/cannon')
    set({ isSimulationRunning: true })

    // Add debug logging
    console.log('📦 Boxes to simulate:', get().boxes.length)
    console.log('🎮 Simulation forces:', get().simulationForces)

    // The actual physics simulation is handled by the PhysicsBox components
    const simulationInterval = setInterval(() => {
      const state = get()
      if (!state.isSimulationRunning) {
        clearInterval(simulationInterval)
        return
      }

      // Update physics stats and log
      const stats = {
        collisions: detectCollisions(state.boxes).length,
        contacts: calculateContacts(state.boxes),
        totalForce: calculateTotalForce(state.boxes),
      }

      console.log('📊 Physics stats:', stats)
      set({ physicsStats: stats })
    }, 500)
  },

  // FIXED: Replace the stopSimulation and resetSimulation functions in your optimization-store.ts
  stopSimulation: () => {
    console.log('🛑 Stopping physics simulation and updating final scores')
    set({ isSimulationRunning: false })

    // Wait a moment for physics to settle, then update all scores
    setTimeout(() => {
      const state = get()
      const scores = calculateAllScores(state.boxes, state.truckDimensions)
      const sequence = generateOptimalLoadingSequence(state.boxes)
      const zones = categorizeTemperatureZones(state.boxes)

      set({
        stabilityScore: scores.stability,
        safetyScore: scores.safety,
        optimizationScore: scores.optimization,
        loadingSequence: sequence,
        temperatureZones: zones,
        physicsStats: {
          collisions: detectCollisions(state.boxes).length,
          contacts: calculateContacts(state.boxes),
          totalForce: calculateTotalForce(state.boxes),
        },
      })

      console.log('📊 Final simulation scores:', scores)
    }, 100)
  },

  // Enhanced resetSimulation function
  resetSimulation: () => {
    console.log('🔄 Resetting simulation to optimized positions')
    set({ isSimulationRunning: false })

    // Reset to optimized positions
    const state = get()
    //@ts-ignore
    const optimizedBoxes = optimizeBoxPlacement(state.boxes, state.truckDimensions)
    //@ts-ignore
    set({ boxes: optimizedBoxes })

    // Recalculate scores after reset
    setTimeout(() => {
      get().updatePhysics()
    }, 100)
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

  // FIXED: Physics-aware position update that doesn't recalculate scores during simulation
  updateBoxPositionPhysics: (id, position) => {
    set((state) => {
      const newBoxes = state.boxes.map((box) =>
        box.id === id ? {
          ...box,
          position: { ...position },
          isNew: false
        } : box
      )

      // During simulation, only update positions, don't recalculate scores
      // The physics engine handles the movement
      return { boxes: newBoxes }
    })
  },

  // FIXED: Modified updateBoxPosition to use physics-aware version
  updateBoxPosition: (id: string, position: { x: number; y: number; z: number }) => {
    const state = get()

    if (state.isSimulationRunning) {
      // During simulation, use physics-aware update
      get().updateBoxPositionPhysics(id, position)
    } else {
      // When not simulating, update normally and recalculate scores
      set((state) => {
        const newBoxes = state.boxes.map((box) =>
          box.id === id ? { ...box, position, isNew: false } : box
        )
        const scores = calculateAllScores(newBoxes, state.truckDimensions)

        return {
          boxes: newBoxes,
          stabilityScore: scores.stability,
          safetyScore: scores.safety,
          optimizationScore: scores.optimization,
        }
      })
    }
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
    const state = get();
    if (state.boxes.length === 0 && state.unplaceableBoxes.length === 0) {
      console.log('❌ No boxes to optimize');
      return;
    }

    // Combine both placed and unplaced boxes for re-optimization
    const allBoxes = [...state.boxes, ...state.unplaceableBoxes];
    console.log('🚛 Starting layout optimization (void-filling strategy)...', allBoxes.length, 'boxes');
    const startTime = performance.now();

    try {
      const boxesToOptimize: PackableBox[] = allBoxes.map(box => ({
        ...box,
        position: { ...box.position },
        originalId: box.id,
      }));

      // Get the updated return structure with separate arrays
      const { placedBoxes, unplacedBoxes } = optimizeBoxPlacement(boxesToOptimize, state.truckDimensions);
      const endTime = performance.now();

      console.log('📦 Optimization results:', {
        placed: placedBoxes.length,
        unplaced: unplacedBoxes.length,
        total: allBoxes.length
      });

      if (placedBoxes.length > 0) {
        console.log('📦 Sample placed box:', placedBoxes.slice(0, 1).map(b => ({
          id: b.originalId,
          pos: b.position
        })));
      }

      // Update state with separated arrays
      set({
        boxes: placedBoxes.map(box => ({
          ...box,
          id: box.originalId,
          isNew: false
        })),
        unplaceableBoxes: unplacedBoxes.map(box => ({
          ...box,
          id: box.originalId,
          isNew: false
        }))
      });

      console.log(`✅ Layout optimization completed in ${(endTime - startTime).toFixed(2)}ms`);

      // Recalculate everything after optimization in next tick
      requestAnimationFrame(() => {
        const currentState = get()
        // Only calculate scores for placed boxes
        const scores = calculateAllScores(currentState.boxes, currentState.truckDimensions)
        const sequence = generateOptimalLoadingSequence(currentState.boxes)
        const zones = categorizeTemperatureZones(currentState.boxes)

        set({
          stabilityScore: scores.stability,
          safetyScore: scores.safety,
          optimizationScore: scores.optimization,
          loadingSequence: sequence,
          temperatureZones: zones,
        })

        console.log('📊 Scores updated:', scores)
        console.log('📊 Final state:', {
          placedBoxes: currentState.boxes.length,
          unplaceableBoxes: currentState.unplaceableBoxes.length
        })
      })

    } catch (error) {
      console.error('❌ Layout optimization failed:', error)
    }
  },

  resetLayout: () => {
    set((state) => {
      const resetBoxes = state.boxes.map((box) => ({
        ...box,
        position: { x: 0, y: box.height / 2, z: 0 },
      }))

      const scores = calculateAllScores(resetBoxes, state.truckDimensions)

      return {
        boxes: resetBoxes,
        stabilityScore: scores.stability,
        safetyScore: scores.safety,
        optimizationScore: scores.optimization,
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

  calculateScores: () => {
    const state = get()
    const scores = calculateAllScores(state.boxes, state.truckDimensions)
    set({
      stabilityScore: scores.stability,
      safetyScore: scores.safety,
      optimizationScore: scores.optimization,
    })
  },

  generateLoadingSequence: () => {
    const state = get()
    const sequence = generateOptimalLoadingSequence(state.boxes)
    set({ loadingSequence: sequence, currentLoadStep: 0 })
  },

  nextLoadStep: () => {
    set((state) => ({
      currentLoadStep: Math.min(state.currentLoadStep + 1, state.loadingSequence.length - 1),
    }))
  },

  previousLoadStep: () => {
    set((state) => ({
      currentLoadStep: Math.max(state.currentLoadStep - 1, 0),
    }))
  },
}))

/* -------------------------------------------------------------------------- */
/* HELPER FUNCTIONS FOR BOX ARRANGEMENT (Void-filling Strategy)              */
/* -------------------------------------------------------------------------- */

// Type for a potential placement, including its dimensions in that orientation
interface PlacementCandidate {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  length: number;
  rotation: 'xy' | 'xz' | 'yz' | 'yx' | 'zx' | 'zy';
}

// Function to get all unique orientations for a box
function getOrientations(box: PackableBox): PlacementCandidate[] {
  const { width, height, length } = box;
  const orientations: PlacementCandidate[] = [];

  // Create all 6 permutations, then filter for unique dimensions
  const dims = [width, height, length].sort((a, b) => a - b); // Sorted dimensions for canonical representation

  // Permutations and rotations
  orientations.push({ x: 0, y: 0, z: 0, width: width, height: height, length: length, rotation: 'xy' });
  orientations.push({ x: 0, y: 0, z: 0, width: width, height: length, length: height, rotation: 'xz' });
  orientations.push({ x: 0, y: 0, z: 0, width: length, height: height, length: width, rotation: 'yz' });
  // Add other permutations if truly unique for non-cuboid boxes
  orientations.push({ x: 0, y: 0, z: 0, width: height, height: width, length: length, rotation: 'yx' });
  orientations.push({ x: 0, y: 0, z: 0, width: height, height: length, length: width, rotation: 'zx' });
  orientations.push({ x: 0, y: 0, z: 0, width: length, height: width, length: height, rotation: 'zy' });


  const uniqueOrientations: PlacementCandidate[] = [];
  const seenDimensions = new Set<string>();

  for (const o of orientations) {
    const dimKey = [o.width, o.height, o.length].sort().join(',');
    if (!seenDimensions.has(dimKey)) {
      uniqueOrientations.push(o);
      seenDimensions.add(dimKey);
    }
  }

  return uniqueOrientations;
}


// --- Main Optimization Function ---
function optimizeBoxPlacement(
  boxes: PackableBox[],
  truckDimensions: { width: number; length: number; height: number }
): { placedBoxes: PackableBox[], unplacedBoxes: PackableBox[] } {
  console.log('📦 Optimizing placement for', boxes.length, 'boxes with improved void-filling strategy.');

  if (boxes.length === 0) return { placedBoxes: [], unplacedBoxes: [] };

  const placedBoxes: PackableBox[] = [];
  const unplacedBoxes: PackableBox[] = [];

  // Initial available space is the entire truck volume
  let voids: Void[] = [
    {
      id: 'truck-initial-void',
      x: -truckDimensions.width / 2,
      y: 0,
      z: -truckDimensions.length / 2,
      width: truckDimensions.width,
      height: truckDimensions.height,
      length: truckDimensions.length,
      volume: truckDimensions.width * truckDimensions.height * truckDimensions.length,
    },
  ];

  // Sort boxes by priority: LIFO destination first, then HEAVIEST first for stability
  const boxesToPlace = [...boxes].sort((a, b) => {
    const stopOrder = { "Stop 4": 0, "Stop 3": 1, "Stop 2": 2, "Stop 1": 3 };
    const aStopRank = stopOrder[a.destination as keyof typeof stopOrder] ?? 4;
    const bStopRank = stopOrder[b.destination as keyof typeof stopOrder] ?? 4;

    if (aStopRank !== bStopRank) return aStopRank - bStopRank;
    return b.weight - a.weight;
  });

  // Try multiple placement strategies for each box
  boxesToPlace.forEach((box, index) => {
    console.log(`📍 Attempting to place box ${index + 1}/${boxesToPlace.length}: ${box.id} (${box.weight}kg)`);

    let bestPlacement = findBestPlacement(box, voids, placedBoxes, truckDimensions);

    if (bestPlacement) {
      const placedBox = bestPlacement.box;
      placedBox.position = bestPlacement.position;
      placedBoxes.push(placedBox);

      console.log(`✅ Placed ${placedBox.id} at position:`, placedBox.position);

      // Update voids after placement
      const originalVoid = voids[bestPlacement.voidIndex];
      const newVoids = splitVoidTightly(originalVoid, placedBox);
      voids.splice(bestPlacement.voidIndex, 1);
      voids.push(...newVoids);
      voids = cleanAndMergeVoids(voids, placedBoxes);

    } else {
      console.warn(`❌ Could not find a suitable position for box ${box.id}`);
      unplacedBoxes.push(box);
    }
  });

  console.log(`✅ Placement complete. Placed: ${placedBoxes.length}, Unplaced: ${unplacedBoxes.length}`);
  return { placedBoxes, unplacedBoxes };
}
function findBestPlacement(
  box: PackableBox,
  voids: Void[],
  placedBoxes: PackableBox[],
  truckDimensions: { width: number; length: number; height: number }
): {
  box: PackableBox;
  position: { x: number; y: number; z: number };
  score: number;
  voidIndex: number;
} | null {

  let bestPlacement: {
    box: PackableBox;
    position: { x: number; y: number; z: number };
    score: number;
    voidIndex: number;
  } | null = null;

  const orientations = getOrientations(box);

  // Sort voids by placement priority
  const sortedVoids = [...voids].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 0.01) return a.y - b.y; // Lower first
    if (Math.abs(a.volume - b.volume) > 0.01) return a.volume - b.volume; // Smaller first
    return b.z - a.z; // Closer to rear first
  });

  // Try multiple placement positions within each void
  for (let i = 0; i < sortedVoids.length; i++) {
    const currentVoid = sortedVoids[i];
    const originalIndex = voids.indexOf(currentVoid);

    for (const orientation of orientations) {
      // Try multiple positions within the void, not just bottom-left-rear
      const positions = generatePositionsInVoid(currentVoid, orientation);

      for (const pos of positions) {
        const testBox: PackableBox = {
          ...box,
          ...orientation,
          position: pos,
          rotation: orientation.rotation
        };

        if (isValidPlacement(testBox, placedBoxes, truckDimensions)) {
          const score = evaluatePlacement(testBox, placedBoxes, truckDimensions);

          if (!bestPlacement || score > bestPlacement.score) {
            bestPlacement = {
              box: testBox,
              position: pos,
              score,
              voidIndex: originalIndex
            };
          }
        }
      }
    }
  }

  return bestPlacement;
}

function generatePositionsInVoid(
  void_: Void,
  orientation: PlacementCandidate
): { x: number; y: number; z: number }[] {
  const positions: { x: number; y: number; z: number }[] = [];

  // Calculate how many positions we can try in each dimension
  const maxXPositions = Math.max(1, Math.floor((void_.width - orientation.width) / 0.5) + 1);
  const maxYPositions = Math.max(1, Math.floor((void_.height - orientation.height) / 0.5) + 1);
  const maxZPositions = Math.max(1, Math.floor((void_.length - orientation.length) / 0.5) + 1);

  // Limit to reasonable number of positions to avoid performance issues
  const xPositions = Math.min(maxXPositions, 3);
  const yPositions = Math.min(maxYPositions, 2);
  const zPositions = Math.min(maxZPositions, 3);

  for (let xi = 0; xi < xPositions; xi++) {
    for (let yi = 0; yi < yPositions; yi++) {
      for (let zi = 0; zi < zPositions; zi++) {
        const xOffset = xPositions > 1 ? (xi / (xPositions - 1)) * (void_.width - orientation.width) : 0;
        const yOffset = yPositions > 1 ? (yi / (yPositions - 1)) * (void_.height - orientation.height) : 0;
        const zOffset = zPositions > 1 ? (zi / (zPositions - 1)) * (void_.length - orientation.length) : 0;

        positions.push({
          x: void_.x + xOffset + orientation.width / 2,
          y: void_.y + yOffset + orientation.height / 2,
          z: void_.z + zOffset + orientation.length / 2
        });
      }
    }
  }

  return positions;
}
// --- Helper for splitting a void after a box is placed ---
function splitVoid(originalVoid: Void, placedBox: PackableBox): Void[] {
  const newVoids: Void[] = [];

  const boxMinX = placedBox.position.x - placedBox.width / 2;
  const boxMaxX = placedBox.position.x + placedBox.width / 2;
  const boxMinY = placedBox.position.y - placedBox.height / 2;
  const boxMaxY = placedBox.position.y + placedBox.height / 2;
  const boxMinZ = placedBox.position.z - placedBox.length / 2;
  const boxMaxZ = placedBox.position.z + placedBox.length / 2;

  const voidMinX = originalVoid.x;
  const voidMaxX = originalVoid.x + originalVoid.width;
  const voidMinY = originalVoid.y;
  const voidMaxY = originalVoid.y + originalVoid.height;
  const voidMinZ = originalVoid.z;
  const voidMaxZ = originalVoid.z + originalVoid.length;

  let voidCounter = 0; // Simple counter for void IDs

  // Create voids for spaces left in X, Y, Z directions around the placed box
  // 1. Void to the left of the box
  if (boxMinX > voidMinX) {
    newVoids.push({
      id: `${originalVoid.id}-lx-${voidCounter++}`,
      x: voidMinX, y: voidMinY, z: voidMinZ,
      width: boxMinX - voidMinX, height: originalVoid.height, length: originalVoid.length,
      volume: (boxMinX - voidMinX) * originalVoid.height * originalVoid.length,
    });
  }
  // 2. Void to the right of the box
  if (boxMaxX < voidMaxX) {
    newVoids.push({
      id: `${originalVoid.id}-rx-${voidCounter++}`,
      x: boxMaxX, y: voidMinY, z: voidMinZ,
      width: voidMaxX - boxMaxX, height: originalVoid.height, length: originalVoid.length,
      volume: (voidMaxX - boxMaxX) * originalVoid.height * originalVoid.length,
    });
  }
  // 3. Void below the box (this should ideally not happen if box is placed at bottom)
  if (boxMinY > voidMinY) {
    newVoids.push({
      id: `${originalVoid.id}-rx-${voidCounter++}`,
      x: voidMinX, y: voidMinY, z: voidMinZ,
      width: originalVoid.width, height: boxMinY - voidMinY, length: originalVoid.length,
      volume: originalVoid.width * (boxMinY - voidMinY) * originalVoid.length,
    });
  }
  // 4. Void above the box
  if (boxMaxY < voidMaxY) {
    newVoids.push({
      id: `${originalVoid.id}-rx-${voidCounter++}`,
      x: voidMinX, y: boxMaxY, z: voidMinZ,
      width: originalVoid.width, height: voidMaxY - boxMaxY, length: originalVoid.length,
      volume: originalVoid.width * (voidMaxY - boxMaxY) * originalVoid.length,
    });
  }
  // 5. Void in front of the box (smaller Z)
  if (boxMinZ > voidMinZ) {
    newVoids.push({
      id: `${originalVoid.id}-rx-${voidCounter++}`,
      x: voidMinX, y: voidMinY, z: voidMinZ,
      width: originalVoid.width, height: originalVoid.height, length: boxMinZ - voidMinZ,
      volume: originalVoid.width * originalVoid.height * (boxMinZ - voidMinZ),
    });
  }
  // 6. Void behind the box (larger Z)
  if (boxMaxZ < voidMaxZ) {
    newVoids.push({
      id: `${originalVoid.id}-rx-${voidCounter++}`,
      x: voidMinX, y: voidMinY, z: boxMaxZ,
      width: originalVoid.width, height: originalVoid.height, length: voidMaxZ - boxMaxZ,
      volume: originalVoid.width * originalVoid.height * (voidMaxZ - boxMaxZ),
    });
  }

  // Filter out voids with zero or negative dimensions (might happen from float errors or tight fits)
  return newVoids.filter(v => v.width > 0.01 && v.height > 0.01 && v.length > 0.01);
}
function splitVoidTightly(originalVoid: Void, placedBox: PackableBox): Void[] {
  const newVoids: Void[] = [];

  const boxMinX = placedBox.position.x - placedBox.width / 2;
  const boxMaxX = placedBox.position.x + placedBox.width / 2;
  const boxMinY = placedBox.position.y - placedBox.height / 2;
  const boxMaxY = placedBox.position.y + placedBox.height / 2;
  const boxMinZ = placedBox.position.z - placedBox.length / 2;
  const boxMaxZ = placedBox.position.z + placedBox.length / 2;

  const voidMinX = originalVoid.x;
  const voidMaxX = originalVoid.x + originalVoid.width;
  const voidMinY = originalVoid.y;
  const voidMaxY = originalVoid.y + originalVoid.height;
  const voidMinZ = originalVoid.z;
  const voidMaxZ = originalVoid.z + originalVoid.length;

  let voidCounter = 0;

  // Create tighter voids that start immediately adjacent to the placed box

  // 1. Void to the LEFT of the box (X- direction)
  if (boxMinX > voidMinX) {
    const width = boxMinX - voidMinX;
    if (width > 0.01) {
      newVoids.push({
        id: `${originalVoid.id}-left-${voidCounter++}`,
        x: voidMinX,
        y: voidMinY,
        z: voidMinZ,
        width: width,
        height: originalVoid.height,
        length: originalVoid.length,
        volume: width * originalVoid.height * originalVoid.length,
      });
    }
  }

  // 2. Void to the RIGHT of the box (X+ direction)  
  if (boxMaxX < voidMaxX) {
    const width = voidMaxX - boxMaxX;
    if (width > 0.001) {
      newVoids.push({
        id: `${originalVoid.id}-right-${voidCounter++}`,
        x: boxMaxX, // Start immediately after the box
        y: voidMinY,
        z: voidMinZ,
        width: width,
        height: originalVoid.height,
        length: originalVoid.length,
        volume: width * originalVoid.height * originalVoid.length,
      });
    }
  }

  // 3. Void ABOVE the box (Y+ direction) - constrained to box's X/Z footprint
  if (boxMaxY < voidMaxY) {
    const height = voidMaxY - boxMaxY;
    if (height > 0.01) {
      newVoids.push({
        id: `${originalVoid.id}-above-${voidCounter++}`,
        x: Math.max(voidMinX, boxMinX), // Constrain to box footprint
        y: boxMaxY, // Start immediately above the box
        z: Math.max(voidMinZ, boxMinZ), // Constrain to box footprint
        width: Math.min(voidMaxX, boxMaxX) - Math.max(voidMinX, boxMinX),
        height: height,
        length: Math.min(voidMaxZ, boxMaxZ) - Math.max(voidMinZ, boxMinZ),
        volume: 0, // Will be calculated below
      });
      // Calculate volume for the constrained void
      const lastVoid = newVoids[newVoids.length - 1];
      lastVoid.volume = lastVoid.width * lastVoid.height * lastVoid.length;
    }
  }

  // 4. Void in FRONT of the box (Z- direction)
  if (boxMinZ > voidMinZ) {
    const length = boxMinZ - voidMinZ;
    if (length > 0.01) {
      newVoids.push({
        id: `${originalVoid.id}-front-${voidCounter++}`,
        x: voidMinX,
        y: voidMinY,
        z: voidMinZ,
        width: originalVoid.width,
        height: originalVoid.height,
        length: length,
        volume: originalVoid.width * originalVoid.height * length,
      });
    }
  }

  // 5. Void BEHIND the box (Z+ direction)
  if (boxMaxZ < voidMaxZ) {
    const length = voidMaxZ - boxMaxZ;
    if (length > 0.01) {
      newVoids.push({
        id: `${originalVoid.id}-behind-${voidCounter++}`,
        x: voidMinX,
        y: voidMinY,
        z: boxMaxZ, // Start immediately behind the box
        width: originalVoid.width,
        height: originalVoid.height,
        length: length,
        volume: originalVoid.width * originalVoid.height * length,
      });
    }
  }

  // Filter out invalid voids
  return newVoids.filter(v => v.width > 0.01 && v.height > 0.01 && v.length > 0.01 && v.volume > 0.001);
}
// --- Simplified void cleaning and merging (critical for performance in real apps) ---
function cleanAndMergeVoids(voids: Void[], placedBoxes: PackableBox[]): Void[] {
  const minVoidDimension = 0.02; // Reduced from 0.05 to allow smaller voids

  // Remove voids that are too small
  let cleanedVoids = voids.filter(v =>
    v.width > minVoidDimension &&
    v.height > minVoidDimension &&
    v.length > minVoidDimension &&
    v.volume > minVoidDimension * minVoidDimension * minVoidDimension
  );

  // Less aggressive void blocking check
  cleanedVoids = cleanedVoids.filter(v => {
    for (const pBox of placedBoxes) {
      // Check if void significantly overlaps with any placed box
      const xOverlap = Math.max(0,
        Math.min(v.x + v.width, pBox.position.x + pBox.width / 2) -
        Math.max(v.x, pBox.position.x - pBox.width / 2)
      );
      const yOverlap = Math.max(0,
        Math.min(v.y + v.height, pBox.position.y + pBox.height / 2) -
        Math.max(v.y, pBox.position.y - pBox.height / 2)
      );
      const zOverlap = Math.max(0,
        Math.min(v.z + v.length, pBox.position.z + pBox.length / 2) -
        Math.max(v.z, pBox.position.z - pBox.length / 2)
      );

      const overlapVolume = xOverlap * yOverlap * zOverlap;
      const voidVolume = v.width * v.height * v.length;

      // If more than 80% of void is occupied, remove it
      if (overlapVolume > voidVolume * 0.8) {
        return false;
      }
    }
    return true;
  });

  // Sort by priority
  cleanedVoids.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 0.01) return a.y - b.y;
    return a.volume - b.volume;
  });

  // Increased limit for more placement opportunities
  return cleanedVoids.slice(0, 100); // Increased from 50
}

// Helper to check if box1 is fully contained within box2
function isBoxFullyContained(box1: Box, box2: Box): boolean {
  const box1MinX = box1.position.x - box1.width / 2;
  const box1MaxX = box1.position.x + box1.width / 2;
  const box1MinY = box1.position.y - box1.height / 2;
  const box1MaxY = box1.position.y + box1.height / 2;
  const box1MinZ = box1.position.z - box1.length / 2;
  const box1MaxZ = box1.position.z + box1.length / 2;

  const box2MinX = box2.position.x - box2.width / 2;
  const box2MaxX = box2.position.x + box2.width / 2;
  const box2MinY = box2.position.y - box2.height / 2;
  const box2MaxY = box2.position.y + box2.height / 2;
  const box2MinZ = box2.position.z - box2.length / 2;
  const box2MaxZ = box2.position.z + box2.length / 2;

  return (
    box1MinX >= box2MinX && box1MaxX <= box2MaxX &&
    box1MinY >= box2MinY && box1MaxY <= box2MaxY &&
    box1MinZ >= box2MinZ && box1MaxZ <= box2MaxZ
  );
}


// --- Checks if a box can be placed at a given position ---
function isValidPlacement(
  testBox: PackableBox,
  placedBoxes: PackableBox[],
  truckDimensions: { width: number; length: number; height: number }
): boolean {
  // Check truck boundaries with small tolerance
  const tolerance = 0.01; // Slightly more tolerant
  if (
    testBox.position.x - testBox.width / 2 < -truckDimensions.width / 2 - tolerance ||
    testBox.position.x + testBox.width / 2 > truckDimensions.width / 2 + tolerance ||
    testBox.position.y - testBox.height / 2 < -tolerance ||
    testBox.position.y + testBox.height / 2 > truckDimensions.height + tolerance ||
    testBox.position.z - testBox.length / 2 < -truckDimensions.length / 2 - tolerance ||
    testBox.position.z + testBox.length / 2 > truckDimensions.length / 2 + tolerance
  ) {
    return false;
  }

  // Check collisions with placed boxes
  for (const placedBox of placedBoxes) {
    if (isBoxColliding(testBox, placedBox)) {
      return false;
    }
  }

  // Relaxed support checking
  const isOnFloor = Math.abs(testBox.position.y - testBox.height / 2) < 0.02;
  if (isOnFloor) {
    return true;
  }

  // Reduced support requirement for better space utilization
  const SUPPORT_OVERLAP_THRESHOLD = 0.3; // Reduced from 0.7 to 0.3
  let totalSupportArea = 0;
  const testBoxArea = testBox.width * testBox.length;

  for (const placedBox of placedBoxes) {
    const verticalGap = Math.abs((testBox.position.y - testBox.height / 2) - (placedBox.position.y + placedBox.height / 2));
    const isSupportingFromBelow = verticalGap < 0.02;

    if (isSupportingFromBelow) {
      const xOverlap = Math.max(0,
        Math.min(testBox.position.x + testBox.width / 2, placedBox.position.x + placedBox.width / 2) -
        Math.max(testBox.position.x - testBox.width / 2, placedBox.position.x - placedBox.width / 2)
      );
      const zOverlap = Math.max(0,
        Math.min(testBox.position.z + testBox.length / 2, placedBox.position.z + placedBox.length / 2) -
        Math.max(testBox.position.z - testBox.length / 2, placedBox.position.z - placedBox.length / 2)
      );

      totalSupportArea += xOverlap * zOverlap;
    }
  }

  const supportRatio = totalSupportArea / testBoxArea;
  return supportRatio >= SUPPORT_OVERLAP_THRESHOLD;
}

function calculateHorizontalOverlap(box1: PackableBox, box2: PackableBox): number {
  const xOverlap = Math.max(0, Math.min(box1.position.x + box1.width / 2, box2.position.x + box2.width / 2) -
    Math.max(box1.position.x - box1.width / 2, box2.position.x - box2.width / 2));
  const zOverlap = Math.max(0, Math.min(box1.position.z + box1.length / 2, box2.position.z + box2.length / 2) -
    Math.max(box1.position.z - box1.length / 2, box2.position.z - box2.length / 2));

  const box1Area = box1.width * box1.length;
  const overlapArea = xOverlap * zOverlap;

  return box1Area > 0 ? overlapArea / box1Area : 0;
}
function evaluatePlacement(
  box: PackableBox,
  placedBoxes: PackableBox[],
  truckDimensions: { width: number; length: number; height: number }
): number {
  let score = 0;

  // 1. STABILITY - Much higher weight for lower placement and heavier boxes at bottom
  const heightPenalty = (box.position.y / truckDimensions.height) * 100;
  score -= heightPenalty;

  // Heavy boxes get huge bonus for being low
  const weightStabilityBonus = (box.weight / 100) * (truckDimensions.height - box.position.y) * 2;
  score += weightStabilityBonus;

  // Center of mass preference
  score += (truckDimensions.width / 2 - Math.abs(box.position.x)) * 3;
  score += (truckDimensions.length / 2 - Math.abs(box.position.z)) * 2;

  // 2. TIGHT PACKING - Massive bonus for contact with other boxes or walls
  let contactScore = 0;
  const tolerance = 0.00002; // Tighter tolerance for contact detection

  const boxMinX = box.position.x - box.width / 2;
  const boxMaxX = box.position.x + box.width / 2;
  const boxMinY = box.position.y - box.height / 2;
  const boxMaxY = box.position.y + box.height / 2;
  const boxMinZ = box.position.z - box.length / 2;
  const boxMaxZ = box.position.z + box.length / 2;

  // Contact with truck walls (high bonus)
  if (Math.abs(boxMinX - (-truckDimensions.width / 2)) < tolerance) contactScore += 50;
  if (Math.abs(boxMaxX - (truckDimensions.width / 2)) < tolerance) contactScore += 50;
  if (Math.abs(boxMinY - 0) < tolerance) contactScore += 100; // Floor contact is critical
  if (Math.abs(boxMinZ - (-truckDimensions.length / 2)) < tolerance) contactScore += 30;
  if (Math.abs(boxMaxZ - (truckDimensions.length / 2)) < tolerance) contactScore += 30;

  // Contact with other boxes (very high bonus for tight packing)
  for (const pBox of placedBoxes) {
    const pBoxMinX = pBox.position.x - pBox.width / 2;
    const pBoxMaxX = pBox.position.x + pBox.width / 2;
    const pBoxMinY = pBox.position.y - pBox.height / 2;
    const pBoxMaxY = pBox.position.y + pBox.height / 2;
    const pBoxMinZ = pBox.position.z - pBox.length / 2;
    const pBoxMaxZ = pBox.position.z + pBox.length / 2;

    // Check for face-to-face contact (no gaps)
    if (Math.abs(boxMaxX - pBoxMinX) < tolerance) contactScore += 200; // Increase from 80
    if (Math.abs(boxMinX - pBoxMaxX) < tolerance) contactScore += 200; // Left face touching right face
    if (Math.abs(boxMaxY - pBoxMinY) < tolerance) contactScore += 120; // Top touching bottom (stacking)
    if (Math.abs(boxMinY - pBoxMaxY) < tolerance) contactScore += 60; // Bottom touching top
    if (Math.abs(boxMaxZ - pBoxMinZ) < tolerance) contactScore += 80; // Back touching front
    if (Math.abs(boxMinZ - pBoxMaxZ) < tolerance) contactScore += 80; // Front touching back
  }
  score += contactScore;

  // 3. Temperature Zone Compliance
  const zoneScore = getTemperatureZoneScore(box, box.position, truckDimensions);
  score += zoneScore * 200; // Higher bonus for correct temperature zone

  // 4. Fragile Item Protection
  if (box.isFragile) {
    score += (truckDimensions.height - box.position.y) * 20; // Lower placement for fragile
    // Penalty if heavy boxes are above fragile boxes
    for (const pBox of placedBoxes) {
      if (pBox.weight > box.weight * 1.5 && pBox.position.y > box.position.y) {
        const overlap = calculateHorizontalOverlap(box, pBox);
        if (overlap > 0.3) { // 30% overlap threshold
          score -= overlap * 100; // Penalty for heavy items above fragile
        }
      }
    }
  }

  // 5. LIFO Accessibility
  const stopOrder = { "Stop 4": 0, "Stop 3": 1, "Stop 2": 2, "Stop 1": 3 };
  const targetZRatio = (stopOrder[box.destination as keyof typeof stopOrder] ?? 0) / 3;
  const actualZRatio = (box.position.z + truckDimensions.length / 2) / truckDimensions.length;
  score -= Math.abs(targetZRatio - actualZRatio) * 150;

  // 6. CORNER AND EDGE PREFERENCE - Prioritize corners and edges for structural support
  let structuralBonus = 0;

  // Corner bonuses (box touching two walls)
  const touchingLeftWall = Math.abs(boxMinX - (-truckDimensions.width / 2)) < tolerance;
  const touchingRightWall = Math.abs(boxMaxX - (truckDimensions.width / 2)) < tolerance;
  const touchingFrontWall = Math.abs(boxMinZ - (-truckDimensions.length / 2)) < tolerance;
  const touchingBackWall = Math.abs(boxMaxZ - (truckDimensions.length / 2)) < tolerance;
  const touchingFloor = Math.abs(boxMinY - 0) < tolerance;

  const wallContacts = [touchingLeftWall, touchingRightWall, touchingFrontWall, touchingBackWall].filter(Boolean).length;

  if (touchingFloor && wallContacts >= 2) {
    structuralBonus += 200; // Corner placement bonus
  } else if (touchingFloor && wallContacts >= 1) {
    structuralBonus += 100; // Edge placement bonus
  } else if (touchingFloor) {
    structuralBonus += 50; // Floor contact bonus
  }

  score += structuralBonus;

  return Math.max(0, score);
}


/* -------------------------------------------------------------------------- */
/*                           EXISTING HELPER FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

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

  const centerOfGravity = {
    x: boxes.reduce((sum, box) => sum + box.position.x * box.weight, 0) / totalWeight,
    y: boxes.reduce((sum, box) => sum + box.position.y * box.weight, 0) / totalWeight,
    z: boxes.reduce((sum, box) => sum + box.position.z * box.weight, 0) / totalWeight,
  }

  const maxSafeHeight = truckDimensions.height * 0.6
  if (centerOfGravity.y > maxSafeHeight) {
    const heightPenalty = ((centerOfGravity.y - maxSafeHeight) / maxSafeHeight) * 30
    score -= heightPenalty
  }

  const lateralOffset = Math.abs(centerOfGravity.x) / (truckDimensions.width / 2)
  score -= lateralOffset * 25

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

  boxes.forEach((box) => {
    if (box.isFragile) {
      if (box.position.y > truckDimensions.height * 0.7) {
        score -= 10
      }
      // Consider adding checks for heavy boxes directly on top of fragile ones
    }
  })

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

// Bounding Box Collision Detection
function isBoxColliding(box1: Box | PackableBox, box2: Box | PackableBox): boolean {
  const xOverlap = Math.max(0, Math.min(box1.position.x + box1.width / 2, box2.position.x + box2.width / 2) - Math.max(box1.position.x - box1.width / 2, box2.position.x - box2.width / 2));
  const yOverlap = Math.max(0, Math.min(box1.position.y + box1.height / 2, box2.position.y + box2.height / 2) - Math.max(box1.position.y - box1.height / 2, box2.position.y - box2.height / 2));
  const zOverlap = Math.max(0, Math.min(box1.position.z + box1.length / 2, box2.position.z + box2.length / 2) - Math.max(box1.position.z - box1.length / 2, box2.position.z - box2.length / 2));

  return xOverlap > 0 && yOverlap > 0 && zOverlap > 0;
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

function calculateContacts(boxes: Box[]): number {
  let contacts = 0
  const CONTACT_THRESHOLD = 0.05;

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const box1 = boxes[i];
      const box2 = boxes[j];

      const minDx = (box1.width + box2.width) / 2;
      const minDy = (box1.height + box2.height) / 2;
      const minDz = (box1.length + box2.length) / 2;

      const actualDx = Math.abs(box1.position.x - box2.position.x);
      const actualDy = Math.abs(box1.position.y - box2.position.y);
      const actualDz = Math.abs(box1.position.z - box2.position.z);

      const isTouchingX = Math.abs(actualDx - minDx) < CONTACT_THRESHOLD;
      const isTouchingY = Math.abs(actualDy - minDy) < CONTACT_THRESHOLD;
      const isTouchingZ = Math.abs(actualDz - minDz) < CONTACT_THRESHOLD;

      if (
        (isTouchingX && actualDy < minDy && actualDz < minDz) ||
        (isTouchingY && actualDx < minDx && actualDz < minDz) ||
        (isTouchingZ && actualDx < minDx && actualDy < minDy)
      ) {
        contacts++;
      }
    }
  }
  return contacts;
}

function calculateTotalForce(boxes: Box[]): number {
  return boxes.reduce((total, box) => {
    const mass = box.weight * 0.453592;
    const gravitationalForce = mass * 9.81;

    const heightFactor = box.position.y / 10;
    return total + gravitationalForce * (1 + heightFactor);
  }, 0) / 1000;
}


function getDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
  const dx = pos1.x - pos2.x
  const dy = pos1.y - pos2.y
  const dz = pos1.z - pos2.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function getTemperatureZoneScore(
  box: PackableBox,
  position: { x: number; y: number; z: number },
  truckDimensions: { width: number; length: number; height: number },
): number {
  const truckRearZ = truckDimensions.length / 2;
  const frozenZoneEnd = truckRearZ; // Back of the truck
  const coldZoneEnd = truckRearZ - 4; // 4 units from the back
  const regularZoneEnd = truckRearZ - 8; // 8 units from the back

  const boxCenterZ = position.z;

  switch (box.temperatureZone) {
    case "frozen":
      // Box center must be within the frozen zone (e.g., last 4 units of length)
      return (boxCenterZ > coldZoneEnd && boxCenterZ <= frozenZoneEnd) ? 1 : 0;
    case "cold":
      // Box center must be within the cold zone (e.g., next 4 units)
      return (boxCenterZ > regularZoneEnd && boxCenterZ <= coldZoneEnd) ? 1 : 0;
    case "regular":
      // Box center must be within the regular zone (everything before cold zone)
      return (boxCenterZ <= regularZoneEnd) ? 1 : 0;
    default:
      return 0.5;
  }
}

function generateOptimalLoadingSequence(boxes: Box[]): Box[] {
  const sorted = [...boxes].sort((a, b) => {
    const stopOrder = { "Stop 4": 0, "Stop 3": 1, "Stop 2": 2, "Stop 1": 3 };
    const aStop = stopOrder[a.destination as keyof typeof stopOrder] || 4;
    const bStop = stopOrder[b.destination as keyof typeof stopOrder] || 4;

    if (aStop !== bStop) return aStop - bStop;
    if (a.isFragile && !b.isFragile) return 1;
    if (!a.isFragile && b.isFragile) return -1;
    return b.weight - a.weight;
  });

  return sorted;
}

function categorizeTemperatureZones(boxes: Box[]) {
  return {
    regular: boxes.filter((box) => box.temperatureZone === "regular").map((box) => box.id),
    cold: boxes.filter((box) => box.temperatureZone === "cold").map((box) => box.id),
    frozen: boxes.filter((box) => box.temperatureZone === "frozen").map((box) => box.id),
  }
}