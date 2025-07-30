"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useOptimizationStore } from "@/store/optimization-store"
import { Route, Navigation, AlertTriangle, Loader2, Search, Warehouse, Store } from "lucide-react"

// Real Walmart store locations across the US
const walmartStores = [
  {
    id: "warehouse",
    name: "Walmart Distribution Center",
    address: "1940 Argentia Road, Mississauga, ON L5N 1P9",
    coordinates: [-76.6413, 39.0458], // [lng, lat] for OpenRouteService
    type: "warehouse",
    priority: 0,
  },
  {
    id: "stop1",
    name: "Walmart Supercenter #1521",
    address: "1521 E Baseline Rd, Phoenix, AZ 85042",
    coordinates: [-112.074, 33.4484],
    type: "store",
    priority: 1,
  },
  {
    id: "stop2",
    name: "Walmart Supercenter #2500",
    address: "2500 W Happy Valley Rd, Phoenix, AZ 85085",
    coordinates: [-112.1401, 33.6839],
    type: "store",
    priority: 2,
  },
  {
    id: "stop3",
    name: "Walmart Supercenter #3721",
    address: "3721 E Thomas Rd, Phoenix, AZ 85018",
    coordinates: [-111.9981, 33.4806],
    type: "store",
    priority: 3,
  },
  {
    id: "stop4",
    name: "Walmart Supercenter #1955",
    address: "1955 W Baseline Rd, Mesa, AZ 85202",
    coordinates: [-111.8431, 33.3783],
    type: "store",
    priority: 4,
  },
]

interface MapError {
  type: "api" | "network" | "geocoding" | "routing"
  message: string
  details?: string
}

export function MapVisualization() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [markers, setMarkers] = useState<any[]>([])
  const [routeLines, setRouteLines] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<MapError | null>(null)
  const [routeInfo, setRouteInfo] = useState<{
    totalDistance: number
    totalDuration: number
    route: string[]
  } | null>(null)

  const { boxes } = useOptimizationStore()

  // OpenRouteService API key - replace with your own
  const apiKey = "5b3ce3597851100001cf62848060d6c3a82f4685accd09c0edd72edf"

  useEffect(() => {
    loadLeaflet()
  }, [])

  const loadLeaflet = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load Leaflet CSS
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)

      // Load Leaflet JS
      const script = document.createElement("script")
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"

      script.onload = () => {
        if (typeof window !== "undefined" && (window as any).L) {
          initializeMap()
        } else {
          setError({
            type: "api",
            message: "Failed to load map library",
            details: "Leaflet library could not be loaded properly",
          })
        }
      }

      script.onerror = () => {
        setError({
          type: "network",
          message: "Network error loading map",
          details: "Could not load Leaflet from CDN",
        })
        setIsLoading(false)
      }

      document.head.appendChild(script)
    } catch (error) {
      console.error("Error loading Leaflet:", error)
      setError({
        type: "api",
        message: "Failed to initialize map",
        details: error instanceof Error ? error.message : "Unknown error",
      })
      setIsLoading(false)
    }
  }

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !(window as any).L) return

    try {
      const L = (window as any).L

      // Initialize map centered on Phoenix area (where most stores are)
      const mapInstance = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([33.4484, -112.074], 10)

      // Add dark tile layer with error handling
      const tileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors, © CARTO",
        errorTileUrl:
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iIzBhMGEwYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSJoc2woMjEwIDEwMCUgNTAlKSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFRpbGU8L3RleHQ+PC9zdmc+",
      })

      tileLayer.on("tileerror", (e: any) => {
        console.warn("Tile loading error:", e)
      })

      tileLayer.addTo(mapInstance)

      setMap(mapInstance)
      setIsLoaded(true)
      setIsLoading(false)

      // Add Walmart store markers
      addWalmartMarkers(mapInstance, L)

      // Handle map resize
      setTimeout(() => {
        mapInstance.invalidateSize()
      }, 100)
    } catch (error) {
      console.error("Error initializing map:", error)
      setError({
        type: "api",
        message: "Failed to initialize map",
        details: error instanceof Error ? error.message : "Unknown error",
      })
      setIsLoading(false)
    }
  }, [])

  const addWalmartMarkers = useCallback(
    (mapInstance: any, L: any) => {
      const newMarkers: any[] = []

      try {
        walmartStores.forEach((store) => {
          const [lng, lat] = store.coordinates

          // Create custom icon based on type
          const iconHtml =
            store.type === "warehouse"
              ? `<div class="flex items-center justify-center w-10 h-10 bg-primary rounded-full shadow-lg border-2 border-primary-foreground/50">
               <svg class="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
               </svg>
             </div>`
              : `<div class="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-full shadow-lg border-2 border-orange-300/50">
               <span class="text-white text-sm font-bold">${store.priority}</span>
             </div>`

          const customIcon = L.divIcon({
            html: iconHtml,
            className: "custom-marker",
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })

          const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstance)

          // Get boxes for this stop
          const stopBoxes = boxes.filter((box) => box.destination === `Stop ${store.priority}`)
          const boxCount = stopBoxes.length
          const totalWeight = stopBoxes.reduce((sum, box) => sum + box.weight, 0)

          const popupContent = `
          <div class="p-4 bg-gray-900 text-white rounded-lg border-2 border-primary/50 min-w-[250px]">
            <div class="flex items-center space-x-2 mb-2">
              ${
                store.type === "warehouse"
                  ? '<svg class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z"/></svg>'
                  : '<svg class="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/></svg>'
              }
              <h3 class="font-bold text-primary">${store.name}</h3>
            </div>
            <p class="text-sm text-gray-300 mb-3">${store.address}</p>
            ${
              store.type === "warehouse"
                ? `<div class="space-y-2 text-sm">
                   <div class="flex justify-between">
                     <span class="text-primary">📦 Total Boxes:</span>
                     <span class="text-white font-bold">${boxes.length}</span>
                   </div>
                   <div class="flex justify-between">
                     <span class="text-primary">⚖️ Total Weight:</span>
                     <span class="text-white font-bold">${boxes.reduce((sum, box) => sum + box.weight, 0)} lbs</span>
                   </div>
                 </div>`
                : `<div class="space-y-2 text-sm">
                   <div class="flex justify-between">
                     <span class="text-primary">📦 Boxes to deliver:</span>
                     <span class="text-white font-bold">${boxCount}</span>
                   </div>
                   <div class="flex justify-between">
                     <span class="text-primary">⚖️ Weight:</span>
                     <span class="text-white font-bold">${totalWeight} lbs</span>
                   </div>
                   <div class="flex justify-between">
                     <span class="text-primary">🎯 Priority:</span>
                     <span class="text-orange-400 font-bold">${store.priority}</span>
                   </div>
                 </div>`
            }
          </div>
        `

          marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: "custom-popup",
          })
          newMarkers.push(marker)
        })

        setMarkers(newMarkers)
      } catch (error) {
        console.error("Error adding markers:", error)
        setError({
          type: "api",
          message: "Failed to add store markers",
          details: error instanceof Error ? error.message : "Unknown error",
        })
      }
    },
    [boxes],
  )

  const calculateOptimalRoute = async () => {
    if (!map || markers.length === 0) return

    setIsCalculatingRoute(true)
    setError(null)

    try {
      const L = (window as any).L

      // Clear existing routes
      routeLines.forEach((line) => map.removeLayer(line))
      setRouteLines([])

      // Get coordinates for route calculation
      const coords = walmartStores.map((store) => store.coordinates)

      // Get distance matrix with error handling
      const matrixUrl = "https://api.openrouteservice.org/v2/matrix/driving-car"
      const body = {
        locations: coords,
        metrics: ["distance", "duration"],
        units: "km",
      }

      const response = await fetch(matrixUrl, {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`)
      }

      const matrix = await response.json()

      if (matrix.error) {
        throw new Error(`OpenRouteService Error: ${matrix.error.message || "Unknown API error"}`)
      }

      const distances = matrix.distances
      const durations = matrix.durations

      // Calculate optimal route considering priorities
      const optimalRoute = calculatePriorityBasedRoute(distances, walmartStores)

      // Draw the optimal route
      const newRouteLines: any[] = []
      let totalDistance = 0
      let totalDuration = 0

      for (let i = 0; i < optimalRoute.length - 1; i++) {
        const startIdx = optimalRoute[i]
        const endIdx = optimalRoute[i + 1]
        const startCoord = coords[startIdx]
        const endCoord = coords[endIdx]

        totalDistance += distances[startIdx][endIdx]
        totalDuration += durations[startIdx][endIdx]

        // Draw route segment
        const routeLine = await drawRoute(startCoord, endCoord, L)
        if (routeLine) {
          newRouteLines.push(routeLine)
        }
      }

      setRouteLines(newRouteLines)

      // Set route info
      const routeNames = optimalRoute.map((idx) => {
        const store = walmartStores[idx]
        return store.type === "warehouse" ? "Warehouse" : `Stop ${store.priority}`
      })

      setRouteInfo({
        totalDistance,
        totalDuration,
        route: routeNames,
      })
    } catch (error) {
      console.error("Route calculation error:", error)
      setError({
        type: "routing",
        message: "Failed to calculate route",
        details: error instanceof Error ? error.message : "Unknown routing error",
      })
    } finally {
      setIsCalculatingRoute(false)
    }
  }

  const drawRoute = async (start: number[], end: number[], L: any) => {
    try {
      const dirUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`

      const res = await fetch(dirUrl, {
        signal: AbortSignal.timeout(15000), // 15 second timeout
      })

      if (!res.ok) {
        throw new Error(`Route API Error: ${res.status}`)
      }

      const json = await res.json()

      if (json.error) {
        throw new Error(`Route Error: ${json.error.message}`)
      }

      const geometry = json.features[0].geometry

      const polyline = L.geoJSON(geometry, {
        color: "hsl(var(--primary))",
        weight: 4,
        opacity: 0.8,
        className: "route-line",
      }).addTo(map)

      return polyline
    } catch (error) {
      console.error("Route drawing error:", error)
      return null
    }
  }

  const calculatePriorityBasedRoute = (distances: number[][], stores: typeof walmartStores) => {
    // Start from warehouse (index 0)
    let current = 0
    const visited = [current]
    const remaining = stores.slice(1).map((_, idx) => idx + 1)

    // Sort remaining stops by priority
    remaining.sort((a, b) => stores[a].priority - stores[b].priority)

    // Visit stops in priority order
    remaining.forEach((stopIdx) => {
      visited.push(stopIdx)
      current = stopIdx
    })

    return visited
  }

  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${query}&boundary.country=US&size=5`

      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!res.ok) {
        throw new Error(`Search API Error: ${res.status}`)
      }

      const data = await res.json()

      if (data.error) {
        throw new Error(`Search Error: ${data.error.message}`)
      }

      setSearchResults(data.features || [])
    } catch (error) {
      console.error("Search error:", error)
      setError({
        type: "geocoding",
        message: "Search failed",
        details: error instanceof Error ? error.message : "Unknown search error",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const addCustomLocation = (place: any) => {
    if (!map) return

    try {
      const L = (window as any).L
      const [lng, lat] = place.geometry.coordinates

      const customIcon = L.divIcon({
        html: `<div class="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full shadow-lg border-2 border-green-300/50">
                 <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                 </svg>
               </div>`,
        className: "custom-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)
      marker.bindPopup(`
        <div class="p-3 bg-gray-900 text-white rounded-lg border-2 border-green-500/50">
          <h4 class="font-bold text-green-400">Custom Location</h4>
          <p class="text-sm text-gray-300">${place.properties.label}</p>
        </div>
      `)

      map.setView([lat, lng], 12)
      setSearchResults([])
      setSearchQuery("")
    } catch (error) {
      console.error("Error adding custom location:", error)
      setError({
        type: "api",
        message: "Failed to add location",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const clearError = () => setError(null)

  return (
    <div className="w-full h-full relative bg-gray-900">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full map-container" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-[2000]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin loading-spinner mx-auto mb-4"></div>
            <p className="text-primary text-lg font-semibold">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1500] max-w-md">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-semibold">{error.message}</div>
                {error.details && <div className="text-sm opacity-80">{error.details}</div>}
                <Button size="sm" variant="outline" onClick={clearError} className="mt-2">
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

  {/* Control Panel */}
  <div className="absolute top-4 left-4 z-[1000] w-96">
    <Card className="bg-gray-800/80 backdrop-blur-md border-2 border-var(--primary)/30">
      <CardHeader>
        <CardTitle className="flex items-center text-var(--primary)">
          <Navigation className="h-5 w-5 mr-2" />
          Route Planner
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="relative mb-4">
          <Input
            type="text"
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              searchPlaces(e.target.value)
            }}
            className="bg-gray-900/50 border-var(--primary)/50 text-white pl-10 focus:ring-var(--primary) focus:border-var(--primary)"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <Loader2 className="h-5 w-5 text-var(--primary) animate-spin" />
            ) : (
              <Search className="h-5 w-5 text-var(--primary)" />
            )}
          </div>
          {searchResults.length > 0 && (
            <Card className="absolute z-10 mt-2 w-full bg-gray-800 border-var(--primary)/50">
              <CardContent className="p-2 max-h-60 overflow-y-auto">
                <ul>
                  {searchResults.map((result) => (
                    <li
                      key={result.properties.id}
                      className="p-2 text-sm text-gray-300 hover:bg-var(--primary)/20 rounded cursor-pointer"
                      onClick={() => addCustomLocation(result)}
                    >
                      {result.properties.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Route Summary */}
    <div className="absolute bottom-4 left-4 z-[1000]">
      <Card className="bg-gray-800/80 backdrop-blur-md border-2 border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-primary flex items-center">
            <Navigation className="h-4 w-4 mr-2" />
            Delivery Route
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
            {walmartStores.map((store, index) => (
              <div key={store.id} className="flex items-center space-x-2 p-1">
                <span className="text-primary font-bold min-w-[20px]">{index + 1}.</span>
                <div className="flex-1">
                  <div className="text-white font-medium">
                    {store.type === "warehouse" ? "Warehouse" : `Stop ${store.priority}`}
                  </div>
                  <div className="text-gray-400 text-xs truncate">{store.name}</div>
                </div>
                {store.type !== "warehouse" && (
                  <span className="text-orange-400 text-xs font-bold">
                    ({boxes.filter((box) => box.destination === `Stop ${store.priority}`).length})
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}
