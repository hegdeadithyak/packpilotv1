/**
 * Enhanced Sample Data for PackPilot Demo
 * @description 200 random boxes for testing truck loading optimization
 * @author PackPilot Team
 * @version 2.4
 */

import type { Box } from "@/types/box";

// Demo destination mapping for realistic scenarios
export const DEMO_DESTINATIONS = {
  walmart: ["Stop 1", "Stop 2", "Stop 3", "Stop 4"],
  electronics: ["Stop 1", "Stop 2", "Stop 3", "Stop 4"], 
  grocery: ["Stop 1", "Stop 2", "Stop 3", "Stop 4"],
  general: ["Stop 1", "Stop 2", "Stop 3", "Stop 4"]
};

const getRandomDestination = () => {
  const destinations = ["Stop 1", "Stop 2", "Stop 3", "Stop 4"];
  return destinations[Math.floor(Math.random() * destinations.length)];
};

// Generate 200 random boxes with realistic variations
export const sampleBoxes: Box[] = Array.from({ length: 200 }, (_, i) => {
  const temperatureZones = ["regular", "cold", "frozen"] as const;
  const tempZone = temperatureZones[Math.floor(Math.random() * temperatureZones.length)];
  
  // Realistic weight distribution (most boxes 10-100 lbs, some heavy items)
  let weight: number;
  if (Math.random() < 0.7) {
    weight = 10 + Math.random() * 90; // 70% are 10-100 lbs
  } else if (Math.random() < 0.9) {
    weight = 100 + Math.random() * 100; // 20% are 100-200 lbs
  } else {
    weight = 200 + Math.random() * 300; // 10% are 200-500 lbs (heavy items)
  }
  
  // Fragility based on weight and temperature zone
  let isFragile: boolean;
  if (tempZone === "frozen") {
    isFragile = Math.random() < 0.1; // Frozen items rarely fragile
  } else if (weight > 100) {
    isFragile = Math.random() < 0.05; // Heavy items rarely fragile
  } else {
    isFragile = Math.random() < 0.25; // Light items more likely fragile
  }
  
  // Realistic dimensions based on weight
  let width: number, height: number, length: number;
  
  if (weight < 20) {
    // Small, light items (electronics, small packages)
    width = 0.5 + Math.random() * 1.5; // 0.5-2.0 ft
    height = 0.3 + Math.random() * 1.2; // 0.3-1.5 ft
    length = 0.5 + Math.random() * 2.0; // 0.5-2.5 ft
  } else if (weight < 100) {
    // Medium items (appliances, furniture pieces)
    width = 1.0 + Math.random() * 3.0; // 1.0-4.0 ft
    height = 0.8 + Math.random() * 2.2; // 0.8-3.0 ft
    length = 1.0 + Math.random() * 4.0; // 1.0-5.0 ft
  } else {
    // Large, heavy items (furniture, equipment)
    width = 2.0 + Math.random() * 4.0; // 2.0-6.0 ft
    height = 1.5 + Math.random() * 2.5; // 1.5-4.0 ft
    length = 2.0 + Math.random() * 6.0; // 2.0-8.0 ft
  }
  
  // Ensure boxes fit within truck constraints
  width = Math.min(width, 7.5); // Max truck width minus margin
  height = Math.min(height, 8.5); // Max truck height minus margin
  length = Math.min(length, 27.5); // Max truck length minus margin
  
  return {
    id: `box-${String(i + 1).padStart(3, "0")}`,
    name: `Sample Box ${i + 1}`,
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
    length: Math.round(length * 10) / 10,
    weight: Math.round(weight * 10) / 10,
    position: { x: 0, y: 0, z: 0 },
    temperatureZone: tempZone,
    isFragile: isFragile,
    destination: getRandomDestination(),
    isNew: true,
    priority: Math.floor(Math.random() * 5) + 1
  };
});

// ═══════════════════════════════════════════════════════════════════
// DEMO SCENARIO CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════

export const DEMO_SCENARIOS = {
  // Walmart-style mixed retail delivery
  walmart: {
    name: "Walmart Multi-Stop Delivery",
    description: "Mixed retail items across multiple temperature zones",
    boxes: sampleBoxes.slice(0, 150), // First 150 boxes
    destinations: DEMO_DESTINATIONS.walmart,
    challenges: [
      "Temperature zone separation required",
      "Heavy items must be loaded first",
      "Fragile electronics need special handling",
      "Multiple delivery stops optimization",
    ],
  },

  // Electronics-focused scenario (lighter, more fragile items)
  electronics: {
    name: "Electronics & Fragile Items",
    description: "High-value fragile electronics requiring careful handling",
    boxes: sampleBoxes
      .filter((box) => box.isFragile && box.weight < 60)
      .slice(0, 35),
    destinations: DEMO_DESTINATIONS.electronics,
    challenges: [
      "All items are fragile - careful stacking required",
      "High-value cargo security",
      "Climate-controlled transport",
      "Anti-static packaging requirements",
    ],
  },

  // Temperature-sensitive scenario
  grocery: {
    name: "Mixed Temperature Loads",
    description: "Cold, frozen, and regular items with complex constraints",
    boxes: sampleBoxes
      .filter((box) => box.temperatureZone !== "regular" || Math.random() > 0.5)
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
  if (!["regular", "cold", "frozen"].includes(box.temperatureZone || "")) {
    errors.push("Invalid temperature zone");
  }

  return errors;
}

// Function to generate dynamic sample boxes based on current routes
export function generateDynamicSampleBoxes(routeNames: string[] = ["Stop 1", "Stop 2", "Stop 3", "Stop 4"], count: number = 200): Box[] {
  const temperatureZones = ["regular", "cold", "frozen"] as const;
  
  return Array.from({ length: count }, (_, i) => {
    const tempZone = temperatureZones[Math.floor(Math.random() * temperatureZones.length)];
    
    // Realistic weight distribution
    let weight: number;
    if (Math.random() < 0.7) {
      weight = 10 + Math.random() * 90; // 70% are 10-100 lbs
    } else if (Math.random() < 0.9) {
      weight = 100 + Math.random() * 100; // 20% are 100-200 lbs
    } else {
      weight = 200 + Math.random() * 300; // 10% are 200-500 lbs
    }
    
    // Fragility based on weight and temperature
    let isFragile: boolean;
    if (tempZone === "frozen") {
      isFragile = Math.random() < 0.1;
    } else if (weight > 100) {
      isFragile = Math.random() < 0.05;
    } else {
      isFragile = Math.random() < 0.25;
    }
    
    // Realistic dimensions based on weight
    let width: number, height: number, length: number;
    
    if (weight < 20) {
      width = 0.5 + Math.random() * 1.5;
      height = 0.3 + Math.random() * 1.2;
      length = 0.5 + Math.random() * 2.0;
    } else if (weight < 100) {
      width = 1.0 + Math.random() * 3.0;
      height = 0.8 + Math.random() * 2.2;
      length = 1.0 + Math.random() * 4.0;
    } else {
      width = 2.0 + Math.random() * 4.0;
      height = 1.5 + Math.random() * 2.5;
      length = 2.0 + Math.random() * 6.0;
    }
    
    // Ensure boxes fit within truck constraints
    width = Math.min(width, 7.5);
    height = Math.min(height, 8.5);
    length = Math.min(length, 27.5);
    
    return {
      id: `box-${String(i + 1).padStart(3, "0")}`,
      name: `Sample Box ${i + 1}`,
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
      length: Math.round(length * 10) / 10,
      weight: Math.round(weight * 10) / 10,
      position: { x: 0, y: 0, z: 0 },
      temperatureZone: tempZone,
      isFragile: isFragile,
      destination: routeNames[Math.floor(Math.random() * routeNames.length)],
      isNew: true,
      priority: Math.floor(Math.random() * 5) + 1
    };
  });
}

// Function to update destinations in existing boxes
export function updateBoxDestinations(boxes: Box[], newDestinations: string[]): Box[] {
  if (newDestinations.length === 0) {
    return boxes;
  }
  
  return boxes.map(box => ({
    ...box,
    destination: newDestinations[Math.floor(Math.random() * newDestinations.length)]
  }));
}

// Export default sample data - 200 random boxes
export default sampleBoxes;