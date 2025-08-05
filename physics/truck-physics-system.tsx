// Enhanced physics system for truck simulation with toast notifications
"use client"

import { useFrame } from "@react-three/fiber"
import { useBox, usePlane } from "@react-three/cannon"
import { useOptimizationStore } from "@/store/optimization-store"
import { useRef, useEffect, useState } from "react"
import * as THREE from "three"
import { useRouteStore } from "@/components/truck-visualization"

// Physics constants
const PHYSICS_CONSTANTS = {
  GRAVITY: -9.81,
  FRICTION: 0.6,
  RESTITUTION: 0.3,
  AIR_RESISTANCE: 0.98,
  COLLISION_DAMPING: 0.8,
}

// Global physics state for the entire truck
interface TruckPhysicsState {
  velocity: THREE.Vector3
  acceleration: THREE.Vector3
  angularVelocity: THREE.Vector3
  isAccelerating: boolean
  isBraking: boolean
  isTurning: boolean
  turnDirection: number // -1 left, 1 right, 0 straight
}

let globalTruckPhysics: TruckPhysicsState = {
  velocity: new THREE.Vector3(0, 0, 0),
  acceleration: new THREE.Vector3(0, 0, 0),
  angularVelocity: new THREE.Vector3(0, 0, 0),
  isAccelerating: false,
  isBraking: false,
  isTurning: false,
  turnDirection: 0,
}

// Import toast from shadcn
import { toast } from "sonner"

// Hook to control truck physics simulation with sonner toast notifications
export function useTruckPhysics() {
  const { simulationForces, isSimulationRunning } = useOptimizationStore()

  useEffect(() => {
    if (isSimulationRunning) {
      // Simulate different driving scenarios
      const scenario = Math.floor(Math.random() * 4)

      // Wrap toast calls in setTimeout to ensure proper rendering
      setTimeout(() => {
        switch (scenario) {
          case 0: // Acceleration
            globalTruckPhysics.isAccelerating = true
            globalTruckPhysics.acceleration.z = -simulationForces.acceleration
            toast.success("🚛 Accelerating Forward", {
              description: "Forward momentum affecting cargo",
              position: "top-center",
            })
            break
          case 1: // Braking
            globalTruckPhysics.isBraking = true
            globalTruckPhysics.acceleration.z = simulationForces.braking
            toast.error("🛑 Emergency Braking", {
              description: "Sudden stop - cargo shifting forward",
              position: "top-center",
            })
            break
          case 2: // Left turn
            globalTruckPhysics.isTurning = true
            globalTruckPhysics.turnDirection = -1
            globalTruckPhysics.acceleration.x = simulationForces.turning
            toast.info("↪️ Sharp Left Turn", {
              description: "Lateral forces moving cargo right",
              position: "top-center",
            })
            break
          case 3: // Right turn
            globalTruckPhysics.isTurning = true
            globalTruckPhysics.turnDirection = 1
            globalTruckPhysics.acceleration.x = -simulationForces.turning
            toast.info("↩️ Sharp Right Turn", {
              description: "Lateral forces moving cargo left", 
              position: "top-center",
            })
            break
        }
      }, 0)

      // Reset after simulation time
      setTimeout(() => {
        globalTruckPhysics.isAccelerating = false
        globalTruckPhysics.isBraking = false
        globalTruckPhysics.isTurning = false
        globalTruckPhysics.acceleration.set(0, 0, 0)
        globalTruckPhysics.velocity.multiplyScalar(0.95) // Gradual slowdown
      }, 2000)
    }
  }, [isSimulationRunning, simulationForces])

  return globalTruckPhysics
}

// Enhanced physics box component (unchanged functionality)
interface PhysicsBoxProps {
  box: any
  children?: React.ReactNode
}

export function PhysicsBox({ box, children }: PhysicsBoxProps) {
  const { simulationForces, isSimulationRunning, simulationSpeed } = useOptimizationStore()

  const [ref, api] = useBox(() => ({
    mass: box.weight/10, // Convert to reasonable physics mass
    position: [box.position.x, box.position.y, box.position.z],
    args: [box.width, box.height, box.length],
    material: {
      friction: box.isFragile ? 0.8 : PHYSICS_CONSTANTS.FRICTION,
      restitution: box.isFragile ? 0.1 : PHYSICS_CONSTANTS.RESTITUTION,
    },
    linearDamping: 0.4,
    angularDamping: 0.4,
  }))

  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3())
  const positionRef = useRef<THREE.Vector3>(new THREE.Vector3())

  useEffect(() => {
    const unsubscribeVelocity = api.velocity.subscribe((v) => velocityRef.current.set(...v))
    const unsubscribePosition = api.position.subscribe((p) => positionRef.current.set(...p))

    return () => {
      unsubscribeVelocity()
      unsubscribePosition()
    }
  }, [api])

  useFrame((state, delta) => {
    if (!isSimulationRunning) return
    const adjustedDelta = delta * simulationSpeed
    const truckForce = new THREE.Vector3()
    truckForce.y += PHYSICS_CONSTANTS.GRAVITY * (box.weight / 100)
    if (globalTruckPhysics.isAccelerating) {
      truckForce.z += simulationForces.acceleration * (box.weight / 1000)
    }
    if (globalTruckPhysics.isBraking) {
      truckForce.z -= simulationForces.braking * (box.weight / 1000)
    }

    if (globalTruckPhysics.isTurning) {
      const lateralForce = simulationForces.turning * globalTruckPhysics.turnDirection
      truckForce.x += lateralForce * (box.weight / 1000)

      const centrifugalForce = lateralForce * 0.0005
      truckForce.z += centrifugalForce * Math.sin(state.clock.elapsedTime * 2)
    }

    if (box.isFragile) {
      truckForce.multiplyScalar(1.2)
    }

    const heightFactor = (box.position.y / 10) * 0.1
    truckForce.x += (Math.random() - 0.5) * heightFactor
    truckForce.z += (Math.random() - 0.5) * heightFactor

    api.applyForce(
      [truckForce.x, truckForce.y, truckForce.z],
      [positionRef.current.x, positionRef.current.y, positionRef.current.z]
    )

    const currentVelocity = velocityRef.current
    const resistance = currentVelocity.clone().multiplyScalar(-0.1 * adjustedDelta)
    api.applyForce(
      [resistance.x, resistance.y, resistance.z],
      [positionRef.current.x, positionRef.current.y, positionRef.current.z]
    )
  })

  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      {children}
    </mesh>
  )
}

// Truck bed physics boundary (unchanged)
export function TruckBedPhysics({ dimensions }: { dimensions: { width: number; length: number; height: number } }) {
  // Floor
  const [floorRef] = usePlane(() => ({
    position: [0, 0, 0],
    rotation: [-Math.PI / 2, 0, 0],
    material: { friction: 0.8, restitution: 0.1 },
    type: 'Static',
  }))

  // Walls
  const [leftWallRef] = usePlane(() => ({
    position: [-dimensions.width / 2, dimensions.height / 2, 0],
    rotation: [0, Math.PI / 2, 0],
    material: { friction: 0.6, restitution: 0.3 },
    type: 'Static',
  }))

  const [rightWallRef] = usePlane(() => ({
    position: [dimensions.width / 2, dimensions.height / 2, 0],
    rotation: [0, -Math.PI / 2, 0],
    material: { friction: 0.6, restitution: 0.3 },
    type: 'Static',
  }))

  const [frontWallRef] = usePlane(() => ({
    position: [0, dimensions.height / 2, -dimensions.length / 2],
    rotation: [0, 0, 0],
    material: { friction: 0.6, restitution: 0.3 },
    type: 'Static',
  }))

  const [backWallRef] = usePlane(() => ({
    position: [0, dimensions.height / 2, dimensions.length / 2],
    rotation: [0, Math.PI, 0],
    material: { friction: 0.6, restitution: 0.3 },
    type: 'Static',
  }))

  // Ceiling wall to prevent boxes from flying upward
  const [ceilingRef] = usePlane(() => ({
    position: [0, dimensions.height, 0],
    rotation: [Math.PI / 2, 0, 0], // Horizontal plane facing downward
    material: { friction: 0.6, restitution: 0.1 },
    type: 'Static',
  }))

  return (
    <>
      <mesh ref={floorRef} visible={false}>
        <planeGeometry args={[dimensions.width, dimensions.length]} />
      </mesh>
      <mesh ref={leftWallRef} visible={false}>
        <planeGeometry args={[dimensions.length, dimensions.height]} />
      </mesh>
      <mesh ref={rightWallRef} visible={false}>
        <planeGeometry args={[dimensions.length, dimensions.height]} />
      </mesh>
      <mesh ref={frontWallRef} visible={false}>
        <planeGeometry args={[dimensions.width, dimensions.height]} />
      </mesh>
      <mesh ref={backWallRef} visible={false}>
        <planeGeometry args={[dimensions.width, dimensions.height]} />
      </mesh>
      <mesh ref={ceilingRef} visible={false}>
        <planeGeometry args={[dimensions.width, dimensions.length]} />
      </mesh>
    </>
  )
}

// Physics simulation controller (simplified - no DOM elements)
export function PhysicsSimulationController() {
  const {
    isSimulationRunning,
    simulationSpeed
  } = useOptimizationStore()

  useFrame((state, delta) => {
    if (isSimulationRunning) {
      // Update global physics state
      const adjustedDelta = delta * simulationSpeed

      // Apply damping to truck velocity
      globalTruckPhysics.velocity.multiplyScalar(PHYSICS_CONSTANTS.AIR_RESISTANCE)
      globalTruckPhysics.angularVelocity.multiplyScalar(PHYSICS_CONSTANTS.AIR_RESISTANCE)

      // Add some random road vibrations for realism
      const vibrationIntensity = 0.02
      globalTruckPhysics.acceleration.y += (Math.random() - 0.5) * vibrationIntensity
    }
  })

  return null
}

// Utility functions for route destinations
export function getAvailableDestinations() {
  try {
    // Check if we're in a browser environment and the store is available
    if (typeof window === 'undefined') {
      return ["Stop 1", "Stop 2", "Stop 3", "Stop 4"] // Default fallback
    }

    const store = useRouteStore.getState()
    
    if (!store || !store.deliveryStops || store.deliveryStops.length === 0) {
      return ["Stop 1", "Stop 2", "Stop 3", "Stop 4"] // Default fallback
    }
    
    return store.deliveryStops.map(stop => stop.name)
  } catch (error) {
    console.warn('Route store not available, using default destinations:', error)
    return ["Stop 1", "Stop 2", "Stop 3", "Stop 4"] // Default fallback
  }
}

// Alternative approach - make it async and lazy-loaded
export async function getAvailableDestinationsAsync() {
  try {
    if (typeof window === 'undefined') {
      return ["Stop 1", "Stop 2", "Stop 3", "Stop 4"]
    }

    const store = useRouteStore.getState()
    
    if (!store?.deliveryStops?.length) {
      return ["Stop 1", "Stop 2", "Stop 3", "Stop 4"]
    }
    
    return store.deliveryStops.map(stop => stop.name)
  } catch (error) {
    console.warn('Route store not available:', error)
    return ["Stop 1", "Stop 2", "Stop 3", "Stop 4"]
  }
}

// Enhanced box renderer with physics and toast notifications
export function EnhancedBoxRenderer({ box }: { box: any }) {
  // Import the route store hook to access delivery stops
  const { deliveryStops } = useRouteStore()

  const getBoxColor = (box: any) => {
    // Priority: Destination > Fragile > Temperature
    if (box.destination) {
      const stopIndex = deliveryStops.findIndex(stop => stop.name === box.destination)
      const colors = ["#d63031", "#e17055", "#00b894", "#0984e3", "#fdcb6e", "#6c5ce7"]
      return colors[stopIndex % colors.length] || "#2d3436"
    }
    if (box.isFragile) return "#d63031"
    switch (box.temperatureZone) {
      case "frozen": return "#0984e3"
      case "cold": return "#6c5ce7"
      default: return "#00b894"
    }
  }

  const getBoxOpacity = (box: any) => {
    return box.isNew ? 0.7 : 1.0
  }

  return (
    <PhysicsBox box={box}>
      <boxGeometry args={[box.width, box.height, box.length]} />
      <meshStandardMaterial
        color={getBoxColor(box)}
        transparent={box.isNew}
        opacity={getBoxOpacity(box)}
        roughness={0.3}
        metalness={0.1}
      />

      {/* ONLY BLACK BORDERS - Same as InteractiveBoxRenderer */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(box.width, box.height, box.length), 1]} />
        <lineBasicMaterial 
          color="#000000"
          transparent={false}
          opacity={1.0}
        />
      </lineSegments>
    </PhysicsBox>
  )
}