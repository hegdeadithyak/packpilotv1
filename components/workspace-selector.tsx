"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useOptimizationStore } from "@/store/optimization-store";
import {
  Truck,
  Plus,
  Package,
  Calendar,
  Users,
  Zap,
  FileText,
  Map,
} from "lucide-react";

interface WorkspaceSelectorProps {
  onWorkspaceSelected: () => void;
}

export function WorkspaceSelector({
  onWorkspaceSelected,
}: WorkspaceSelectorProps) {
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const { workspaces, createWorkspace, loadWorkspace } = useWorkspaceStore();
  const { loadSampleData, resetToEmpty } = useOptimizationStore();

  const handleCreateSampleWorkspace = () => {
    const workspace = createWorkspace("Sample Workspace - 30+ Boxes", "sample");
    loadWorkspace(workspace.id);
    loadSampleData();
    onWorkspaceSelected();
  };

  const handleCreateEmptyWorkspace = () => {
    const name = newWorkspaceName || "New Workspace";
    const workspace = createWorkspace(name, "empty");
    loadWorkspace(workspace.id);
    resetToEmpty();
    onWorkspaceSelected();
  };

  const handleLoadExistingWorkspace = (workspaceId: string) => {
    loadWorkspace(workspaceId);
    onWorkspaceSelected();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-muted rounded-2xl">
              <Truck className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            PackPilot
          </h1>
          <p className="text-xl text-primary max-w-2xl mx-auto">
            Advanced physics-based warehouse management system for optimizing
            truck loading operations
          </p>
        </div>

        {/* Workspace Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Sample Workspace */}
          <Card
            className="bg-card border-2 border-transparent hover:border-secondary transition-all cursor-pointer group"
            onClick={handleCreateSampleWorkspace}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-secondary/20 rounded-lg group-hover:bg-secondary/30 transition-colors">
                  <Package className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle className="text-xl text-foreground">
                  Sample Workspace
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Pre-loaded with 30+ diverse boxes representing typical Walmart
                inventory. Demonstrates optimal loading sequences, temperature
                zones, and physics simulation.
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span className="text-muted-foreground">
                    30+ boxes with varying properties
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span className="text-muted-foreground">
                    Optimized loading sequence
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span className="text-muted-foreground">
                    Temperature zone management
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span className="text-muted-foreground">
                    Physics simulation ready
                  </span>
                </div>
              </div>

              <button
  type="button"
  className="
    relative w-full mt-6 py-2
    flex justify-center items-center   /* centers text */
    text-sm font-semibold text-white text-center
    bg-emerald-600 rounded-lg
    shadow-md transition
    hover:bg-emerald-500
    focus:outline-none focus:ring-2 focus:ring-emerald-300

    /* ─── glowing halo ─── */
    before:absolute before:inset-0 before:-z-10
    before:rounded-lg before:blur-lg before:opacity-40
    before:bg-emerald-400/70
    hover:before:opacity-70
  "
>
  Load Sample Workspace
</button>

            </CardContent>
          </Card>

          {/* Create New Workspace */}
          <Card className="bg-card hover:bg-muted/50 transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl text-foreground">
                  Create New Workspace
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Start with an empty truck and build your loading plan from
                scratch. Perfect for custom scenarios and specific requirements.
              </p>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="workspace-name"
                    className="text-sm text-muted-foreground"
                  >
                    Workspace Name
                  </Label>
                  <Input
                    id="workspace-name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name..."
                    className="mt-1"
                  />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">
                      Empty 28ft box truck
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">
                      Default truck configuration
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">
                      Ready for custom loading
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleCreateEmptyWorkspace}
                  variant="outline"
                  className="w-full"
                >
                  Create Empty Workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Existing Workspaces */}
        {workspaces.length > 0 && (
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Recent Workspaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspaces.slice(0, 6).map((workspace) => (
                  <div
                    key={workspace.id}
                    className="p-4 bg-muted/50 rounded-lg border-2 border-transparent hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => handleLoadExistingWorkspace(workspace.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-foreground truncate">
                        {workspace.name}
                      </h3>
                      <div className="text-xs text-muted-foreground">
                        {workspace.boxes?.length || 0} boxes
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(workspace.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Overview */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Key Features
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-1">
                3D Visualization
              </h3>
              <p className="text-sm text-muted-foreground">
                Interactive 3D truck loading view
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-medium text-white mb-1">Physics Engine</h3>
              <p className="text-sm text-primary">
                Real-time physics simulation
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-medium text-white mb-1">
                Smart Optimization
              </h3>
              <p className="text-sm text-primary">
                AI-powered loading algorithms
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FileText className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="font-medium text-white mb-1">PDF Reports</h3>
              <p className="text-sm text-primary">
                Comprehensive loading reports
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Map className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-medium text-white mb-1">Route Mapping</h3>
              <p className="text-sm text-primary">
                Walmart store route planning
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
