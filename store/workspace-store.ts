"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Box } from "@/types/box"

export interface Workspace {
  id: string
  name: string
  type: "sample" | "empty" | "custom"
  boxes?: Box[]
  truckDimensions?: {
    width: number
    length: number
    height: number
  }
  createdAt: string
  lastModified: string
  description?: string
}

interface WorkspaceState {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null

  // Actions
  createWorkspace: (name: string, type: "sample" | "empty" | "custom") => Workspace
  loadWorkspace: (id: string) => void
  saveWorkspace: (id: string, updates: Partial<Workspace>) => void
  deleteWorkspace: (id: string) => void
  setCurrentWorkspace: (workspace: Workspace | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspace: null,

      createWorkspace: (name, type) => {
        const workspace: Workspace = {
          id: `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          type,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          description: type === "sample" ? "Pre-loaded with 30+ sample boxes" : "Empty workspace for custom loading",
          truckDimensions: {
            width: 8,
            length: 28,
            height: 9,
          },
        }

        set((state) => ({
          workspaces: [...state.workspaces, workspace],
          currentWorkspace: workspace,
        }))

        return workspace
      },

      loadWorkspace: (id) => {
        const workspace = get().workspaces.find((w) => w.id === id)
        if (workspace) {
          set({ currentWorkspace: workspace })
        }
      },

      saveWorkspace: (id, updates) => {
        set((state) => ({
          workspaces: state.workspaces.map((workspace) =>
            workspace.id === id ? { ...workspace, ...updates, lastModified: new Date().toISOString() } : workspace,
          ),
          currentWorkspace:
            state.currentWorkspace?.id === id
              ? { ...state.currentWorkspace, ...updates, lastModified: new Date().toISOString() }
              : state.currentWorkspace,
        }))
      },

      deleteWorkspace: (id) => {
        set((state) => ({
          workspaces: state.workspaces.filter((workspace) => workspace.id !== id),
          currentWorkspace: state.currentWorkspace?.id === id ? null : state.currentWorkspace,
        }))
      },

      setCurrentWorkspace: (workspace) => {
        set({ currentWorkspace: workspace })
      },
    }),
    {
      name: "walmart-workspaces",
      partialize: (state) => ({
        workspaces: state.workspaces,
      }),
    },
  ),
)
