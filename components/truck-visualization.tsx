"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, PerspectiveCamera, Html, Stats, TransformControls } from "@react-three/drei"
import { Physics } from "@react-three/cannon"
import { Suspense, useRef, useEffect, useState, useMemo, useCallback } from "react"
import { TruckContainer } from "@/components/3d/truck-container"
import { TemperatureZones } from "@/components/3d/temperature-zones"
import { LoadingIndicators } from "@/components/3d/loading-indicators"
import { PhysicsDebugger } from "@/components/3d/physics-debugger"
import { TwoDRenderer } from "@/components/2d/two-d-renderer"
import { useOptimizationStore } from "@/store/optimization-store"
import { useFrame } from "@react-three/fiber"
import {
  PhysicsSimulationController,
  EnhancedBoxRenderer,
  TruckBedPhysics,
  useTruckPhysics
} from "@/physics/truck-physics-system"
import * as THREE from "three"

// Route Store for synchronization
import { create } from 'zustand'

interface TruckVisualizationProps {
  viewMode: "3d" | "2d" | "hybrid"
}

interface HoveredBoxInfo {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  dimensions: { width: number; height: number; length: number }
  weight: number
  isFragile: boolean
  temperatureZone: string
  destination: string
  screenPosition: { x: number; y: number }
}

interface SelectedBoxInfo {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  isRotated: boolean
}

interface Order {
  id: number
  retailId: number
  productId: number
  quantity: number
  deliveryDate: string
  status: string
  totalWeight: number
  priority: string
  createdAt: string
  retail?: {
    name: string
    address: string
  }
  product?: {
    name: string
    category: string
    weight: number
  }
}

interface Warehouse {
  id: number
  name: string
  address: string
  coordinates: {
    lat: number
    lng: number
  }
  capacity: number
  orderWarehouses: any[]
  deliveryRoutes: any[]
}

interface DeliveryStop {
  id: string
  warehouseId: number
  warehouse: Warehouse
  order: number
  estimatedArrival?: string
  isCompleted: boolean
  name: string // Display name for the stop - now just "Stop 1", "Stop 2", etc.
}

// Route Store for synchronized destinations
interface RouteStore {
  deliveryStops: DeliveryStop[]
  addDeliveryStop: (warehouse: Warehouse) => void
  removeDeliveryStop: (stopId: string) => void
  reorderStop: (stopId: string, direction: 'up' | 'down') => void
  toggleStopCompletion: (stopId: string) => void
  getAvailableDestinations: () => string[]
}

export const useRouteStore = create<RouteStore>((set, get) => ({
  deliveryStops: [],
  
  addDeliveryStop: (warehouse) => {
    const { deliveryStops } = get()
    const newStop: DeliveryStop = {
      id: `stop-${Date.now()}-${warehouse.id}`,
      warehouseId: warehouse.id,
      warehouse,
      order: deliveryStops.length + 1,
      isCompleted: false,
      name: `Stop ${deliveryStops.length + 1}` // Simple format: "Stop 1", "Stop 2", etc.
    }
    const updatedStops = [...deliveryStops, newStop]
    set({ deliveryStops: updatedStops })
    
    // Sync with optimization store
    syncDestinationsWithRoute(updatedStops)
  },
  
  removeDeliveryStop: (stopId) => {
    const { deliveryStops } = get()
    const removedStop = deliveryStops.find(s => s.id === stopId)
    const updated = deliveryStops
      .filter(stop => stop.id !== stopId)
      .map((stop, index) => ({ 
        ...stop, 
        order: index + 1,
        name: `Stop ${index + 1}` // Simple format after reordering
      }))
    
    set({ deliveryStops: updated })
    
    // Clear boxes assigned to removed stop and sync
    if (removedStop) {
      reassignBoxesFromRemovedStop(removedStop.name)
    }
    syncDestinationsWithRoute(updated)
  },
  
  reorderStop: (stopId, direction) => {
    const { deliveryStops } = get()
    const stopIndex = deliveryStops.findIndex(stop => stop.id === stopId)
    if (stopIndex === -1) return

    const newStops = [...deliveryStops]
    const targetIndex = direction === 'up' ? stopIndex - 1 : stopIndex + 1

    if (targetIndex < 0 || targetIndex >= newStops.length) return

    // Swap stops
    ;[newStops[stopIndex], newStops[targetIndex]] = [newStops[targetIndex], newStops[stopIndex]]

    // Update order numbers and names
    const reorderedStops = newStops.map((stop, index) => ({ 
      ...stop, 
      order: index + 1,
      name: `Stop ${index + 1}` // Simple format after reordering
    }))
    
    set({ deliveryStops: reorderedStops })
    syncDestinationsWithRoute(reorderedStops)
  },
  
  toggleStopCompletion: (stopId) => {
    const { deliveryStops } = get()
    const updated = deliveryStops.map(stop =>
      stop.id === stopId ? { ...stop, isCompleted: !stop.isCompleted } : stop
    )
    set({ deliveryStops: updated })
  },
  
  getAvailableDestinations: () => {
    const { deliveryStops } = get()
    return deliveryStops.map(stop => stop.name)
  }
}))

// Sync functions
const syncDestinationsWithRoute = (deliveryStops: DeliveryStop[]) => {
  const { boxes, updateBox } = useOptimizationStore.getState()
  const availableDestinations = deliveryStops.map(stop => stop.name)
  
  // Update boxes with invalid destinations
  boxes.forEach(box => {
    if (box.destination && !availableDestinations.includes(box.destination)) {
      updateBox(box.id, { destination: '' })
    }
  })
}

const reassignBoxesFromRemovedStop = (removedStopName: string) => {
  const { boxes, updateBox } = useOptimizationStore.getState()
  
  // Clear destination for boxes assigned to removed stop
  boxes.forEach(box => {
    if (box.destination === removedStopName) {
      updateBox(box.id, { destination: '' })
    }
  })
}

// Global state to avoid re-renders
let globalHoveredBox: HoveredBoxInfo | null = null
let globalSelectedBox: SelectedBoxInfo | null = null
let globalHoverCallbacks: Set<(box: HoveredBoxInfo | null) => void> = new Set()
let globalSelectCallbacks: Set<(box: SelectedBoxInfo | null) => void> = new Set()

// Import HDRI environment
import { suspend } from 'suspend-react'
const bridge = import('@pmndrs/assets/hdri/warehouse.exr')

// Add these functions to your truck-visualization.tsx file
// Place them after the useRouteStore definition (around line 110)

// Initialize route store with delivery stops
export function initializeRouteStore(routes: any[]): boolean {
  try {
    if (!routes || routes.length === 0) {
      console.warn('No routes provided for initialization');
      return false;
    }

    const { deliveryStops, addDeliveryStop } = useRouteStore.getState();
    
    // Clear existing stops first
    useRouteStore.setState({ deliveryStops: [] });
    
    // Add each route as a delivery stop
    routes.forEach((route, index) => {
      const warehouse: Warehouse = {
        id: index + 1,
        name: route.name,
        address: route.address,
        coordinates: route.coordinates,
        capacity: route.estimatedBoxes * 100, // Estimate capacity
        orderWarehouses: [],
        deliveryRoutes: []
      };
      
      // Create the delivery stop
      const deliveryStop: DeliveryStop = {
        id: route.id,
        warehouseId: warehouse.id,
        warehouse,
        order: route.priority,
        estimatedArrival: new Date(Date.now() + route.priority * 60 * 60 * 1000).toISOString(),
        isCompleted: false,
        name: `Stop ${route.priority}` // Use simple format
      };
      
      // Add to store
      useRouteStore.setState(state => ({
        deliveryStops: [...state.deliveryStops, deliveryStop]
      }));
    });
    
    console.log('✅ Route store initialized with', routes.length, 'stops');
    return true;
  } catch (error) {
    console.error('Failed to initialize route store:', error);
    return false;
  }
}

// Check if route store is ready and has stops
export function isRouteStoreReady(): boolean {
  try {
    const { deliveryStops } = useRouteStore.getState();
    return Array.isArray(deliveryStops) && deliveryStops.length > 0;
  } catch (error) {
    console.error('Error checking route store readiness:', error);
    return false;
  }
}

// Additional helper function to get available destinations safely
export function getAvailableDestinations(): string[] {
  try {
    const { deliveryStops } = useRouteStore.getState();
    if (!deliveryStops || deliveryStops.length === 0) {
      return ["Stop 1", "Stop 2", "Stop 3", "Stop 4"]; // Default fallback
    }
    return deliveryStops.map(stop => stop.name);
  } catch (error) {
    console.warn('Error getting destinations from route store:', error);
    return ["Stop 1", "Stop 2", "Stop 3", "Stop 4"]; // Default fallback
  }
}

// Initialize route store with default stops if empty
export function ensureRouteStoreHasDefaults(): void {
  try {
    const { deliveryStops } = useRouteStore.getState();
    
    if (deliveryStops.length === 0) {
      console.log('🔄 Initializing route store with default stops');
      
      const defaultWarehouses: Warehouse[] = [
        {
          id: 1,
          name: "Distribution Center",
          address: "123 Main St, Dallas, TX",
          coordinates: { lat: 32.7767, lng: -96.7970 },
          capacity: 10000,
          orderWarehouses: [],
          deliveryRoutes: []
        },
        {
          id: 2,
          name: "Store #4532",
          address: "456 Oak Ave, Dallas, TX",
          coordinates: { lat: 32.7867, lng: -96.7870 },
          capacity: 5000,
          orderWarehouses: [],
          deliveryRoutes: []
        },
        {
          id: 3,
          name: "Store #2901",
          address: "789 Pine St, Dallas, TX",
          coordinates: { lat: 32.7967, lng: -96.7770 },
          capacity: 5000,
          orderWarehouses: [],
          deliveryRoutes: []
        },
        {
          id: 4,
          name: "Store #7834",
          address: "321 Elm Dr, Dallas, TX",
          coordinates: { lat: 32.8067, lng: -96.7670 },
          capacity: 5000,
          orderWarehouses: [],
          deliveryRoutes: []
        }
      ];

      // Add default stops
      defaultWarehouses.forEach(warehouse => {
        useRouteStore.getState().addDeliveryStop(warehouse);
      });
      
      console.log('✅ Default route stops added');
    }
  } catch (error) {
    console.error('Error ensuring route store defaults:', error);
  }
}

// Enhanced Orders Panel Component with Warehouse Stop Management and Route Sync
function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [warehousesLoading, setWarehousesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<Set<number>>(new Set())
  const [isExpanded, setIsExpanded] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'orders' | 'stops'>('orders')
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(['pending', 'confirmed', 'in_transit', 'delivered']))
  const [showAddStopModal, setShowAddStopModal] = useState(false)

  // Route store integration
  const { 
    deliveryStops, 
    addDeliveryStop, 
    removeDeliveryStop, 
    reorderStop, 
    toggleStopCompletion,
    getAvailableDestinations 
  } = useRouteStore()
  
  const { boxes } = useOptimizationStore()

  // Load orders from API
  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:3001/api/orders')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setOrders(data)
      setError(null)
    } catch (err) {
      console.error('Failed to load orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  // Load warehouses from API
  const loadWarehouses = async () => {
    try {
      setWarehousesLoading(true)
      const response = await fetch('http://localhost:3001/api/warehouses')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      if (result.success) {
        setWarehouses(result.data)
      } else {
        throw new Error('Failed to fetch warehouses')
      }
    } catch (err) {
      console.error('Failed to load warehouses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load warehouses')
    } finally {
      setWarehousesLoading(false)
    }
  }

  // Filter orders based on selected statuses
  useEffect(() => {
    const filtered = orders.filter(order => selectedStatuses.has(order.status))
    setFilteredOrders(filtered)
  }, [orders, selectedStatuses])

  // Load initial data
  useEffect(() => {
    loadOrders()
    loadWarehouses()
  }, [])

  // Update order status
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      setUpdatingStatus(prev => new Set(prev).add(orderId))

      const response = await fetch(`http://localhost:3001/api/orders`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus }
            : order
        )
      )
    } catch (err) {
      console.error('Failed to update order status:', err)
      alert('Failed to update order status: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setUpdatingStatus(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  // Get box count and weight for a stop
  const getStopBoxCount = (stopName: string) => {
    return boxes.filter(box => box.destination === stopName).length
  }

  const getStopWeight = (stopName: string) => {
    return boxes
      .filter(box => box.destination === stopName)
      .reduce((sum, box) => sum + box.weight, 0)
  }

  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(status)) {
        newSet.delete(status)
      } else {
        newSet.add(status)
      }
      return newSet
    })
  }

  // Select all statuses
  const selectAllStatuses = () => {
    setSelectedStatuses(new Set(['pending', 'confirmed', 'in_transit', 'delivered']))
  }

  // Clear all status filters
  const clearAllStatusFilters = () => {
    setSelectedStatuses(new Set())
  }

  // Utility functions for styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-900/30'
      case 'confirmed': return 'text-blue-400 bg-blue-900/30'
      case 'in_transit': return 'text-orange-400 bg-orange-900/30'
      case 'delivered': return 'text-green-400 bg-green-900/30'
      default: return 'text-gray-400 bg-gray-900/30'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400'
      case 'normal': return 'text-blue-400'
      case 'low': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  const getFilterButtonColor = (status: string) => {
    const isSelected = selectedStatuses.has(status)
    switch (status) {
      case 'pending':
        return isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-800/50'
      case 'confirmed':
        return isSelected ? 'bg-blue-600 text-white' : 'bg-blue-900/30 text-blue-400 hover:bg-blue-800/50'
      case 'in_transit':
        return isSelected ? 'bg-orange-600 text-white' : 'bg-orange-900/30 text-orange-400 hover:bg-orange-800/50'
      case 'delivered':
        return isSelected ? 'bg-green-600 text-white' : 'bg-green-900/30 text-green-400 hover:bg-green-800/50'
      default:
        return isSelected ? 'bg-gray-600 text-white' : 'bg-gray-900/30 text-gray-400 hover:bg-gray-800/50'
    }
  }

  const statusOptions = ['pending', 'confirmed', 'in_transit', 'delivered']

  return (
    <div className="absolute top-4 left-4 z-10 w-96 max-h-[80vh] bg-gray-900/95 text-white rounded-lg border border-gray-600 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-cyan-400">
            {activeTab === 'orders' ? '📦 Orders' : '🚛 Route Planning'}
          </h3>
          <span className="text-xs bg-gray-700 px-2 py-1 rounded">
            {activeTab === 'orders' ? `${filteredOrders.length}/${orders.length}` : deliveryStops.length}
          </span>
        </div>
        <div className="flex gap-2">
          {activeTab === 'orders' && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-2 py-1 rounded text-xs transition-colors ${showFilters ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              title="Filter orders"
            >
              🔽
            </button>
          )}
          <button
            onClick={activeTab === 'orders' ? loadOrders : loadWarehouses}
            disabled={loading || warehousesLoading}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
          >
            {(loading || warehousesLoading) ? '🔄' : '↻'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      {isExpanded && (
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'orders'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            📦 Orders
          </button>
          <button
            onClick={() => setActiveTab('stops')}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'stops'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            🚛 Route Stops
          </button>
        </div>
      )}

      {/* Filter Panel - Orders Only */}
      {showFilters && isExpanded && activeTab === 'orders' && (
        <div className="p-4 border-b border-gray-700 bg-gray-800/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-cyan-300">Filter by Status</h4>
            <div className="flex gap-1">
              <button
                onClick={selectAllStatuses}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
              >
                All
              </button>
              <button
                onClick={clearAllStatusFilters}
                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
              >
                None
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${getFilterButtonColor(status)}`}
              >
                <div className="flex items-center justify-between">
                  <span>{status.replace('_', ' ').toUpperCase()}</span>
                  <span className="text-xs opacity-75">
                    {orders.filter(o => o.status === status).length}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 text-xs text-gray-400">
            {selectedStatuses.size === 0 ? (
              <span className="text-red-400">No statuses selected - showing 0 orders</span>
            ) : selectedStatuses.size === statusOptions.length ? (
              <span>Showing all statuses</span>
            ) : (
              <span>Showing {selectedStatuses.size} of {statusOptions.length} statuses</span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Error State */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200 text-sm">
              <div className="font-medium">⚠️ Error loading data</div>
              <div className="mt-1 text-xs">{error}</div>
              <button
                onClick={activeTab === 'orders' ? loadOrders : loadWarehouses}
                className="mt-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {(loading || warehousesLoading) && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-gray-400">
                Loading {activeTab === 'orders' ? 'orders' : 'warehouses'}...
              </span>
            </div>
          )}

          {/* Orders Tab Content */}
          {activeTab === 'orders' && !loading && !error && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-2xl mb-2">📭</div>
                  <div>
                    {selectedStatuses.size === 0
                      ? 'No status filters selected'
                      : 'No orders match the selected filters'
                    }
                  </div>
                  {selectedStatuses.size === 0 && (
                    <button
                      onClick={selectAllStatuses}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Show All Orders
                    </button>
                  )}
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div key={order.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-white">Order #{order.id}</div>
                        <div className="text-xs text-gray-400">
                          {order.product?.name || `Product ${order.productId}`}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${getPriorityColor(order.priority)}`}>
                        {order.priority.toUpperCase()}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-gray-300 mb-3">
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span className="text-white">{order.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weight:</span>
                        <span className="text-white">{order.totalWeight} lbs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery:</span>
                        <span className="text-white">
                          {new Date(order.deliveryDate).toLocaleDateString()}
                        </span>
                      </div>
                      {order.retail && (
                        <div className="flex justify-between">
                          <span>Retailer:</span>
                          <span className="text-white truncate max-w-32" title={order.retail.name}>
                            {order.retail.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Status:</span>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        disabled={updatingStatus.has(order.id)}
                        className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>

                      {updatingStatus.has(order.id) && (
                        <div className="animate-spin w-4 h-4 border border-cyan-400 border-t-transparent rounded-full"></div>
                      )}
                    </div>

                    <div className={`mt-2 px-2 py-1 rounded text-xs text-center ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Enhanced Route Stops Tab Content */}
          {activeTab === 'stops' && !warehousesLoading && !error && (
            <div className="space-y-3">
              {/* Add Stop Button */}
              <button
                onClick={() => setShowAddStopModal(true)}
                className="w-full py-2 px-4 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
              >
                + Add Warehouse Stop
              </button>

              {/* Route Overview */}
              {deliveryStops.length > 0 && (
                <div className="mb-4 p-3 bg-gray-800/30 rounded border border-gray-700">
                  <h4 className="text-sm font-medium text-cyan-400 mb-2">Route Overview</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Stops:</span>
                      <span className="text-white">{deliveryStops.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completed:</span>
                      <span className="text-green-400">
                        {deliveryStops.filter(s => s.isCompleted).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Boxes:</span>
                      <span className="text-white">
                        {deliveryStops.reduce((sum, stop) => sum + getStopBoxCount(stop.name), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Weight:</span>
                      <span className="text-white">
                        {deliveryStops.reduce((sum, stop) => sum + getStopWeight(stop.name), 0).toLocaleString()} lbs
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Stops List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {deliveryStops.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-2xl mb-2">🏭</div>
                    <div>No delivery stops added</div>
                    <div className="text-xs mt-2">Add warehouse stops to enable box destination assignment</div>
                  </div>
                ) : (
                  deliveryStops.map((stop, index) => {
                    const boxCount = getStopBoxCount(stop.name)
                    const weight = getStopWeight(stop.name)
                    
                    return (
                      <div key={stop.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              stop.isCompleted ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                            }`}>
                              {stop.order}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{stop.warehouse.name}</div>
                              <div className="text-xs text-gray-400">{stop.warehouse.address}</div>
                              <div className="text-xs text-cyan-400 font-medium">{stop.name}</div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {index > 0 && (
                              <button
                                onClick={() => reorderStop(stop.id, 'up')}
                                className="p-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500"
                                title="Move up"
                              >
                                ↑
                              </button>
                            )}
                            {index < deliveryStops.length - 1 && (
                              <button
                                onClick={() => reorderStop(stop.id, 'down')}
                                className="p-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500"
                                title="Move down"
                              >
                                ↓
                              </button>
                            )}
                            <button
                              onClick={() => removeDeliveryStop(stop.id)}
                              className="p-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                              title="Remove stop"
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        {/* Enhanced Stop Details */}
                        <div className="space-y-1 text-xs text-gray-300 mb-3">
                          <div className="flex justify-between">
                            <span>Assigned Boxes:</span>
                            <span className={`font-medium ${boxCount > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                              {boxCount} boxes
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Weight:</span>
                            <span className="text-white">{weight.toLocaleString()} lbs</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Capacity:</span>
                            <span className="text-white">{stop.warehouse.capacity?.toLocaleString()} units</span>
                          </div>
                          {stop.warehouse.coordinates && (
                            <div className="flex justify-between">
                              <span>Location:</span>
                              <span className="text-white font-mono text-xs">
                                {stop.warehouse.coordinates.lat.toFixed(2)}, {stop.warehouse.coordinates.lng.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleStopCompletion(stop.id)}
                            className={`flex-1 py-1 px-2 rounded text-xs transition-colors ${
                              stop.isCompleted
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-600 text-white hover:bg-gray-500'
                            }`}
                          >
                            {stop.isCompleted ? '✓ Completed' : 'Mark Complete'}
                          </button>
                        </div>

                        {/* Box Assignment Warning */}
                        {boxCount === 0 && (
                          <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-600 rounded text-xs text-yellow-400">
                            ⚠️ No boxes assigned to this stop
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Route Summary */}
              {deliveryStops.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-700 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Total Stops:</span>
                    <span className="text-white">{deliveryStops.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Completed:</span>
                    <span className="text-green-400">
                      {deliveryStops.filter(stop => stop.isCompleted).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Remaining:</span>
                    <span className="text-orange-400">
                      {deliveryStops.filter(stop => !stop.isCompleted).length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Summary - Orders Tab Only */}
          {activeTab === 'orders' && !loading && !error && orders.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700 text-xs">
              <div className="grid grid-cols-2 gap-2 text-gray-400">
                {statusOptions.map((status) => (
                  <div key={status} className={selectedStatuses.has(status) ? getStatusColor(status).split(' ')[0] : ''}>
                    {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}: {orders.filter(o => o.status === status).length}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Stop Modal */}
      {showAddStopModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 w-80 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">Add Warehouse Stop</h3>

            {warehouses.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                No warehouses available
              </div>
            ) : (
              <div className="space-y-2">
                {warehouses.map((warehouse) => {
                  const isAlreadyAdded = deliveryStops.some(stop => stop.warehouseId === warehouse.id)
                  return (
                    <button
                      key={warehouse.id}
                      onClick={() => addDeliveryStop(warehouse)}
                      disabled={isAlreadyAdded}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        isAlreadyAdded
                          ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-cyan-400'
                      }`}
                    >
                      <div className="font-medium">{warehouse.name}</div>
                      <div className="text-sm text-gray-400">{warehouse.address}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Capacity: {warehouse.capacity?.toLocaleString()} units
                        {isAlreadyAdded && ' (Already added)'}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddStopModal(false)}
                className="flex-1 py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced Box Tooltip Component with Route Info
function BoxTooltip({ hoveredBox }: { hoveredBox: HoveredBoxInfo | null }) {
  const { isSimulationRunning } = useOptimizationStore()
  const { deliveryStops } = useRouteStore()

  if (!hoveredBox || isSimulationRunning) return null

  const getDestinationInfo = (destination: string) => {
    const stop = deliveryStops.find(s => s.name === destination)
    return {
      color: stop ? (stop.isCompleted ? 'text-green-400' : 'text-blue-400') : 'text-gray-400',
      status: stop ? (stop.isCompleted ? '✓ Completed' : '🚛 Pending') : '❌ Invalid'
    }
  }

  const destInfo = hoveredBox.destination ? getDestinationInfo(hoveredBox.destination) : null

  return (
    <div
      className="fixed pointer-events-none z-50 bg-gray-900/95 text-white p-3 rounded-lg border border-gray-600 shadow-xl backdrop-blur-sm"
      style={{
        left: hoveredBox.screenPosition.x + 15,
        top: hoveredBox.screenPosition.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="text-sm font-semibold text-cyan-400 mb-2">{hoveredBox.name}</div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">ID:</span>
          <span className="text-white font-mono">{hoveredBox.id}</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Dimensions:</span>
          <span className="text-white font-mono">
            {hoveredBox.dimensions.width}×{hoveredBox.dimensions.height}×{hoveredBox.dimensions.length} ft
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Weight:</span>
          <span className="text-white font-mono">{hoveredBox.weight} lbs</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Position:</span>
          <span className="text-white font-mono">
            X:{hoveredBox.position.x.toFixed(1)}, Y:{hoveredBox.position.y.toFixed(1)}, Z:{hoveredBox.position.z.toFixed(1)}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Temperature:</span>
          <span className={`font-medium ${
            hoveredBox.temperatureZone === 'frozen' ? 'text-blue-400' :
            hoveredBox.temperatureZone === 'cold' ? 'text-cyan-400' : 'text-green-400'
          }`}>
            {hoveredBox.temperatureZone.toUpperCase()}
          </span>
        </div>

        {/* Enhanced Destination Info */}
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Destination:</span>
          {hoveredBox.destination ? (
            <div className="text-right">
              <div className={`font-medium ${destInfo?.color}`}>
                {hoveredBox.destination}
              </div>
              <div className={`text-xs ${destInfo?.color}`}>
                {destInfo?.status}
              </div>
            </div>
          ) : (
            <span className="text-orange-400 font-medium">⚠️ UNASSIGNED</span>
          )}
        </div>

        {hoveredBox.isFragile && (
          <div className="flex justify-between gap-3">
            <span className="text-gray-300">Special:</span>
            <span className="text-red-400 font-medium">⚠️ FRAGILE</span>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-700 space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Volume:</span>
          <span className="text-white font-mono">
            {(hoveredBox.dimensions.width * hoveredBox.dimensions.height * hoveredBox.dimensions.length).toFixed(1)} ft³
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-gray-300">Density:</span>
          <span className="text-white font-mono">
            {(hoveredBox.weight / (hoveredBox.dimensions.width * hoveredBox.dimensions.height * hoveredBox.dimensions.length)).toFixed(1)} lbs/ft³
          </span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
        💡 Click to select • Assign destination in Route Stops tab
      </div>
    </div>
  )
}

// Manual Box Control Panel
function BoxControlPanel({ selectedBox }: { selectedBox: SelectedBoxInfo | null }) {
  const { updateBoxPosition, updateBox } = useOptimizationStore()
  const [localPosition, setLocalPosition] = useState({ x: 0, y: 0, z: 0 })
  const [localRotation, setLocalRotation] = useState(false)

  useEffect(() => {
    if (selectedBox) {
      setLocalPosition(selectedBox.position)
      setLocalRotation(selectedBox.isRotated || false)
    }
  }, [selectedBox?.id])

  if (!selectedBox) return null

  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...localPosition, [axis]: value }
    setLocalPosition(newPosition)

    updateBoxPosition(selectedBox.id, newPosition)

    if (globalSelectedBox) {
      globalSelectedBox.position = newPosition
    }
  }

  const handleRotationToggle = () => {
    const newRotation = !localRotation
    setLocalRotation(newRotation)

    updateBox(selectedBox.id, {
      //@ts-ignore 
      isRotated: newRotation,
    })

    if (globalSelectedBox) {
      globalSelectedBox.isRotated = newRotation
      globalSelectedBox.rotation.y = newRotation ? Math.PI / 2 : 0
    }
  }

  return (
    <div className="absolute top-20 right-4 z-10 bg-gray-900/95 text-white p-4 rounded-lg border border-gray-600 shadow-xl backdrop-blur-sm">
      <div className="text-sm font-semibold text-cyan-400 mb-3">Manual Control: {selectedBox.name}</div>

      <div className="space-y-3 text-xs">
        <div className="pb-2 border-b border-gray-700">
          <label className="text-gray-300 block mb-2">Orientation:</label>
          <div className="flex gap-2">
            <button
              onClick={handleRotationToggle}
              className={`px-3 py-1 rounded text-xs transition-colors ${!localRotation
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
            >
              Horizontal
            </button>
            <button
              onClick={handleRotationToggle}
              className={`px-3 py-1 rounded text-xs transition-colors ${localRotation
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
            >
              Vertical
            </button>
          </div>
          <div className="text-gray-400 mt-1">
            {localRotation ? "📦 Rotated 90°" : "📦 Default orientation"}
          </div>
        </div>

        <div>
          <label className="text-gray-300 block mb-1">Position X:</label>
          <input
            type="range"
            min={-12}
            max={12}
            step={0.1}
            value={localPosition.x}
            onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-mono">{localPosition.x.toFixed(1)}</span>
        </div>

        <div>
          <label className="text-gray-300 block mb-1">Position Y:</label>
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.1}
            value={localPosition.y}
            onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-mono">{localPosition.y.toFixed(1)}</span>
        </div>

        <div>
          <label className="text-gray-300 block mb-1">Position Z:</label>
          <input
            type="range"
            min={-14}
            max={14}
            step={0.1}
            value={localPosition.z}
            onChange={(e) => handlePositionChange('z', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-mono">{localPosition.z.toFixed(1)}</span>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <button
            onClick={() => {
              globalSelectedBox = null
              globalSelectCallbacks.forEach(callback => callback(null))
            }}
            className="w-full px-3 py-2 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
          >
            Deselect Box
          </button>
        </div>
      </div>
    </div>
  )
}

// Enhanced Interactive Box Renderer with Route-based Colors
// Replace the InteractiveBoxRenderer function with this enhanced version
// Replace the InteractiveBoxRenderer function with this version that has only black borders
function InteractiveBoxRenderer({ box }: { box: any }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isSelected, setIsSelected] = useState(false)
  const [localPosition, setLocalPosition] = useState(box.position)
  const [localRotation, setLocalRotation] = useState(box.isRotated || false)
  const { isSimulationRunning } = useOptimizationStore()
  const { deliveryStops } = useRouteStore()

  useEffect(() => {
    const checkSelection = (selectedBox: SelectedBoxInfo | null) => {
      const selected = selectedBox?.id === box.id
      setIsSelected(selected)

      if (selected && selectedBox) {
        setLocalPosition(selectedBox.position)
        setLocalRotation(selectedBox.isRotated || false)
      }
    }
    globalSelectCallbacks.add(checkSelection)
    return () => { globalSelectCallbacks.delete(checkSelection) }
  }, [box.id])

  useEffect(() => {
    const threshold = 0.1
    if (Math.abs(localPosition.x - box.position.x) > threshold ||
      Math.abs(localPosition.y - box.position.y) > threshold ||
      Math.abs(localPosition.z - box.position.z) > threshold) {
      setLocalPosition(box.position)
    }
  }, [box.position])

  useFrame(() => {
    if (groupRef.current && (isSelected || localPosition !== box.position)) {
      groupRef.current.position.set(localPosition.x, localPosition.y, localPosition.z)
      groupRef.current.rotation.y = localRotation ? Math.PI / 2 : 0
    }
  })

  const handlePointerEnter = useCallback((event: any) => {
    if (isSimulationRunning) return
    event.stopPropagation()
    setIsHovered(true)

    const screenPosition = {
      x: event.clientX || event.nativeEvent?.clientX || 0,
      y: event.clientY || event.nativeEvent?.clientY || 0
    }

    const hoveredInfo: HoveredBoxInfo = {
      id: box.id,
      name: box.name,
      position: localPosition,
      dimensions: { width: box.width, height: box.height, length: box.length },
      weight: box.weight,
      isFragile: box.isFragile,
      temperatureZone: box.temperatureZone,
      destination: box.destination,
      screenPosition
    }

    globalHoveredBox = hoveredInfo
    globalHoverCallbacks.forEach(callback => callback(hoveredInfo))
  }, [box, localPosition, isSimulationRunning])

  const handlePointerLeave = useCallback((event: any) => {
    if (isSimulationRunning) return
    event.stopPropagation()
    setIsHovered(false)
    globalHoveredBox = null
    globalHoverCallbacks.forEach(callback => callback(null))
  }, [isSimulationRunning])

  const handlePointerMove = useCallback((event: any) => {
    if (!isHovered || isSimulationRunning) return

    const screenPosition = {
      x: event.clientX || event.nativeEvent?.clientX || 0,
      y: event.clientY || event.nativeEvent?.clientY || 0
    }

    if (globalHoveredBox) {
      globalHoveredBox.screenPosition = screenPosition
      globalHoverCallbacks.forEach(callback => callback(globalHoveredBox))
    }
  }, [isHovered, isSimulationRunning])

  const handleClick = useCallback((event: any) => {
    if (isSimulationRunning) return
    event.stopPropagation()

    const selectedInfo: SelectedBoxInfo = {
      id: box.id,
      name: box.name,
      position: localPosition,
      rotation: { x: 0, y: localRotation ? Math.PI / 2 : 0, z: 0 },
      isRotated: localRotation
    }

    globalSelectedBox = selectedInfo
    globalSelectCallbacks.forEach(callback => callback(selectedInfo))
  }, [box, localPosition, localRotation, isSimulationRunning])

  // Enhanced color logic based on destination
  const getBoxColor = (box: any) => {
    // Priority: Destination > Fragile > Temperature
    if (box.destination) {
      const stopIndex = deliveryStops.findIndex(stop => stop.name === box.destination)
      const colors = ["#d63031", "#e17055", "#00b894", "#0984e3", "#fdcb6e", "#6c5ce7"]
      return colors[stopIndex % colors.length] || "#2d3436"
    }
    if (box.isFragile) return "#d63031"
    switch (box.temperatureZone) {
      case "frozen": return "#0984e3"
      case "cold": return "#6c5ce7"
      default: return "#00b894"
    }
  }

  const getBoxOpacity = (box: any) => {
    return box.isNew ? 0.7 : 1.0
  }

  return (
    <group ref={groupRef} position={[localPosition.x, localPosition.y, localPosition.z]}>
      {/* Main Box Mesh */}
      <mesh
        ref={meshRef}
        rotation={[0, localRotation ? Math.PI / 2 : 0, 0]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[box.width, box.height, box.length]} />
        <meshStandardMaterial
          color={getBoxColor(box)}
          transparent={box.isNew}
          opacity={getBoxOpacity(box)}
          roughness={isHovered ? 0.2 : 0.4}
          metalness={isHovered ? 0.3 : 0.1}
          emissive={isHovered ? "#333333" : "#111111"}
          emissiveIntensity={isHovered ? 0.2 : 0.05}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* ONLY BLACK BORDERS - Bold and Simple */}
      <lineSegments rotation={[0, localRotation ? Math.PI / 2 : 0, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(box.width, box.height, box.length), 1]} />
        <lineBasicMaterial 
          color="#000000"
          transparent={false}
          opacity={1.0}
        />
      </lineSegments>

      {/* Top Label */}
      <mesh position={[0, box.height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[Math.min(box.width * 0.9, 3), Math.min(box.length * 0.9, 2)]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={isHovered ? 1.0 : 0.85}
        />
      </mesh>

      {/* Box ID/Name Text Background */}
      <mesh position={[0, box.height / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[Math.min(box.width * 0.8, 2.5), Math.min(box.length * 0.3, 0.8)]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Corner Accent Dots */}
      {[
        [-box.width/2, box.height/2, -box.length/2],
        [box.width/2, box.height/2, -box.length/2],
        [-box.width/2, box.height/2, box.length/2],
        [box.width/2, box.height/2, box.length/2]
      ].map((pos, i) => (
        //@ts-ignore
        <mesh key={i} position={pos} rotation={[0, localRotation ? Math.PI / 2 : 0, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial
            color={isHovered ? "#ffffff" : getBoxColor(box)}
            transparent
            opacity={isHovered ? 0.9 : 0.6}
          />
        </mesh>
      ))}

      {/* Selection Highlight */}
      {isSelected && (
        <>
          <mesh rotation={[0, localRotation ? Math.PI / 2 : 0, 0]}>
            <boxGeometry args={[box.width + 0.15, box.height + 0.15, box.length + 0.15]} />
            <meshBasicMaterial
              color="#00ffff"
              transparent
              opacity={0.2}
            />
          </mesh>
          <lineSegments rotation={[0, localRotation ? Math.PI / 2 : 0, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(box.width + 0.15, box.height + 0.15, box.length + 0.15)]} />
            <lineBasicMaterial 
              color="#00ffff" 
              transparent={true}
              opacity={0.8}
            />
          </lineSegments>
        </>
      )}

      {/* Rotation Indicator */}
      {localRotation && (
        <group position={[0, box.height / 2 + 0.3, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.15, 0.25, 8]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={0.8}
            />
          </mesh>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.1, 0.1]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.9}
            />
          </mesh>
        </group>
      )}

      {/* Drop Shadow */}
      <mesh position={[0, -box.height / 2 - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[box.width * 0.9, box.length * 0.9]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  )
}

function PerformanceStats() {
  const [fps, setFps] = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const [renderTime, setRenderTime] = useState(0)
  const [physicsObjects, setPhysicsObjects] = useState(0)
  const lastTime = useRef(performance.now())
  const frameStart = useRef(0)
  const { boxes, isSimulationRunning, optimizeLayout } = useOptimizationStore()

  const handleOptimize = () => {
    console.log('🔄 Optimize button clicked from PerformanceStats')
    optimizeLayout()
  }

  useFrame(() => {
    const currentTime = performance.now()
    frameStart.current = currentTime

    setFrameCount((prev) => prev + 1)
    setPhysicsObjects(boxes.length)

    if (currentTime - lastTime.current >= 1000) {
      setFps(frameCount)
      setFrameCount(0)
      lastTime.current = currentTime
    }

    requestAnimationFrame(() => {
      setRenderTime(performance.now() - frameStart.current)
    })
  })

  return (
    <Html position={[12, 8, 0]} className="pointer-events-auto">
      <div className="bg-black/90 text-white p-3 rounded text-xs font-mono border border-gray-600">
        <div className={`${fps > 60 ? "text-green-400" : fps > 30 ? "text-yellow-400" : "text-red-400"}`}>
          FPS: {fps}
        </div>

        <div className="text-cyan-400">Render: {renderTime.toFixed(2)}ms</div>
        <div className="text-blue-400">Physics Objects: {physicsObjects}</div>
        <div className={`${isSimulationRunning ? "text-green-400" : "text-gray-400"}`}>
          Physics: {isSimulationRunning ? "ACTIVE" : "IDLE"}
        </div>
        <div className="text-gray-400">WebGL 2.0</div>

        <button
          onClick={handleOptimize}
          disabled={boxes.length === 0}
          className={`
                      mt-2 px-3 py-1 rounded text-xs font-medium transition-all duration-200
                      ${boxes.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }
                    `}
        >
          Optimize ({boxes.length})
        </button>
      </div>
    </Html>
  )
}

function CameraController() {
  const { truckDimensions } = useOptimizationStore()

  return (
    <OrbitControls
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      maxPolarAngle={Math.PI / 2.1}
      minDistance={8}
      maxDistance={60}
      panSpeed={1.2}
      rotateSpeed={0.8}
      zoomSpeed={1.5}
      target={[0, truckDimensions.height / 2, 0]}
      enableDamping={true}
      dampingFactor={0.05}
    />
  )
}

function PhysicsStatusIndicator() {
  const { isSimulationRunning, simulationForces } = useOptimizationStore()
  const truckPhysics = useTruckPhysics()

  if (!isSimulationRunning) return null

  return (
    <Html position={[-12, 6, 0]} className="pointer-events-none">
      <div className="bg-red-900/95 text-white p-3 rounded text-xs font-mono border border-red-600 shadow-xl backdrop-blur-sm">
        <div className="text-red-300 font-bold mb-2">🚛 TRUCK SIMULATION</div>

        {truckPhysics.isAccelerating && (
          <div className="text-green-400">⬆️ ACCELERATING ({simulationForces.acceleration}g)</div>
        )}
        {truckPhysics.isBraking && (
          <div className="text-red-400">⬇️ BRAKING ({simulationForces.braking}g)</div>
        )}
        {truckPhysics.isTurning && (
          <div className="text-yellow-400">
            {truckPhysics.turnDirection < 0 ? "⬅️" : "➡️"} TURNING ({simulationForces.turning}g)
          </div>
        )}

        <div className="text-gray-300 mt-2">
          Gravity: {simulationForces.gravity}g
        </div>
      </div>
    </Html>
  )
}

function Scene() {
  const { boxes, physicsEnabled, truckDimensions, updatePhysics, isSimulationRunning } = useOptimizationStore()

  const boxesKey = useMemo(() => {
    return boxes.map(b => `${b.id}-${b.position.x}-${b.position.y}-${b.position.z}`).join(',')
  }, [boxes])

  useEffect(() => {
    console.log('📊 Scene updated with', boxes.length, 'boxes')
    updatePhysics()
  }, [boxes, updatePhysics])

  const boxRenderers = useMemo(() => {
    console.log('🔄 Re-creating box renderers for', boxes.length, 'boxes')
    return boxes.map((box) => (
      isSimulationRunning ? (
        <EnhancedBoxRenderer key={`physics-${box.id}-${boxesKey}`} box={box} />
      ) : (
        <InteractiveBoxRenderer key={`interactive-${box.id}-${boxesKey}`} box={box} />
      )
    ))
  }, [boxes, boxesKey, isSimulationRunning])

  return (
    <>
      <PerspectiveCamera makeDefault position={[20, 15, 20]} fov={50} near={0.1} far={1000} />

      <CameraController />
    
      <Environment files={suspend(bridge).default} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight position={[0, 15, 0]} intensity={0.4} />
      <pointLight position={[-10, 10, 10]} intensity={0.3} color="#4fc3f7" />

      <TruckContainer dimensions={truckDimensions} />
      <TemperatureZones />
      <LoadingIndicators />

      <TruckBedPhysics dimensions={truckDimensions} />

      <PhysicsSimulationController />

      {boxRenderers}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.1} />
      </mesh>

      <gridHelper args={[100, 50, "#333333", "#1a1a1a"]} position={[0, 0, 0]} />

      <PerformanceStats />
      <PhysicsStatusIndicator />

      {physicsEnabled && <PhysicsDebugger />}
    </>
  )
}

export function TruckVisualization({ viewMode }: TruckVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { physicsEnabled, boxes, optimizeLayout, isSimulationRunning } = useOptimizationStore()
  const { deliveryStops } = useRouteStore()
  const [forceUpdate, setForceUpdate] = useState(0)
  const [hoveredBox, setHoveredBox] = useState<HoveredBoxInfo | null>(null)
  const [selectedBox, setSelectedBox] = useState<SelectedBoxInfo | null>(null)

  useEffect(() => {
    const hoverCallback = (box: HoveredBoxInfo | null) => setHoveredBox(box)
    globalHoverCallbacks.add(hoverCallback)
    return () => { globalHoverCallbacks.delete(hoverCallback) }
  }, [])

  useEffect(() => {
    const selectCallback = (box: SelectedBoxInfo | null) => setSelectedBox(box)
    globalSelectCallbacks.add(selectCallback)
    return () => { globalSelectCallbacks.delete(selectCallback) }
  }, [])

  useEffect(() => {
    if (isSimulationRunning) {
      setHoveredBox(null)
      setSelectedBox(null)
      globalHoveredBox = null
      globalSelectedBox = null
      globalHoverCallbacks.forEach(callback => callback(null))
      globalSelectCallbacks.forEach(callback => callback(null))
    }
  }, [isSimulationRunning])

  useEffect(() => {
    console.log('🔄 TruckVisualization: Boxes changed, forcing update')
    setForceUpdate(prev => prev + 1)
  }, [boxes])

  useEffect(() => {
    if (canvasRef.current) {
      const gl = canvasRef.current.getContext("webgl2")
      if (gl) {
        gl.getExtension("EXT_texture_filter_anisotropic")
        gl.getExtension("WEBGL_compressed_texture_s3tc")
        gl.getExtension("OES_texture_float")
        gl.getExtension("WEBGL_depth_texture")
      }
    }
  }, [])

  // Initialize route store with sample data if needed
  useEffect(() => {
    // Auto-populate some sample stops if none exist and boxes are loaded
    if (deliveryStops.length === 0 && boxes.length > 0) {
      const sampleWarehouses = [
        { id: 1, name: "Downtown Warehouse", address: "123 Main St", capacity: 10000, coordinates: { lat: 40.7128, lng: -74.0060 }, orderWarehouses: [], deliveryRoutes: [] },
        { id: 2, name: "North Distribution Center", address: "456 North Ave", capacity: 15000, coordinates: { lat: 40.7580, lng: -73.9855 }, orderWarehouses: [], deliveryRoutes: [] }
      ]
      
      // Add first two as sample stops
      setTimeout(() => {
        useRouteStore.getState().addDeliveryStop(sampleWarehouses[0])
        useRouteStore.getState().addDeliveryStop(sampleWarehouses[1])
      }, 1000)
    }
  }, [deliveryStops.length, boxes.length])

  const handleOptimize = () => {
    console.log('🔄 Optimize button clicked from TruckVisualization')
    optimizeLayout()
  }

  if (viewMode === "2d") {
    return <TwoDRenderer />
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Enhanced Orders Panel with Warehouse Stop Management and Route Sync */}
      <OrdersPanel />

      {/* Enhanced Box Tooltip with Route Info */}
      <BoxTooltip hoveredBox={hoveredBox} />

      {/* Manual Control Panel */}
      <BoxControlPanel selectedBox={selectedBox} />

      {/* Route Status Indicator - Updated to show simple names */}
      {deliveryStops.length > 0 && (
        <div className="absolute top-4 right-4 z-10 bg-gray-900/95 text-white p-3 rounded-lg border border-gray-600">
          <h4 className="text-sm font-bold text-cyan-400 mb-2">🚛 Active Route</h4>
          <div className="space-y-1 text-xs">
            {deliveryStops.map((stop, index) => {
              const boxCount = boxes.filter(box => box.destination === stop.name).length
              return (
                <div key={stop.id} className="flex justify-between gap-2">
                  <span className={stop.isCompleted ? 'text-green-400' : 'text-white'}>
                    {index + 1}. {stop.warehouse.name}
                  </span>
                
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unassigned Boxes Warning */}
      {(() => {
        const unassignedCount = boxes.filter(box => !box.destination).length
        return unassignedCount > 0 ? (
          <div className="absolute bottom-4 left-4 z-10 bg-orange-900/95 text-white p-3 rounded-lg border border-orange-600">
            <div className="text-sm font-bold text-orange-400">
              ⚠️ {unassignedCount} Unassigned Box{unassignedCount !== 1 ? 'es' : ''}
            </div>
            <div className="text-xs text-orange-300 mt-1">
              Add route stops and assign destinations
            </div>
          </div>
        ) : null
      })()}

      {/* 2D Overlay for Hybrid Mode */}
      {viewMode === "hybrid" && (
        <div className="absolute top-4 right-4 z-10 w-64 h-48 border border-gray-600 bg-gray-900/95 rounded-lg overflow-hidden">
          <TwoDRenderer isOverlay />
        </div>
      )}

      {/* Performance Monitor Overlay */}
      <div className="absolute top-4 right-4 z-10">
        <Stats />
      </div>

      {/* Interaction Instructions */}
      {!isSimulationRunning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gray-900/90 text-white px-3 py-1 rounded text-xs border border-gray-600">
            💡 Hover for properties • Click to select • Use controls to move/rotate
          </div>
        </div>
      )}

      {/* Simulation Status */}
      {isSimulationRunning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-red-900/95 text-white px-4 py-2 rounded text-sm border border-red-600 animate-pulse shadow-xl backdrop-blur-sm">
            🚛 PHYSICS SIMULATION ACTIVE - Manual controls disabled
          </div>
        </div>
      )}

      {/* Optimize Button Overlay */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={handleOptimize}
          disabled={boxes.length === 0}
          className={`
                      px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg
                      ${boxes.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 hover:shadow-xl'
            }
                    `}
        >
          🚛 Optimize Layout ({boxes.length} boxes)
        </button>
      </div>

      <Canvas
        key={`canvas-${forceUpdate}`}
        ref={canvasRef}
        shadows="soft"
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: true,
          precision: "highp",
        }}
        dpr={[1, 2]}
        performance={{ min: 0.8 }}
        frameloop="always"
        camera={{ position: [20, 15, 20], fov: 50 }}
      >
        <Suspense
          fallback={
            <Html center>
              <div className="text-white bg-gray-900/80 p-4 rounded">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading 3D Scene...
              </div>
            </Html>
          }
        >
          <Physics
            gravity={[0, -9.81, 0]}
            iterations={20}
            broadphase="SAP"
            allowSleep={true}
            defaultContactMaterial={{
              friction: 0.6,
              restitution: 0.3,
              contactEquationStiffness: 1e8,
              contactEquationRelaxation: 3,
            }}
            size={4096}
            axisIndex={0}
          >
            <Scene key={`scene-${forceUpdate}`} />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  )
}