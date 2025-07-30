// PDF Report Generation Utility
export async function generatePDFReport(reportData: any) {
  try {
    // Dynamic import to avoid SSR issues
    const jsPDF = (await import("jspdf")).default
    const html2canvas = (await import("html2canvas")).default

    const doc = new jsPDF("p", "mm", "a4")
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 20

    // Title Page
    doc.setFontSize(24)
    doc.setTextColor(0, 188, 212) // Cyan color
    doc.text("Walmart 3D Truck-Loading Report", pageWidth / 2, yPosition, { align: "center" })

    yPosition += 15
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date(reportData.timestamp).toLocaleString()}`, pageWidth / 2, yPosition, {
      align: "center",
    })

    yPosition += 10
    doc.text(`Workspace: ${reportData.workspace?.name || "Unnamed"}`, pageWidth / 2, yPosition, { align: "center" })

    // Executive Summary
    yPosition += 20
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text("Executive Summary", 20, yPosition)

    yPosition += 10
    doc.setFontSize(10)
    const summaryData = [
      [`Total Boxes`, `${reportData.loadingPlan.totalBoxes}`],
      [`Total Weight`, `${reportData.loadingPlan.totalWeight} lbs`],
      [`Volume Utilization`, `${reportData.loadingPlan.volumeUtilization}%`],
      [`Weight Utilization`, `${reportData.loadingPlan.weightUtilization}%`],
      [`Stability Score`, `${reportData.scores.stability.toFixed(1)}%`],
      [`Safety Score`, `${reportData.scores.safety.toFixed(1)}%`],
      [`Optimization Score`, `${reportData.scores.optimization.toFixed(1)}%`],
    ]

    summaryData.forEach(([label, value]) => {
      doc.text(`${label}:`, 25, yPosition)
      doc.text(value, 80, yPosition)
      yPosition += 6
    })

    // Truck Specifications
    yPosition += 15
    doc.setFontSize(16)
    doc.text("Truck Specifications", 20, yPosition)

    yPosition += 10
    doc.setFontSize(10)
    const truckData = [
      [`Type`, reportData.truckInfo.type],
      [
        `Dimensions`,
        `${reportData.truckInfo.dimensions.width}' × ${reportData.truckInfo.dimensions.length}' × ${reportData.truckInfo.dimensions.height}'`,
      ],
      [`Max Weight`, `${reportData.truckInfo.maxWeight} lbs`],
      [`Max Volume`, `${reportData.truckInfo.maxVolume.toFixed(1)} ft³`],
    ]

    truckData.forEach(([label, value]) => {
      doc.text(`${label}:`, 25, yPosition)
      doc.text(value, 80, yPosition)
      yPosition += 6
    })

    // Temperature Zones
    yPosition += 15
    doc.setFontSize(16)
    doc.text("Temperature Zone Distribution", 20, yPosition)

    yPosition += 10
    doc.setFontSize(10)
    const tempData = [
      [`Regular Temperature`, `${reportData.temperatureZones.regular} boxes`],
      [`Cold Storage`, `${reportData.temperatureZones.cold} boxes`],
      [`Frozen Storage`, `${reportData.temperatureZones.frozen} boxes`],
    ]

    tempData.forEach(([label, value]) => {
      doc.text(`${label}:`, 25, yPosition)
      doc.text(value, 80, yPosition)
      yPosition += 6
    })

    // Safety Checklist
    doc.addPage()
    yPosition = 20
    doc.setFontSize(16)
    doc.text("Safety Compliance Checklist", 20, yPosition)

    yPosition += 15
    doc.setFontSize(10)
    reportData.safetyChecklist.forEach((item: any) => {
      doc.text(`${item.status} ${item.item}`, 25, yPosition)
      yPosition += 5
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`   ${item.details}`, 25, yPosition)
      yPosition += 8
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
    })

    // Box Inventory
    doc.addPage()
    yPosition = 20
    doc.setFontSize(16)
    doc.text("Box Inventory & Placement", 20, yPosition)

    yPosition += 15
    doc.setFontSize(8)

    // Table headers
    const headers = ["#", "Name", "Dimensions", "Weight", "Position", "Zone", "Fragile", "Destination"]
    const colWidths = [10, 35, 25, 15, 35, 15, 15, 20]
    let xPos = 20

    headers.forEach((header, index) => {
      doc.text(header, xPos, yPosition)
      xPos += colWidths[index]
    })

    yPosition += 8
    doc.line(20, yPosition - 2, pageWidth - 20, yPosition - 2)

    // Table data
    reportData.boxes.forEach((box: any, index: number) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage()
        yPosition = 20
      }

      xPos = 20
      const rowData = [
        box.sequenceNumber.toString(),
        box.name.substring(0, 20),
        box.dimensions,
        box.weight,
        box.position,
        box.temperatureZone,
        box.isFragile,
        box.destination,
      ]

      rowData.forEach((data, colIndex) => {
        doc.text(data, xPos, yPosition)
        xPos += colWidths[colIndex]
      })

      yPosition += 6
    })

    // Add 2D Images if available
    if (reportData.images && reportData.images.length > 0) {
      doc.addPage()
      yPosition = 20
      doc.setFontSize(16)
      doc.text("Loading Plan Visualizations", 20, yPosition)

      yPosition += 15

      for (const image of reportData.images) {
        if (yPosition > pageHeight - 80) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(12)
        doc.text(image.name, 20, yPosition)
        yPosition += 10

        try {
          // Add image to PDF
          const imgWidth = 170
          const imgHeight = 100
          doc.addImage(image.dataUrl, "PNG", 20, yPosition, imgWidth, imgHeight)
          yPosition += imgHeight + 15
        } catch (error) {
          console.error("Error adding image to PDF:", error)
          doc.text("Image could not be loaded", 20, yPosition)
          yPosition += 10
        }
      }
    }

    // Loading Instructions
    doc.addPage()
    yPosition = 20
    doc.setFontSize(16)
    doc.text("Loading Sequence Instructions", 20, yPosition)

    yPosition += 15
    doc.setFontSize(10)
    doc.text("Follow this sequence for optimal loading:", 20, yPosition)

    yPosition += 10
    reportData.loadingPlan.sequence.forEach((boxId: string, index: number) => {
      const box = reportData.boxes.find((b: any) => b.id === boxId)
      if (box) {
        doc.text(`${index + 1}. Load ${box.name} (${box.weight}) - ${box.destination}`, 25, yPosition)
        yPosition += 6
        if (box.isFragile === "YES") {
          doc.setTextColor(255, 100, 100)
          doc.text("   ⚠ FRAGILE - Handle with care", 30, yPosition)
          doc.setTextColor(0, 0, 0)
          yPosition += 6
        }
      }
    })

    // Footer
    const totalPages = doc.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10)
      doc.text("Walmart 3D Truck-Loading Optimizer", 20, pageHeight - 10)
    }

    // Save the PDF
    doc.save(`walmart-loading-report-${Date.now()}.pdf`)
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw new Error("Failed to generate PDF report")
  }
}
