"use client"
import { useBox } from "@react-three/cannon"
import { Edges } from "@react-three/drei"

interface TruckContainerProps {
  dimensions: {
    width: number
    length: number
    height: number
  }
}

export function TruckContainer({ dimensions }: TruckContainerProps) {
  const { width, length, height } = dimensions

  // Physics bodies for container walls
  const [floorRef] = useBox(() => ({
    position: [0, -0.05, 0],
    args: [width, 0.1, length],
    type: "Static",
  }))

  const [leftWallRef] = useBox(() => ({
    position: [-width / 2 - 0.05, height / 2, 0],
    args: [0.1, height, length],
    type: "Static",
  }))

  const [rightWallRef] = useBox(() => ({
    position: [width / 2 + 0.05, height / 2, 0],
    args: [0.1, height, length],
    type: "Static",
  }))

  const [backWallRef] = useBox(() => ({
    position: [0, height / 2, -length / 2 - 0.05],
    args: [width, height, 0.1],
    type: "Static",
  }))

  return (
    <group>
      {/* Floor */}
      <mesh ref={floorRef} receiveShadow>
        <boxGeometry args={[width, 0.1, length]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} metalness={0.2} />
        <Edges color="#444444" />
      </mesh>

      {/* Left Wall */}
      <mesh ref={leftWallRef}>
        <boxGeometry args={[0.1, height, length]} />
        <meshStandardMaterial color="#333333" transparent opacity={0.3} roughness={0.9} />
        <Edges color="#555555" />
      </mesh>

      {/* Right Wall */}
      <mesh ref={rightWallRef}>
        <boxGeometry args={[0.1, height, length]} />
        <meshStandardMaterial color="#333333" transparent opacity={0.3} roughness={0.9} />
        <Edges color="#555555" />
      </mesh>

      {/* Back Wall */}
      <mesh ref={backWallRef}>
        <boxGeometry args={[width, height, 0.1]} />
        <meshStandardMaterial color="#333333" transparent opacity={0.3} roughness={0.9} />
        <Edges color="#555555" />
      </mesh>

      {/* Grid lines for reference */}
      <group>
        {Array.from({ length: Math.floor(width) + 1 }, (_, i) => (
          <line key={`grid-x-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([-width / 2 + i, 0.01, -length / 2, -width / 2 + i, 0.01, length / 2])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#444444" opacity={0.3} transparent />
          </line>
        ))}
        {Array.from({ length: Math.floor(length) + 1 }, (_, i) => (
          <line key={`grid-z-${i}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([-width / 2, 0.01, -length / 2 + i, width / 2, 0.01, -length / 2 + i])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#444444" opacity={0.3} transparent />
          </line>
        ))}
      </group>
    </group>
  )
}
