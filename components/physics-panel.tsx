"use client"

import { useState } from "react"
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
    // Simulate different force scenarios
    const accelerationResistance = calculateForceResistance(accelerationForce)
    const brakingResistance = calculateForceResistance(brakingForce)
    const turningResistance = calculateForceResistance(turningForce)

    return {
      acceleration: accelerationResistance > 0.3,
      braking: brakingResistance > 0.6,
      turning: turningResistance > 0.4,
    }
  }

  const physicsResults = runPhysicsSimulation()
  const stabilityScore = calculateStabilityScore()

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
              <span className="text-gray-300">Acceleration Test</span>
              {physicsResults.acceleration ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">Braking Test</span>
              {physicsResults.braking ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">Turning Test</span>
              {physicsResults.turning ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              )}
            </div>
          </div>

          <Button
            className="w-full h-8 text-xs"
            onClick={() => {
              // Trigger physics simulation
              console.log("Running physics simulation...", physicsResults)
            }}
          >
            Run Simulation
          </Button>
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
