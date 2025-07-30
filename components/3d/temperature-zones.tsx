"use client"

import { useOptimizationStore } from "@/store/optimization-store"
import * as THREE from "three"

export function TemperatureZones() {
  const { truckDimensions, temperatureZones } = useOptimizationStore()

  return (
    <group>
      {/* Frozen zone (front section) */}
      <mesh position={[0, truckDimensions.height / 2, truckDimensions.length / 2 - 2]}>
        <boxGeometry args={[truckDimensions.width, truckDimensions.height, 4]} />
        <meshStandardMaterial color="#00bcd4" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Cold zone (middle section) */}
      <mesh position={[0, truckDimensions.height / 2, 0]}>
        <boxGeometry args={[truckDimensions.width, truckDimensions.height, 8]} />
        <meshStandardMaterial color="#2196f3" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Regular zone (back section) */}
      <mesh position={[0, truckDimensions.height / 2, -truckDimensions.length / 2 + 4]}>
        <boxGeometry args={[truckDimensions.width, truckDimensions.height, 8]} />
        <meshStandardMaterial color="#666666" transparent opacity={0.05} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
