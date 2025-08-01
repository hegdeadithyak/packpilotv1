"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, PerspectiveCamera, Html, Stats } from "@react-three/drei"
import { Physics } from "@react-three/cannon"
import { Suspense, useRef, useEffect, useState } from "react"
import { TruckContainer } from "@/components/3d/truck-container"
import { TemperatureZones } from "@/components/3d/temperature-zones"
import { LoadingIndicators } from "@/components/3d/loading-indicators"
import { PhysicsDebugger } from "@/components/3d/physics-debugger"
import { TwoDRenderer } from "@/components/2d/two-d-renderer"
import { useOptimizationStore } from "@/store/optimization-store"
import { useFrame } from "@react-three/fiber"
import { 
  PhysicsSimulationController, 
  EnhancedBoxRenderer, 
  TruckBedPhysics,
  useTruckPhysics 
} from "@/physics/truck-physics-system"


interface TruckVisualizationProps {
  viewMode: "3d" | "2d" | "hybrid"
}

// Import HDRI environment
import { suspend } from 'suspend-react'
const bridge = import('@pmndrs/assets/hdri/warehouse.exr')

function PerformanceStats() {
  const [fps, setFps] = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const [renderTime, setRenderTime] = useState(0)
  const [physicsObjects, setPhysicsObjects] = useState(0)
  const lastTime = useRef(performance.now())
  const frameStart = useRef(0)
  const { boxes, isSimulationRunning } = useOptimizationStore()

  useFrame(() => {
    const currentTime = performance.now()
    frameStart.current = currentTime

    setFrameCount((prev) => prev + 1)
    setPhysicsObjects(boxes.length)

    if (currentTime - lastTime.current >= 1000) {
      setFps(frameCount)
      setFrameCount(0)
      lastTime.current = currentTime
    }

    // Measure render time
    requestAnimationFrame(() => {
      setRenderTime(performance.now() - frameStart.current)
    })
  })

  return (
    <Html position={[12, 8, 0]} className="pointer-events-none">
      <div className="bg-black/90 text-white p-3 rounded text-xs font-mono border border-gray-600">
        <div className={`${fps > 60 ? "text-green-400" : fps > 30 ? "text-yellow-400" : "text-red-400"}`}>
          FPS: {fps}
        </div>
        <div className="text-cyan-400">Render: {renderTime.toFixed(2)}ms</div>
        <div className="text-blue-400">Physics Objects: {physicsObjects}</div>
        <div className={`${isSimulationRunning ? "text-green-400" : "text-gray-400"}`}>
          Physics: {isSimulationRunning ? "ACTIVE" : "IDLE"}
        </div>
        <div className="text-gray-400">WebGL 2.0</div>
      </div>
    </Html>
  )
}

function CameraController() {
  const { truckDimensions } = useOptimizationStore()

  return (
    <OrbitControls
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      maxPolarAngle={Math.PI / 2.1}
      minDistance={8}
      maxDistance={60}
      panSpeed={1.2}
      rotateSpeed={0.8}
      zoomSpeed={1.5}
      target={[0, truckDimensions.height / 2, 0]}
      enableDamping={true}
      dampingFactor={0.05}
    />
  )
}

function PhysicsStatusIndicator() {
  const { isSimulationRunning, simulationForces } = useOptimizationStore()
  const truckPhysics = useTruckPhysics()

  if (!isSimulationRunning) return null

  return (
    <Html position={[-12, 8, 0]} className="pointer-events-none">
      <div className="bg-red-900/90 text-white p-3 rounded text-xs font-mono border border-red-600">
        <div className="text-red-300 font-bold mb-2">🚛 TRUCK SIMULATION</div>
        
        {truckPhysics.isAccelerating && (
          <div className="text-green-400">⬆️ ACCELERATING ({simulationForces.acceleration}g)</div>
        )}
        {truckPhysics.isBraking && (
          <div className="text-red-400">⬇️ BRAKING ({simulationForces.braking}g)</div>
        )}
        {truckPhysics.isTurning && (
          <div className="text-yellow-400">
            {truckPhysics.turnDirection < 0 ? "⬅️" : "➡️"} TURNING ({simulationForces.turning}g)
          </div>
        )}
        
        <div className="text-gray-300 mt-2">
          Gravity: {simulationForces.gravity}g
        </div>
      </div>
    </Html>
  )
}

function Scene() {
  const { boxes, physicsEnabled, truckDimensions, updatePhysics } = useOptimizationStore()

  useEffect(() => {
    // Update physics calculations when boxes change
    updatePhysics()
  }, [boxes, updatePhysics])

  return (
    <>
      <PerspectiveCamera makeDefault position={[20, 15, 20]} fov={50} near={0.1} far={1000} />

      <CameraController />

      {/* Enhanced Lighting Setup */}
      <Environment files={suspend(bridge).default} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight position={[0, 15, 0]} intensity={0.4} />
      <pointLight position={[-10, 10, 10]} intensity={0.3} color="#4fc3f7" />

      {/* Truck Container (Visual Only) */}
      <TruckContainer dimensions={truckDimensions} />
      <TemperatureZones />
      <LoadingIndicators />

      {/* Physics Boundaries (Invisible collision planes) */}
      <TruckBedPhysics dimensions={truckDimensions} />

      {/* Physics Simulation Controller */}
      <PhysicsSimulationController />

      {/* Enhanced Box Rendering with Physics */}
      {boxes.map((box) => (
        <EnhancedBoxRenderer key={box.id} box={box} />
      ))}

      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Grid Helper */}
      <gridHelper args={[100, 50, "#333333", "#1a1a1a"]} position={[0, 0, 0]} />

      {/* Performance and Physics Stats */}
      <PerformanceStats />
      <PhysicsStatusIndicator />

      {/* Physics Debugger */}
      {physicsEnabled && <PhysicsDebugger />}
    </>
  )
}

export function TruckVisualization({ viewMode }: TruckVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { physicsEnabled } = useOptimizationStore()

  useEffect(() => {
    if (canvasRef.current) {
      const gl = canvasRef.current.getContext("webgl2")
      if (gl) {
        // Enable high-performance rendering optimizations
        gl.getExtension("EXT_texture_filter_anisotropic")
        gl.getExtension("WEBGL_compressed_texture_s3tc")
        gl.getExtension("OES_texture_float")
        gl.getExtension("WEBGL_depth_texture")
      }
    }
  }, [])

  if (viewMode === "2d") {
    return <TwoDRenderer />
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* 2D Overlay for Hybrid Mode */}
      {viewMode === "hybrid" && (
        <div className="absolute top-4 right-4 z-10 w-64 h-48 border border-gray-600 bg-gray-900/95 rounded-lg overflow-hidden">
          <TwoDRenderer isOverlay />
        </div>
      )}

      {/* Performance Monitor Overlay */}
      <div className="absolute top-4 left-4 z-10">
        <Stats />
      </div>

      <Canvas
        ref={canvasRef}
        shadows="soft"
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: true,
          precision: "highp",
        }}
        dpr={[1, 2]}
        performance={{ min: 0.8 }}
        frameloop="always"
        camera={{ position: [20, 15, 20], fov: 50 }}
      >
        <Suspense
          fallback={
            <Html center>
              <div className="text-white bg-gray-900/80 p-4 rounded">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading 3D Scene...
              </div>
            </Html>
          }
        >
          {/* Enhanced Physics World */}
          <Physics
            gravity={[0, -9.81, 0]}
            iterations={20}
            broadphase="SAP"
            allowSleep={true}
            defaultContactMaterial={{
              friction: 0.6,
              restitution: 0.3,
              contactEquationStiffness: 1e8,
              contactEquationRelaxation: 3,
            }}
            size={4096}
            axisIndex={0}
          >
            <Scene />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  )
}