// Enhanced physics system for truck simulation
"use client"

import { useFrame } from "@react-three/fiber"
import { useBox, usePlane } from "@react-three/cannon"
import { useOptimizationStore } from "@/store/optimization-store"
import { useRef, useEffect } from "react"
import * as THREE from "three"

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

// Hook to control truck physics simulation
export function useTruckPhysics() {
  const { simulationForces, isSimulationRunning } = useOptimizationStore()

  useEffect(() => {
    if (isSimulationRunning) {
      // Simulate different driving scenarios
      const scenario = Math.floor(Math.random() * 4)

      switch (scenario) {
        case 0: // Acceleration
          globalTruckPhysics.isAccelerating = true
          globalTruckPhysics.acceleration.z = -simulationForces.acceleration
          break
        case 1: // Braking
          globalTruckPhysics.isBraking = true
          globalTruckPhysics.acceleration.z = simulationForces.braking
          break
        case 2: // Left turn
          globalTruckPhysics.isTurning = true
          globalTruckPhysics.turnDirection = -1
          globalTruckPhysics.acceleration.x = simulationForces.turning
          break
        case 3: // Right turn
          globalTruckPhysics.isTurning = true
          globalTruckPhysics.turnDirection = 1
          globalTruckPhysics.acceleration.x = -simulationForces.turning
          break
      }

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

// Enhanced physics box component
interface PhysicsBoxProps {
  box: any
  children?: React.ReactNode
}

export function PhysicsBox({ box, children }: PhysicsBoxProps) {
  const { simulationForces, isSimulationRunning, simulationSpeed } = useOptimizationStore()

  const [ref, api] = useBox(() => ({
    mass: box.weight / 5, // Convert to reasonable physics mass
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
      truckForce.z += simulationForces.acceleration * (box.weight / 100)
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

// Truck bed physics boundary
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

  // ADDED: Ceiling wall to prevent boxes from flying upward
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
      {/* ADDED: Ceiling mesh */}
      <mesh ref={ceilingRef} visible={false}>
        <planeGeometry args={[dimensions.width, dimensions.length]} />
      </mesh>
    </>
  )
}

// Physics simulation controller
export function PhysicsSimulationController() {
  const {
    isSimulationRunning,
    simulationForces,
    runSimulation,
    stopSimulation,
    simulationSpeed
  } = useOptimizationStore()

  const truckPhysics = useTruckPhysics()

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

// Enhanced box renderer that uses physics
export function EnhancedBoxRenderer({ box }: { box: any }) {
  const getBoxColor = (box: any) => {
    if (box.isFragile) return "#ff6b6b"
    switch (box.temperatureZone) {
      case "frozen": return "#74c0fc"
      case "cold": return "#91a7ff"
      default: return "#51cf66"
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

      {/* Box label */}
      <mesh position={[0, box.height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[box.width * 0.8, box.length * 0.8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
    </PhysicsBox>
  )
}