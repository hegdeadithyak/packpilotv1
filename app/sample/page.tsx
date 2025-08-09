"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { TruckVisualization } from "@/components/truck-visualization";
import MapVisualization from "@/components/map-visualization";
import { ControlPanel } from "@/components/control-panel";
import { BoxManager } from "@/components/box-manager";
import { useRouteStore,initializeRouteStore } from "@/components/truck-visualization";
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
import Image from 'next/image';

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
    Clock,
    AlertCircle,
    CheckCircle,
    TrendingUp,
    Thermometer,
    Shield,
    Target,
    MapPin,
    Route,
    Plus,
    X,
    ArrowRight,
    Globe,
    Building2,
    Navigation,
} from "lucide-react";

// Setup workflow steps
type SetupStep = "workspace" | "routes" | "data" | "optimization" | "complete";

interface RouteStop {
    id: string;
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    priority: number;
    estimatedBoxes: number;
}

interface TruckConfig {
    width: number;
    length: number;
    height: number;
    maxWeight: number;
}

// Demo configuration templates
const DEMO_SCENARIOS = {
    "walmart-delivery": {
        name: "Walmart Multi-Stop Delivery",
        description: "150 diverse items across 4 temperature zones",
        boxCount: 150,
        temperatureZones: ["regular", "cold", "frozen"],
        truckConfig: { width: 8, length: 28, height: 9, maxWeight: 34000 },
        defaultRoutes: [
            { name: "Distribution Center", address: "123 Main St, Dallas, TX", priority: 1, estimatedBoxes: 0 },
            { name: "Store #4532", address: "456 Oak Ave, Dallas, TX", priority: 2, estimatedBoxes: 45 },
            { name: "Store #2901", address: "789 Pine St, Dallas, TX", priority: 3, estimatedBoxes: 55 },
            { name: "Store #7834", address: "321 Elm Dr, Dallas, TX", priority: 4, estimatedBoxes: 50 }
        ]
    },
    "electronics-fragile": {
        name: "Electronics & Fragile Items",
        description: "High-value fragile electronics requiring careful handling",
        boxCount: 35,
        temperatureZones: ["regular"],
        truckConfig: { width: 8, length: 24, height: 8, maxWeight: 25000 },
        defaultRoutes: [
            { name: "Electronics Warehouse", address: "100 Tech Blvd, Austin, TX", priority: 1, estimatedBoxes: 0 },
            { name: "Best Buy #432", address: "200 Consumer Way, Austin, TX", priority: 2, estimatedBoxes: 15 },
            { name: "Apple Store", address: "300 Innovation Dr, Austin, TX", priority: 3, estimatedBoxes: 12 },
            { name: "GameStop #891", address: "400 Gaming St, Austin, TX", priority: 4, estimatedBoxes: 8 }
        ]
    },
    "mixed-temperature": {
        name: "Mixed Temperature Loads",
        description: "Frozen, cold, and regular items with complex constraints",
        boxCount: 85,
        temperatureZones: ["regular", "cold", "frozen"],
        truckConfig: { width: 8.5, length: 26, height: 9, maxWeight: 30000 },
        defaultRoutes: [
            { name: "Food Distribution Hub", address: "500 Cold Chain Ave, Houston, TX", priority: 1, estimatedBoxes: 0 },
            { name: "Grocery Hub", address: "600 Fresh Market St, Houston, TX", priority: 2, estimatedBoxes: 35 },
            { name: "Restaurant Supply", address: "700 Chef's Way, Houston, TX", priority: 3, estimatedBoxes: 30 },
            { name: "Convenience Store", address: "800 Quick Stop Ln, Houston, TX", priority: 4, estimatedBoxes: 20 }
        ]
    }
};

export default function SamplePage() {
    // ───────────────────────── Setup State ─────────────────────────
    const [currentStep, setCurrentStep] = useState<SetupStep>("workspace");
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [setupProgress, setSetupProgress] = useState(0);

    // ───────────────────────── Workspace State ─────────────────────────
    const [workspaceName, setWorkspaceName] = useState("");
    const [selectedScenario, setSelectedScenario] = useState<keyof typeof DEMO_SCENARIOS>("walmart-delivery");
    const [truckConfig, setTruckConfig] = useState<TruckConfig>(DEMO_SCENARIOS["walmart-delivery"].truckConfig);

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
        unplaceableBoxes,
        truckDimensions,
        stabilityScore,
        safetyScore,
        optimizationScore,
        isSimulationRunning,
        initializePhysics,
        runSimulation,
        stopSimulation,
        loadSampleData,
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
            workspace: workspaceName && selectedScenario ? 25 : 0,
            routes: routes.length >= 2 ? 50 : 25,
            data: boxes.length > 0 ? 75 : 50,
            optimization: stabilityScore > 0 ? 100 : 75,
            complete: 100
        };
        setSetupProgress(stepProgress[currentStep]);
    }, [currentStep, workspaceName, selectedScenario, routes.length, boxes.length, stabilityScore]);

    // ───────────────────────── Setup Functions ─────────────────────────
    const initializeWorkspace = async () => {
        if (!workspaceName.trim()) return;

        setIsLoading(true);
        setLoadingMessage("Creating workspace...");

        try {
            const workspace = createWorkspace(workspaceName, "sample");
            loadWorkspace(workspace.id);
            
            // Set truck dimensions based on scenario
            setTruckDimensions(truckConfig);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setLoadingMessage("Setting up default routes...");
            
            // Load default routes for scenario
            const defaultRoutes = DEMO_SCENARIOS[selectedScenario].defaultRoutes.map((route, index) => ({
                id: `route-${index}`,
                name: route.name,
                address: route.address,
                coordinates: { lat: 32.7767 + (index * 0.01), lng: -96.7970 + (index * 0.01) },
                priority: route.priority,
                estimatedBoxes: route.estimatedBoxes
            }));
            
            setRoutes(defaultRoutes);
            
            // Initialize the route store with routes
            try {
                const initialized = initializeRouteStore(defaultRoutes);
                if (initialized) {
                    console.log('✅ Routes initialized in route store:', defaultRoutes.length);
                } else {
                    console.warn('⚠️ Route store initialization failed, continuing with local routes');
                }
            } catch (routeError) {
                console.warn("Route store initialization failed, continuing without route integration:", routeError);
            }
            
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

    const generateSampleData = async () => {
        setIsLoading(true);
        setLoadingMessage("Initializing route system...");

        try {
            // Use the safe route integration utility
            if (routes.length > 0) {
                const initialized = await initializeRouteStore(routes);
                
                if (initialized) {
                    setLoadingMessage("Routes configured successfully...");
                } else {
                    setLoadingMessage("Using default route configuration...");
                }
                
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            setLoadingMessage("Generating sample boxes with destinations...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Generate sample data - now safe to call
            loadSampleData();
            
            setLoadingMessage("Finalizing setup...");
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setCurrentStep("optimization");
        } catch (error) {
            console.error("Error in data generation process:", error);
            
            // Fallback: try to load sample data anyway
            try {
                setLoadingMessage("Loading with fallback configuration...");
                await new Promise(resolve => setTimeout(resolve, 500));
                loadSampleData();
                setCurrentStep("optimization");
            } catch (fallbackError) {
                console.error("Fallback also failed:", fallbackError);
                alert("Failed to generate sample data. Please try refreshing the page.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const runOptimization = async () => {
        setIsLoading(true);
        setLoadingMessage("Optimizing truck layout...");

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            optimizeLayout();
            initializePhysics();
            setCurrentStep("complete");
            setIsSetupComplete(true);
        } catch (error) {
            console.error("Error running optimization:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // ───────────────────────── derived metrics ─────────────────────────
    const totalWeight = boxes.reduce((s, b) => s + b.weight, 0);
    const totalVolume = boxes.reduce((s, b) => s + b.width * b.height * b.length, 0);
    const truckVolume = truckDimensions.width * truckDimensions.length * truckDimensions.height;
    const volumeUtilization = truckVolume > 0 ? Math.min((totalVolume / truckVolume) * 100, 100) : 0;
    const weightUtilization = Math.min((totalWeight / truckConfig.maxWeight) * 100, 100);

    // Temperature zone distribution
    const temperatureStats = boxes.reduce((acc, box) => {
        acc[box.temperatureZone] = (acc[box.temperatureZone] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Fragile items count
    const fragileCount = boxes.filter(box => box.isFragile).length;

    // ───────────────────────── Setup Wizard Render ─────────────────────────
    if (!isSetupComplete) {
        return (
            <div className="h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a2e] to-[#16213e] text-white overflow-hidden">
                {/* Header */}
                <header className="border-b border-primary/20 bg-[#0f0f10]/95 backdrop-blur-sm">
                    <div className="container mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <Image
                                    src="/logo_image.jpg"  // <-- your JPG file here
                                    alt="PackPilot Logo"
                                    width={80}
                                    height={80}
                                    className="rounded-xl"
                                    />

                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                                        PackPilot Setup Wizard
                                    </h1>
                                    <p className="text-sm text-gray-400">
                                        Configure your delivery scenario step by step
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

                {/* Setup Content */}
                <div className="flex h-[calc(100vh-88px)]">
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="max-w-2xl w-full space-y-8">
                            {/* Step Indicator */}
                            <div className="flex items-center justify-center space-x-4 mb-8">
                                {[
                                    { step: "workspace", label: "Workspace", icon: Building2 },
                                    { step: "routes", label: "Routes", icon: Route },
                                    { step: "data", label: "Data", icon: Package },
                                    { step: "optimization", label: "Optimize", icon: TrendingUp }
                                ].map(({ step, label, icon: Icon }, index) => (
                                    <div key={step} className="flex items-center">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                                            currentStep === step
                                                ? "border-primary bg-primary text-white"
                                                : setupProgress > (index + 1) * 25
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
                                        {index < 3 && (
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
                                        {currentStep === "data" && "Step 3: Generate Sample Data"}
                                        {currentStep === "optimization" && "Step 4: Optimize Layout"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Workspace Step */}
                                    {currentStep === "workspace" && (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="workspace-name">Workspace Name</Label>
                                                    <Input
                                                        id="workspace-name"
                                                        placeholder="Enter workspace name..."
                                                        value={workspaceName}
                                                        onChange={(e) => setWorkspaceName(e.target.value)}
                                                        className="mt-2"
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <Label>Select Delivery Scenario</Label>
                                                    <Select value={selectedScenario} onValueChange={(value) => {
                                                        setSelectedScenario(value as keyof typeof DEMO_SCENARIOS);
                                                        setTruckConfig(DEMO_SCENARIOS[value as keyof typeof DEMO_SCENARIOS].truckConfig);
                                                    }}>
                                                        <SelectTrigger className="mt-2">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(DEMO_SCENARIOS).map(([key, scenario]) => (
                                                                <SelectItem key={key} value={key}>
                                                                    {scenario.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                                                    <h4 className="font-medium text-primary mb-2">Scenario Details:</h4>
                                                    <p className="text-sm text-gray-300 mb-3">
                                                        {DEMO_SCENARIOS[selectedScenario].description}
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>Box Count: {DEMO_SCENARIOS[selectedScenario].boxCount}</div>
                                                        <div>Temperature Zones: {DEMO_SCENARIOS[selectedScenario].temperatureZones.length}</div>
                                                        <div>Truck: {truckConfig.width} × {truckConfig.length} × {truckConfig.height} ft</div>
                                                        <div>Max Weight: {truckConfig.maxWeight.toLocaleString()} lbs</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end">
                                                <Button
                                                    onClick={initializeWorkspace}
                                                    disabled={!workspaceName.trim() || isLoading}
                                                    className="bg-gradient-to-r from-primary to-blue-500"
                                                >
                                                    {isLoading ? "Creating..." : "Create Workspace"}
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

                                            <div className="flex justify-between">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setCurrentStep("workspace")}
                                                >
                                                    Back
                                                </Button>
                                                <Button
                                                    onClick={() => setCurrentStep("data")}
                                                    disabled={routes.length < 2}
                                                    className="bg-gradient-to-r from-primary to-blue-500"
                                                >
                                                    Continue
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Data Step */}
                                    {currentStep === "data" && (
                                        <div className="space-y-6">
                                            <div className="text-center space-y-4">
                                                <div className="p-8 bg-primary/10 rounded-lg border border-primary/20">
                                                    <Package className="h-16 w-16 text-primary mx-auto mb-4" />
                                                    <h4 className="text-lg font-medium mb-2">Generate Sample Data</h4>
                                                    <p className="text-gray-400 mb-4">
                                                        Routes are configured! Now we'll create {DEMO_SCENARIOS[selectedScenario].boxCount} sample boxes 
                                                        based on your {routes.length} delivery stops and scenario requirements.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>Configured Routes: {routes.length}</div>
                                                        <div>Estimated Boxes: {routes.reduce((sum, r) => sum + r.estimatedBoxes, 0)}</div>
                                                        <div>Temperature Zones: {DEMO_SCENARIOS[selectedScenario].temperatureZones.length}</div>
                                                        <div>Fragile Items: ~{Math.floor(DEMO_SCENARIOS[selectedScenario].boxCount * 0.15)}</div>
                                                    </div>
                                                    
                                                    <div className="mt-4 p-3 bg-green-500/10 rounded border border-green-500/20">
                                                        <div className="flex items-center justify-center space-x-2 text-sm text-green-400">
                                                            <CheckCircle className="h-4 w-4" />
                                                            <span>Routes initialized and ready for data generation</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setCurrentStep("routes")}
                                                >
                                                    Back
                                                </Button>
                                                <Button
                                                    onClick={generateSampleData}
                                                    disabled={isLoading || routes.length < 2}
                                                    className="bg-gradient-to-r from-primary to-blue-500"
                                                >
                                                    {isLoading ? "Generating..." : "Generate Sample Data"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Optimization Step */}
                                    {currentStep === "optimization" && (
                                        <div className="space-y-6">
                                            <div className="text-center space-y-4">
                                                <div className="p-8 bg-green-500/10 rounded-lg border border-green-500/20">
                                                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                                                    <h4 className="text-lg font-medium mb-2">Data Generated Successfully!</h4>
                                                    <p className="text-gray-400 mb-4">
                                                        {boxes.length + unplaceableBoxes.length} boxes created. 
                                                        Now let's optimize the truck layout for maximum efficiency.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>Total Boxes: {boxes.length + unplaceableBoxes.length}</div>
                                                        <div>Placeable: {boxes.length}</div>
                                                        <div>Need Placement: {unplaceableBoxes.length}</div>
                                                        <div>Total Weight: {totalWeight.toFixed(0)} lbs</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setCurrentStep("data")}
                                                >
                                                    Back
                                                </Button>
                                                <Button
                                                    onClick={runOptimization}
                                                    disabled={isLoading}
                                                    className="bg-gradient-to-r from-primary to-blue-500"
                                                >
                                                    {isLoading ? "Optimizing..." : "Optimize Layout"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-gray-800 p-6 rounded-lg border border-primary/20 text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-sm">{loadingMessage}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ───────────────────────── Main Application (After Setup) ─────────────────────────
    return (
        <div className="h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a2e] to-[#16213e] text-white overflow-hidden">
            {/* Enhanced Header */}
            <header className="border-b border-primary/ backdrop-blur-sm z-50 relative">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <Image
                                    src="/logo_image.jpg"  // <-- your JPG file here
                                    alt="PackPilot Logo"
                                    width={80}
                                    height={80}
                                    className="rounded-xl"
                                    />

                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                                    PackPilot
                                </h1>
                                <p className="text-sm text-primary font-medium">
                                    {currentWorkspace?.name || workspaceName}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            {/* Demo Stats */}
                            <div className="hidden lg:flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-2 px-3 py-1 bg-primary/10 rounded-full">
                                    <Package className="h-4 w-4 text-primary" />
                                    <span>{boxes.length} Placed</span>
                                </div>
                                {unplaceableBoxes.length > 0 && (
                                    <div className="flex items-center space-x-2 px-3 py-1 bg-red-500/10 rounded-full">
                                        <AlertCircle className="h-4 w-4 text-red-400" />
                                    <span>{unplaceableBoxes.length} Unplaced</span>
                                </div>
                                )}
                                <div className="flex items-center space-x-2 px-3 py-1 bg-orange-500/10 rounded-full">
                                    <Shield className="h-4 w-4 text-orange-400" />
                                    <span>{fragileCount} Fragile</span>
                                </div>
                                <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 rounded-full">
                                    <Thermometer className="h-4 w-4 text-green-400" />
                                    <span>{Object.keys(temperatureStats).length} Zones</span>
                                </div>
                            </div>

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
                                    className="border-primary/30 hover:bg-primary/10"
                                >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save Demo
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                        setIsSetupComplete(false);
                                        setCurrentStep("workspace");
                                        resetToEmpty();
                                    }}
                                    className="border-gray-600 hover:bg-gray-700"
                                >
                                    New Setup
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex h-[calc(100vh-88px)]">
                {/* Enhanced Sidebar */}
                <div className={`${sidebarCollapsed ? "w-16" : "w-80"} transition-all duration-300 bg-[#0f0f10]/80 backdrop-blur-sm flex flex-col border-r border-primary/20`}>
                    {/* Collapse Button */}
                    <div className="p-4 border-b border-primary/30">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="w-full justify-start text-primary hover:bg-primary/10 transition-colors"
                        >
                            {sidebarCollapsed ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <>
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="ml-2">Collapse Panel</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Enhanced Sidebar Content */}
                    {!sidebarCollapsed && (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Route Overview */}
                            <Card className="bg-gradient-to-br from-primary/10 to-blue-500/10 border-primary/20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-primary flex items-center">
                                        <Route className="h-4 w-4 mr-2" />
                                        Delivery Routes ({routes.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {routes.slice(0, 4).map((route, index) => (
                                        <div key={route.id} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs">
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

                            {/* Placement Summary */}
                            {(boxes.length > 0 || unplaceableBoxes.length > 0) && (
                                <Card className="bg-gradient-to-br from-green-500/10 to-red-500/10 border-green-500/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-green-400 flex items-center">
                                            <Package className="h-4 w-4 mr-2" />
                                            Placement Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-green-400">Successfully Placed:</span>
                                                <span className="font-medium">{boxes.length}</span>
                                            </div>
                                            {unplaceableBoxes.length > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-red-400">Unplaced:</span>
                                                    <span className="font-medium">{unplaceableBoxes.length}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span>Total:</span>
                                                <span className="font-medium">{boxes.length + unplaceableBoxes.length}</span>
                                            </div>
                                        </div>
                                        <Progress 
                                            value={(boxes.length / (boxes.length + unplaceableBoxes.length)) * 100} 
                                            className="h-2"
                                        />
                                        <div className="text-xs text-gray-400 text-center">
                                            {((boxes.length / (boxes.length + unplaceableBoxes.length)) * 100).toFixed(1)}% placement rate
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Main Tabs */}
                            <Tabs defaultValue="boxes" className="w-full">
                                <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border border-primary/20">
                                    {[
                                        { value: "boxes", icon: Package, label: "Boxes" },
                                        { value: "physics", icon: Zap, label: "Physics" },
                                        { value: "control", icon: Settings, label: "Control" },
                                        { value: "reports", icon: FileText, label: "Reports" },
                                    ].map(({ value, icon: Icon, label }) => (
                                        <TabsTrigger
                                            key={value}
                                            value={value}
                                            className="text-xs text-primary data-[state=active]:bg-primary/20 data-[state=active]:text-white transition-colors"
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span className="ml-1 hidden sm:inline">{label}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                <TabsContent value="boxes" className="mt-4">
                                    <BoxManager />
                                </TabsContent>

                                <TabsContent value="physics" className="mt-4 space-y-4">
                                    <PhysicsPanel />
                                    <SimulationControls />
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

                {/* Enhanced Visualization Pane */}
                <div className="flex-1 flex flex-col">
                    {/* Enhanced Toolbar */}
                    <div className="p-4 border-b border-primary/30 bg-[#0f0f10]/50 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            {/* View Controls */}
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
                                    disabled={boxes.length === 0 && unplaceableBoxes.length === 0}
                                >
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    Re-optimize Load
                                </Button>
                            </div>

                            {/* Enhanced Stats */}
                            <div className="hidden xl:flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                                    <BarChart3 className="h-4 w-4 text-blue-400" />
                                    <span className="text-blue-300">Vol: {volumeUtilization.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                                    <TrendingUp className="h-4 w-4 text-green-400" />
                                    <span className="text-green-300">Weight: {weightUtilization.toFixed(1)}%</span>
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

                    {/* Visualization Canvas */}
                    <div className="flex-1 relative bg-gradient-to-br from-[#0f0f10] to-[#1a1a2e]">
                        {activeView === "map" ? (
                            <MapVisualization />
                        ) : (
                            <TruckVisualization viewMode={activeView} />
                        )}
                        
                        {/* Demo Overlay */}
                        <div className="absolute top-4 left-4 space-y-2">
                            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                                🚀 Demo Mode Active
                            </Badge>
                            {isSimulationRunning && (
                                <Badge variant="destructive" className="animate-pulse">
                                    ⚡ Physics Simulation Running
                                </Badge>
                            )}
                            {unplaceableBoxes.length > 0 && (
                                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                                    ⚠️ {unplaceableBoxes.length} Unplaced Items
                                </Badge>
                            )}
                        </div>

                        {/* Truck Info Overlay */}
                        <div className="absolute top-4 right-4 space-y-2">
                            <Card className="bg-gray-800/90 backdrop-blur-sm border-primary/20 p-3">
                                <div className="text-xs space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Truck:</span>
                                        <span>{truckDimensions.width} × {truckDimensions.length} × {truckDimensions.height} ft</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Capacity:</span>
                                        <span>{(truckVolume).toFixed(0)} ft³</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Used:</span>
                                        <span className={volumeUtilization > 80 ? "text-red-400" : "text-green-400"}>
                                            {volumeUtilization.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Status Panel */}
            <StatusPanel />
        </div>
    );
}