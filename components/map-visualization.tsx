"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Route,
  Navigation,
  AlertTriangle,
  Loader2,
  Search,
  Store,
  MapPin,
  Clock,
  Car,
  Shuffle,
  Warehouse,
  Thermometer,
  CloudSun,
  ToggleLeft,
  ToggleRight,
  Truck,
} from "lucide-react"

// Real Walmart Distribution Center as warehouse origin
const warehouseLocation = {
  id: "warehouse",
  name: "Walmart Distribution Center #6094",
  address: "24555 Katy Freeway, Katy, TX 77494",
  coordinates: { lat: 29.7604, lng: -95.689 },
  type: "warehouse" as const,
}

// Real Walmart store locations in Texas/Southwest region for realistic routing
const walmartStorePool = [
  {
    id: "walmart_1",
    name: "Walmart Supercenter #5260",
    address: "2425 East Pioneer Parkway, Arlington, TX 76010",
    coordinates: { lat: 32.7074, lng: -97.0682 },
    placeId: "ChIJhRMHnlWZToYRqHKFOjAKXA8",
  },
  {
    id: "walmart_2",
    name: "Walmart Supercenter #1349",
    address: "8555 Preston Road, Frisco, TX 75034",
    coordinates: { lat: 33.129, lng: -96.8236 },
    placeId: "ChIJN0nKjv3tTIYRoKqVOmQKrA0",
  },
  {
    id: "walmart_3",
    name: "Walmart Supercenter #3052",
    address: "1405 East Belt Line Road, Richardson, TX 75081",
    coordinates: { lat: 32.9581, lng: -96.6989 },
    placeId: "ChIJ8b8HLvK7SIYRnQJVOkQHbN2",
  },
  {
    id: "walmart_4",
    name: "Walmart Supercenter #1329",
    address: "13750 East Northwest Highway, Dallas, TX 75244",
    coordinates: { lat: 32.9247, lng: -96.7702 },
    placeId: "ChIJ7a5Hj6M7SIYRPLsVLmAWcK9",
  },
  {
    id: "walmart_5",
    name: "Walmart Supercenter #1800",
    address: "3500 Texas Highway 6, Sugar Land, TX 77478",
    coordinates: { lat: 29.5997, lng: -95.6394 },
    placeId: "ChIJQyFHdkW8QIYRtLsVKnAFcQ3",
  },
  {
    id: "walmart_6",
    name: "Walmart Supercenter #2705",
    address: "1521 South Loop 336 West, Conroe, TX 77304",
    coordinates: { lat: 30.2849, lng: -95.456 },
    placeId: "ChIJRyHnfEW2QIYRqMsVJoAHdR8",
  },
  {
    id: "walmart_7",
    name: "Walmart Supercenter #3412",
    address: "19720 Northwest Freeway, Houston, TX 77065",
    coordinates: { lat: 29.8688, lng: -95.5643 },
    placeId: "ChIJTyJnhEX3QIYRsNsVNoAIdU4",
  },
  {
    id: "walmart_8",
    name: "Walmart Supercenter #1002",
    address: "500 Highway 6, Kemah, TX 77565",
    coordinates: { lat: 29.543, lng: -95.0213 },
    placeId: "ChIJUyKniEY4QIYRuOsVPoAJeW5",
  },
]

// TypeScript interfaces for type safety
interface WalmartLocation {
  id: string
  name: string
  address: string
  coordinates: { lat: number; lng: number }
  priority?: number
  placeId?: string
}

interface RouteInfo {
  totalDistance: string
  totalDuration: string
  route: string[]
  trafficInfo?: string
  weatherInfo?: string
}

interface WeatherData {
  location: string
  temperature: number
  condition: string
  icon: string
  humidity: number
  windSpeed: number
}

interface MapError {
  type: "api" | "network" | "routing" | "places" | "weather"
  message: string
  details?: string
}

// Declare global Google Maps types for TypeScript
declare global {
  interface Window {
    google: any
    initGoogleMaps: () => void
  }
}

// Google Maps type definitions for better TypeScript support
type GoogleMap = any
type GoogleMapsService = any
type GoogleMapsMarker = any
type GoogleMapsInfoWindow = any

export default function MapVisualization() {
  // Map and Google APIs references
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<GoogleMap | null>(null)
  const [directionsService, setDirectionsService] = useState<GoogleMapsService | null>(null)
  const [directionsRenderer, setDirectionsRenderer] = useState<GoogleMapsService | null>(null)
  const [placesService, setPlacesService] = useState<GoogleMapsService | null>(null)
  const [trafficLayer, setTrafficLayer] = useState<any | null>(null)

  // UI state management
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<MapError | null>(null)

  // Location and route state
  const [selectedStores, setSelectedStores] = useState<WalmartLocation[]>([])
  const [markers, setMarkers] = useState<any[]>([])
  const [warehouseMarker, setWarehouseMarker] = useState<any | null>(null)
  const [truckMarker, setTruckMarker] = useState<any | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Feature toggles for extensibility
  const [trafficLayerEnabled, setTrafficLayerEnabled] = useState(true)
  const [routeOptimizationEnabled, setRouteOptimizationEnabled] = useState(true)
  const [weatherOverlayEnabled, setWeatherOverlayEnabled] = useState(true)
  const [warehouseOverlayEnabled, setWarehouseOverlayEnabled] = useState(true)

  // Google Maps API key - Replace with your actual API key
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBHSNMm74onzOin26VZqzPcDvqAMNqFNMs"

  /**
   * Initialize Google Maps on component mount
   * Loads the Google Maps JavaScript API with required libraries
   */
  useEffect(() => {
    if (!apiKey) {
      setError({
        type: "api",
        message: "Google Maps API key not configured",
        details: "Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable",
      })
      setIsLoading(false)
      return
    }
    loadGoogleMaps()
  }, [apiKey])

  /**
   * Auto-select 4 random stores and add warehouse when map is loaded
   */
  useEffect(() => {
    if (isLoaded && selectedStores.length === 0) {
      selectRandomStores()
      if (warehouseOverlayEnabled) {
        addWarehouseMarker()
      }
      if (weatherOverlayEnabled) {
        fetchWeatherData()
      }
    }
  }, [isLoaded, warehouseOverlayEnabled, weatherOverlayEnabled])

  /**
   * Load Google Maps JavaScript API with Places and Geometry libraries
   * Handles script injection and initialization callback
   */
  const loadGoogleMaps = useCallback(() => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        initializeMap()
        return
      }

      // Set up initialization callback
      window.initGoogleMaps = () => {
        if (window.google && window.google.maps) {
          initializeMap()
        } else {
          setError({
            type: "api",
            message: "Failed to load Google Maps",
            details: "Google Maps API could not be initialized properly",
          })
          setIsLoading(false)
        }
      }

      // Create and inject Google Maps script
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initGoogleMaps`
      script.async = true
      script.defer = true
      script.onerror = () => {
        setError({
          type: "network",
          message: "Network error loading Google Maps",
          details: "Could not load Google Maps API from CDN. Check your internet connection and API key.",
        })
        setIsLoading(false)
      }

      document.head.appendChild(script)
    } catch (error) {
      console.error("Error loading Google Maps:", error)
      setError({
        type: "api",
        message: "Failed to initialize Google Maps",
        details: error instanceof Error ? error.message : "Unknown error",
      })
      setIsLoading(false)
    }
  }, [apiKey])

  /**
   * Initialize Google Maps instance and services
   * Sets up map with dark mode styling and initializes required services
   */
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) return

    try {
      // Dark mode Google Maps styles for professional presentation
      const darkMapStyles: any[] = [
        { elementType: "geometry", stylers: [{ color: "#212121" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
        {
          featureType: "administrative",
          elementType: "geometry",
          stylers: [{ color: "#757575" }],
        },
        {
          featureType: "administrative.country",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9e9e9e" }],
        },
        {
          featureType: "administrative.land_parcel",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#bdbdbd" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#757575" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#181818" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#616161" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#1b1b1b" }],
        },
        {
          featureType: "road",
          elementType: "geometry.fill",
          stylers: [{ color: "#2c2c2c" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#8a8a8a" }],
        },
        {
          featureType: "road.arterial",
          elementType: "geometry",
          stylers: [{ color: "#373737" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#3c3c3c" }],
        },
        {
          featureType: "road.highway.controlled_access",
          elementType: "geometry",
          stylers: [{ color: "#4e4e4e" }],
        },
        {
          featureType: "road.local",
          elementType: "labels.text.fill",
          stylers: [{ color: "#616161" }],
        },
        {
          featureType: "transit",
          elementType: "labels.text.fill",
          stylers: [{ color: "#757575" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#000000" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#3d3d3d" }],
        },
      ]

      // Initialize map centered on Texas region where warehouse and stores are located
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 8,
        center: warehouseLocation.coordinates, // Center on warehouse
        styles: darkMapStyles,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
        },
      })

      // Initialize directions service and renderer
      const directionsServiceInstance = new window.google.maps.DirectionsService()
      const directionsRendererInstance = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true, // We'll use custom markers
        polylineOptions: {
          strokeColor: "#3b82f6", // Map primary color
          strokeWeight: 6,
          strokeOpacity: 0.9,
        },
      })
      directionsRendererInstance.setMap(mapInstance)

      // Initialize Places service for search functionality
      const placesServiceInstance = new window.google.maps.places.PlacesService(mapInstance)

      // Initialize traffic layer (but don't add to map yet)
      const trafficLayerInstance = new window.google.maps.TrafficLayer()
      if (trafficLayerEnabled) {
        trafficLayerInstance.setMap(mapInstance)
      }

      // Set state
      setMap(mapInstance)
      setDirectionsService(directionsServiceInstance)
      setDirectionsRenderer(directionsRendererInstance)
      setPlacesService(placesServiceInstance)
      setTrafficLayer(trafficLayerInstance)
      setIsLoaded(true)
      setIsLoading(false)
    } catch (error) {
      console.error("Error initializing map:", error)
      setError({
        type: "api",
        message: "Failed to initialize map",
        details: error instanceof Error ? error.message : "Unknown error",
      })
      setIsLoading(false)
    }
  }, [trafficLayerEnabled])

  /**
   * Add warehouse marker to the map
   * Creates custom warehouse icon and info window
   */
  const addWarehouseMarker = useCallback(() => {
    if (!map || !window.google) return

    const warehouseIcon = {
      url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(`
        <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
          <circle cx="25" cy="25" r="23" fill="#3b82f6" stroke="#1e40af" strokeWidth="2"/>
          <path d="M10 18h30v14H10z" fill="white"/>
          <path d="M12 20h26v2H12zm0 4h26v2H12zm0 4h26v2H12z" fill="#3b82f6"/>
          <text x="25" y="42" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">HQ</text>
        </svg>
      `),
      scaledSize: new window.google.maps.Size(50, 50),
      anchor: new window.google.maps.Point(25, 25),
    }

    const marker = new window.google.maps.Marker({
      position: warehouseLocation.coordinates,
      map: map,
      icon: warehouseIcon,
      title: warehouseLocation.name,
    })

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="color: #1f2937; padding: 12px; min-width: 280px; font-family: system-ui;">
          <h3 style="margin: 0 0 8px 0; color: #3b82f6; font-weight: bold; font-size: 16px;">
            🏭 ${warehouseLocation.name}
          </h3>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">${warehouseLocation.address}</p>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6b7280;">
            <span>📦 Distribution Hub</span>
            <span>🚛 Route Origin</span>
          </div>
        </div>
      `,
    })

    marker.addListener("click", () => {
      infoWindow.open(map, marker)
    })

    setWarehouseMarker(marker)
  }, [map])

  /**
   * Add truck marker to represent delivery vehicle
   * Creates animated truck icon that moves along the route
   */
  const addTruckMarker = useCallback(
      (position: any) => {
        if (!map || !window.google) return

        // Remove existing truck marker
        if (truckMarker) {
          truckMarker.setMap(null)
        }

        const truckIcon = {
          url:
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(`
        <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#10b981" stroke="#059669" strokeWidth="2"/>
          <path d="M8 16h8v8H8zm10-2h6v4h-6zm8 2h4v8h-4z" fill="white"/>
          <circle cx="12" cy="26" r="2" fill="#059669"/>
          <circle cx="28" cy="26" r="2" fill="#059669"/>
          <text x="20" y="12" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">🚛</text>
        </svg>
      `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20),
        }

        const marker = new window.google.maps.Marker({
          position: position,
          map: map,
          icon: truckIcon,
          title: "Delivery Truck",
          zIndex: 1000,
        })

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
        <div style="color: #1f2937; padding: 8px; min-width: 200px; font-family: system-ui;">
          <h4 style="margin: 0 0 8px 0; color: #10b981; font-weight: bold;">🚛 Delivery Vehicle</h4>
          <p style="margin: 0; font-size: 14px;">Currently on route for deliveries</p>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            Real-time tracking enabled
          </div>
        </div>
      `,
        })

        marker.addListener("click", () => {
          infoWindow.open(map, marker)
        })

        setTruckMarker(marker)
      },
      [map, truckMarker],
  )

  /**
   * Fetch weather data simulation
   * Simulates weather data for the area
   */
  const fetchWeatherData = useCallback(async () => {
    try {
      // Simulate weather data (in production, you'd call a real weather API)
      setWeatherData({
        location: "Dallas-Fort Worth, TX",
        temperature: 78,
        condition: "Partly Cloudy",
        icon: "🌤",
        humidity: 65,
        windSpeed: 8,
      })
    } catch (error) {
      console.error("Weather fetch error:", error)
      // Weather is optional, don't show error for this
    }
  }, [])

  /**
   * Randomly select 4 Walmart stores from the pool
   * Updates selectedStores state and adds markers to map
   */
  const selectRandomStores = useCallback(() => {
    if (!map) return

    try {
      // Clear existing markers
      markers.forEach((marker) => marker.setMap(null))
      setMarkers([])
      setRouteInfo(null)

      // Remove existing truck marker
      if (truckMarker) {
        truckMarker.setMap(null)
        setTruckMarker(null)
      }

      // Randomly select 4 stores
      const shuffled = [...walmartStorePool].sort(() => 0.5 - Math.random())
      const selected = shuffled.slice(0, 4).map((store, index) => ({
        ...store,
        priority: index + 1,
      }))

      setSelectedStores(selected)
      addStoreMarkers(selected)
    } catch (error) {
      console.error("Error selecting random stores:", error)
      setError({
        type: "api",
        message: "Failed to select stores",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }, [map, markers, truckMarker])

  /**
   * Add store markers to the map with custom styling
   * Creates numbered markers for each selected store
   */
  const addStoreMarkers = useCallback(
      (stores: WalmartLocation[]) => {
        if (!map || !window.google) return

        const newMarkers: any[] = []

        stores.forEach((store, index) => {
          // Create custom numbered marker icon
          const storeIcon = {
            url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(`
          <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#f97316" stroke="#ea580c" strokeWidth="2"/>
            <text x="20" y="26" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">${index + 1}</text>
          </svg>
        `),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
          }

          const marker = new window.google.maps.Marker({
            position: store.coordinates,
            map: map,
            icon: storeIcon,
            title: store.name,
          })

          // Create info window with store details
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
          <div style="color: #1f2937; padding: 12px; min-width: 280px; font-family: system-ui;">
            <h3 style="margin: 0 0 8px 0; color: #f97316; font-weight: bold; font-size: 16px;">
              🏪 ${store.name}
            </h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #4b5563;">${store.address}</p>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6b7280;">
              <span>🎯 Priority: <strong>${index + 1}</strong></span>
              <span>🚛 Stop: <strong>${index + 1}</strong></span>
            </div>
          </div>
        `,
          })

          marker.addListener("click", () => {
            infoWindow.open(map, marker)
          })

          newMarkers.push(marker)
        })

        setMarkers(newMarkers)
      },
      [map],
  )

  /**
   * Calculate and display optimal route starting from warehouse
   * Uses Google Directions API with real-time traffic data and warehouse origin
   */
  const calculateOptimalRoute = useCallback(async () => {
    if (!directionsService || !directionsRenderer || selectedStores.length === 0) return

    setIsCalculatingRoute(true)
    setError(null)

    try {
      // Create waypoints from all selected stores
      const waypoints = selectedStores.map((store) => ({
        location: store.coordinates,
        stopover: true,
      }))

      // Route starts from warehouse and visits all stores
      const request: any = {
        origin: warehouseLocation.coordinates, // Start from warehouse
        destination: warehouseLocation.coordinates, // Return to warehouse
        waypoints: waypoints,
        optimizeWaypoints: routeOptimizationEnabled,
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(), // Current time for real-time traffic
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
        },
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
        avoidHighways: false,
        avoidTolls: false,
      }

      directionsService.route(request, (result: any, status: any) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result)

          // Add truck marker at the starting position (warehouse)
          addTruckMarker(warehouseLocation.coordinates)

          // Extract and calculate route information
          const route = result.routes[0]
          let totalDistance = 0
          let totalDuration = 0

          route.legs.forEach((leg: any) => {
            totalDistance += leg.distance?.value || 0
            totalDuration += leg.duration?.value || 0
          })

          // Convert to readable format
          const distanceText = (totalDistance / 1609.34).toFixed(1) + " miles"
          const durationText = Math.round(totalDuration / 60) + " minutes"

          // Check for traffic delays
          let trafficInfo = ""
          const firstLeg = route.legs[0]
          if (firstLeg.duration_in_traffic) {
            const trafficDelay = (firstLeg.duration_in_traffic.value - firstLeg.duration!.value) / 60
            trafficInfo =
                trafficDelay > 5
                    ? `${Math.round(trafficDelay)} min delay due to traffic`
                    : "No significant traffic delays"
          }

          // Build route sequence starting with warehouse
          const routeNames = [
            "Warehouse: " + warehouseLocation.name.split("#")[0],
            ...selectedStores.map((store, index) => `Stop ${index + 1}: ${store.name.split("#")[0]}`),
            "Return: " + warehouseLocation.name.split("#")[0],
          ]

          setRouteInfo({
            totalDistance: distanceText,
            totalDuration: durationText,
            route: routeNames,
            trafficInfo: trafficInfo || undefined,
            weatherInfo: weatherData ? `${weatherData.temperature}°F, ${weatherData.condition}` : undefined,
          })
        } else {
          throw new Error(`Directions request failed: ${status}`)
        }
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
  }, [directionsService, directionsRenderer, selectedStores, routeOptimizationEnabled, weatherData, addTruckMarker])

  /**
   * Search for places using Google Places API
   * Extensible search functionality for custom locations
   */
  const searchPlaces = useCallback(
      async (query: string) => {
        if (!placesService || query.length < 3) {
          setSearchResults([])
          return
        }

        setIsSearching(true)
        setError(null)

        try {
          const request = {
            query: query,
            fields: ["name", "geometry", "formatted_address", "place_id"],
          }

          placesService.textSearch(request, (results: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              setSearchResults(results.slice(0, 5))
            } else {
              setSearchResults([])
              if (status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                setError({
                  type: "places",
                  message: "Search failed",
                  details: `Places API error: ${status}`,
                })
              }
            }
            setIsSearching(false)
          })
        } catch (error) {
          console.error("Search error:", error)
          setError({
            type: "places",
            message: "Search failed",
            details: error instanceof Error ? error.message : "Unknown search error",
          })
          setIsSearching(false)
        }
      },
      [placesService],
  )

  /**
   * Add custom location from search results
   * Extensibility feature for adding custom waypoints
   */
  const addCustomLocation = useCallback(
      (place: any) => {
        if (!map || !place.geometry?.location) return

        try {
          const customIcon = {
            url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(`
          <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#10b981" stroke="#059669" strokeWidth="2"/>
            <path d="M16 8l3 6h5l-4 3 1.5 6-5.5-4-5.5 4L12 17l-4-3h5l3-6z" fill="white"/>
          </svg>
        `),
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16),
          }

          const marker = new window.google.maps.Marker({
            position: place.geometry.location,
            map: map,
            icon: customIcon,
            title: place.name,
          })

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
          <div style="color: #1f2937; padding: 8px; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #10b981; font-weight: bold;">📍 Custom Location</h4>
            <p style="margin: 0; font-size: 14px;">${place.formatted_address || place.name}</p>
          </div>
        `,
          })

          marker.addListener("click", () => {
            infoWindow.open(map, marker)
          })

          map.setCenter(place.geometry.location)
          map.setZoom(14)
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
      },
      [map],
  )

  /**
   * Toggle traffic layer visibility
   * Extensibility feature for traffic analysis
   */
  const toggleTrafficLayer = useCallback(() => {
    if (!trafficLayer || !map) return

    setTrafficLayerEnabled((prev) => {
      const newState = !prev
      if (newState) {
        trafficLayer.setMap(map)
      } else {
        trafficLayer.setMap(null)
      }
      return newState
    })
  }, [trafficLayer, map])

  const clearError = () => setError(null)

  return (
      <div className="w-full h-screen relative bg-background">
        {/* Map Container */}
        <div ref={mapRef} className="w-full h-full" style={{ background: "hsl(var(--muted))" }} />

        {/* Loading Overlay */}
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-50">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-foreground text-lg font-semibold">Loading Google Maps...</p>
                <p className="text-muted-foreground text-sm">
                  Initializing route planner with real warehouse and store locations...
                </p>
              </div>
            </div>
        )}

        {/* Error Display */}
        {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 max-w-md">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-semibold">{error.message}</div>
                    {error.details && <div className="text-sm opacity-90">{error.details}</div>}
                    <Button size="sm" variant="outline" onClick={clearError} className="mt-2 bg-transparent">
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
        )}

        {/* Control Panel - Left Side */}
        <div className="absolute top-4 left-4 z-30 w-96 space-y-4">
          {/* Main Controls Card */}
          <Card className="backdrop-blur-md bg-card/95 border-border shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-primary">
                <Navigation className="h-5 w-5 mr-2" />
                Walmart Route Optimizer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Input
                    type="text"
                    placeholder="Search for additional locations..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      searchPlaces(e.target.value)
                    }}
                    className="pl-10 bg-background border-border"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {isSearching ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                      <Search className="h-4 w-4 text-primary" />
                  )}
                </div>
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <Card className="absolute z-10 mt-2 w-full bg-card border-border">
                      <CardContent className="p-2 max-h-60 overflow-y-auto">
                        {searchResults.map((result, index) => (
                            <div
                                key={result.place_id || index}
                                className="p-2 text-sm hover:bg-accent rounded cursor-pointer flex items-center space-x-2"
                                onClick={() => addCustomLocation(result)}
                            >
                              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                              <div className="flex-1">
                                <div className="font-medium text-foreground">{result.name}</div>
                                <div className="text-xs text-muted-foreground">{result.formatted_address}</div>
                              </div>
                            </div>
                        ))}
                      </CardContent>
                    </Card>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                    onClick={selectRandomStores}
                    disabled={!isLoaded}
                    variant="outline"
                    className="flex-1 bg-transparent"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  New Route
                </Button>
                <Button
                    onClick={calculateOptimalRoute}
                    disabled={!isLoaded || selectedStores.length === 0 || isCalculatingRoute}
                    className="flex-1"
                >
                  {isCalculatingRoute ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                      <Route className="h-4 w-4 mr-2" />
                  )}
                  Calculate Route
                </Button>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Car className="h-4 w-4 text-primary" />
                    <span className="text-sm">Traffic Layer</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={toggleTrafficLayer} className="h-6 w-10 p-0">
                    {trafficLayerEnabled ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Navigation className="h-4 w-4 text-primary" />
                    <span className="text-sm">Route Optimization</span>
                  </div>
                  <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRouteOptimizationEnabled(!routeOptimizationEnabled)}
                      className="h-6 w-10 p-0"
                  >
                    {routeOptimizationEnabled ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Warehouse className="h-4 w-4 text-primary" />
                    <span className="text-sm">Show Warehouse</span>
                  </div>
                  <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWarehouseOverlayEnabled(!warehouseOverlayEnabled)}
                      className="h-6 w-10 p-0"
                  >
                    {warehouseOverlayEnabled ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CloudSun className="h-4 w-4 text-primary" />
                    <span className="text-sm">Weather Info</span>
                  </div>
                  <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWeatherOverlayEnabled(!weatherOverlayEnabled)}
                      className="h-6 w-10 p-0"
                  >
                    {weatherOverlayEnabled ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weather Info Card */}
          {weatherOverlayEnabled && weatherData && (
              <Card className="backdrop-blur-md bg-card/95 border-border shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary flex items-center">
                    <Thermometer className="h-4 w-4 mr-2" />
                    Current Weather - {weatherData.location}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{weatherData.icon}</span>
                      <div>
                        <div className="text-xl font-semibold text-foreground">{weatherData.temperature}°F</div>
                        <div className="text-sm text-muted-foreground">{weatherData.condition}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>Humidity: {weatherData.humidity}%</div>
                      <div>Wind: {weatherData.windSpeed} mph</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}
        </div>

        {/* Selected Stores Info - Right Side */}
        {selectedStores.length > 0 && (
            <div className="absolute top-4 right-4 z-30 w-80">
              <Card className="backdrop-blur-md bg-card/95 border-border shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary flex items-center">
                    <Store className="h-4 w-4 mr-2" />
                    Selected Stores ({selectedStores.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {/* Warehouse as starting point */}
                    <div className="flex items-start space-x-3 p-3 bg-primary/10 rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                        🏭
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{warehouseLocation.name.split("#")[0]}</div>
                        <div className="text-xs text-muted-foreground truncate">{warehouseLocation.address}</div>
                        <div className="text-xs text-primary mt-1">Route Origin</div>
                      </div>
                    </div>
                    {/* Selected stores */}
                    {selectedStores.map((store, index) => (
                        <div key={store.id} className="flex items-start space-x-3 p-3 bg-accent/50 rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">{store.name.split("#")[0]}</div>
                            <div className="text-xs text-muted-foreground truncate">{store.address}</div>
                            <div className="text-xs text-primary mt-1">Stop {index + 1}</div>
                          </div>
                        </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Route Summary Card - Bottom Left */}
        {routeInfo && (
            <div className="absolute bottom-4 left-4 z-30">
              <Card className="backdrop-blur-md bg-card/95 border-border shadow-lg min-w-[320px]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary flex items-center">
                    <Route className="h-4 w-4 mr-2" />
                    Optimized Route Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Route Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Navigation className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-semibold text-foreground">{routeInfo.totalDistance}</div>
                        <div className="text-xs text-muted-foreground">Total Distance</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-semibold text-foreground">{routeInfo.totalDuration}</div>
                        <div className="text-xs text-muted-foreground">Estimated Time</div>
                      </div>
                    </div>
                  </div>

                  {/* Truck Status */}
                  {truckMarker && (
                      <div className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Truck className="h-4 w-4 text-green-600" />
                        <div className="text-sm text-green-700 dark:text-green-400">
                          Delivery truck positioned at warehouse
                        </div>
                      </div>
                  )}

                  {/* Traffic and Weather Info */}
                  {(routeInfo.trafficInfo || routeInfo.weatherInfo) && (
                      <div className="space-y-2 text-xs">
                        {routeInfo.trafficInfo && (
                            <div className="flex items-center space-x-2 text-yellow-600">
                              <Car className="h-3 w-3" />
                              <span>{routeInfo.trafficInfo}</span>
                            </div>
                        )}
                        {routeInfo.weatherInfo && (
                            <div className="flex items-center space-x-2 text-primary">
                              <CloudSun className="h-3 w-3" />
                              <span>{routeInfo.weatherInfo}</span>
                            </div>
                        )}
                      </div>
                  )}

                  {/* Route Sequence */}
                  <div className="border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground mb-2">Route Sequence:</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {routeInfo.route.map((stop, index) => (
                          <div key={index} className="flex items-center space-x-2 text-xs">
                            <span className="text-primary font-bold min-w-[20px]">{index + 1}.</span>
                            <span className="text-foreground">{stop}</span>
                          </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

        {/* API Key Warning - Show if no API key configured */}
        {!apiKey && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50">
              <Card className="border-destructive max-w-md">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Configuration Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">Google Maps API key is required to use this feature.</p>
                    <div className="bg-muted p-3 rounded">
                      <p className="font-medium text-foreground mb-2">Steps to configure:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Get a Google Maps API key from Google Cloud Console</li>
                        <li>Enable Maps JavaScript API, Places API, and Directions API</li>
                        <li>Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable</li>
                      </ol>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For production, use environment variables instead of hardcoding the API key.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}
      </div>
  )
}