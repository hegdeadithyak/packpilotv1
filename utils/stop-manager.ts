// utils/route-stops-manager.ts

// Define interfaces
interface Warehouse {
  id: number
  name: string
  address: string
  coordinates: {
    lat: number
    lng: number
  }
  capacity: number
  orderWarehouses?: any[]
  deliveryRoutes?: any[]
}

interface DeliveryStop {
  id: string
  warehouseId: number
  warehouse: Warehouse
  order: number
  estimatedArrival?: string
  isCompleted: boolean
}

interface StopMappings {
  [key: string | number]: string
}

// Global state for route stops synchronization
let globalDeliveryStops: DeliveryStop[] = []
let globalStopCallbacks: Set<(stops: DeliveryStop[]) => void> = new Set()
let globalMappingCallbacks: Set<(mappings: StopMappings) => void> = new Set()

// Route stops management class
export class RouteStopsManager {
  // Get current stops
  static getStops(): DeliveryStop[] {
    return [...globalDeliveryStops]
  }
  
  // Set stops and notify all subscribers
  static setStops(stops: DeliveryStop[]): void {
    globalDeliveryStops = [...stops]
    this.notifyStopCallbacks()
    this.notifyMappingCallbacks()
  }
  
  // Add a new stop
  static addStop(warehouse: Warehouse): DeliveryStop {
    // Check if warehouse already exists
    const existingStop = globalDeliveryStops.find(stop => stop.warehouseId === warehouse.id)
    if (existingStop) {
      console.warn(`Warehouse ${warehouse.name} is already in the route`)
      return existingStop
    }

    const newStop: DeliveryStop = {
      id: `stop-${Date.now()}-${warehouse.id}`,
      warehouseId: warehouse.id,
      warehouse,
      order: globalDeliveryStops.length + 1,
      isCompleted: false
    }

    globalDeliveryStops = [...globalDeliveryStops, newStop]
    this.notifyStopCallbacks()
    this.notifyMappingCallbacks()
    
    console.log(`Added stop: ${warehouse.name} as Stop ${newStop.order}`)
    return newStop
  }
  
  // Remove a stop
  static removeStop(stopId: string): void {
    const stopToRemove = globalDeliveryStops.find(stop => stop.id === stopId)
    if (!stopToRemove) return

    globalDeliveryStops = globalDeliveryStops
      .filter(stop => stop.id !== stopId)
      .map((stop, index) => ({ ...stop, order: index + 1 }))
    
    this.notifyStopCallbacks()
    this.notifyMappingCallbacks()
    
    console.log(`Removed stop: ${stopToRemove.warehouse.name}`)
  }
  
  // Reorder stops
  static reorderStop(stopId: string, direction: 'up' | 'down'): void {
    const stopIndex = globalDeliveryStops.findIndex(stop => stop.id === stopId)
    if (stopIndex === -1) return

    const newStops = [...globalDeliveryStops]
    const targetIndex = direction === 'up' ? stopIndex - 1 : stopIndex + 1

    if (targetIndex < 0 || targetIndex >= newStops.length) return

    // Swap stops
    [newStops[stopIndex], newStops[targetIndex]] = [newStops[targetIndex], newStops[stopIndex]]

    // Update order numbers
    globalDeliveryStops = newStops.map((stop, index) => ({ ...stop, order: index + 1 }))
    
    this.notifyStopCallbacks()
    this.notifyMappingCallbacks()
    
    console.log(`Reordered stop: ${globalDeliveryStops[targetIndex].warehouse.name}`)
  }
  
  // Toggle stop completion
  static toggleCompletion(stopId: string): void {
    globalDeliveryStops = globalDeliveryStops.map(stop =>
      stop.id === stopId ? { ...stop, isCompleted: !stop.isCompleted } : stop
    )
    
    this.notifyStopCallbacks()
    
    const toggledStop = globalDeliveryStops.find(stop => stop.id === stopId)
    if (toggledStop) {
      console.log(`${toggledStop.isCompleted ? 'Completed' : 'Uncompleted'} stop: ${toggledStop.warehouse.name}`)
    }
  }
  
  // Get stop mappings (warehouse ID/name -> "Stop X")
  static getStopMappings(): StopMappings {
    const mappings: StopMappings = {}
    
    globalDeliveryStops.forEach((stop, index) => {
      const stopLabel = `Stop ${index + 1}`
      mappings[stop.warehouse.id] = stopLabel
      mappings[stop.warehouse.name] = stopLabel
      mappings[stop.warehouseId] = stopLabel
    })
    
    return mappings
  }
  
  // Get stop by warehouse ID
  static getStopByWarehouse(warehouseId: number): string | null {
    const stopIndex = globalDeliveryStops.findIndex(stop => stop.warehouseId === warehouseId)
    return stopIndex >= 0 ? `Stop ${stopIndex + 1}` : null
  }
  
  // Get current stop (first uncompleted)
  static getCurrentStop(): DeliveryStop | null {
    return globalDeliveryStops.find(stop => !stop.isCompleted) || null
  }
  
  // Get completed stops
  static getCompletedStops(): DeliveryStop[] {
    return globalDeliveryStops.filter(stop => stop.isCompleted)
  }
  
  // Get remaining stops
  static getRemainingStops(): DeliveryStop[] {
    return globalDeliveryStops.filter(stop => !stop.isCompleted)
  }
  
  // Get progress percentage
  static getProgress(): number {
    if (globalDeliveryStops.length === 0) return 0
    const completed = this.getCompletedStops().length
    return Math.round((completed / globalDeliveryStops.length) * 100)
  }
  
  // Clear all stops
  static clearAllStops(): void {
    globalDeliveryStops = []
    this.notifyStopCallbacks()
    this.notifyMappingCallbacks()
    console.log('Cleared all delivery stops')
  }
  
  // Subscribe to stop changes
  static subscribe(callback: (stops: DeliveryStop[]) => void): () => void {
    globalStopCallbacks.add(callback)
    // Immediately call with current state
    callback([...globalDeliveryStops])
    
    return () => {
      globalStopCallbacks.delete(callback)
    }
  }
  
  // Subscribe to mapping changes
  static subscribeMappings(callback: (mappings: StopMappings) => void): () => void {
    globalMappingCallbacks.add(callback)
    // Immediately call with current mappings
    callback(this.getStopMappings())
    
    return () => {
      globalMappingCallbacks.delete(callback)
    }
  }
  
  // Notify all stop subscribers
  private static notifyStopCallbacks(): void {
    const currentStops = [...globalDeliveryStops]
    globalStopCallbacks.forEach(callback => callback(currentStops))
  }
  
  // Notify all mapping subscribers
  private static notifyMappingCallbacks(): void {
    const currentMappings = this.getStopMappings()
    globalMappingCallbacks.forEach(callback => callback(currentMappings))
  }
  
  // Get route statistics
  static getRouteStats() {
    const total = globalDeliveryStops.length
    const completed = this.getCompletedStops().length
    const remaining = this.getRemainingStops().length
    const progress = this.getProgress()
    
    // Rough distance calculation (12.5 miles per stop average)
    const estimatedDistance = total > 0 ? total * 12.5 : 0
    
    return {
      total,
      completed,
      remaining,
      progress,
      estimatedDistance: Math.round(estimatedDistance),
      hasActiveRoute: total > 0,
      isComplete: total > 0 && completed === total
    }
  }
  
  // Export route data
  static exportRoute() {
    return {
      timestamp: new Date().toISOString(),
      stops: [...globalDeliveryStops],
      mappings: this.getStopMappings(),
      stats: this.getRouteStats()
    }
  }
  
  // Import route data
  static importRoute(routeData: { stops: DeliveryStop[] }) {
    if (!routeData.stops || !Array.isArray(routeData.stops)) {
      throw new Error('Invalid route data')
    }
    
    this.setStops(routeData.stops)
    console.log(`Imported route with ${routeData.stops.length} stops`)
  }
}

// Export types for use in other files
export type { Warehouse, DeliveryStop, StopMappings }