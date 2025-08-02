"use client"

import { useRef, useState, useEffect } from "react"
import { useBox } from "@react-three/cannon"
import { Edges, Text, Html } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useOptimizationStore } from "@/store/optimization-store"
import type { Box } from "@/types/box"
import type * as THREE from "three"

interface BoxRendererProps {
  box: Box
}

export function BoxRenderer({ box }: BoxRendererProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [selected, setSelected] = useState(false)
  const [isColliding, setIsColliding] = useState(false)
  const { updateBoxPosition, checkCollisions } = useOptimizationStore()

  // Physics body with realistic properties
  const [ref, api] = useBox(() => ({
    mass: box.weight / 100, // Convert lbs to reasonable physics mass
    position: [box.position.x, box.position.y, box.position.z],
    args: [box.width, box.height, box.length],
    material: {
      friction: box.isFragile ? 0.8 : 0.4,
      restitution: box.isFragile ? 0.1 : 0.3,
    },
    type: "Dynamic",
    allowSleep: true,
    sleepSpeedLimit: 0.1,
    sleepTimeLimit: 1,
  }))

  // Subscribe to physics position updates
  useEffect(() => {
    const unsubscribe = api.position.subscribe((position) => {
      updateBoxPosition(box.id, {
        x: position[0],
        y: position[1],
        z: position[2],
      })
    })

    return unsubscribe
  }, [api.position, box.id, updateBoxPosition])

  // Collision detection
  useEffect(() => {
    const collisions = checkCollisions(box.id)
    setIsColliding(collisions.length > 0)
  }, [box.position, checkCollisions, box.id])

  // Temperature-based color coding with enhanced materials
  const getBoxMaterial = () => {
    let baseColor = "#666666"
    let emissive = "#000000"

    if (selected) {
      baseColor = "#00ff88"
      emissive = "#003322"
    } else if (hovered) {
      baseColor = "#ffffff"
      emissive = "#111111"
    } else if (isColliding) {
      baseColor = "#ff4444"
      emissive = "#330000"
    } else {
      switch (box.temperatureZone) {
        case "frozen":
          baseColor = "#00bcd4"
          emissive = "#001a1f"
          break
        case "cold":
          baseColor = "#2196f3"
          emissive = "#001122"
          break
        case "regular":
          baseColor = "#666666"
          emissive = "#000000"
          break
      }
    }

    return {
      color: baseColor,
      emissive,
      roughness: box.isFragile ? 0.3 : 0.7,
      metalness: box.isFragile ? 0.8 : 0.1,
      transparent: box.isFragile,
      opacity: box.isFragile ? 0.9 : 1.0,
    }
  }

  // Animation for newly added boxes
  useFrame((state) => {
    if (meshRef.current && box.isNew) {
      const time = state.clock.getElapsedTime()
      const scale = 1 + Math.sin(time * 8) * 0.03
      meshRef.current.scale.setScalar(scale)
    }
  })

  const material = getBoxMaterial()

  return (
    <group>
      <mesh
        ref={meshRef}
        // @ts-ignore
        ref={ref}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = "default"
        }}
        onClick={(e) => {
          e.stopPropagation()
          setSelected(!selected)
        }}
      >
        <boxGeometry args={[box.width, box.height, box.length]} />
        <meshStandardMaterial {...material} />
        <Edges
          color={box.isFragile ? "#ff9800" : isColliding ? "#ff0000" : "#333333"}
          lineWidth={box.isFragile || isColliding ? 3 : 1}
        />
      </mesh>

      {/* Enhanced Box Labels */}
      {(hovered || selected) && (
        <Html position={[box.position.x, box.position.y + box.height / 2 + 1, box.position.z]}>
          <div className="bg-gray-900/95 text-white p-2 rounded-lg text-xs min-w-32 border border-gray-600">
            <div className="font-bold text-cyan-400">{box.name}</div>
            <div className="text-gray-300">
              {box.width}×{box.height}×{box.length} ft
            </div>
            <div className="text-gray-300">{box.weight} lbs</div>
            <div className="flex items-center space-x-1 mt-1">
              <span
                className={`px-1 py-0.5 rounded text-xs ${
                  box.temperatureZone === "frozen"
                    ? "bg-cyan-900 text-cyan-300"
                    : box.temperatureZone === "cold"
                      ? "bg-blue-900 text-blue-300"
                      : "bg-gray-600 text-gray-300"
                }`}
              >
                {box.temperatureZone.toUpperCase()}
              </span>
              {box.isFragile && (
                <span className="px-1 py-0.5 bg-orange-900 text-orange-300 rounded text-xs">FRAGILE</span>
              )}
            </div>
            <div className="text-gray-400 mt-1">→ {box.destination}</div>
            {isColliding && <div className="text-red-400 mt-1 font-bold">⚠ COLLISION</div>}
          </div>
        </Html>
      )}

      {/* Weight indicator for selected boxes */}
      {selected && (
        <Text
          position={[box.position.x, box.position.y - box.height / 2 - 0.5, box.position.z]}
          fontSize={0.3}
          color="#00bcd4"
          anchorX="center"
          anchorY="middle"
        >
          {box.weight} lbs
        </Text>
      )}

      {/* Stability indicator */}
      {selected && (
        <Text
          position={[box.position.x, box.position.y + box.height / 2 + 0.8, box.position.z]}
          fontSize={0.25}
          color={isColliding ? "#ff4444" : "#44ff44"}
          anchorX="center"
          anchorY="middle"
        >
          {isColliding ? "UNSTABLE" : "STABLE"}
        </Text>
      )}
    </group>
  )
}
