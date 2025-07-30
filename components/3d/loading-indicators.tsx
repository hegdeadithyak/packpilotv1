"use client"

import { Text } from "@react-three/drei"
import { useOptimizationStore } from "@/store/optimization-store"

export function LoadingIndicators() {
  const { loadingSequence, boxes, truckDimensions } = useOptimizationStore()

  return (
    <group>
      {/* Loading sequence numbers */}
      {loadingSequence.slice(0, 10).map((boxId, index) => {
        const box = boxes.find((b) => b.id === boxId)
        if (!box) return null

        return (
          <Text
            key={boxId}
            position={[box.position.x, box.position.y + box.height / 2 + 0.8, box.position.z]}
            fontSize={0.4}
            color="#00ff88"
            anchorX="center"
            anchorY="middle"
          >
            #{index + 1}
          </Text>
        )
      })}

      {/* Truck capacity indicator */}
      <Text
        position={[0, truckDimensions.height + 1, truckDimensions.length / 2]}
        fontSize={0.6}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        28ft Delivery Truck
      </Text>
    </group>
  )
}
