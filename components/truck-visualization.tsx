"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, PerspectiveCamera, Html, Stats, TransformControls } from "@react-three/drei"
import { Physics } from "@react-three/cannon"
import { Suspense, useRef, useEffect, useState, useMemo, useCallback } from "react"
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
import * as THREE from "three"

interface TruckVisualizationProps {
  viewMode: "3d" | "2d" | "hybrid"
}

interface HoveredBoxInfo {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  dimensions: { width: number; height: number; length: number }
  weight: number
  isFragile: boolean
  temperatureZone: string
  destination: string
  screenPosition: { x: number; y: number }
}

interface SelectedBoxInfo {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  isRotated: boolean // Track if box is rotated 90 degrees
}

// Global state to avoid re-renders
let globalHoveredBox: HoveredBoxInfo | null = null
let globalSelectedBox: SelectedBoxInfo | null = null
let globalHoverCallbacks: Set<(box: HoveredBoxInfo | null) => void> = new Set()
let globalSelectCallbacks: Set<(box: SelectedBoxInfo | null) => void> = new Set()

// Import HDRI environment
import { suspend } from 'suspend-react'
const bridge = import('@pmndrs/assets/hdri/warehouse.exr')

// Enhanced Box Tooltip Component (unchanged display, just shows properties)
function BoxTooltip({ hoveredBox }: { hoveredBox: HoveredBoxInfo | null }) {
  const { isSimulationRunning } = useOptimizationStore()
  
  // Don't show tooltip during simulation
  if (!hoveredBox || isSimulationRunning) return null

  return (
    <div 
      className="fixed pointer-events-none z-50 bg-gray-900/95 text-white p-3 rounded-lg border border-gray-600 shadow-xl backdrop-blur-sm"
      style={{
        left: hoveredBox.screenPosition.x + 15,
        top: hoveredBox.screenPosition.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="text-sm font-semibold text-cyan-400 mb-2">{hoveredBox.name}</div>
      
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">ID:</span>
          <span className="text-white font-mono">{hoveredBox.id}</span>
        </div>
        
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Dimensions:</span>
          <span className="text-white font-mono">
            {hoveredBox.dimensions.width}×{hoveredBox.dimensions.height}×{hoveredBox.dimensions.length} ft
          </span>
        </div>
        
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Weight:</span>
          <span className="text-white font-mono">{hoveredBox.weight} lbs</span>
        </div>
        
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Position:</span>
          <span className="text-white font-mono">
            X:{hoveredBox.position.x.toFixed(1)}, Y:{hoveredBox.position.y.toFixed(1)}, Z:{hoveredBox.position.z.toFixed(1)}
          </span>
        </div>
        
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Temperature:</span>
          <span className={`font-medium ${
            hoveredBox.temperatureZone === 'frozen' ? 'text-blue-400' :
            hoveredBox.temperatureZone === 'cold' ? 'text-cyan-400' : 'text-green-400'
          }`}>
            {hoveredBox.temperatureZone.toUpperCase()}
          </span>
        </div>
        
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Destination:</span>
          <span className={`font-medium ${
            hoveredBox.destination === 'Stop 1' ? 'text-red-400' :
            hoveredBox.destination === 'Stop 2' ? 'text-orange-400' :
            hoveredBox.destination === 'Stop 3' ? 'text-green-400' :
            hoveredBox.destination === 'Stop 4' ? 'text-blue-400' : 'text-yellow-400'
          }`}>
            {hoveredBox.destination}
          </span>
        </div>
        
        {hoveredBox.isFragile && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-300">Special:</span>
            <span className="text-red-400 font-medium">⚠️ FRAGILE</span>
          </div>
        )}
      </div>
      
      {/* Volume and density calculations */}
      <div className="mt-2 pt-2 border-t border-gray-700 space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Volume:</span>
          <span className="text-white font-mono">
            {(hoveredBox.dimensions.width * hoveredBox.dimensions.height * hoveredBox.dimensions.length).toFixed(1)} ft³
          </span>
        </div>
        
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Density:</span>
          <span className="text-white font-mono">
            {(hoveredBox.weight / (hoveredBox.dimensions.width * hoveredBox.dimensions.height * hoveredBox.dimensions.length)).toFixed(1)} lbs/ft³
          </span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
        💡 Click to select and manipulate
      </div>
    </div>
  )
}

// Manual Box Control Panel
function BoxControlPanel({ selectedBox }: { selectedBox: SelectedBoxInfo | null }) {
  const { updateBoxPosition, updateBox } = useOptimizationStore()
  const [localPosition, setLocalPosition] = useState({ x: 0, y: 0, z: 0 })
  const [localRotation, setLocalRotation] = useState(false)
  
  // Sync local state with selected box
  useEffect(() => {
    if (selectedBox) {
      setLocalPosition(selectedBox.position)
      setLocalRotation(selectedBox.isRotated || false)
    }
  }, [selectedBox?.id]) // Only update when box changes, not position
  
  if (!selectedBox) return null

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...localPosition, [axis]: value }
    setLocalPosition(newPosition)
    
    // Update store with debouncing
    updateBoxPosition(selectedBox.id, newPosition)
    
    // Update global state for real-time visual feedback
    if (globalSelectedBox) {
      globalSelectedBox.position = newPosition
    }
  }

  const handleRotationToggle = () => {
    const newRotation = !localRotation
    setLocalRotation(newRotation)
    
    // Update the box in store with rotation info
    updateBox(selectedBox.id, { 
      isRotated: newRotation,
      // Swap width and length when rotating
      ...(newRotation ? {
        width: selectedBox.name.includes('width') ? parseFloat(selectedBox.name.split('×')[1]) : undefined,
        length: selectedBox.name.includes('width') ? parseFloat(selectedBox.name.split('×')[0]) : undefined
      } : {})
    })
    
    // Update global state
    if (globalSelectedBox) {
      globalSelectedBox.isRotated = newRotation
      globalSelectedBox.rotation.y = newRotation ? Math.PI / 2 : 0
    }
  }

  return (
    <div className="absolute top-20 right-4 z-10 bg-gray-900/95 text-white p-4 rounded-lg border border-gray-600 shadow-xl backdrop-blur-sm">
      <div className="text-sm font-semibold text-cyan-400 mb-3">Manual Control: {selectedBox.name}</div>
      
      <div className="space-y-3 text-xs">
        {/* Orientation Control */}
        <div className="pb-2 border-b border-gray-700">
          <label className="text-gray-300 block mb-2">Orientation:</label>
          <div className="flex gap-2">
            <button
              onClick={handleRotationToggle}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                !localRotation 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              Horizontal
            </button>
            <button
              onClick={handleRotationToggle}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                localRotation 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              Vertical
            </button>
          </div>
          <div className="text-gray-400 mt-1">
            {localRotation ? "📦 Rotated 90°" : "📦 Default orientation"}
          </div>
        </div>
        
        <div>
          <label className="text-gray-300 block mb-1">Position X:</label>
          <input
            type="range"
            min={-12}
            max={12}
            step={0.1}
            value={localPosition.x}
            onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-mono">{localPosition.x.toFixed(1)}</span>
        </div>
        
        <div>
          <label className="text-gray-300 block mb-1">Position Y:</label>
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.1}
            value={localPosition.y}
            onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-mono">{localPosition.y.toFixed(1)}</span>
        </div>
        
        <div>
          <label className="text-gray-300 block mb-1">Position Z:</label>
          <input
            type="range"
            min={-14}
            max={14}
            step={0.1}
            value={localPosition.z}
            onChange={(e) => handlePositionChange('z', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-mono">{localPosition.z.toFixed(1)}</span>
        </div>
        
        <div className="pt-2 border-t border-gray-700">
          <button
            onClick={() => {
              globalSelectedBox = null
              globalSelectCallbacks.forEach(callback => callback(null))
            }}
            className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
          >
            Deselect Box
          </button>
        </div>
      </div>
    </div>
  )
}

// Optimized Interactive Box Renderer with Local State
function InteractiveBoxRenderer({ box }: { box: any }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isSelected, setIsSelected] = useState(false)
  const [localPosition, setLocalPosition] = useState(box.position)
  const [localRotation, setLocalRotation] = useState(box.isRotated || false)
  const { isSimulationRunning } = useOptimizationStore()
  
  // Check if this box is selected
  useEffect(() => {
    const checkSelection = (selectedBox: SelectedBoxInfo | null) => {
      const selected = selectedBox?.id === box.id
      setIsSelected(selected)
      
      // Update local state from global state for real-time movement
      if (selected && selectedBox) {
        setLocalPosition(selectedBox.position)
        setLocalRotation(selectedBox.isRotated || false)
      }
    }
    globalSelectCallbacks.add(checkSelection)
    return () => { globalSelectCallbacks.delete(checkSelection) }
  }, [box.id])
  
  // Update local position only when box position changes significantly
  useEffect(() => {
    const threshold = 0.1
    if (Math.abs(localPosition.x - box.position.x) > threshold ||
        Math.abs(localPosition.y - box.position.y) > threshold ||
        Math.abs(localPosition.z - box.position.z) > threshold) {
      setLocalPosition(box.position)
    }
  }, [box.position])
  
  // Update mesh position directly without re-render
  useFrame(() => {
    if (groupRef.current && (isSelected || localPosition !== box.position)) {
      groupRef.current.position.set(localPosition.x, localPosition.y, localPosition.z)
      groupRef.current.rotation.y = localRotation ? Math.PI / 2 : 0
    }
  })
  
  const handlePointerEnter = useCallback((event: any) => {
    if (isSimulationRunning) return
    
    event.stopPropagation()
    setIsHovered(true)
    
    const screenPosition = {
      x: event.clientX || event.nativeEvent?.clientX || 0,
      y: event.clientY || event.nativeEvent?.clientY || 0
    }
    
    const hoveredInfo: HoveredBoxInfo = {
      id: box.id,
      name: box.name,
      position: localPosition,
      dimensions: { width: box.width, height: box.height, length: box.length },
      weight: box.weight,
      isFragile: box.isFragile,
      temperatureZone: box.temperatureZone,
      destination: box.destination,
      screenPosition
    }
    
    globalHoveredBox = hoveredInfo
    globalHoverCallbacks.forEach(callback => callback(hoveredInfo))
  }, [box, localPosition, isSimulationRunning])
  
  const handlePointerLeave = useCallback((event: any) => {
    if (isSimulationRunning) return
    
    event.stopPropagation()
    setIsHovered(false)
    
    globalHoveredBox = null
    globalHoverCallbacks.forEach(callback => callback(null))
  }, [isSimulationRunning])
  
  const handlePointerMove = useCallback((event: any) => {
    if (!isHovered || isSimulationRunning) return
    
    const screenPosition = {
      x: event.clientX || event.nativeEvent?.clientX || 0,
      y: event.clientY || event.nativeEvent?.clientY || 0
    }
    
    if (globalHoveredBox) {
      globalHoveredBox.screenPosition = screenPosition
      globalHoverCallbacks.forEach(callback => callback(globalHoveredBox))
    }
  }, [isHovered, isSimulationRunning])

  const handleClick = useCallback((event: any) => {
    if (isSimulationRunning) return
    
    event.stopPropagation()
    
    const selectedInfo: SelectedBoxInfo = {
      id: box.id,
      name: box.name,
      position: localPosition,
      rotation: { x: 0, y: localRotation ? Math.PI / 2 : 0, z: 0 },
      isRotated: localRotation
    }
    
    globalSelectedBox = selectedInfo
    globalSelectCallbacks.forEach(callback => callback(selectedInfo))
  }, [box, localPosition, localRotation, isSimulationRunning])

  const getBoxColor = (box: any) => {
    // Color based on fragile and temperature (no color change on hover)
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
    <group ref={groupRef} position={[localPosition.x, localPosition.y, localPosition.z]}>
      <mesh 
        ref={meshRef}
        rotation={[0, localRotation ? Math.PI / 2 : 0, 0]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[box.width, box.height, box.length]} />
        <meshStandardMaterial
          color={getBoxColor(box)}
          transparent={box.isNew}
          opacity={getBoxOpacity(box)}
          roughness={0.3}
          metalness={0.1}
          // Add subtle highlight for hovered boxes
          emissive={isHovered ? "#222222" : "#000000"}
          emissiveIntensity={isHovered ? 0.1 : 0}
        />
        
        {/* Box label - more visible */}
        <mesh position={[0, box.height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[box.width * 0.8, box.length * 0.8]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.9} 
          />
        </mesh>
      </mesh>
      
      {/* Selection indicator */}
      {isSelected && (
        <mesh rotation={[0, localRotation ? Math.PI / 2 : 0, 0]}>
          <boxGeometry args={[box.width + 0.1, box.height + 0.1, box.length + 0.1]} />
          <meshBasicMaterial 
            color="#ffff00" 
            transparent 
            opacity={0.3}
            wireframe 
          />
        </mesh>
      )}
      
      {/* Rotation indicator */}
      {localRotation && (
        <mesh position={[0, box.height / 2 + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial 
            color="#00ff00" 
            transparent 
            opacity={0.8} 
          />
        </mesh>
      )}
    </group>
  )
}

function PerformanceStats() {
  const [fps, setFps] = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const [renderTime, setRenderTime] = useState(0)
  const [physicsObjects, setPhysicsObjects] = useState(0)
  const lastTime = useRef(performance.now())
  const frameStart = useRef(0)
  const { boxes, isSimulationRunning, optimizeLayout } = useOptimizationStore()

  const handleOptimize = () => {
    console.log('🔄 Optimize button clicked from PerformanceStats')
    optimizeLayout()
  }

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
    <Html position={[12, 8, 0]} className="pointer-events-auto">
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
        
        {/* Optimize Button */}
        <button
          onClick={handleOptimize}
          disabled={boxes.length === 0}
          className={`
            mt-2 px-3 py-1 rounded text-xs font-medium transition-all duration-200
            ${boxes.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }
          `}
        >
          Optimize ({boxes.length})
        </button>
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
    <Html position={[-12, 6, 0]} className="pointer-events-none">
      <div className="bg-red-900/95 text-white p-3 rounded text-xs font-mono border border-red-600 shadow-xl backdrop-blur-sm">
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
  const { boxes, physicsEnabled, truckDimensions, updatePhysics, isSimulationRunning } = useOptimizationStore()
  
  // Force re-render when boxes change
  const boxesKey = useMemo(() => {
    return boxes.map(b => `${b.id}-${b.position.x}-${b.position.y}-${b.position.z}`).join(',')
  }, [boxes])

  useEffect(() => {
    console.log('📊 Scene updated with', boxes.length, 'boxes')
    updatePhysics()
  }, [boxes, updatePhysics])

  // Create memoized box renderers - use physics or interactive based on simulation state
  const boxRenderers = useMemo(() => {
    console.log('🔄 Re-creating box renderers for', boxes.length, 'boxes')
    return boxes.map((box) => (
      isSimulationRunning ? (
        <EnhancedBoxRenderer key={`physics-${box.id}-${boxesKey}`} box={box} />
      ) : (
        <InteractiveBoxRenderer key={`interactive-${box.id}-${boxesKey}`} box={box} />
      )
    ))
  }, [boxes, boxesKey, isSimulationRunning])

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

      {/* Enhanced Box Rendering with Hover Support */}
      {boxRenderers}

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
  const { physicsEnabled, boxes, optimizeLayout, isSimulationRunning } = useOptimizationStore()
  const [forceUpdate, setForceUpdate] = useState(0)
  const [hoveredBox, setHoveredBox] = useState<HoveredBoxInfo | null>(null)
  const [selectedBox, setSelectedBox] = useState<SelectedBoxInfo | null>(null)

  // Register hover callback
  useEffect(() => {
    const hoverCallback = (box: HoveredBoxInfo | null) => setHoveredBox(box)
    globalHoverCallbacks.add(hoverCallback)
    return () => { globalHoverCallbacks.delete(hoverCallback) }
  }, [])

  // Register selection callback
  useEffect(() => {
    const selectCallback = (box: SelectedBoxInfo | null) => setSelectedBox(box)
    globalSelectCallbacks.add(selectCallback)
    return () => { globalSelectCallbacks.delete(selectCallback) }
  }, [])

  // Clear hover and selection state when simulation starts
  useEffect(() => {
    if (isSimulationRunning) {
      setHoveredBox(null)
      setSelectedBox(null)
      globalHoveredBox = null
      globalSelectedBox = null
      globalHoverCallbacks.forEach(callback => callback(null))
      globalSelectCallbacks.forEach(callback => callback(null))
    }
  }, [isSimulationRunning])

  // Force re-render when boxes change
  useEffect(() => {
    console.log('🔄 TruckVisualization: Boxes changed, forcing update')
    setForceUpdate(prev => prev + 1)
  }, [boxes])

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

  const handleOptimize = () => {
    console.log('🔄 Optimize button clicked from TruckVisualization')
    optimizeLayout()
  }

  if (viewMode === "2d") {
    return <TwoDRenderer />
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Box Tooltip */}
      <BoxTooltip hoveredBox={hoveredBox} />
      
      {/* Manual Control Panel */}
      <BoxControlPanel selectedBox={selectedBox} />
      
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

      {/* Interaction Instructions */}
      {!isSimulationRunning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gray-900/90 text-white px-3 py-1 rounded text-xs border border-gray-600">
            💡 Hover for properties • Click to select • Use controls to move/rotate
          </div>
        </div>
      )}

      {/* Simulation Status */}
      {isSimulationRunning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-red-900/95 text-white px-4 py-2 rounded text-sm border border-red-600 animate-pulse shadow-xl backdrop-blur-sm">
            🚛 PHYSICS SIMULATION ACTIVE - Manual controls disabled
          </div>
        </div>
      )}

      {/* Optimize Button Overlay */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={handleOptimize}
          disabled={boxes.length === 0}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg
            ${boxes.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 hover:shadow-xl'
            }
          `}
        >
          🚛 Optimize Layout ({boxes.length} boxes)
        </button>
      </div>

      <Canvas
        key={`canvas-${forceUpdate}`}
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
            <Scene key={`scene-${forceUpdate}`} />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  )
}