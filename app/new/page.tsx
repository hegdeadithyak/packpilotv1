"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { TruckVisualization } from "@/components/truck-visualization";
import MapVisualization from "@/components/map-visualization";
import { ControlPanel } from "@/components/control-panel";
import { BoxManager } from "@/components/box-manager";
import { useRouteStore, initializeRouteStore } from "@/components/truck-visualization";
import { PhysicsPanel } from "@/components/physics-panel";
import { ReportGenerator } from "@/components/report-generator";
import { PerformanceMonitor } from "@/components/performance-monitor";
import { StatusPanel } from "@/components/status-panel";
import { ScoreDisplay } from "@/components/score-display";
import { SimulationControls } from "@/components/simulation-controls";
import { useOptimizationStore } from "@/store/optimization-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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
  BarChart3,
  CheckCircle,
  TrendingUp,
  Building2,
  ArrowRight,
  Hash,
  Route,
  Plus,
  X,
  MapPin,
} from "lucide-react";

// Setup workflow steps
type SetupStep = "workspace" | "routes" | "complete";

interface RouteStop {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  priority: number;
  estimatedBoxes: number;
}

// Default truck configuration for empty workspace
const DEFAULT_TRUCK_CONFIG = {
  width: 8,
  length: 24,
  height: 8,
  maxWeight: 26000
};

export default function NewWorkspacePage() {
  // ───────────────────────── Setup State ─────────────────────────
  const [currentStep, setCurrentStep] = useState<SetupStep>("workspace");
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);

  // ───────────────────────── Workspace State ─────────────────────────
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  
  // ───────────────────────── Truck State ─────────────────────────
  const [truckId, setTruckId] = useState("");

  // ───────────────────────── Route State ─────────────────────────
  const [routes, setRoutes] = useState<RouteStop[]>([]);
  const [newRoute, setNewRoute] = useState({ name: "", address: "", estimatedBoxes: 10 });

  // ───────────────────────── UI State ─────────────────────────
  const [activeView, setActiveView] = useState<"3d" | "2d" | "hybrid" | "map">("3d");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

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
    optimizeLayout,
    resetLayout,
    setTruckDimensions,
    resetToEmpty,
  } = useOptimizationStore();

  const { 
    createWorkspace, 
    loadWorkspace, 
    currentWorkspace, 
    saveWorkspace 
  } = useWorkspaceStore();

  // ───────────────────────── Step Progress Calculation ─────────────────────────
  useEffect(() => {
    const stepProgress = {
      workspace: workspaceName.trim() && truckId.trim() ? 50 : 0,
      routes: routes.length >= 1 ? 100 : 50,
      complete: 100
    };
    setSetupProgress(stepProgress[currentStep]);
  }, [currentStep, workspaceName, truckId, routes.length]);

  // ───────────────────────── Auto-generate Truck ID ─────────────────────────
  useEffect(() => {
    if (workspaceName.trim() && !truckId) {
      const cleanName = workspaceName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      setTruckId(`TRK-${cleanName}-${randomSuffix}`.toUpperCase());
    }
  }, [workspaceName, truckId]);

  // ───────────────────────── Setup Functions ─────────────────────────
  const initializeWorkspace = async () => {
    if (!workspaceName.trim() || !truckId.trim()) return;

    setIsLoading(true);
    setLoadingMessage("Creating workspace...");

    try {
      const workspace = createWorkspace(workspaceName, "empty");
      workspace.description = workspaceDescription;
      loadWorkspace(workspace.id);
      
      // Set default truck dimensions
      setTruckDimensions(DEFAULT_TRUCK_CONFIG);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setLoadingMessage("Setting up default route...");
      
      // Add a default starting point route
      const defaultRoute: RouteStop = {
        id: 'route-0',
        name: 'Distribution Center',
        address: '123 Main St, City, State',
        coordinates: { lat: 32.7767, lng: -96.7970 },
        priority: 1,
        estimatedBoxes: 0
      };
      
      setRoutes([defaultRoute]);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep("routes");
      
    } catch (error) {
      console.error("Error creating workspace:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRoute = async () => {
    if (!newRoute.name.trim() || !newRoute.address.trim()) return;

    const route: RouteStop = {
      id: `route-${Date.now()}`,
      name: newRoute.name,
      address: newRoute.address,
      coordinates: { 
        lat: 32.7767 + (routes.length * 0.01), 
        lng: -96.7970 + (routes.length * 0.01) 
      },
      priority: routes.length + 1,
      estimatedBoxes: newRoute.estimatedBoxes
    };

    const updatedRoutes = [...routes, route];
    setRoutes(updatedRoutes);
    
    // Update route store as well
    try {
      if (typeof window !== 'undefined') {
        //@ts-ignore
        const { setDeliveryStops } = useRouteStore.getState();
        
        const routeStops = updatedRoutes.map(r => ({
          id: r.id,
          name: r.name,
          address: r.address,
          coordinates: r.coordinates,
          priority: r.priority,
          estimatedDeliveryTime: new Date(Date.now() + r.priority * 60 * 60 * 1000).toISOString(),
          boxCount: r.estimatedBoxes,
          completed: false
        }));
        
        setDeliveryStops(routeStops);
      }
    } catch (error) {
      console.warn("Failed to update route store:", error);
    }
    
    setNewRoute({ name: "", address: "", estimatedBoxes: 10 });
  };

  const removeRoute = async (id: string) => {
    const updatedRoutes = routes.filter(r => r.id !== id);
    setRoutes(updatedRoutes);
    
    // Update route store as well
    try {
      if (typeof window !== 'undefined') {
        //@ts-ignore
        const { setDeliveryStops } = useRouteStore.getState();
        
        const routeStops = updatedRoutes.map(r => ({
          id: r.id,
          name: r.name,
          address: r.address,
          coordinates: r.coordinates,
          priority: r.priority,
          estimatedDeliveryTime: new Date(Date.now() + r.priority * 60 * 60 * 1000).toISOString(),
          boxCount: r.estimatedBoxes,
          completed: false
        }));
        
        setDeliveryStops(routeStops);
      }
    } catch (error) {
      console.warn("Failed to update route store:", error);
    }
  };

  const finalizeSetup = async () => {
    setIsLoading(true);
    setLoadingMessage("Initializing route system...");

    try {
      // Initialize route store if routes exist
      if (routes.length > 0) {
        const initialized = await initializeRouteStore(routes);
        
        if (initialized) {
          setLoadingMessage("Routes configured successfully...");
        } else {
          setLoadingMessage("Using default route configuration...");
        }
        
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      setLoadingMessage("Initializing physics engine...");
      
      // Initialize physics
      initializePhysics();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentStep("complete");
      setIsSetupComplete(true);
      
    } catch (error) {
      console.error("Error finalizing setup:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ───────────────────────── derived metrics ─────────────────────────
  const totalWeight = boxes.reduce((s, b) => s + b.weight, 0);
  const totalVolume = boxes.reduce(
    (s, b) => s + b.width * b.height * b.length,
    0,
  );
  const truckVolume = truckDimensions.width * truckDimensions.length * truckDimensions.height;
  const volumeUtilization = truckVolume > 0 ? (totalVolume / truckVolume) * 100 : 0;
  const weightUtilization = DEFAULT_TRUCK_CONFIG.maxWeight > 0 ? (totalWeight / DEFAULT_TRUCK_CONFIG.maxWeight) * 100 : 0;

  // ───────────────────────── Setup Wizard Render ─────────────────────────
  if (!isSetupComplete) {
    return (
      <div className="h-screen bg-[#0f0f10] text-white overflow-hidden">
        {/* Simplified Header */}
        <header className="border-b border-primary/20 bg-[#0f0f10]/95 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gray-800 rounded-xl border border-primary/30">
                  <Truck className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">PackPilot - New Workspace</h1>
                  <p className="text-sm text-primary">
                    Create empty workspace with route configuration
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Progress value={setupProgress} className="w-32 h-2" />
                <span className="text-sm text-gray-400">{setupProgress}%</span>
              </div>
            </div>
          </div>
        </header>

        {/* Simplified Loading Screen */}
        {isLoading && (
          <div className="h-[calc(100vh-88px)] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold mb-2">{loadingMessage}</h2>
              <p className="text-primary">Setting up your workspace...</p>
            </div>
          </div>
        )}

        {/* Setup Content - Only show when not loading */}
        {!isLoading && (
          <div className="flex h-[calc(100vh-88px)]">
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-2xl w-full space-y-8">
                {/* Step Indicator */}
                <div className="flex items-center justify-center space-x-4 mb-8">
                  {[
                    { step: "workspace", label: "Workspace", icon: Building2 },
                    { step: "routes", label: "Routes", icon: Route }
                  ].map(({ step, label, icon: Icon }, index) => (
                    <div key={step} className="flex items-center">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                        currentStep === step
                          ? "border-primary bg-primary text-white"
                          : setupProgress > (index + 1) * 50
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-gray-600 text-gray-400"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`ml-2 text-sm ${
                        currentStep === step ? "text-primary" : "text-gray-400"
                      }`}>
                        {label}
                      </span>
                      {index < 1 && (
                        <ArrowRight className="h-4 w-4 text-gray-600 mx-4" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Step Content */}
                <Card className="bg-gray-800/50 border-primary/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl text-primary">
                      {currentStep === "workspace" && "Step 1: Create Workspace"}
                      {currentStep === "routes" && "Step 2: Configure Routes"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Workspace Step */}
                    {currentStep === "workspace" && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="workspace-name">Workspace Name *</Label>
                            <Input
                              id="workspace-name"
                              placeholder="Enter workspace name..."
                              value={workspaceName}
                              onChange={(e) => setWorkspaceName(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="truck-id">Truck ID *</Label>
                            <div className="flex items-center space-x-2 mt-2">
                              <Hash className="h-4 w-4 text-gray-400" />
                              <Input
                                id="truck-id"
                                placeholder="Auto-generated truck ID"
                                value={truckId}
                                onChange={(e) => setTruckId(e.target.value.toUpperCase())}
                                className="flex-1"
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              Unique identifier for this truck configuration
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="workspace-description">Description (Optional)</Label>
                            <Input
                              id="workspace-description"
                              placeholder="Brief description of this workspace..."
                              value={workspaceDescription}
                              onChange={(e) => setWorkspaceDescription(e.target.value)}
                              className="mt-2"
                            />
                          </div>

                          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                            <h4 className="font-medium text-primary mb-2">Empty Workspace</h4>
                            <p className="text-sm text-gray-300 mb-3">
                              You're creating an empty workspace with route management. You can add boxes manually or import them from files after setup.
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>✓ Clean slate for custom projects</div>
                              <div>✓ Route-based organization</div>
                              <div>✓ Manual box management</div>
                              <div>✓ File import capabilities</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={initializeWorkspace}
                            disabled={!workspaceName.trim() || !truckId.trim()}
                            className="bg-gradient-to-r from-primary to-blue-500"
                          >
                            Create Workspace
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Routes Step */}
                    {currentStep === "routes" && (
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-medium mb-4">Delivery Routes</h4>
                          <div className="space-y-3">
                            {routes.map((route, index) => (
                              <div key={route.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-full text-primary text-sm font-medium">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium">{route.name}</div>
                                    <div className="text-sm text-gray-400">{route.address}</div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{route.estimatedBoxes} boxes</Badge>
                                  {index > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeRoute(route.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h4 className="font-medium mb-4">Add New Route</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                              placeholder="Stop name..."
                              value={newRoute.name}
                              onChange={(e) => setNewRoute({...newRoute, name: e.target.value})}
                            />
                            <Input
                              placeholder="Address..."
                              value={newRoute.address}
                              onChange={(e) => setNewRoute({...newRoute, address: e.target.value})}
                            />
                            <div className="flex space-x-2">
                              <Input
                                type="number"
                                placeholder="Est. boxes"
                                value={newRoute.estimatedBoxes}
                                onChange={(e) => setNewRoute({...newRoute, estimatedBoxes: parseInt(e.target.value) || 0})}
                                className="flex-1"
                              />
                              <Button onClick={addRoute} size="sm">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <h4 className="font-medium text-blue-400 mb-2 flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            Route Summary
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Total Routes:</span>
                              <span className="ml-2">{routes.length}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Estimated Boxes:</span>
                              <span className="ml-2">{routes.reduce((sum, r) => sum + r.estimatedBoxes, 0)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Truck ID:</span>
                              <span className="ml-2 font-mono text-primary">{truckId}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Status:</span>
                              <span className="ml-2 text-green-400">Ready for setup</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            onClick={() => setCurrentStep("workspace")}
                          >
                            Back
                          </Button>
                          <Button
                            onClick={finalizeSetup}
                            disabled={routes.length < 1}
                            className="bg-gradient-to-r from-primary to-blue-500"
                          >
                            Complete Setup
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────── Main Application (After Setup) ─────────────────────────
  return (
    <div className="h-screen bg-[#0f0f10] text-white overflow-hidden">
      {/* Simplified Header */}
      <header className="border-b border-primary/20 bg-[#0f0f10]/95 backdrop-blur-sm z-50 relative">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gray-800 rounded-xl border border-primary/30">
                <Truck className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">PackPilot</h1>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-primary">
                    {currentWorkspace?.name || "Advanced Physics-Based Warehouse Management System"}
                  </p>
                  {truckId && (
                    <Badge variant="outline" className="text-xs">
                      {truckId}
                    </Badge>
                  )}
                </div>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (!currentWorkspace) return;
                    saveWorkspace(currentWorkspace.id, {
                      ...currentWorkspace,
                      boxes,
                      truckDimensions,
                      lastModified: new Date().toISOString(),
                    });
                  }}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
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
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
              {!sidebarCollapsed && <span className="ml-2">Collapse Panel</span>}
            </Button>
          </div>

          {/* Enhanced Sidebar Content */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Truck Info Card */}
              <Card className="bg-gradient-to-br from-primary/10 to-blue-500/10 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-primary flex items-center">
                    <Truck className="h-4 w-4 mr-2" />
                    Truck Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID:</span>
                    <span className="font-mono text-primary">{truckId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dimensions:</span>
                    <span>{truckDimensions.width} × {truckDimensions.length} × {truckDimensions.height} ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Capacity:</span>
                    <span>{(truckVolume).toFixed(0)} ft³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Weight:</span>
                    <span>{DEFAULT_TRUCK_CONFIG.maxWeight.toLocaleString()} lbs</span>
                  </div>
                </CardContent>
              </Card>

              {/* Route Overview */}
              <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-400 flex items-center">
                    <Route className="h-4 w-4 mr-2" />
                    Delivery Routes ({routes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {routes.slice(0, 4).map((route, index) => (
                    <div key={route.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs">
                          {index + 1}
                        </div>
                        <span className="truncate">{route.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {route.estimatedBoxes}
                      </Badge>
                    </div>
                  ))}
                  {routes.length > 4 && (
                    <div className="text-xs text-gray-400 text-center">
                      +{routes.length - 4} more routes
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* tabs */}
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
              <div className="flex items-center space-x-2">
                {(["3d", "2d", "hybrid", "map"] as const).map((view) => (
                  <Button
                    key={view}
                    variant={activeView === view ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveView(view)}
                    className="transition-all duration-200"
                  >
                    {view === "map" ? (
                      <>
                        <Map className="h-4 w-4 mr-1" />
                        Map
                      </>
                    ) : (
                      `${view.toUpperCase()}`
                    )}
                  </Button>
                ))}
                
                <div className="h-6 w-px bg-primary/30 mx-2" />
                
                <Button
                  variant={isSimulationRunning ? "destructive" : "secondary"}
                  size="sm"
                  onClick={isSimulationRunning ? stopSimulation : runSimulation}
                  className="transition-all duration-200"
                >
                  <Play className="h-4 w-4 mr-1" />
                  {isSimulationRunning ? "Stop Physics" : "Run Physics"}
                </Button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetLayout}
                  className="border-gray-600 hover:bg-gray-700"
                >
                  Reset Layout
                </Button>
                <Button
                  size="sm"
                  onClick={optimizeLayout}
                  className="bg-gradient-to-r from-primary to-blue-500 hover:shadow-lg transition-all duration-200"
                  disabled={boxes.length === 0}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Optimize Layout
                </Button>
              </div>

              {/* quick stats */}
              <div className="hidden xl:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-300">Vol: {volumeUtilization.toFixed(1)}%</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-green-300">Weight: {weightUtilization.toFixed(1)}%</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-primary">Boxes: {boxes.length}</span>
                </div>
                {isSimulationRunning && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-300 font-medium">PHYSICS ACTIVE</span>
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
            
            {/* Empty state overlay when no boxes */}
            {boxes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f10]/80 backdrop-blur-sm">
                <div className="text-center max-w-md">
                  <Package className="h-16 w-16 text-primary/50 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Empty Truck - Ready to Load</h2>
                  <p className="text-primary/70 mb-6">
                    Your truck <span className="font-mono text-primary">{truckId}</span> is configured with {routes.length} routes. 
                    Start by adding boxes using the Box Manager in the sidebar.
                  </p>
                  <div className="flex flex-col gap-2 text-sm text-primary/60">
                    <p>• Use the "Boxes" tab to add individual boxes</p>
                    <p>• Try the "Control" tab for bulk operations</p>
                    <p>• Use "Physics" tab to configure simulation settings</p>
                    <p>• Import boxes from CSV or Excel files</p>
                  </div>
                  
                  <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h3 className="text-sm font-medium text-primary mb-2">Truck & Route Summary</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                      <div>Capacity: {truckVolume.toFixed(0)} ft³</div>
                      <div>Max Weight: {DEFAULT_TRUCK_CONFIG.maxWeight.toLocaleString()} lbs</div>
                      <div>Routes: {routes.length} configured</div>
                      <div>Status: Ready for loading</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            
            </div>
        </div>
      </div>

      {/* Status Panel - Non-intrusive floating panel */}
      <StatusPanel />
    </div>
  );
}