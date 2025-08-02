import type { Box } from "@/types/box"

export interface GeneratedImage {
  name: string
  dataUrl: string
  width: number
  height: number
}

export async function generate2DImages(
  boxes: Box[],
  truckDimensions: { width: number; length: number; height: number },
  temperatureZones: { regular: string[]; cold: string[]; frozen: string[] },
): Promise<GeneratedImage[]> {
  const images: GeneratedImage[] = []

  // Generate different views
  const views = [
    { name: "Top View", angle: "top" },
    { name: "Side View", angle: "side" },
    { name: "Front View", angle: "front" },
  ]

  for (const view of views) {
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) continue

      // Set high resolution
      const scale = 2
      canvas.width = 800 * scale
      canvas.height = 600 * scale
      ctx.scale(scale, scale)

      // Clear background
      ctx.fillStyle = "#1a1a1a"
      ctx.fillRect(0, 0, 800, 600)

      // Calculate dimensions and scale
      let truckWidth, truckHeight
      switch (view.angle) {
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
        default:
          continue
      }

      const padding = 50
      const availableWidth = 800 - padding * 2
      const availableHeight = 600 - padding * 2
      const scaleX = availableWidth / truckWidth
      const scaleY = availableHeight / truckHeight
      const drawScale = Math.min(scaleX, scaleY)

      const offsetX = 400
      const offsetY = 300

      // Draw temperature zones (background)
      ctx.globalAlpha = 0.15

      // Frozen zone (cyan)
      ctx.fillStyle = "#00bcd4"
      if (view.angle === "top") {
        const zoneWidth = truckDimensions.width * drawScale
        const zoneHeight = 4 * drawScale
        ctx.fillRect(
          offsetX - zoneWidth / 2,
          offsetY + (truckDimensions.length * drawScale) / 2 - zoneHeight,
          zoneWidth,
          zoneHeight,
        )
      }

      // Cold zone (blue)
      ctx.fillStyle = "#2196f3"
      if (view.angle === "top") {
        const zoneWidth = truckDimensions.width * drawScale
        const zoneHeight = 8 * drawScale
        ctx.fillRect(offsetX - zoneWidth / 2, offsetY - zoneHeight / 2, zoneWidth, zoneHeight)
      }

      ctx.globalAlpha = 1

      // Draw truck outline
      ctx.strokeStyle = "#555555"
      ctx.lineWidth = 2
      ctx.strokeRect(
        offsetX - (truckWidth * drawScale) / 2,
        offsetY - (truckHeight * drawScale) / 2,
        truckWidth * drawScale,
        truckHeight * drawScale,
      )

      // Draw grid
      ctx.strokeStyle = "#333333"
      ctx.lineWidth = 0.5
      ctx.globalAlpha = 0.5

      const gridSize = 1 * drawScale
      const gridStartX = offsetX - (truckWidth * drawScale) / 2
      const gridStartY = offsetY - (truckHeight * drawScale) / 2
      const gridEndX = offsetX + (truckWidth * drawScale) / 2
      const gridEndY = offsetY + (truckHeight * drawScale) / 2

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

        switch (view.angle) {
          case "top":
            x = offsetX + (box.position.x - box.width / 2) * drawScale
            y = offsetY + (box.position.z - box.length / 2) * drawScale
            width = box.width * drawScale
            height = box.length * drawScale
            break
          case "side":
            x = offsetX + (box.position.z - box.length / 2) * drawScale
            y = offsetY - (box.position.y + box.height / 2) * drawScale
            width = box.length * drawScale
            height = box.height * drawScale
            break
          case "front":
            x = offsetX + (box.position.x - box.width / 2) * drawScale
            y = offsetY - (box.position.y + box.height / 2) * drawScale
            width = box.width * drawScale
            height = box.height * drawScale
            break
          default:
            return
        }

        // Box fill color
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

        ctx.globalAlpha = box.isFragile ? 0.7 : 1.0
        ctx.fillRect(x, y, width, height)
        ctx.globalAlpha = 1.0

        // Box outline
        ctx.strokeStyle = box.isFragile ? "#ff9800" : "#333333"
        ctx.lineWidth = box.isFragile ? 2 : 1
        ctx.strokeRect(x, y, width, height)

        // Box labels
        if (width > 30 && height > 20) {
          ctx.fillStyle = "white"
          ctx.font = "10px Arial"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"

          const label = box.name.length > 12 ? box.name.substring(0, 12) + "..." : box.name
          ctx.fillText(label, x + width / 2, y + height / 2 - 5)

          ctx.font = "8px Arial"
          ctx.fillStyle = "#aaa"
          ctx.fillText(`${box.weight}lbs`, x + width / 2, y + height / 2 + 5)
        }

        // Loading sequence number
        if (width > 20 && height > 20) {
          ctx.fillStyle = "#00ff88"
          ctx.font = "bold 12px Arial"
          ctx.textAlign = "center"
          ctx.fillText((index + 1).toString(), x + 10, y + 15)
        }
      })

      // Draw title
      ctx.fillStyle = "white"
      ctx.font = "16px Arial"
      ctx.textAlign = "left"
      ctx.fillText(`${view.name} - Truck Loading Plan`, 20, 30)

      // Draw legend
      const legendY = 550
      ctx.font = "12px Arial"

      // Temperature zones legend
      ctx.fillStyle = "#00bcd4"
      ctx.fillRect(20, legendY, 15, 10)
      ctx.fillStyle = "white"
      ctx.fillText("Frozen", 40, legendY + 8)

      ctx.fillStyle = "#2196f3"
      ctx.fillRect(20, legendY + 15, 15, 10)
      ctx.fillStyle = "white"
      ctx.fillText("Cold", 40, legendY + 23)

      ctx.fillStyle = "#666666"
      ctx.fillRect(20, legendY + 30, 15, 10)
      ctx.fillStyle = "white"
      ctx.fillText("Regular", 40, legendY + 38)

      // Fragile indicator
      ctx.strokeStyle = "#ff9800"
      ctx.lineWidth = 2
      ctx.strokeRect(120, legendY, 15, 10)
      ctx.fillStyle = "white"
      ctx.fillText("Fragile", 140, legendY + 8)

      // Convert to data URL
      const dataUrl = canvas.toDataURL("image/png", 1.0)
      images.push({
        name: view.name.replace(" ", "-").toLowerCase(),
        dataUrl,
        width: 800,
        height: 600,
      })
    } catch (error) {
      console.error(`Error generating ${view.name}:`, error)
    }
  }

  return images
}
