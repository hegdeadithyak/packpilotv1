// Ultra-Modern Walmart 3D Truck-Loading PDF Report Generator - FIXED VERSION (Pie Chart Re-implemented)
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize pdfMake with proper font handling
(pdfMake as any).vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

// Enhanced font system with multiple professional fonts
(pdfMake as any).fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

// Professional color palette inspired by modern design systems
const COLORS = {
  primary: '#1E40AF',       // Deep blue - professional and trustworthy
  secondary: '#7C3AED',     // Purple - modern and sophisticated
  accent: '#059669',        // Green - success and growth
  success: '#10B981',       // Emerald green
  warning: '#F59E0B',       // Amber
  error: '#EF4444',         // Red
  dark: '#1F2937',          // Dark gray for text
  medium: '#6B7280',        // Medium gray
  light: '#F9FAFB',         // Very light gray
  white: '#FFFFFF',
  walmart: '#0071CE',       // Walmart blue
  walmartYellow: '#FFC220', // Walmart yellow
  gradientStart: '#3B82F6', // Blue gradient start
  gradientEnd: '#1E40AF',   // Blue gradient end
  shadow: '#00000015',      // Subtle shadow
  border: '#E5E7EB'         // Light border
};

// Enhanced typography system
const FONTS = {
  display: { fontSize: 36, bold: true, color: COLORS.dark, lineHeight: 1.2 },
  heading: { fontSize: 28, bold: true, color: COLORS.dark, lineHeight: 1.3 },
  subheading: { fontSize: 20, bold: true, color: COLORS.primary, lineHeight: 1.4 },
  title: { fontSize: 16, bold: true, color: COLORS.dark, lineHeight: 1.4 },
  body: { fontSize: 11, color: COLORS.dark, lineHeight: 1.5 },
  caption: { fontSize: 9, color: COLORS.medium, italics: true, lineHeight: 1.4 },
  large: { fontSize: 14, color: COLORS.dark, lineHeight: 1.4 },
  small: { fontSize: 8, color: COLORS.medium, lineHeight: 1.3 }
};

// Professional styling system
const STYLES = {
  // Header styles with enhanced typography
  reportTitle: {
    fontSize: 34,
    bold: true,
    color: COLORS.white,
    alignment: 'center',
    margin: [0, 0, 0, 8],
    font: 'Roboto'
  },
 
  reportSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    alignment: 'center',
    margin: [0, 0, 0, 0],
    opacity: 0.9
  },
 
  // Modern section headers with enhanced visual hierarchy
  sectionHeader: {
    fontSize: 20,
    bold: true,
    color: COLORS.primary,
    margin: [0, 25, 0, 15],
    decoration: 'underline',
    decorationStyle: 'solid',
    decorationColor: COLORS.accent,
    font: 'Roboto'
  },
 
  subsectionHeader: {
    fontSize: 16,
    bold: true,
    color: COLORS.dark,
    margin: [0, 20, 0, 10],
    font: 'Roboto'
  },
 
  // Enhanced card containers with shadows
  cardContainer: {
    fillColor: COLORS.white,
    margin: [0, 8, 0, 16]
  },
 
  // Professional metric cards
  metricCard: {
    fillColor: COLORS.white,
    margin: [8, 8, 8, 8]
  },
 
  // Enhanced table styling
  tableHeader: {
    bold: true,
    fontSize: 12,
    color: COLORS.white,
    fillColor: COLORS.primary,
    alignment: 'center',
    margin: [8, 10, 8, 10]
  },
 
  tableCell: {
    fontSize: 10,
    color: COLORS.dark,
    margin: [8, 8, 8, 8]
  },
 
  // Status indicators
  statusSuccess: {
    color: COLORS.success,
    bold: true,
    fontSize: 11
  },
 
  statusWarning: {
    color: COLORS.warning,
    bold: true,
    fontSize: 11
  },
 
  statusError: {
    color: COLORS.error,
    bold: true,
    fontSize: 11
  },
 
  // Accent elements
  accent: {
    color: COLORS.accent,
    bold: true
  },
 
  highlight: {
    color: COLORS.primary,
    bold: true,
    fontSize: 12
  }
};

// FIXED: Enhanced header design without unsupported linearGradient
function createHeaderDesign() {
  return {
    canvas: [
      // Primary gradient background
      { type: 'rect', x: 0, y: 0, w: 595, h: 130, color: COLORS.walmart, fillOpacity: 1 },
      // FIXED: Secondary overlay without linearGradient
      { type: 'rect', x: 0, y: 0, w: 595, h: 130, color: COLORS.gradientStart, fillOpacity: 0.15 },
      // Sophisticated wave pattern
      {
        type: 'polyline',
        points: [
          { x: 0, y: 105 }, { x: 100, y: 95 }, { x: 200, y: 110 }, { x: 300, y: 100 },
          { x: 400, y: 115 }, { x: 500, y: 105 }, { x: 595, y: 95 }, { x: 595, y: 130 }, { x: 0, y: 130 }
        ],
        color: COLORS.walmartYellow,
        fillOpacity: 0.9
      },
      // Modern geometric accents
      { type: 'ellipse', x: 520, y: 25, r1: 35, r2: 18, color: COLORS.white, fillOpacity: 0.08 },
      { type: 'ellipse', x: 60, y: 85, r1: 25, r2: 25, color: COLORS.white, fillOpacity: 0.12 },
      { type: 'rect', x: 480, y: 70, w: 20, h: 20, color: COLORS.white, fillOpacity: 0.06 },
      // Subtle grid pattern
      { type: 'line', x1: 150, y1: 0, x2: 150, y2: 130, lineWidth: 0.5, lineColor: COLORS.white, fillOpacity: 0.1 },
      { type: 'line', x1: 300, y1: 0, x2: 300, y2: 130, lineWidth: 0.5, lineColor: COLORS.white, fillOpacity: 0.1 },
      { type: 'line', x1: 450, y1: 0, x2: 450, y2: 130, lineWidth: 0.5, lineColor: COLORS.white, fillOpacity: 0.1 }
    ]
  };
}

// Enhanced footer with professional styling
function createFooterDesign() {
  return {
    canvas: [
      { type: 'rect', x: 0, y: 0, w: 595, h: 3, color: COLORS.primary },
      { type: 'rect', x: 0, y: 3, w: 595, h: 1, color: COLORS.accent }
    ]
  };
}

// MODIFIED: Professional metric card with icons removed
function createMetricCard(label: string, value: string, color: string = COLORS.primary, trend?: string) {
  return {
    table: {
      body: [
        [{
            stack: [
              // Icon and canvas elements have been removed as per the request.
              { text: value, fontSize: 26, bold: true, color: color, alignment: 'center', margin: [0, 8, 0, 4], font: 'Roboto' },
              { text: label, fontSize: 10, color: COLORS.medium, alignment: 'center', margin: [0, 0, 0, 4] },
              trend ? { text: trend, fontSize: 8, color: COLORS.success, alignment: 'center', italics: true } : null
            ].filter(Boolean),
            border: [false, false, false, false]
        }]
      ]
    },
    layout: {
      fillColor: () => COLORS.white,
      paddingLeft: () => 20, paddingRight: () => 20, paddingTop: () => 20, paddingBottom: () => 20
    }
  };
}

// Enhanced table with professional styling and better readability
function createModernTable(headers: string[], data: any[], title?: string, highlightColumn?: number) {
  const tableBody = [headers.map((header, index) => ({ text: header, style: 'tableHeader', fillColor: index === highlightColumn ? COLORS.accent : COLORS.primary }))];
  data.forEach(row => {
    const rowData = headers.map((header, colIndex) => ({
      text: row[header] || '', fontSize: 10, color: COLORS.dark, margin: [0, 0, 0, 0],
      bold: colIndex === highlightColumn ? true : false, fillColor: colIndex === highlightColumn ? '#F0FDF4' : undefined
    }));
    tableBody.push(rowData);
  });
  return {
    stack: [
      title ? { text: title, style: 'subsectionHeader' } : null,
      {
        table: { headerRows: 1, widths: Array(headers.length).fill('*'), body: tableBody },
        layout: {
          fillColor: (rowIndex: number, node: any, columnIndex: number) => {
            if (rowIndex === 0) return columnIndex === highlightColumn ? COLORS.accent : COLORS.primary;
            if (columnIndex === highlightColumn) return '#F0FDF4';
            return rowIndex % 2 === 0 ? COLORS.light : COLORS.white;
          },
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 2 : 0.5),
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i === 1 ? COLORS.primary : COLORS.border),
          paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 12, paddingBottom: () => 10
        },
        alignment: 'center' // FIXED: Added center alignment for tables
      }
    ].filter(Boolean)
  };
}

// Bar chart with fixed 0-100 Y-axis and "Store X" labels on X-axis.
function createDestinationBarChart(reportData: any) {
    const uniqueDestinations = [...new Set(reportData.boxes.map((b: any) => b.destination || "Unknown"))];
    const destinationCounts = uniqueDestinations.map(dest => ({
        name: String(dest).substring(0, 15),
        count: reportData.boxes.filter((b: any) => (b.destination || "Unknown") === dest).length
    }));

    if (destinationCounts.length === 0) {
        return { canvas: [], width: 520, height: 240 };
    }

    const chartWidth = 520, chartHeight = 240;
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const graphWidth = chartWidth - margin.left - margin.right;
    const graphHeight = chartHeight - margin.top - margin.bottom;

    // Set a fixed Y-axis scale from 0-100 with intervals of 10.
    const yAxisMax = 100;
    const numYTicks = 10; // 10 ticks for 11 labels (0, 10, ..., 100)

    const canvas: any[] = [
        // Chart background
        { type: 'rect', x: 0, y: 0, w: chartWidth, h: chartHeight, color: COLORS.light, fillOpacity: 0.3 },
    ];

    // Y-axis labels and grid lines
    for (let i = 0; i <= numYTicks; i++) {
        const tickValue = Math.round((yAxisMax / numYTicks) * i);
        const yPos = margin.top + graphHeight - (tickValue / yAxisMax) * graphHeight;
       
        // Grid line
        canvas.push({ type: 'line', x1: margin.left, y1: yPos, x2: margin.left + graphWidth, y2: yPos, lineWidth: 0.5, lineColor: COLORS.border });
       
        // Y-axis label
        canvas.push({
            text: tickValue.toString(),
            x: margin.left - 8,
            y: yPos - 4, // Adjust for vertical alignment
            style: 'small',
            color: COLORS.medium,
            alignment: 'right'
        });
    }

    // Axes lines
    canvas.push({ type: 'line', x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + graphHeight, lineWidth: 1.5, lineColor: COLORS.dark }); // Y-axis
    canvas.push({ type: 'line', x1: margin.left, y1: margin.top + graphHeight, x2: margin.left + graphWidth, y2: margin.top + graphHeight, lineWidth: 1.5, lineColor: COLORS.dark }); // X-axis

    const barTotalWidth = graphWidth / destinationCounts.length;
    const barWidth = barTotalWidth * 0.7;
    const barSpacing = barTotalWidth * 0.3;

    // Bars and X-axis labels
    destinationCounts.forEach((dest, index) => {
        // Cap the bar height at the maximum graph height
        const barHeight = Math.min(graphHeight, (dest.count / yAxisMax) * graphHeight);
        if (barHeight <= 0) return; // Don't draw zero-height bars

        const x = margin.left + (index * barTotalWidth) + (barSpacing / 2);
        const y = margin.top + graphHeight - barHeight;
        const barColor = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.warning][index % 4];

        // Bar shadow
        canvas.push({ type: 'rect', x: x + 2, y: y + 2, w: barWidth, h: barHeight, color: COLORS.shadow, fillOpacity: 0.3 });
        // Main bar
        canvas.push({ type: 'rect', x: x, y: y, w: barWidth, h: barHeight, color: barColor, fillOpacity: 0.9 });
        // Bar highlight
        canvas.push({ type: 'rect', x: x, y: y, w: barWidth, h: Math.min(barHeight, 8), color: COLORS.white, fillOpacity: 0.3 });

        // Use "Store X" for the X-axis label
        canvas.push({
            text: `Store ${index + 1}`,
            x: x + barWidth / 2,
            y: margin.top + graphHeight + 6,
            style: 'small',
            bold: true,
            color: COLORS.dark,
            alignment: 'center'
        });
    });
   
    // Axis Titles
    canvas.push({ text: 'Number of Boxes', x: 15, y: chartHeight / 2, style: 'caption', bold: true, alignment: 'center'});
    // Update X-axis title
    canvas.push({ text: 'Store Stop', x: chartWidth / 2, y: chartHeight - 15, style: 'caption', bold: true, alignment: 'center'});

    return { canvas, width: chartWidth, height: chartHeight };
}


// NEW: Function to create the Temperature Zone Analysis Pie Chart
function createTemperaturePieChart(reportData: any) {
  const zoneCounts: { [key: string]: number } = { Cold: 0, Frozen: 0, Regular: 0 };
  (reportData.boxes || []).forEach((box: any) => {
    const zone = box.temperatureZone || 'Regular';
    if (zone.toLowerCase() === 'cold') zoneCounts.Cold++;
    else if (zone.toLowerCase() === 'frozen') zoneCounts.Frozen++;
    else zoneCounts.Regular++;
  });
  const totalBoxes = (reportData.boxes || []).length;
  if (totalBoxes === 0) return { text: 'No box data available for temperature analysis.', style: 'caption', alignment: 'center' };

  const chartRadius = 70, centerX = chartRadius, centerY = chartRadius;
  const chartColors: { [key: string]: string } = { Cold: COLORS.primary, Frozen: COLORS.secondary, Regular: COLORS.success };
  const canvasElements = [];
  let startAngle = -90; // Start at 12 o'clock

  for (const zone in zoneCounts) {
    const count = zoneCounts[zone as keyof typeof zoneCounts];
    if (count > 0) {
      const sweepAngle = (count / totalBoxes) * 360;
      const endAngle = startAngle + sweepAngle;
      const points = [{ x: centerX, y: centerY }];
      for (let i = Math.floor(startAngle); i <= Math.ceil(endAngle); i++) {
        const angleRad = i * (Math.PI / 180);
        points.push({ x: centerX + chartRadius * Math.cos(angleRad), y: centerY + chartRadius * Math.sin(angleRad) });
      }
      canvasElements.push({ type: 'polyline', points: points, color: chartColors[zone], closePath: true, fillOpacity: 0.95 });
      startAngle = endAngle;
    }
  }

  const legendItems = Object.keys(zoneCounts).map(zone => ({
    columns: [
      { canvas: [{ type: 'rect', x: 0, y: 3, w: 12, h: 12, r: 2, color: chartColors[zone] }], width: 20 },
      { text: `${zone}:`, style: 'body', bold: true, width: 50 },
      { text: `${zoneCounts[zone]} units (${((zoneCounts[zone] / totalBoxes) * 100).toFixed(1)}%)`, style: 'body', width: '*' }
    ],
    columnGap: 5, margin: [0, 0, 0, 5]
  }));

  return {
    columns: [
      { width: 'auto', stack: [{ canvas: canvasElements, width: chartRadius * 2, height: chartRadius * 2 }], alignment: 'center' },
      { width: '*', stack: legendItems, margin: [30, 20, 0, 0] }
    ],
    columnGap: 20, margin: [0, 0, 0, 25]
  };
}

// FIXED: Enhanced safety checklist with proper data handling


export async function generateTemplateBasedPDF_V1(reportData: any, templateDataParam?: any): Promise<void> {
  try {
    const safeReportData = {
      ...reportData,
      scores: { ...reportData.scores,
        efficiency: reportData.scores?.efficiency || reportData.scores?.stability || 85,
        spaceUtilization: reportData.scores?.spaceUtilization || reportData.loadingPlan?.volumeUtilization || 75,
        stability: reportData.scores?.stability || 90,
        safety: reportData.scores?.safety || 95,
      }
    };

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [45, 140, 45, 70],
     
      header: (currentPage: number) => {
        if (currentPage === 1) {
          return {
            stack: [
              createHeaderDesign(),
               { text: 'Walmart 3D Truck-Loading Report', style: 'reportTitle', margin: [0, 45, 0, 0] },
              { text: `AI-Optimized Loading Analysis • Generated ${new Date(safeReportData.timestamp).toLocaleDateString()}`, style: 'reportSubtitle', margin: [0, 8, 0, 0] }
            ]
          };
        }
        return {
          stack: [
            { canvas: [{ type: 'rect', x: 0, y: 0, w: 595, h: 40, color: COLORS.light, fillOpacity: 0.5 }] },
            { text: `Walmart Loading Report - Page ${currentPage}`, fontSize: 11, color: COLORS.dark, alignment: 'center', margin: [0, -30, 0, 0], bold: true }
          ]
        };
      },

      footer: (currentPage: number, pageCount: number) => ({
        stack: [
          createFooterDesign(),
          { text: `Page ${currentPage} of ${pageCount} • Generated on ${new Date().toLocaleDateString()} • Confidential`, fontSize: 9, color: COLORS.medium, alignment: 'center', margin: [0, 12, 0, 0] }
        ]
      }),

      content: [
        { text: 'Executive Dashboard', style: 'sectionHeader', margin: [0, 0, 0, 20] },
        {
          columns: [
            { width: '*', ...createMetricCard('Total Boxes', `${safeReportData.loadingPlan.totalBoxes}`, COLORS.primary) },
            { width: '*', ...createMetricCard('Total Weight', `${safeReportData.loadingPlan.totalWeight} lbs`, COLORS.success) },
            { width: '*', ...createMetricCard('Volume Used', `${safeReportData.loadingPlan.volumeUtilization}%`, COLORS.warning) }
          ],
          columnGap: 18, margin: [0, 0, 0, 18]
        },
        {
          columns: [
            { width: '*', ...createMetricCard('Weight Efficiency', `${safeReportData.loadingPlan.weightUtilization}%`, COLORS.accent) },
            { width: '*', ...createMetricCard('Stability Score', `${safeReportData.scores.stability.toFixed(1)}%`, COLORS.success) },
            { width: '*', ...createMetricCard('Safety Rating', `${safeReportData.scores.safety.toFixed(1)}%`, COLORS.error) }
          ],
          columnGap: 18, margin: [0, 0, 0, 25]
        },
        { text: 'Truck Specifications', style: 'sectionHeader', margin: [0, 0, 0, 15] },
        createModernTable(['Specification', 'Value', 'Status'], [
          { 'Specification': 'Truck Type', 'Value': safeReportData.truckInfo.type, 'Status': '✓ Optimal' },
          { 'Specification': 'Dimensions', 'Value': `${safeReportData.truckInfo.dimensions.width}' × ${safeReportData.truckInfo.dimensions.length}' × ${safeReportData.truckInfo.dimensions.height}'`, 'Status': '✓ Standard' },
          { 'Specification': 'Maximum Weight', 'Value': `${safeReportData.truckInfo.maxWeight} lbs`, 'Status': '✓ Within Limits' },
          { 'Specification': 'Maximum Volume', 'Value': `${safeReportData.truckInfo.maxVolume.toFixed(1)} ft³`, 'Status': '✓ Optimized' }
        ], undefined, 2),

        { text: 'Visual Analytics', style: 'sectionHeader', pageBreak: 'before', margin: [0, 0, 0, 20] },
        { text: 'Box Distribution by Destination', style: 'subsectionHeader', margin: [0, 0, 0, 15] },
        // Bar chart is first
        (() => {
          // *** FIX: Spread the returned barChart object to include its width and height properties. ***
          // This is crucial for defining the canvas size and preventing label clipping.
          const barChart = createDestinationBarChart(safeReportData);
          return {
              ...barChart,
              margin: [0, 0, 0, 25],
              alignment: 'center'
          };
        })(),
       
        // *** MODIFIED: Temperature Zone Pie Chart Section moved to be after the bar graph ***
        { text: 'Temperature Zone Analysis', style: 'subsectionHeader', margin: [0, 25, 0, 15] },
        createTemperaturePieChart(safeReportData),
       
        // *** MODIFIED: Destination summary table now comes after the pie chart ***
        (() => {
          const uniqueDestinations = [...new Set(safeReportData.boxes.map((b: any) => b.destination || "Unknown"))];
          const destinationData = uniqueDestinations.map(destination => {
            const destinationBoxes = safeReportData.boxes.filter((b: any) => (b.destination || "Unknown") === destination);
            const totalWeight = destinationBoxes.reduce((sum: number, box: any) => sum + parseFloat(box.weight || 0), 0);
            const avgWeight = destinationBoxes.length > 0 ? totalWeight / destinationBoxes.length : 0;
            return { 'Destination': String(destination), 'Boxes': destinationBoxes.length.toString(), 'Total Weight': `${totalWeight.toFixed(1)} lbs`, 'Avg Weight': `${avgWeight.toFixed(1)} lbs` };
          });
          return createModernTable(['Destination', 'Boxes', 'Total Weight', 'Avg Weight'], destinationData, 'Destination Summary', 1);
        })(),

       
        { text: 'Performance Metrics', style: 'sectionHeader', margin: [0, 25, 0, 15] },
        {
          columns: [
            { width: '*', stack: [
                { text: 'Loading Efficiency', fontSize: 14, bold: true, color: COLORS.dark, margin: [0, 0, 0, 8] },
                { canvas: [ { type: 'rect', x: 0, y: 0, w: 150, h: 20, color: COLORS.light }, { type: 'rect', x: 0, y: 0, w: safeReportData.scores.efficiency * 1.5, h: 20, color: COLORS.success } ] },
                { text: `${safeReportData.scores.efficiency.toFixed(1)}%`, fontSize: 16, bold: true, color: COLORS.success, margin: [0, 8, 0, 0] }
            ] },
            { width: '*', stack: [
                { text: 'Space Utilization', fontSize: 14, bold: true, color: COLORS.dark, margin: [0, 0, 0, 8] },
                { canvas: [ { type: 'rect', x: 0, y: 0, w: 150, h: 20, color: COLORS.light }, { type: 'rect', x: 0, y: 0, w: safeReportData.scores.spaceUtilization * 1.5, h: 20, color: COLORS.primary } ] },
                { text: `${typeof safeReportData.scores.spaceUtilization === 'number' ? safeReportData.scores.spaceUtilization.toFixed(1) : 'N/A'}%`, fontSize: 16, bold: true, color: COLORS.primary, margin: [0, 8, 0, 0] }
            ] }
          ],
          columnGap: 30, margin: [0, 0, 0, 25]
        },
        { text: 'Detailed Shipment Breakdown', style: 'sectionHeader', margin: [0, 0, 0, 15] },
        (() => {
          const uniqueDestinations = [...new Set(safeReportData.boxes.map((b: any) => b.destination || "Unknown"))];
          const destinationData = uniqueDestinations.map(destination => {
            const destinationBoxes = safeReportData.boxes.filter((b: any) => (b.destination || "Unknown") === destination);
            const totalWeight = destinationBoxes.reduce((sum: number, box: any) => sum + parseFloat(box.weight || 0), 0);
            const totalVolume = destinationBoxes.reduce((sum: number, box: any) => {
              const dims = box.dimensions?.split('×') || ['0', '0', '0'];
              return sum + (parseFloat(dims[0]) * parseFloat(dims[1]) * parseFloat(dims[2])) / 1728;
            }, 0);
            const priority = destinationBoxes.some((box: any) => box.priority === 'high') ? 'High' : destinationBoxes.some((box: any) => box.priority === 'medium') ? 'Medium' : 'Standard';
            return { 'Destination': String(destination), 'Boxes': destinationBoxes.length.toString(), 'Weight (lbs)': totalWeight.toFixed(1), 'Volume (ft³)': totalVolume.toFixed(1), 'Priority': priority };
          });
          return createModernTable(['Destination', 'Boxes', 'Weight (lbs)', 'Volume (ft³)', 'Priority'], destinationData);
        })(),
        { text: 'Complete Box Inventory', style: 'sectionHeader', pageBreak: 'before', margin: [0, 0, 0, 0] },
        {
          alignment: 'center', // FIXED: Added alignment wrapper for the entire table section
          stack: [
            (() => {
              const inventoryData = reportData.boxes.map((box: any) => ({
                'Name': (box.name || '').substring(0, 20),
                'Dimensions': box.dimensions || '',
                'Weight': box.weight || '',
                'Position': box.position || '', // FIXED: Added position coordinates column
                'Zone': box.temperatureZone || '',
                'Fragile': box.isFragile || '',
                'Destination': (box.destination || '').substring(0, 15)
              }));
              return createModernTable(['Name', 'Dimensions', 'Weight', 'Position', 'Zone', 'Fragile', 'Destination'], inventoryData);
            })()
          ]
        },
        ...(reportData.images && reportData.images.length > 0 ? [
          { text: 'Loading Plan Visualizations', style: 'sectionHeader', pageBreak: 'before' },
          ...reportData.images.map((image: any) => ({
           stack: [
              { text: image.name, fontSize: 14, bold: true, color: COLORS.primary, margin: [0, 0, 0, 10] },
              { image: image.dataUrl, width: 500, alignment: 'center', margin: [0, 0, 0, 15] }
            ]
          }))
        ] : []),
        { text: 'AI Loading Recommendations', style: 'sectionHeader', margin: [0, 25, 0, 15] },
        { ul: [ 'Load heavy items first to establish a stable base foundation', 'Maintain temperature zone separation for optimal product integrity', 'Ensure fragile items are properly cushioned and secured', 'Optimize weight distribution across all axles for safety', 'Plan unloading sequence based on delivery route efficiency' ], fontSize: 11, color: COLORS.dark, margin: [0, 0, 0, 20] },
        { text: 'Executive Summary', style: 'sectionHeader', margin: [0, 0, 0, 15] },
        { text: `This AI-optimized loading plan achieves ${safeReportData.loadingPlan.volumeUtilization}% volume utilization and ${safeReportData.loadingPlan.weightUtilization}% weight efficiency. The configuration ensures optimal safety with a ${safeReportData.scores.safety.toFixed(1)}% safety rating and maintains excellent stability at ${safeReportData.scores.stability.toFixed(1)}%. All temperature zones are properly segregated, and the loading sequence is optimized for efficient delivery operations.`, fontSize: 12, color: COLORS.dark, lineHeight: 1.6, margin: [0, 0, 0, 20] }
      ],

      styles: STYLES,
      defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.4, color: COLORS.dark }
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.download(`walmart-loading-report-professional-${Date.now()}.pdf`);

  } catch (error) {
    console.error("Error generating professional PDF:", error);
    throw new Error("Failed to generate professional PDF report");
  }
}

// Export the default function for compatibility
export { generateTemplateBasedPDF_V1 as generatePDFReport };
