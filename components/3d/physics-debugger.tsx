"use client"

import { Html } from "@react-three/drei"
import { useOptimizationStore } from "@/store/optimization-store"

export function PhysicsDebugger() {
  const { boxes, stabilityScore, safetyScore, physicsStats } = useOptimizationStore()

  const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)
  const centerOfGravity = {
    x: boxes.reduce((sum, box) => sum + box.position.x * box.weight, 0) / totalWeight || 0,
    y: boxes.reduce((sum, box) => sum + box.position.y * box.weight, 0) / totalWeight || 0,
    z: boxes.reduce((sum, box) => sum + box.position.z * box.weight, 0) / totalWeight || 0,
  }

  return null
 
}
