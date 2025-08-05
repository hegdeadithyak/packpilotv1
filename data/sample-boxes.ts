/**
 * Enhanced Sample Data for PackPilot Demo
 * @description Realistic sample boxes representing various retail scenarios
 * @author PackPilot Team
 * @version 2.3
 */

import type { Box } from "@/types/box";

// Demo destination mapping for realistic scenarios
export const DEMO_DESTINATIONS = {
  walmart: [
    "Distribution Center A",
    "Store #4532 - Downtown",
    "Store #2901 - Mall Plaza",
    "Store #7834 - Suburban",
  ],
  electronics: [
    "Best Buy #432",
    "Apple Store - Tech District",
    "GameStop #891",
    "MicroCenter Warehouse",
  ],
  grocery: [
    "Fresh Market Hub",
    "Restaurant Supply Co",
    "Corner Mart #156",
    "Organic Foods Store",
  ],
};

const getRandomDestination = (category: keyof typeof DEMO_DESTINATIONS) => {
  const destinations = DEMO_DESTINATIONS[category];
  return destinations[Math.floor(Math.random() * destinations.length)];
};

// Enhanced sample boxes with better categorization and realistic data
export const sampleBoxes: Box[] = [
  // ═══════════════════════════════════════════════════════════════════
  // ELECTRONICS & HIGH-VALUE ITEMS (25 boxes)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "elec-001",
    name: 'Samsung 75" QLED 4K TV',
    width: 1.7,
    height: 0.35,
    length: 3.8,
    weight: 95,
    position: { x: 0, y: 0.175, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.electronics[0],
    crushFactor: 0.1,
    stackLimit: 1,
    isNew: false,
  },
  {
    id: "elec-002",
    name: "MacBook Pro 16-inch Cases (12-pack)",
    width: 1.2,
    height: 0.8,
    length: 1.5,
    weight: 28,
    position: { x: 0, y: 0.4, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.electronics[1],
    crushFactor: 0.3,
    stackLimit: 3,
    isNew: false,
  },
  {
    id: "elec-003",
    name: "Gaming Desktop Computers",
    width: 1.8,
    height: 1.2,
    length: 1.4,
    weight: 52,
    position: { x: 0, y: 0.6, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.electronics[2],
    crushFactor: 0.4,
    stackLimit: 2,
    isNew: false,
  },
  {
    id: "elec-004",
    name: "Premium Soundbars",
    width: 2.2,
    height: 0.6,
    length: 0.8,
    weight: 25,
    position: { x: 0, y: 0.3, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.electronics[0],
    crushFactor: 0.4,
    stackLimit: 4,
    isNew: false,
  },
  {
    id: "elec-005",
    name: "Professional Cameras",
    width: 1.0,
    height: 0.9,
    length: 1.3,
    weight: 15,
    position: { x: 0, y: 0.45, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.electronics[3],
    crushFactor: 0.2,
    stackLimit: 4,
    isNew: false,
  },
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `elec-${String(i + 6).padStart(3, "0")}`,
    name: `High-End Tablet (Box ${i + 1})`,
    width: 1.5 + Math.random() * 1.5,
    height: 1.0 + Math.random() * 1.0,
    length: 1.8 + Math.random() * 1.5,
    weight: 20 + Math.random() * 40,
    position: { x: 0, y: 0, z: 0 },
    temperatureZone: "regular" as "regular",
    isFragile: true,
    destination: getRandomDestination("electronics"),
    crushFactor: 0.3 + Math.random() * 0.2,
    stackLimit: 2,
    isNew: false,
  })),

  // ═══════════════════════════════════════════════════════════════════
  // COLD/REFRIGERATED - Temperature Sensitive (30 boxes)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "cold-001",
    name: "Organic Dairy Products",
    width: 1.8,
    height: 1.2,
    length: 1.8,
    weight: 42,
    position: { x: 0, y: 0.6, z: 0 },
    temperatureZone: "cold",
    isFragile: false,
    destination: DEMO_DESTINATIONS.grocery[0],
    crushFactor: 0.6,
    stackLimit: 3,
    isNew: false,
  },
  {
    id: "cold-002",
    name: "Fresh Produce - Delicate",
    width: 2.4,
    height: 1.0,
    length: 2.0,
    weight: 35,
    position: { x: 0, y: 0.5, z: 0 },
    temperatureZone: "cold",
    isFragile: true,
    destination: DEMO_DESTINATIONS.grocery[3],
    crushFactor: 0.3,
    stackLimit: 2,
    isNew: false,
  },
  {
    id: "cold-003",
    name: "Premium Deli Meats",
    width: 1.6,
    height: 0.9,
    length: 2.4,
    weight: 32,
    position: { x: 0, y: 0.45, z: 0 },
    temperatureZone: "cold",
    isFragile: false,
    destination: DEMO_DESTINATIONS.grocery[1],
    crushFactor: 0.7,
    stackLimit: 4,
    isNew: false,
  },
  {
    id: "cold-004",
    name: "Artisan Cheese Selection",
    width: 1.4,
    height: 1.1,
    length: 1.6,
    weight: 28,
    position: { x: 0, y: 0.55, z: 0 },
    temperatureZone: "cold",
    isFragile: true,
    destination: DEMO_DESTINATIONS.grocery[0],
    crushFactor: 0.4,
    stackLimit: 3,
    isNew: false,
  },
  {
    id: "cold-005",
    name: "Farm Fresh Eggs - Grade A",
    width: 1.5,
    height: 1.0,
    length: 1.5,
    weight: 24,
    position: { x: 0, y: 0.5, z: 0 },
    temperatureZone: "cold",
    isFragile: true,
    destination: DEMO_DESTINATIONS.grocery[2],
    crushFactor: 0.1,
    stackLimit: 2,
    isNew: false,
  },
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `cold-${String(i + 6).padStart(3, "0")}`,
    name: `Fresh Juices (Case ${i + 1})`,
    width: 1.5 + Math.random() * 1.5,
    height: 1.2 + Math.random() * 1.2,
    length: 2.0 + Math.random() * 1.5,
    weight: 35 + Math.random() * 40,
    position: { x: 0, y: 0, z: 0 },
    temperatureZone: "cold" as "cold",
    isFragile: false,
    destination: getRandomDestination("grocery"),
    crushFactor: 0.5 + Math.random() * 0.3,
    stackLimit: 3,
    isNew: false,
  })),

  // ═══════════════════════════════════════════════════════════════════
  // FURNITURE & LARGE ITEMS - High Weight/Volume (30 boxes)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "furn-001",
    name: "Executive Office Chair Set",
    width: 3.2,
    height: 2.8,
    length: 4.2,
    weight: 145,
    position: { x: 0, y: 1.4, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.walmart[1],
    crushFactor: 0.8,
    stackLimit: 1,
    isNew: false,
  },
  {
    id: "furn-002",
    name: "Modern Dining Table",
    width: 2.8,
    height: 3.2,
    length: 1.2,
    weight: 110,
    position: { x: 0, y: 1.6, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.walmart[2],
    crushFactor: 0.9,
    stackLimit: 1,
    isNew: false,
  },
  {
    id: "furn-003",
    name: "Queen Size Mattress Set",
    width: 4.2,
    height: 1.2,
    length: 6.8,
    weight: 95,
    position: { x: 0, y: 0.6, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.walmart[0],
    crushFactor: 0.4,
    stackLimit: 2,
    isNew: false,
  },
  {
    id: "furn-004",
    name: "3-Seater Sofa",
    width: 5.2,
    height: 3.2,
    length: 2.8,
    weight: 175,
    position: { x: 0, y: 1.6, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.walmart[3],
    crushFactor: 0.9,
    stackLimit: 1,
    isNew: false,
  },
  ...Array.from({ length: 26 }, (_, i) => ({
    id: `furn-${String(i + 5).padStart(3, "0")}`,
    name: `Bookshelf Kit (Box ${i + 1})`,
    width: 3.0 + Math.random() * 2.5,
    height: 2.2 + Math.random() * 2.5,
    length: 1.5 + Math.random() * 2.5,
    weight: 80 + Math.random() * 100,
    position: { x: 0, y: 0, z: 0 },
    temperatureZone: "regular" as "regular",
    isFragile: false,
    destination: getRandomDestination("walmart"),
    crushFactor: 0.7 + Math.random() * 0.2,
    stackLimit: 1,
    isNew: false,
  })),

  // ═══════════════════════════════════════════════════════════════════
  // CLOTHING & TEXTILES - Low Weight, Compressible (35 boxes)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "cloth-001",
    name: "Designer Winter Coats",
    width: 1.8,
    height: 1.2,
    length: 2.2,
    weight: 18,
    position: { x: 0, y: 0.6, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[1],
    crushFactor: 0.3,
    stackLimit: 5,
    isNew: false,
  },
  {
    id: "cloth-002",
    name: "Premium Bedding Sets",
    width: 2.2,
    height: 1.4,
    length: 1.9,
    weight: 22,
    position: { x: 0, y: 0.7, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[0],
    crushFactor: 0.4,
    stackLimit: 4,
    isNew: false,
  },
  {
    id: "cloth-003",
    name: "Athletic Shoe Collection",
    width: 1.9,
    height: 0.9,
    length: 2.6,
    weight: 28,
    position: { x: 0, y: 0.45, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[2],
    crushFactor: 0.6,
    stackLimit: 4,
    isNew: false,
  },
  {
    id: "cloth-004",
    name: "Luxury Towel Sets",
    width: 1.7,
    height: 1.6,
    length: 1.7,
    weight: 20,
    position: { x: 0, y: 0.8, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[3],
    crushFactor: 0.5,
    stackLimit: 4,
    isNew: false,
  },
  ...Array.from({ length: 31 }, (_, i) => ({
    id: `cloth-${String(i + 5).padStart(3, "0")}`,
    name: `Assorted T-Shirts (Case ${i + 1})`,
    width: 1.8 + Math.random() * 1.5,
    height: 1.2 + Math.random() * 1.2,
    length: 2.5 + Math.random() * 2.0,
    weight: 20 + Math.random() * 30,
    position: { x: 0, y: 0, z: 0 },
    temperatureZone: "regular" as "regular",
    isFragile: false,
    destination: getRandomDestination("walmart"),
    crushFactor: 0.4 + Math.random() * 0.2,
    stackLimit: 5,
    isNew: false,
  })),

  // ═══════════════════════════════════════════════════════════════════
  // HOUSEHOLD ITEMS - Mixed Fragility (35 boxes)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "house-001",
    name: "Kitchen Appliance Bundle",
    width: 2.4,
    height: 1.9,
    length: 1.6,
    weight: 72,
    position: { x: 0, y: 0.95, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.walmart[1],
    crushFactor: 0.7,
    stackLimit: 2,
    isNew: false,
  },
  {
    id: "house-002",
    name: "Professional Cleaning Supplies",
    width: 1.6,
    height: 1.3,
    length: 2.1,
    weight: 35,
    position: { x: 0, y: 0.65, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[0],
    crushFactor: 0.8,
    stackLimit: 3,
    isNew: false,
  },
  {
    id: "house-003",
    name: "Smart Home Device Bundle",
    width: 1.4,
    height: 1.1,
    length: 1.8,
    weight: 25,
    position: { x: 0, y: 0.55, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.electronics[0],
    crushFactor: 0.4,
    stackLimit: 3,
    isNew: false,
  },
  {
    id: "house-004",
    name: "Garden Tools & Equipment",
    width: 1.2,
    height: 3.2,
    length: 0.9,
    weight: 42,
    position: { x: 0, y: 1.6, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[2],
    crushFactor: 0.9,
    stackLimit: 1,
    isNew: false,
  },
  ...Array.from({ length: 31 }, (_, i) => ({
    id: `house-${String(i + 5).padStart(3, "0")}`,
    name: `Ceramic Dinnerware Set (Case ${i + 1})`,
    width: 2.0 + Math.random() * 1.5,
    height: 1.8 + Math.random() * 1.5,
    length: 2.5 + Math.random() * 1.8,
    weight: 50 + Math.random() * 50,
    position: { x: 0, y: 0, z: 0 },
    temperatureZone: "regular" as "regular",
    isFragile: true,
    destination: getRandomDestination("walmart"),
    crushFactor: 0.2 + Math.random() * 0.3,
    stackLimit: 2,
    isNew: false,
  })),

  // ═══════════════════════════════════════════════════════════════════
  // SPORTS & RECREATION - Varied Shapes (30 boxes)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "sport-001",
    name: "Professional Exercise Equipment",
    width: 2.8,
    height: 1.6,
    length: 3.2,
    weight: 95,
    position: { x: 0, y: 0.8, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[3],
    crushFactor: 0.8,
    stackLimit: 2,
    isNew: false,
  },
  {
    id: "sport-002",
    name: "Mountain Bikes (2-pack)",
    width: 1.8,
    height: 3.8,
    length: 6.2,
    weight: 68,
    position: { x: 0, y: 1.9, z: 0 },
    temperatureZone: "regular",
    isFragile: true,
    destination: DEMO_DESTINATIONS.walmart[1],
    crushFactor: 0.7,
    stackLimit: 1,
    isNew: false,
  },
  {
    id: "sport-003",
    name: "Premium Sports Gear Collection",
    width: 2.1,
    height: 1.2,
    length: 2.7,
    weight: 38,
    position: { x: 0, y: 0.6, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[0],
    crushFactor: 0.6,
    stackLimit: 3,
    isNew: false,
  },
  {
    id: "sport-004",
    name: "Camping Equipment Bundle",
    width: 1.9,
    height: 1.1,
    length: 2.8,
    weight: 32,
    position: { x: 0, y: 0.55, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[2],
    crushFactor: 0.6,
    stackLimit: 3,
    isNew: false,
  },
  ...Array.from({ length: 26 }, (_, i) => ({
    id: `sport-${String(i + 5).padStart(3, "0")}`,
    name: `Yoga Mat & Accessories (Set ${i + 1})`,
    width: 1.2 + Math.random() * 1.5,
    height: 1.0 + Math.random() * 1.2,
    length: 1.8 + Math.random() * 1.5,
    weight: 10 + Math.random() * 25,
    position: { x: 0, y: 0, z: 0 },
    temperatureZone: "regular" as "regular",
    isFragile: false,
    destination: getRandomDestination("walmart"),
    crushFactor: 0.5 + Math.random() * 0.4,
    stackLimit: 4,
    isNew: false,
  })),

  // ═══════════════════════════════════════════════════════════════════
  // AUTOMOTIVE & HARDWARE - Heavy Duty (30 boxes)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "auto-001",
    name: "Automotive Parts Collection",
    width: 2.2,
    height: 1.2,
    length: 3.2,
    weight: 75,
    position: { x: 0, y: 0.6, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[3],
    crushFactor: 0.9,
    stackLimit: 2,
    isNew: false,
  },
  {
    id: "auto-002",
    name: "Professional Tool Set",
    width: 2.0,
    height: 1.6,
    length: 2.6,
    weight: 88,
    position: { x: 0, y: 0.8, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[1],
    crushFactor: 0.9,
    stackLimit: 2,
    isNew: false,
  },
  {
    id: "auto-003",
    name: "Hardware & Fasteners",
    width: 1.8,
    height: 1.2,
    length: 2.4,
    weight: 65,
    position: { x: 0, y: 0.6, z: 0 },
    temperatureZone: "regular",
    isFragile: false,
    destination: DEMO_DESTINATIONS.walmart[0],
    crushFactor: 0.9,
    stackLimit: 3,
    isNew: false,
  },
  ...Array.from({ length: 27 }, (_, i) => ({
    id: `auto-${String(i + 4).padStart(3, "0")}`,
    name: `Car Maintenance Kit (Box ${i + 1})`,
    width: 2.0 + Math.random() * 2.0,
    height: 1.5 + Math.random() * 1.5,
    length: 2.5 + Math.random() * 2.5,
    weight: 60 + Math.random() * 80,
    position: { x: 0, y: 0, z: 0 },
    temperatureZone: "regular" as "regular",
    isFragile: false,
    destination: getRandomDestination("walmart"),
    crushFactor: 0.9 + Math.random() * 0.05,
    stackLimit: 3,
    isNew: false,
  })),
];

// ═══════════════════════════════════════════════════════════════════
// DEMO SCENARIO CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════

export const DEMO_SCENARIOS = {
  // Walmart-style mixed retail delivery
  walmart: {
    name: "Walmart Multi-Stop Delivery",
    description: "Mixed retail items across multiple temperature zones",
    boxes: sampleBoxes.filter(
      (box) =>
        box.destination?.includes("Store #") ||
        box.destination?.includes("Distribution")
    ),
    destinations: DEMO_DESTINATIONS.walmart,
    challenges: [
      "Temperature zone separation required",
      "Heavy items must be loaded first",
      "Fragile electronics need special handling",
      "Multiple delivery stops optimization",
    ],
  },

  // Electronics-focused scenario
  electronics: {
    name: "Electronics & Fragile Items",
    description: "High-value fragile electronics requiring careful handling",
    boxes: sampleBoxes
      .filter((box) => box.isFragile && box.temperatureZone === "regular")
      .slice(0, 35),
    destinations: DEMO_DESTINATIONS.electronics,
    challenges: [
      "All items are fragile - no stacking",
      "High-value cargo security",
      "Climate-controlled transport",
      "Anti-static packaging requirements",
    ],
  },

  // Temperature-sensitive scenario
  grocery: {
    name: "Mixed Temperature Loads",
    description: "Cold and regular items with complex constraints",
    boxes: sampleBoxes
      .filter(
        (box) =>
          box.temperatureZone === "cold" ||
          (box.temperatureZone === "regular" && Math.random() > 0.7)
      )
      .slice(0, 85),
    destinations: DEMO_DESTINATIONS.grocery,
    challenges: [
      "Strict temperature zone isolation",
      "Cold chain maintenance critical",
      "Time-sensitive delivery windows",
      "Cross-contamination prevention",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

export function getBoxesByScenario(
  scenarioKey: keyof typeof DEMO_SCENARIOS
): Box[] {
  return DEMO_SCENARIOS[scenarioKey].boxes;
}

export function getScenarioInfo(scenarioKey: keyof typeof DEMO_SCENARIOS) {
  return DEMO_SCENARIOS[scenarioKey];
}

export function generateRandomBoxId(): string {
  return `box-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function validateBoxData(box: Partial<Box>): string[] {
  const errors: string[] = [];

  if (!box.name?.trim()) errors.push("Name is required");
  if (!box.width || box.width <= 0) errors.push("Width must be positive");
  if (!box.height || box.height <= 0) errors.push("Height must be positive");
  if (!box.length || box.length <= 0) errors.push("Length must be positive");
  if (!box.weight || box.weight <= 0) errors.push("Weight must be positive");
  if (!["regular", "cold"].includes(box.temperatureZone || "")) {
    errors.push("Invalid temperature zone");
  }

  return errors;
}

// Export default sample data (first 200 boxes for a robust demo)
export default sampleBoxes.slice(0, 200);