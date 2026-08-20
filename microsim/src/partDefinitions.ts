import type { PartDefinition, Pin } from "./types/types";

const ARDUINO_WIDTH = 32; // grid units (was 24)
const ARDUINO_HEIGHT = 22; // grid units (was 18)
  
function evenlySpaced(count: number, span: number, start: number): number[] {
  const step = span / count;
  return Array.from({ length: count }, (_, i) => start + step * (i + 0.5));
}

function buildArduinoPins(): Pin[] {
  const pins: Pin[] = [];
  const halfW = ARDUINO_WIDTH / 2;
  const halfH = ARDUINO_HEIGHT / 2;

  // Top edge, left to right, roughly matching a real Uno's silkscreen.
  const topLabels = ["AREF", "GND", "13", "12", "~11", "~10", "~9", "8", "7", "~6", "~5", "4", "~3", "2", "TX", "RX"];
  const topXs = evenlySpaced(topLabels.length, ARDUINO_WIDTH - 2, -halfW + 1);
  topLabels.forEach((label, i) => {
    const digitalMatch = /^~?(\d+)$/.exec(label);
    if (digitalMatch) {
      pins.push({ id: `d${digitalMatch[1]}`, label, x: topXs[i], y: -halfH, type: "digital" });
    } else if (label === "GND") {
      pins.push({ id: "gnd-top", label, x: topXs[i], y: -halfH, type: "ground" });
    } else if (label === "TX") {
      pins.push({ id: "d1", label, x: topXs[i], y: -halfH, type: "digital" });
    } else if (label === "RX") {
      pins.push({ id: "d0", label, x: topXs[i], y: -halfH, type: "digital" });
    } else {
      pins.push({ id: "aref", label, x: topXs[i], y: -halfH, type: "passive" });
    }
  });

  // Bottom edge: power pins, then analog pins A0-A5.
  const bottomLabels = ["RESET", "3V3", "5V", "GND", "GND", "VIN", "A0", "A1", "A2", "A3", "A4", "A5"];
  const bottomXs = evenlySpaced(bottomLabels.length, ARDUINO_WIDTH - 2, -halfW + 1);
  bottomLabels.forEach((label, i) => {
    if (label === "GND") {
      pins.push({ id: `gnd-bottom-${i}`, label, x: bottomXs[i], y: halfH, type: "ground" });
    } else if (label === "5V") {
      pins.push({ id: "5v", label, x: bottomXs[i], y: halfH, type: "power" });
    } else if (label === "3V3") {
      pins.push({ id: "3v3", label, x: bottomXs[i], y: halfH, type: "power" });
    } else if (label === "VIN") {
      pins.push({ id: "vin", label, x: bottomXs[i], y: halfH, type: "power" });
    } else if (label === "RESET") {
      pins.push({ id: "reset", label, x: bottomXs[i], y: halfH, type: "passive" });
    } else {
      pins.push({ id: label.toLowerCase(), label, x: bottomXs[i], y: halfH, type: "analog" });
    }
  });

  return pins;
}

// Helper to generate mini breadboard pins (17 columns, no power rails)
function buildMiniBreadboardPins(): Pin[] {
  const pins: Pin[] = [];
  const cols = 17;
  const colOffset = -Math.floor(cols / 2);

  for (let c = 0; c < cols; c++) {
    const colNum = c + 1;
    const x = colOffset + c;

    // Top section: Rows A to E
    ["a", "b", "c", "d", "e"].forEach((row, i) => {
      pins.push({
        id: `col_${colNum}_${row}`,
        label: `${colNum}${row.toUpperCase()}`,
        x,
        y: -5 + i,
        type: "passive",
      });
    });

    // Bottom section: Rows F to J
    ["f", "g", "h", "i", "j"].forEach((row, i) => {
      pins.push({
        id: `col_${colNum}_${row}`,
        label: `${colNum}${row.toUpperCase()}`,
        x,
        y: 1 + i,
        type: "passive",
      });
    });
  }
  return pins;
}

// Helper to generate half (30 cols) and full (63 cols) breadboard pins with power rails
function buildStandardBreadboardPins(cols: number): Pin[] {
  const pins: Pin[] = [];
  const colOffset = -Math.floor(cols / 2);

  for (let c = 0; c < cols; c++) {
    const colNum = c + 1;
    const x = colOffset + c;

    // Top Power Rails
    pins.push({ id: `pwr_top_plus_${colNum}`, label: `+${colNum}`, x, y: -8, type: "power" });
    pins.push({ id: `pwr_top_minus_${colNum}`, label: `-${colNum}`, x, y: -7, type: "ground" });

    // Terminal Strip Top: Rows A to E
    ["a", "b", "c", "d", "e"].forEach((row, i) => {
      pins.push({
        id: `col_${colNum}_${row}`,
        label: `${colNum}${row.toUpperCase()}`,
        x,
        y: -5 + i,
        type: "passive",
      });
    });

    // Terminal Strip Bottom: Rows F to J
    ["f", "g", "h", "i", "j"].forEach((row, i) => {
      pins.push({
        id: `col_${colNum}_${row}`,
        label: `${colNum}${row.toUpperCase()}`,
        x,
        y: 1 + i,
        type: "passive",
      });
    });

    // Bottom Power Rails
    pins.push({ id: `pwr_bot_plus_${colNum}`, label: `+${colNum}`, x, y: 7, type: "power" });
    pins.push({ id: `pwr_bot_minus_${colNum}`, label: `-${colNum}`, x, y: 8, type: "ground" });
  }

  return pins;
}

export const partDefinitions: Record<string, PartDefinition> = {
  led: {
    type: "led",
    displayName: "LED",
    widthUnits: 2,
    heightUnits: 3,
    pins: [
      { id: "anode", label: "Anode", x: 0, y: 2, type: "passive" },
      { id: "cathode", label: "Cathode", x: 1, y: 2, type: "passive" },
    ],
    defaultProperties: { color: "red" },
  },

  resistor: {
    type: "resistor",
    displayName: "Resistor",
    widthUnits: 6,
    heightUnits: 2,
    pins: [
      { id: "pin1", label: "1", x: -3, y: 0, type: "passive" },
      { id: "pin2", label: "2", x: 3, y: 0, type: "passive" },
    ],
    defaultProperties: { resistance: 220 },
  },

  pushbutton: {
    type: "pushbutton",
    displayName: "Pushbutton",
    widthUnits: 4,
    heightUnits: 4,
    pins: [
      { id: "pin1", label: "1", x: -2, y: -2, type: "digital" },
      { id: "pin2", label: "2", x: 2, y: -2, type: "digital" },
      { id: "pin3", label: "3", x: -2, y: 2, type: "digital" },
      { id: "pin4", label: "4", x: 2, y: 2, type: "digital" },
    ],
    defaultProperties: { pressed: false },
  },

  "arduino-uno": {
    type: "arduino-uno",
    displayName: "Arduino Uno",
    widthUnits: ARDUINO_WIDTH,
    heightUnits: ARDUINO_HEIGHT,
    pins: buildArduinoPins(),
    defaultProperties: {},
  },

  "breadboard-mini": {
    type: "breadboard-mini",
    displayName: "Small Breadboard",
    widthUnits: 19,
    heightUnits: 14,
    pins: buildMiniBreadboardPins(),
    defaultProperties: {},
  },

  "breadboard-half": {
    type: "breadboard-half",
    displayName: "Medium Breadboard",
    widthUnits: 33,
    heightUnits: 20,
    pins: buildStandardBreadboardPins(30),
    defaultProperties: {},
  },

  "breadboard-full": {
    type: "breadboard-full",
    displayName: "Large Breadboard",
    widthUnits: 67,
    heightUnits: 22,
    pins: buildStandardBreadboardPins(63),
    defaultProperties: {},
  },

  battery: {
    type: "battery",
    displayName: "9V Battery",
    widthUnits: 19,
    heightUnits: 8,
    pins: [
      { id: "negative", label: "−", x: -10, y: -1.5, type: "ground" },
      { id: "positive", label: "+", x: -10, y: 1.5, type: "power" },
    ],
    defaultProperties: { voltage: 9 },
  },
  potentiometer: {
    type: "potentiometer",
    displayName: "Potentiometer",
    widthUnits: 4,
    heightUnits: 4,
    pins: [
      { id: "pin1", label: "1", x: -2, y: 4, type: "passive" },
      { id: "wiper", label: "Wiper", x: 0, y: 4, type: "passive" },
      { id: "pin2", label: "2", x: 2, y: 4, type: "passive" },
    ],
    defaultProperties: {
      wiperPosition: 0.5,
      maxResistance: 10000,
    },
  },
  "ultrasonic-hcsr04": {
    type: "ultrasonic-hcsr04",
    displayName: "Ultrasonic Sensor (HC-SR04)",
    widthUnits: 16,
    heightUnits: 10,
    pins: [
      // Left to right, matching the real board's silkscreen order.
      // FIXED: x/y are whole grid-unit numbers now (were -4.5/-1.5/1.5/4.5
      // and y:5.5 -- those .5 fractions could never land on a breadboard
      // hole, since every hole sits at a whole multiple of GRID and a
      // part's position always snaps to whole multiples too). 4-unit
      // spacing between adjacent pins keeps everything on-grid while still
      // being wider than the original cramped 2-unit spacing.
      { id: "vcc", label: "VCC", x: -6, y: 5, type: "passive" },
      { id: "trig", label: "TRIG", x: -2, y: 5, type: "digital" },
      { id: "echo", label: "ECHO", x: 2, y: 5, type: "digital" },
      { id: "gnd", label: "GND", x: 6, y: 5, type: "passive" },
    ],
    defaultProperties: { distanceCm: 50, detectionThresholdCm: 100 },
  },
  "lcd-16x2-i2c": {
    type: "lcd-16x2-i2c",
    displayName: "LCD 16x2 (I2C)",
    widthUnits: 18,
    heightUnits: 8,
    pins: [
      // Left edge, top to bottom, matching the real module's header order.
      // Whole grid-unit values only (learned that the hard way with the
      // ultrasonic sensor) -- x is 10 units from center, slightly past the
      // board's own edge (halfW = 9) so the pins visibly protrude, like the
      // real module's header does.
      { id: "gnd", label: "GND", x: -10, y: -3, type: "passive" },
      { id: "vcc", label: "VCC", x: -10, y: -1, type: "passive" },
      { id: "sda", label: "SDA", x: -10, y: 1, type: "digital" },
      { id: "scl", label: "SCL", x: -10, y: 3, type: "digital" },
    ],
    defaultProperties: {},
  },
};

export function createPartInstance(
  type: string,
  x: number,
  y: number,
  idSuffix: string
) {
  const def = partDefinitions[type];
  if (!def) throw new Error(`Unknown part type: ${type}`);
  return {
    id: `${type}-${idSuffix}`,
    type,
    x,
    y,
    rotation: 0 as const,
    properties: { ...def.defaultProperties },
  };
}