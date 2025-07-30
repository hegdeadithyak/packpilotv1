"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { useOptimizationStore } from "@/store/optimization-store"
import { Button } from "@/components/ui/button"
import { Download, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"

interface TwoDRendererProps {
  isOverlay?: boolean
}

export function TwoDRenderer({ isOverlay = false }: TwoDRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [viewAngle, setViewAngle] = useState<"top" | "side" | "front">("top")
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  const { boxes, truckDimensions, temperatureZones, stabilityScore, safetyScore } = useOptimizationStore()

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size with device pixel ratio
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas with dark background
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Calculate scale and offset
    const padding = isOverlay ? 10 : 40
    const availableWidth = rect.width - padding * 2
    const availableHeight = rect.height - padding * 2

    let scaleX, scaleY, baseScale
    let truckWidth, truckHeight

    switch (viewAngle) {
      case "top":
        truckWidth = truckDimensions.width
        truckHeight = truckDimensions.length
        break
      case "side":
        truckWidth = truckDimensions.length
        truckHeight = truckDimensions.height
        break
      case "front":
        truckWidth = truckDimensions.width
        truckHeight = truckDimensions.height
        break
    }

    scaleX = availableWidth / truckWidth
    scaleY = availableHeight / truckHeight
    baseScale = Math.min(scaleX, scaleY) * zoom

    const offsetX = rect.width / 2 + pan.x
    const offsetY = rect.height / 2 + pan.y

    // Draw temperature zones first (background)
    ctx.globalAlpha = 0.15

    // Frozen zone (cyan)
    ctx.fillStyle = "#00bcd4"
    if (viewAngle === "top") {
      const zoneWidth = truckDimensions.width * baseScale
      const zoneHeight = 4 * baseScale
      ctx.fillRect(
        offsetX - zoneWidth / 2,
        offsetY + (truckDimensions.length * baseScale) / 2 - zoneHeight,
        zoneWidth,
        zoneHeight,
      )
    }

    // Cold zone (blue)
    ctx.fillStyle = "#2196f3"
    if (viewAngle === "top") {
      const zoneWidth = truckDimensions.width * baseScale
      const zoneHeight = 8 * baseScale
      ctx.fillRect(offsetX - zoneWidth / 2, offsetY - zoneHeight / 2, zoneWidth, zoneHeight)
    }

    ctx.globalAlpha = 1

    // Draw truck outline
    ctx.strokeStyle = "#555555"
    ctx.lineWidth = 2
    ctx.strokeRect(
      offsetX - (truckWidth * baseScale) / 2,
      offsetY - (truckHeight * baseScale) / 2,
      truckWidth * baseScale,
      truckHeight * baseScale,
    )

    // Draw grid
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 0.5
    ctx.globalAlpha = 0.5

    const gridSize = 1 * baseScale
    const gridStartX = offsetX - (truckWidth * baseScale) / 2
    const gridStartY = offsetY - (truckHeight * baseScale) / 2
    const gridEndX = offsetX + (truckWidth * baseScale) / 2
    const gridEndY = offsetY + (truckHeight * baseScale) / 2

    // Vertical grid lines
    for (let x = gridStartX; x <= gridEndX; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, gridStartY)
      ctx.lineTo(x, gridEndY)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let y = gridStartY; y <= gridEndY; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(gridStartX, y)
      ctx.lineTo(gridEndX, y)
      ctx.stroke()
    }

    ctx.globalAlpha = 1

    // Draw boxes
    boxes.forEach((box, index) => {
      let x, y, width, height

      switch (viewAngle) {
        case "top":
          x = offsetX + (box.position.x - box.width / 2) * baseScale
          y = offsetY + (box.position.z - box.length / 2) * baseScale
          width = box.width * baseScale
          height = box.length * baseScale
          break
        case "side":
          x = offsetX + (box.position.z - box.length / 2) * baseScale
          y = offsetY - (box.position.y + box.height / 2) * baseScale
          width = box.length * baseScale
          height = box.height * baseScale
          break
        case "front":
          x = offsetX + (box.position.x - box.width / 2) * baseScale
          y = offsetY - (box.position.y + box.height / 2) * baseScale
          width = box.width * baseScale
          height = box.height * baseScale
          break
      }

      // Box fill color based on temperature zone
      switch (box.temperatureZone) {
        case "frozen":
          ctx.fillStyle = "#00bcd4"
          break
        case "cold":
          ctx.fillStyle = "#2196f3"
          break
        default:
          ctx.fillStyle = "#666666"
      }

      // Add transparency for fragile items
      ctx.globalAlpha = box.isFragile ? 0.7 : 1.0
      ctx.fillRect(x, y, width, height)
      ctx.globalAlpha = 1.0

      // Box outline
      ctx.strokeStyle = box.isFragile ? "#ff9800" : "#333333"
      ctx.lineWidth = box.isFragile ? 2 : 1
      ctx.strokeRect(x, y, width, height)

      // Box labels (only if not overlay and box is large enough)
      if (!isOverlay && width > 40 && height > 25) {
        ctx.fillStyle = "white"
        ctx.font = "10px Inter, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        const label = box.name.length > 8 ? box.name.substring(0, 8) + "..." : box.name
        ctx.fillText(label, x + width / 2, y + height / 2 - 5)

        // Weight
        ctx.font = "8px Inter, sans-serif"
        ctx.fillStyle = "#aaa"
        ctx.fillText(`${box.weight}lbs`, x + width / 2, y + height / 2 + 5)
      }

      // Loading sequence number
      if (!isOverlay && width > 20 && height > 20) {
        const sequenceIndex = boxes.findIndex((b) => b.id === box.id) + 1
        ctx.fillStyle = "#00ff88"
        ctx.font = "bold 12px Inter, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(sequenceIndex.toString(), x + 10, y + 15)
      }
    })

    // Draw center of gravity indicator
    if (!isOverlay && boxes.length > 0) {
      const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)
      const cog = {
        x: boxes.reduce((sum, box) => sum + box.position.x * box.weight, 0) / totalWeight,
        y: boxes.reduce((sum, box) => sum + box.position.y * box.weight, 0) / totalWeight,
        z: boxes.reduce((sum, box) => sum + box.position.z * box.weight, 0) / totalWeight,
      }

      let cogX, cogY
      switch (viewAngle) {
        case "top":
          cogX = offsetX + cog.x * baseScale
          cogY = offsetY + cog.z * baseScale
          break
        case "side":
          cogX = offsetX + cog.z * baseScale
          cogY = offsetY - cog.y * baseScale
          break
        case "front":
          cogX = offsetX + cog.x * baseScale
          cogY = offsetY - cog.y * baseScale
          break
      }

      // Draw center of gravity marker
      ctx.fillStyle = "#ff4444"
      ctx.beginPath()
      ctx.arc(cogX, cogY, 6, 0, 2 * Math.PI)
      ctx.fill()

      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()

      // COG label
      ctx.fillStyle = "white"
      ctx.font = "10px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("COG", cogX, cogY - 12)
    }

    // Draw title and info
    if (!isOverlay) {
      ctx.fillStyle = "white"
      ctx.font = "14px Inter, sans-serif"
      ctx.textAlign = "left"
      ctx.fillText(`${viewAngle.toUpperCase()} VIEW`, 10, 25)

      // Stability and safety scores
      ctx.font = "12px Inter, sans-serif"
      ctx.fillStyle = stabilityScore > 80 ? "#4ade80" : stabilityScore > 60 ? "#fbbf24" : "#ef4444"
      ctx.fillText(`Stability: ${stabilityScore.toFixed(1)}%`, 10, 45)

      ctx.fillStyle = safetyScore > 80 ? "#4ade80" : safetyScore > 60 ? "#fbbf24" : "#ef4444"
      ctx.fillText(`Safety: ${safetyScore.toFixed(1)}%`, 10, 60)
    }

    // Legend
    if (!isOverlay) {
      const legendY = rect.height - 80
      ctx.font = "10px Inter, sans-serif"
      ctx.textAlign = "left"

      // Temperature zones legend
      ctx.fillStyle = "#00bcd4"
      ctx.fillRect(10, legendY, 15, 10)
      ctx.fillStyle = "white"
      ctx.fillText("Frozen", 30, legendY + 8)

      ctx.fillStyle = "#2196f3"
      ctx.fillRect(10, legendY + 15, 15, 10)
      ctx.fillStyle = "white"
      ctx.fillText("Cold", 30, legendY + 23)

      ctx.fillStyle = "#666666"
      ctx.fillRect(10, legendY + 30, 15, 10)
      ctx.fillStyle = "white"
      ctx.fillText("Regular", 30, legendY + 38)

      // Fragile indicator
      ctx.strokeStyle = "#ff9800"
      ctx.lineWidth = 2
      ctx.strokeRect(10, legendY + 45, 15, 10)
      ctx.fillStyle = "white"
      ctx.fillText("Fragile", 30, legendY + 53)
    }
  }, [boxes, truckDimensions, temperatureZones, viewAngle, zoom, pan, isOverlay, stabilityScore, safetyScore])

  useEffect(() => {
    drawScene()
  }, [drawScene])

  // Mouse event handlers for panning and zooming
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isOverlay) return
    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isOverlay) return

    const deltaX = e.clientX - lastMousePos.x
    const deltaY = e.clientY - lastMousePos.y

    setPan((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }))

    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (isOverlay) return
    e.preventDefault()

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((prev) => Math.max(0.1, Math.min(5, prev * zoomFactor)))
  }

  const resetView = () => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
  }

  const exportImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement("a")
    link.download = `truck-layout-${viewAngle}-${Date.now()}.png`
    link.href = canvas.toDataURL("image/png", 1.0)
    link.click()
  }

  return (
    <div className={`relative w-full h-full ${isOverlay ? "bg-gray-900/95" : "bg-gray-900"}`}>
      {!isOverlay && (
        <>
          {/* View Controls */}
          <div className="absolute top-4 left-4 z-10 flex space-x-2">
            <Button
              variant={viewAngle === "top" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewAngle("top")}
              className="text-xs"
            >
              Top
            </Button>
            <Button
              variant={viewAngle === "side" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewAngle("side")}
              className="text-xs"
            >
              Side
            </Button>
            <Button
              variant={viewAngle === "front" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewAngle("front")}
              className="text-xs"
            >
              Front
            </Button>
          </div>

          {/* Zoom and Export Controls */}
          <div className="absolute top-4 right-4 z-10 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom((prev) => Math.min(5, prev * 1.2))}
              className="text-xs bg-transparent"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom((prev) => Math.max(0.1, prev * 0.8))}
              className="text-xs bg-transparent"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetView} className="text-xs bg-transparent">
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportImage} className="text-xs bg-transparent">
              <Download className="h-3 w-3" />
            </Button>
          </div>

          {/* Zoom indicator */}
          <div className="absolute bottom-4 right-4 z-10 bg-gray-900/80 text-white px-2 py-1 rounded text-xs">
            Zoom: {(zoom * 100).toFixed(0)}%
          </div>
        </>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-move"
        style={{ imageRendering: "pixelated" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {isOverlay && <div className="absolute bottom-2 left-2 text-xs text-gray-400">2D {viewAngle.toUpperCase()}</div>}
    </div>
  )
}
