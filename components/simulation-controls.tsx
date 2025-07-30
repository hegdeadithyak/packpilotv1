"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { useOptimizationStore } from "@/store/optimization-store"
import { Play, Square, RotateCcw, Zap } from "lucide-react"

export function SimulationControls() {
  const {
    isSimulationRunning,
    simulationSpeed,
    simulationForces,
    runSimulation,
    stopSimulation,
    resetSimulation,
    setSimulationSpeed,
    setSimulationForces,
  } = useOptimizationStore()

  const [localForces, setLocalForces] = useState(simulationForces)

  const handleForceChange = (type: keyof typeof simulationForces, value: number) => {
    const newForces = { ...localForces, [type]: value }
    setLocalForces(newForces)
    setSimulationForces(newForces)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-foreground flex items-center">
          <Zap className="h-4 w-4 mr-2" />
          Physics Simulation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Simulation Controls */}
        <div className="flex space-x-2">
          <Button
            onClick={runSimulation}
            disabled={isSimulationRunning}
            className="flex-1 h-8 text-xs"
            variant={isSimulationRunning ? "secondary" : "default"}
          >
            <Play className="h-3 w-3 mr-1" />
            {isSimulationRunning ? "Running..." : "Start"}
          </Button>
          <Button
            onClick={stopSimulation}
            disabled={!isSimulationRunning}
            variant="destructive"
            className="h-8 text-xs"
          >
            <Square className="h-3 w-3 mr-1" />
            Stop
          </Button>
          <Button onClick={resetSimulation} variant="outline" className="h-8 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>

        {/* Simulation Speed */}
        <div>
          <Label className="text-xs text-muted-foreground">Simulation Speed: {simulationSpeed.toFixed(1)}x</Label>
          <Slider
            value={[simulationSpeed]}
            onValueChange={(value) => setSimulationSpeed(value[0])}
            max={3.0}
            min={0.1}
            step={0.1}
            className="mt-1"
          />
        </div>

        {/* Force Settings */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Acceleration: {localForces.acceleration.toFixed(1)}g</Label>
            <Slider
              value={[localForces.acceleration]}
              onValueChange={(value) => handleForceChange("acceleration", value[0])}
              max={1.0}
              min={0.1}
              step={0.1}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Braking: {localForces.braking.toFixed(1)}g</Label>
            <Slider
              value={[localForces.braking]}
              onValueChange={(value) => handleForceChange("braking", value[0])}
              max={1.5}
              min={0.1}
              step={0.1}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Turning: {localForces.turning.toFixed(1)}g</Label>
            <Slider
              value={[localForces.turning]}
              onValueChange={(value) => handleForceChange("turning", value[0])}
              max={1.0}
              min={0.1}
              step={0.1}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Gravity: {localForces.gravity.toFixed(1)}x</Label>
            <Slider
              value={[localForces.gravity]}
              onValueChange={(value) => handleForceChange("gravity", value[0])}
              max={2.0}
              min={0.1}
              step={0.1}
              className="mt-1"
            />
          </div>
        </div>

        {/* Simulation Scenarios */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Quick Scenarios</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const forces = { acceleration: 0.3, braking: 0.6, turning: 0.4, gravity: 1.0 }
                setLocalForces(forces)
                setSimulationForces(forces)
              }}
            >
              Normal Driving
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const forces = { acceleration: 0.6, braking: 1.2, turning: 0.8, gravity: 1.0 }
                setLocalForces(forces)
                setSimulationForces(forces)
              }}
            >
              Aggressive Driving
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const forces = { acceleration: 0.8, braking: 1.5, turning: 1.0, gravity: 1.0 }
                setLocalForces(forces)
                setSimulationForces(forces)
              }}
            >
              Emergency Stop
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const forces = { acceleration: 0.2, braking: 0.4, turning: 0.3, gravity: 1.0 }
                setLocalForces(forces)
                setSimulationForces(forces)
              }}
            >
              Smooth Delivery
            </Button>
          </div>
        </div>

        {/* Status Indicator */}
        {isSimulationRunning && (
          <div className="flex items-center space-x-2 p-2 bg-destructive/10 rounded border border-destructive/30">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
            <span className="text-xs text-destructive/80">Physics simulation active</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
