"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { TruckVisualization } from "@/components/truck-visualization";
import MapVisualization from "@/components/map-visualization";
import { ControlPanel } from "@/components/control-panel";
import { BoxManager } from "@/components/box-manager";
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
import Logo from '@/public/logo.svg';
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
} from "lucide-react";

// Demo configuration
const DEMO_CONFIG = {
    autoOptimize: false,
    showTutorial: false,
    simulationSpeed: 1.0,
    demoScenarios: [
        {
            id: "walmart-delivery",
            name: "Walmart Multi-Stop Delivery",
            description: "150 diverse items across 4 temperature zones",
            boxCount: 150,
            temperatureZones: ["regular", "cold", "frozen"],
            destinations: ["Distribution Center A", "Store #4532", "Store #2901", "Store #7834"]
        },
        {
            id: "electronics-fragile",
            name: "Electronics & Fragile Items",
            description: "High-value fragile electronics requiring careful handling",
            boxCount: 35,
            temperatureZones: ["regular"],
            destinations: ["Best Buy #432", "Apple Store", "GameStop #891"]
        },
        {
            id: "mixed-temperature",
            name: "Mixed Temperature Loads",
            description: "Frozen, cold, and regular items with complex constraints",
            boxCount: 85,
            temperatureZones: ["regular", "cold", "frozen"],
            destinations: ["Grocery Hub", "Restaurant Supply", "Convenience Store"]
        }
    ]
};

export default function SamplePage() {
    // ───────────────────────── state ─────────────────────────
    const [activeView, setActiveView] = useState<"3d" | "2d" | "hybrid" | "map">("3d");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentScenario, setCurrentScenario] = useState(DEMO_CONFIG.demoScenarios[0]);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState("Initializing PackPilot...");

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
        loadSampleData,
        optimizeLayout,
        resetLayout,
    } = useOptimizationStore();

    const { 
        createWorkspace, 
        loadWorkspace, 
        currentWorkspace, 
        saveWorkspace 
    } = useWorkspaceStore();

    // ───────────────────────── initialization ─────────────────────────
    useEffect(() => {
        const initializeSample = async () => {
            const loadingSteps = [
                { message: "Creating sample workspace...", progress: 20 },
                { message: "Loading 150 sample boxes...", progress: 40 },
                { message: "Initializing physics engine...", progress: 60 },
                { message: "Optimizing initial layout...", progress: 80 },
                { message: "Finalizing demo environment...", progress: 100 },
            ];

            try {
                for (let i = 0; i < loadingSteps.length; i++) {
                    const step = loadingSteps[i];
                    setLoadingMessage(step.message);
                    setLoadingProgress(step.progress);
                    
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    if (i === 0) {
                        // Create sample workspace
                        const workspace = createWorkspace(
                            `${currentScenario.name} - Demo`, 
                            "sample"
                        );
                        loadWorkspace(workspace.id);
                    } else if (i === 1) {
                        // Load sample data
                        loadSampleData();
                    } else if (i === 2) {
                        // Initialize physics
                        initializePhysics();
                    } else if (i === 3) {
                        // Auto-optimize if configured
                        if (DEMO_CONFIG.autoOptimize) {
                            optimizeLayout();
                        }
                    }
                }

                setIsLoading(false);
            } catch (error) {
                console.error("Error initializing sample workspace:", error);
                setLoadingMessage("Error loading demo - retrying...");
                setTimeout(() => setIsLoading(false), 2000);
            }
        };

        initializeSample();
    }, [currentScenario, createWorkspace, loadWorkspace, loadSampleData, initializePhysics, optimizeLayout]);

    // ───────────────────────── derived metrics ─────────────────────────
    const totalWeight = boxes.reduce((s, b) => s + b.weight, 0);
    const totalVolume = boxes.reduce((s, b) => s + b.width * b.height * b.length, 0);
    const truckVolume = truckDimensions.width * truckDimensions.length * truckDimensions.height;
    const volumeUtilization = Math.min((totalVolume / truckVolume) * 100, 100);
    const weightUtilization = Math.min((totalWeight / 34_000) * 100, 100);

    // Temperature zone distribution
    const temperatureStats = boxes.reduce((acc, box) => {
        acc[box.temperatureZone] = (acc[box.temperatureZone] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Fragile items count
    const fragileCount = boxes.filter(box => box.isFragile).length;

    // Destination distribution
    const destinationStats = boxes.reduce((acc, box) => {
        if (box.destination) {
            acc[box.destination] = (acc[box.destination] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    // ───────────────────────── actions ─────────────────────────
    const handleSaveWorkspace = () => {
        if (!currentWorkspace) return;
        saveWorkspace(currentWorkspace.id, {
            ...currentWorkspace,
            boxes,
            truckDimensions,
            lastModified: new Date().toISOString(),
        });
    };

    const handleOptimize = () => {
        optimizeLayout();
    };

    const handleResetLayout = () => {
        resetLayout();
    };

    const handleScenarioChange = (scenario: typeof DEMO_CONFIG.demoScenarios[0]) => {
        setCurrentScenario(scenario);
        setIsLoading(true);
    };

    // Show loading screen while initializing
    if (isLoading) {
        return (
            <div className="h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a2e] to-[#16213e] text-white flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md mx-auto px-6">
                    <div className="relative">
                        <div className="p-6 bg-gray-800/50 rounded-2xl border border-primary/30 backdrop-blur-sm">
                            <Logo className="w-20 h-20 mx-auto mb-4 text-primary" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full animate-pulse" />
                    </div>
                    
                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                            PackPilot Demo
                        </h1>
                        <p className="text-lg text-primary font-medium">
                            {currentScenario.name}
                        </p>
                        <p className="text-sm text-gray-400">
                            {currentScenario.description}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Progress value={loadingProgress} className="h-2" />
                        <p className="text-sm text-gray-300">{loadingMessage}</p>
                    </div>

                    <div className="flex justify-center space-x-4 text-xs text-gray-400">
                        <div className="flex items-center space-x-1">
                            <Package className="h-4 w-4" />
                            <span>{currentScenario.boxCount} Items</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Thermometer className="h-4 w-4" />
                            <span>{currentScenario.temperatureZones.length} Zones</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Map className="h-4 w-4" />
                            <span>{currentScenario.destinations.length} Stops</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a2e] to-[#16213e] text-white overflow-hidden">
            {/* Enhanced Header */}
            <header className="border-b border-primary/20 bg-[#0f0f10]/95 backdrop-blur-sm z-50 relative">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="relative p-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-primary/30">
                                <Logo className="w-12 h-12 text-primary" />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                                    PackPilot Demo
                                </h1>
                                <p className="text-sm text-primary font-medium">
                                    {currentWorkspace?.name || currentScenario.name}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            {/* Demo Stats */}
                            <div className="hidden lg:flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-2 px-3 py-1 bg-primary/10 rounded-full">
                                    <Package className="h-4 w-4 text-primary" />
                                    <span>{boxes.length} Items</span>
                                </div>
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
                                    onClick={handleSaveWorkspace}
                                    className="border-primary/30 hover:bg-primary/10"
                                >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save Demo
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
                            {/* Demo Scenario Selector */}
                            <Card className="bg-gradient-to-br from-primary/10 to-blue-500/10 border-primary/20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-primary flex items-center">
                                        <Target className="h-4 w-4 mr-2" />
                                        Demo Scenarios
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {DEMO_CONFIG.demoScenarios.map((scenario) => (
                                        <Button
                                            key={scenario.id}
                                            variant={currentScenario.id === scenario.id ? "default" : "outline"}
                                            size="sm"
                                            className="w-full justify-start text-xs"
                                            onClick={() => handleScenarioChange(scenario)}
                                        >
                                            {scenario.name}
                                        </Button>
                                    ))}
                                </CardContent>
                            </Card>

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
                                    onClick={handleResetLayout}
                                    className="border-gray-600 hover:bg-gray-700"
                                >
                                    Reset Layout
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleOptimize}
                                    className="bg-gradient-to-r from-primary to-blue-500 hover:shadow-lg transition-all duration-200"
                                >
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    Optimize Load
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Status Panel */}
            <StatusPanel />
        </div>
    );
}