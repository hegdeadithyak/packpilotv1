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

  return (
    <Html position={[-12, 8, 0]} className="pointer-events-none">
      <div className="bg-gray-900/95 text-white p-3 rounded-lg text-xs font-mono border border-gray-600">
        <div className="text-cyan-400 font-bold mb-2">Physics Debug</div>

        <div className="space-y-1">
          <div>Bodies: {boxes.length}</div>
          <div>Total Weight: {totalWeight.toFixed(1)} lbs</div>

          <div className="mt-2 text-yellow-400">Center of Gravity:</div>
          <div>X: {centerOfGravity.x.toFixed(2)}</div>
          <div>Y: {centerOfGravity.y.toFixed(2)}</div>
          <div>Z: {centerOfGravity.z.toFixed(2)}</div>

          <div className="mt-2">
            <div
              className={`${stabilityScore > 80 ? "text-green-400" : stabilityScore > 60 ? "text-yellow-400" : "text-red-400"}`}
            >
              Stability: {stabilityScore.toFixed(1)}%
            </div>
            <div
              className={`${safetyScore > 80 ? "text-green-400" : safetyScore > 60 ? "text-yellow-400" : "text-red-400"}`}
            >
              Safety: {safetyScore.toFixed(1)}%
            </div>
          </div>

          {physicsStats && (
            <div className="mt-2 text-gray-400">
              <div>Collisions: {physicsStats.collisions}</div>
              <div>Contacts: {physicsStats.contacts}</div>
            </div>
          )}
        </div>
      </div>
    </Html>
  )
}
