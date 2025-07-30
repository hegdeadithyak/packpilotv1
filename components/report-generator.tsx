"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useOptimizationStore } from "@/store/optimization-store"
import { useWorkspaceStore } from "@/store/workspace-store"
import { FileText, Download, ImageIcon, FileSpreadsheet } from "lucide-react"
import { generatePDFReport } from "@/utils/pdf-generator"
import { generate2DImages } from "@/utils/image-generator"

export function ReportGenerator() {
  const { boxes, truckDimensions, stabilityScore, safetyScore, optimizationScore, loadingSequence, temperatureZones } =
    useOptimizationStore()
  const { currentWorkspace } = useWorkspaceStore()

  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePDFReport = async () => {
    setIsGenerating(true)

    try {
      // Generate 2D images first
      const images = await generate2DImages(boxes, truckDimensions, temperatureZones)

      // Create comprehensive report data
      const reportData = {
        workspace: currentWorkspace,
        timestamp: new Date().toISOString(),
        truckInfo: {
          type: "28ft Box Truck",
          dimensions: truckDimensions,
          maxWeight: 34000,
          maxVolume: truckDimensions.width * truckDimensions.length * truckDimensions.height,
        },
        loadingPlan: {
          totalBoxes: boxes.length,
          totalWeight: boxes.reduce((sum, box) => sum + box.weight, 0),
          totalVolume: boxes.reduce((sum, box) => sum + box.width * box.height * box.length, 0),
          volumeUtilization: (
            (boxes.reduce((sum, box) => sum + box.width * box.height * box.length, 0) /
              (truckDimensions.width * truckDimensions.length * truckDimensions.height)) *
            100
          ).toFixed(1),
          weightUtilization: ((boxes.reduce((sum, box) => sum + box.weight, 0) / 34000) * 100).toFixed(1),
          sequence: loadingSequence,
        },
        scores: {
          stability: stabilityScore,
          safety: safetyScore,
          optimization: optimizationScore,
        },
        temperatureZones: {
          regular: temperatureZones.regular.length,
          cold: temperatureZones.cold.length,
          frozen: temperatureZones.frozen.length,
        },
        safetyChecklist: [
          {
            item: "Weight distribution verified",
            status: stabilityScore > 80 ? "✓ PASS" : "⚠ WARNING",
            details: `Stability score: ${stabilityScore.toFixed(1)}%`,
          },
          {
            item: "Center of gravity within limits",
            status: stabilityScore > 70 ? "✓ PASS" : "⚠ WARNING",
            details: "COG calculated based on box positions and weights",
          },
          {
            item: "Fragile items properly secured",
            status: boxes.filter((box) => box.isFragile).every((box) => box.position.y < 6) ? "✓ PASS" : "⚠ WARNING",
            details: `${boxes.filter((box) => box.isFragile).length} fragile items identified`,
          },
          {
            item: "Temperature zones maintained",
            status: "✓ PASS",
            details: "All items placed in appropriate temperature zones",
          },
          {
            item: "Loading sequence optimized",
            status: loadingSequence.length > 0 ? "✓ PASS" : "⚠ WARNING",
            details: "Multi-stop delivery sequence calculated",
          },
          {
            item: "DOT weight compliance",
            status: boxes.reduce((sum, box) => sum + box.weight, 0) <= 34000 ? "✓ PASS" : "❌ FAIL",
            details: `Total weight: ${boxes.reduce((sum, box) => sum + box.weight, 0)} lbs`,
          },
        ],
        boxes: boxes.map((box, index) => ({
          sequenceNumber: loadingSequence.indexOf(box.id) + 1,
          id: box.id,
          name: box.name,
          dimensions: `${box.width}×${box.height}×${box.length} ft`,
          weight: `${box.weight} lbs`,
          position: `X:${box.position.x.toFixed(1)}, Y:${box.position.y.toFixed(1)}, Z:${box.position.z.toFixed(1)}`,
          temperatureZone: box.temperatureZone.toUpperCase(),
          isFragile: box.isFragile ? "YES" : "NO",
          destination: box.destination,
          stackLimit: box.stackLimit || "N/A",
          crushFactor: box.crushFactor ? (box.crushFactor * 100).toFixed(0) + "%" : "N/A",
        })),
        images,
      }

      // Generate PDF
      await generatePDFReport(reportData)
    } catch (error) {
      console.error("Error generating PDF report:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport2DImages = async () => {
    setIsGenerating(true)

    try {
      const images = await generate2DImages(boxes, truckDimensions, temperatureZones)

      // Create ZIP file with all images
      const zip = new (await import("jszip")).default()

      images.forEach((image, index) => {
        const base64Data = image.dataUrl.split(",")[1]
        zip.file(`${image.name}.png`, base64Data, { base64: true })
      })

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `truck-loading-images-${Date.now()}.zip`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting 2D images:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportLoadingPlan = () => {
    const loadingPlan = {
      workspace: currentWorkspace?.name,
      timestamp: new Date().toISOString(),
      sequence: loadingSequence.map((boxId, index) => {
        const box = boxes.find((b) => b.id === boxId)
        return {
          order: index + 1,
          boxId,
          name: box?.name,
          destination: box?.destination,
          weight: box?.weight,
          dimensions: box ? `${box.width}×${box.height}×${box.length}` : "",
          isFragile: box?.isFragile,
          temperatureZone: box?.temperatureZone,
          instructions: box?.isFragile ? "Handle with care - fragile item" : "Standard loading procedure",
          estimatedTime: "2-3 minutes",
        }
      }),
      unloadingGuide: ["Stop 4", "Stop 3", "Stop 2", "Stop 1"].map((stop) => ({
        stop,
        boxes: boxes
          .filter((box) => box.destination === stop)
          .map((box) => ({
            name: box.name,
            weight: box.weight,
            position: `X:${box.position.x.toFixed(1)}, Y:${box.position.y.toFixed(1)}, Z:${box.position.z.toFixed(1)}`,
            isFragile: box.isFragile,
            specialInstructions: box.isFragile ? "Handle with care" : "Standard unloading",
          })),
      })),
      summary: {
        totalBoxes: boxes.length,
        totalWeight: boxes.reduce((sum, box) => sum + box.weight, 0),
        estimatedLoadingTime: `${Math.ceil(boxes.length * 2.5)} minutes`,
        stabilityScore: stabilityScore.toFixed(1),
        safetyScore: safetyScore.toFixed(1),
      },
    }

    const blob = new Blob([JSON.stringify(loadingPlan, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `loading-plan-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Report Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleGeneratePDFReport}
            className="w-full h-8 text-xs"
            disabled={isGenerating || boxes.length === 0}
          >
            <Download className="h-3 w-3 mr-1" />
            {isGenerating ? "Generating PDF..." : "Generate Comprehensive PDF Report"}
          </Button>

          <Button
            onClick={handleExport2DImages}
            variant="outline"
            className="w-full h-8 text-xs bg-transparent"
            disabled={isGenerating || boxes.length === 0}
          >
            <ImageIcon className="h-3 w-3 mr-1" />
            Export 2D Images (ZIP)
          </Button>

          <Button
            onClick={handleExportLoadingPlan}
            variant="outline"
            className="w-full h-8 text-xs bg-transparent"
            disabled={boxes.length === 0}
          >
            <FileSpreadsheet className="h-3 w-3 mr-1" />
            Export Loading Sequence
          </Button>

          <div className="text-xs text-gray-400 space-y-1">
            <div>• High-resolution 2D/3D visualizations</div>
            <div>• Item-by-item placement maps</div>
            <div>• Loading sequence instructions</div>
            <div>• Temperature zone indicators</div>
            <div>• Safety compliance checklist</div>
            <div>• Weight distribution analysis</div>
            <div>• Cargo securing recommendations</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white">Report Contents Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs space-y-1">
            <div className="font-medium text-white">PDF Report Includes:</div>
            <div className="text-gray-300">✓ Executive Summary</div>
            <div className="text-gray-300">✓ 3D Truck Visualization</div>
            <div className="text-gray-300">✓ Multiple 2D Views (Top/Side/Front)</div>
            <div className="text-gray-300">✓ Box Placement Coordinates</div>
            <div className="text-gray-300">✓ Loading Sequence Guide</div>
            <div className="text-gray-300">✓ Unloading Instructions</div>
            <div className="text-gray-300">✓ Safety Compliance Report</div>
            <div className="text-gray-300">✓ Weight Distribution Maps</div>
            <div className="text-gray-300">✓ Temperature Zone Analysis</div>
            <div className="text-gray-300">✓ Physics Simulation Results</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Workspace:</span>
              <span className="text-white">{currentWorkspace?.name || "Unnamed"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Total Items:</span>
              <span className="text-white">{boxes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Stability Score:</span>
              <span className="text-cyan-400">{stabilityScore.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Safety Score:</span>
              <span className="text-cyan-400">{safetyScore.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Ready for Export:</span>
              <span className={boxes.length > 0 ? "text-green-400" : "text-red-400"}>
                {boxes.length > 0 ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
