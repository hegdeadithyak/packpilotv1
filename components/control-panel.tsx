"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOptimizationStore } from "@/store/optimization-store"
import { Settings, Truck, Shuffle, RotateCcw } from "lucide-react"

export function ControlPanel() {
  const { truckDimensions, setTruckDimensions, optimizeLayout, resetLayout, boxes } = useOptimizationStore()

  const [truckType, setTruckType] = useState("28ft-box")

  const truckPresets = {
    "28ft-box": { width: 8, length: 28, height: 9 },
    "26ft-box": { width: 8, length: 26, height: 9 },
    "24ft-box": { width: 8, length: 24, height: 8.5 },
    "53ft-trailer": { width: 8.5, length: 53, height: 9 },
    custom: truckDimensions,
  }

  const handleTruckTypeChange = (type: string) => {
    setTruckType(type)
    if (type !== "custom") {
      setTruckDimensions(truckPresets[type as keyof typeof truckPresets])
    }
  }

  const handleOptimize = () => {
    optimizeLayout()
  }

  const handleReset = () => {
    resetLayout()
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center">
            <Truck className="h-4 w-4 mr-2" />
            Truck Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-gray-300">Truck Type</Label>
            <Select value={truckType} onValueChange={handleTruckTypeChange}>
              <SelectTrigger className="h-8 text-xs bg-gray-700 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="28ft-box">28ft Box Truck</SelectItem>
                <SelectItem value="26ft-box">26ft Box Truck</SelectItem>
                <SelectItem value="24ft-box">24ft Box Truck</SelectItem>
                <SelectItem value="53ft-trailer">53ft Trailer</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-gray-300">Width (ft)</Label>
              <Input
                type="number"
                value={truckDimensions.width}
                onChange={(e) =>
                  setTruckDimensions({
                    ...truckDimensions,
                    width: Number.parseFloat(e.target.value),
                  })
                }
                className="h-8 text-xs bg-gray-700 border-gray-600"
                min="1"
                step="0.5"
                disabled={truckType !== "custom"}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Length (ft)</Label>
              <Input
                type="number"
                value={truckDimensions.length}
                onChange={(e) =>
                  setTruckDimensions({
                    ...truckDimensions,
                    length: Number.parseFloat(e.target.value),
                  })
                }
                className="h-8 text-xs bg-gray-700 border-gray-600"
                min="1"
                step="0.5"
                disabled={truckType !== "custom"}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Height (ft)</Label>
              <Input
                type="number"
                value={truckDimensions.height}
                onChange={(e) =>
                  setTruckDimensions({
                    ...truckDimensions,
                    height: Number.parseFloat(e.target.value),
                  })
                }
                className="h-8 text-xs bg-gray-700 border-gray-600"
                min="1"
                step="0.5"
                disabled={truckType !== "custom"}
              />
            </div>
          </div>

          <div className="text-xs text-gray-400">
            Volume: {(truckDimensions.width * truckDimensions.length * truckDimensions.height).toFixed(1)} ft³
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Optimization Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleOptimize} className="w-full h-8 text-xs" disabled={boxes.length === 0}>
            <Shuffle className="h-3 w-3 mr-1" />
            Optimize Layout
          </Button>

          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full h-8 text-xs"
            disabled={boxes.length === 0}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset Layout
          </Button>

          <div className="text-xs text-gray-400 space-y-1">
            <div>• Maximizes volume utilization</div>
            <div>• Respects weight distribution</div>
            <div>• Considers temperature zones</div>
            <div>• Optimizes loading sequence</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white">Loading Constraints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Max Weight:</span>
              <span className="text-white">34,000 lbs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Max Height:</span>
              <span className="text-white">{truckDimensions.height} ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Temperature Zones:</span>
              <span className="text-white">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Fragile Items:</span>
              <span className="text-white">{boxes.filter((box) => box.isFragile).length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
