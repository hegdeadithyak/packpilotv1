"use client"

import { useState, useEffect } from "react"
import { WorkspaceSelector } from "@/components/workspace-selector"
import { TruckVisualization } from "@/components/truck-visualization"
import { MapVisualization } from "@/components/map-visualization"
import { ControlPanel } from "@/components/control-panel"
import { BoxManager } from "@/components/box-manager"
import { PhysicsPanel } from "@/components/physics-panel"
import { ReportGenerator } from "@/components/report-generator"
import { PerformanceMonitor } from "@/components/performance-monitor"
import { ScoreDisplay } from "@/components/score-display"
import { SimulationControls } from "@/components/simulation-controls"
import { useOptimizationStore } from "@/store/optimization-store"
import { useWorkspaceStore } from "@/store/workspace-store"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Truck,
  Package,
  FileText,
  Settings,
  Zap,
  Play,
  Save,
  Map,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export default function WalmartTruckOptimizer() {
  // ───────────────────────── state ─────────────────────────
  const [activeView, setActiveView] = useState<"3d" | "2d" | "hybrid" | "map">("3d")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(true)

  // ───────────────────────── stores ─────────────────────────
  const {
    boxes,
    truckDimensions,
    stabilityScore,
    safetyScore,
    optimizationScore,
    isSimulationRunning,
    initializePhysics,
    runSimulation,
    stopSimulation,
  } = useOptimizationStore()

  const { currentWorkspace, saveWorkspace } = useWorkspaceStore()

  // ───────────────────────── life-cycle ─────────────────────────
  useEffect(() => {
    initializePhysics()
  }, [initializePhysics])

  // ───────────────────────── derived metrics ─────────────────────────
  const totalWeight = boxes.reduce((s, b) => s + b.weight, 0)
  const totalVolume = boxes.reduce((s, b) => s + b.width * b.height * b.length, 0)
  const truckVolume = truckDimensions.width * truckDimensions.length * truckDimensions.height
  const volumeUtilization = (totalVolume / truckVolume) * 100
  const weightUtilization = (totalWeight / 34_000) * 100

  // ───────────────────────── actions ─────────────────────────
  const handleSaveWorkspace = () => {
    if (!currentWorkspace) return
    saveWorkspace(currentWorkspace.id, {
      ...currentWorkspace,
      boxes,
      truckDimensions,
      lastModified: new Date().toISOString(),
    })
  }

  if (showWorkspaceSelector) {
    return <WorkspaceSelector onWorkspaceSelected={() => setShowWorkspaceSelector(false)} />
  }

  return (
    <div className="h-screen bg-[#0f0f10] text-white overflow-hidden">
      <header className="border-b border-primary/20 bg-[#0f0f10]/95 backdrop-blur-sm z-50 relative">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gray-800 rounded-xl border border-primary/30">
                <Truck className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">PackPilot</h1>
                <p className="text-sm text-primary">
                  {currentWorkspace?.name || "Advanced Physics-Based Warehouse Management System"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <PerformanceMonitor />
              <ScoreDisplay
                stabilityScore={stabilityScore}
                safetyScore={safetyScore}
                optimizationScore={optimizationScore}
              />
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleSaveWorkspace}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowWorkspaceSelector(true)}>
                  Switch Workspace
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ───────── Main Layout ───────── */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* sidebar */}
        <div
          className={`${
            sidebarCollapsed ? "w-16" : "w-80"
          } transition-all duration-300 bg-[#0f0f10]/50 backdrop-blur-sm flex flex-col border-r border-primary/20`}
        >
          {/* collapse btn */}
          <div className="p-4 border-b border-primary/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full justify-start text-primary hover:bg-primary/10"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {!sidebarCollapsed && <span className="ml-2">Collapse Panel</span>}
            </Button>
          </div>

          {/* tabs */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-4">
              <Tabs defaultValue="boxes" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-gray-800 border border-primary/20">
                  {[
                    { value: "boxes", icon: Package },
                    { value: "physics", icon: Zap },
                    { value: "control", icon: Settings },
                    { value: "reports", icon: FileText },
                  ].map(({ value, icon: Icon }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="text-xs text-primary data-[state=active]:bg-primary/20 data-[state=active]:text-white"
                    >
                      <Icon className="h-4 w-4" />
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="boxes" className="mt-4">
                  <BoxManager />
                </TabsContent>

                <TabsContent value="physics" className="mt-4">
                  <PhysicsPanel />
                  <div className="mt-4">
                    <SimulationControls />
                  </div>
                </TabsContent>

                <TabsContent value="control" className="mt-4">
                  <ControlPanel />
                </TabsContent>

                <TabsContent value="reports" className="mt-4">
                  <ReportGenerator />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* visualization pane */}
        <div className="flex-1 flex flex-col">
          {/* toolbar */}
          <div className="p-4 border-b border-primary/30 bg-[#0f0f10]/30">
            <div className="flex items-center justify-between">
              {/* view toggles */}
              <div className="flex space-x-2">
                {(["3d", "2d", "hybrid", "map"] as const).map((v) => (
                  <Button
                    key={v}
                    variant={activeView === v ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveView(v)}
                  >
                    {v === "map" ? (
                      <>
                        <Map className="h-4 w-4 mr-1" /> Map View
                      </>
                    ) : (
                      `${v.toUpperCase()} View`
                    )}
                  </Button>
                ))}
                <Button
                  variant={isSimulationRunning ? "destructive" : "secondary"}
                  size="sm"
                  onClick={isSimulationRunning ? stopSimulation : runSimulation}
                  className="ml-4"
                >
                  <Play className="h-4 w-4 mr-1" />
                  {isSimulationRunning ? "Stop Simulation" : "Run Simulation"}
                </Button>
              </div>

              {/* quick stats */}
              <div className="flex items-center space-x-4 text-sm">
                {[
                  ["Volume", volumeUtilization.toFixed(1) + "%"],
                  ["Weight", weightUtilization.toFixed(1) + "%"],
                  ["Boxes", boxes.length],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center space-x-2">
                    <span className="text-primary">{label}:</span>
                    <span className="font-bold">{val}</span>
                  </div>
                ))}
                {isSimulationRunning && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-400 font-bold">SIMULATION ACTIVE</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* canvas / map */}
          <div className="flex-1 relative bg-[#0f0f10]">
            {activeView === "map" ? (
              <MapVisualization />
            ) : (
              <TruckVisualization viewMode={activeView} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
