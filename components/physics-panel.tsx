"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useOptimizationStore } from "@/store/optimization-store"
import { Zap, Activity, AlertTriangle, CheckCircle } from "lucide-react"

export function PhysicsPanel() {
  const { physicsEnabled, setPhysicsEnabled, boxes, truckDimensions, optimizationScore } = useOptimizationStore()

  const [accelerationForce, setAccelerationForce] = useState(0.4)
  const [brakingForce, setBrakingForce] = useState(0.8)
  const [turningForce, setTurningForce] = useState(0.5)
  const [gravityMultiplier, setGravityMultiplier] = useState(1.0)
  const [physicsStats, setPhysicsStats] = useState({ collisions: 0, contacts: 0, stability: 100 })
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)
  
  const workerRef = useRef<Worker | null>(null)
  const messageIdRef = useRef(0)

  // Initialize physics worker
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(new URL('../workers/physics-worker.ts', import.meta.url))
      
      workerRef.current.onmessage = (event) => {
        const { type, payload, id } = event.data
        
        switch (type) {
          case 'SIMULATION_UPDATE':
            setPhysicsStats(payload.stats)
            break
          case 'OPTIMAL_PLACEMENT_FOUND':
            console.log('Optimal placements found:', payload.solutions)
            break
          case 'ERROR':
            console.error('Physics worker error:', payload)
            break
        }
      }
      
      // Initialize the physics engine
      sendWorkerMessage('INITIALIZE', {})
      sendWorkerMessage('CREATE_TRUCK', { dimensions: truckDimensions })
    }
    
    return () => {
      if (workerRef.current) {
        sendWorkerMessage('DESTROY', {})
        workerRef.current.terminate()
      }
    }
  }, [])

  // Send message to worker
  const sendWorkerMessage = (type: string, payload: any) => {
    if (workerRef.current) {
      const id = `msg_${messageIdRef.current++}`
      workerRef.current.postMessage({ type, payload, id })
      return id
    }
    return null
  }

  // Physics calculations
  const calculateStabilityScore = () => {
    if (boxes.length === 0) return 100

    let stabilityScore = 100
    const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)

    // Center of gravity calculation
    const centerOfGravity = {
      x: boxes.reduce((sum, box) => sum + box.position.x * box.weight, 0) / totalWeight,
      y: boxes.reduce((sum, box) => sum + box.position.y * box.weight, 0) / totalWeight,
      z: boxes.reduce((sum, box) => sum + box.position.z * box.weight, 0) / totalWeight,
    }

    // Penalize high center of gravity
    if (centerOfGravity.y > truckDimensions.height * 0.6) {
      stabilityScore -= 20
    }

    // Penalize off-center weight distribution
    const lateralOffset = Math.abs(centerOfGravity.x) / (truckDimensions.width / 2)
    stabilityScore -= lateralOffset * 15

    // Check for proper support (boxes on floor or other boxes)
    boxes.forEach((box) => {
      if (box.position.y > 0.6) {
        // Not on floor
        const supportingBoxes = boxes.filter(
          (otherBox) =>
            otherBox.id !== box.id &&
            otherBox.position.y < box.position.y &&
            Math.abs(otherBox.position.x - box.position.x) < (otherBox.width + box.width) / 2 &&
            Math.abs(otherBox.position.z - box.position.z) < (otherBox.length + box.length) / 2,
        )

        if (supportingBoxes.length === 0) {
          stabilityScore -= 10 // Floating box penalty
        }
      }
    })

    return Math.max(0, Math.min(100, stabilityScore))
  }

  const calculateForceResistance = (force: number) => {
    const stabilityScore = calculateStabilityScore()
    const resistance = stabilityScore / 100
    return force * resistance
  }

  const runPhysicsSimulation = () => {
    if (!workerRef.current) return
    
    setIsSimulationRunning(true)
    
    // Add all boxes to physics simulation
    boxes.forEach(box => {
      sendWorkerMessage('ADD_BOX', { box })
    })
    
    // Apply forces and start continuous simulation
    const forces = {
      acceleration: accelerationForce,
      braking: brakingForce,
      turning: turningForce,
      gravity: gravityMultiplier
    }
    
    sendWorkerMessage('START_CONTINUOUS_SIMULATION', { forces })
  }

  const stopPhysicsSimulation = () => {
    if (!workerRef.current) return
    
    setIsSimulationRunning(false)
    sendWorkerMessage('STOP_SIMULATION', {})
  }

  const findOptimalPlacement = () => {
    if (!workerRef.current) return
    
    const constraints = {
      truckDimensions,
      maxWeight: 34000,
      fragileZones: [],
      temperatureZones: { 
        cold: [{ x: -2, y: 1, z: -4, width: 3, height: 2, length: 2 }], 
        frozen: [{ x: 2, y: 1, z: -4, width: 3, height: 2, length: 2 }], 
        regular: [] 
      },
      lifoOrder: true,
      perishableAreas: []
    }
    
    sendWorkerMessage('FIND_OPTIMAL_PLACEMENT', { boxes, constraints })
  }

  const testSpecificForce = (forceType: string, magnitude: number) => {
    if (!workerRef.current) return
    
    sendWorkerMessage('APPLY_FORCE_EVENT', { forceType, magnitude })
  }

  const simulateEmergencyScenario = () => {
    if (!workerRef.current) return
    
    // Apply emergency braking scenario
    const emergencyForces = {
      acceleration: 0,
      braking: 1.5,
      turning: 0.8,
      gravity: 1.2
    }
    
    sendWorkerMessage('START_CONTINUOUS_SIMULATION', { forces: emergencyForces })
  }

  const stabilityScore = physicsStats.stability

  return (
    <div className="space-y-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Physics Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-300">Enable Physics</Label>
            <Switch checked={physicsEnabled} onCheckedChange={setPhysicsEnabled} />
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-300">Acceleration Force: {accelerationForce.toFixed(1)}g</Label>
              <Slider
                value={[accelerationForce]}
                onValueChange={(value) => setAccelerationForce(value[0])}
                max={1.0}
                min={0.1}
                step={0.1}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-300">Braking Force: {brakingForce.toFixed(1)}g</Label>
              <Slider
                value={[brakingForce]}
                onValueChange={(value) => setBrakingForce(value[0])}
                max={1.5}
                min={0.1}
                step={0.1}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-300">Turning Force: {turningForce.toFixed(1)}g</Label>
              <Slider
                value={[turningForce]}
                onValueChange={(value) => setTurningForce(value[0])}
                max={1.0}
                min={0.1}
                step={0.1}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-300">Gravity: {(gravityMultiplier * 9.81).toFixed(1)} m/s²</Label>
              <Slider
                value={[gravityMultiplier]}
                onValueChange={(value) => setGravityMultiplier(value[0])}
                max={2.0}
                min={0.1}
                step={0.1}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Stability Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">Overall Stability</span>
            <span
              className={`text-xs font-bold ${
                stabilityScore > 80 ? "text-green-400" : stabilityScore > 60 ? "text-yellow-400" : "text-red-400"
              }`}
            >
              {stabilityScore.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">Collisions</span>
              <span className="text-white">{physicsStats.collisions}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">Contacts</span>
              <span className="text-white">{physicsStats.contacts}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">Simulation Status</span>
              {isSimulationRunning ? (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400">Running</span>
                </div>
              ) : (
                <span className="text-gray-400">Stopped</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full h-8 text-xs"
              onClick={isSimulationRunning ? stopPhysicsSimulation : runPhysicsSimulation}
              variant={isSimulationRunning ? "destructive" : "default"}
            >
              {isSimulationRunning ? "Stop Simulation" : "Run Simulation"}
            </Button>
            <Button
              className="w-full h-8 text-xs"
              onClick={findOptimalPlacement}
              variant="outline"
            >
              Find Optimal Placement (MCTS)
            </Button>
          </div>

          {/* Force Testing Section */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Force Testing</Label>
            <div className="grid grid-cols-2 gap-1">
              <Button
                className="h-6 text-xs"
                onClick={() => testSpecificForce('braking', brakingForce)}
                variant="outline"
                size="sm"
              >
                Test Brake
              </Button>
              <Button
                className="h-6 text-xs"
                onClick={() => testSpecificForce('turning', turningForce)}
                variant="outline"
                size="sm"
              >
                Test Turn
              </Button>
              <Button
                className="h-6 text-xs"
                onClick={() => testSpecificForce('acceleration', accelerationForce)}
                variant="outline"
                size="sm"
              >
                Test Accel
              </Button>
              <Button
                className="h-6 text-xs"
                onClick={() => simulateEmergencyScenario()}
                variant="destructive"
                size="sm"
              >
                Emergency
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white">Weight Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Total Weight:</span>
              <span className="text-white">{boxes.reduce((sum, box) => sum + box.weight, 0).toFixed(0)} lbs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Max Capacity:</span>
              <span className="text-white">34,000 lbs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Utilization:</span>
              <span
                className={`${
                  (boxes.reduce((sum, box) => sum + box.weight, 0) / 34000) > 0.9 ? "text-red-400" : "text-green-400"
                }`}
              >
                {((boxes.reduce((sum, box) => sum + box.weight, 0) / 34000) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
