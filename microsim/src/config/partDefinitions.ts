import type { PartDefinition, Pin } from "../types/types";

const ARDUINO_WIDTH = 32; 
const ARDUINO_HEIGHT = 22; 

export const DEFAULT_ULTRASONIC_DISTANCE_CM = 50;

function evenlySpaced(count: number, span: number, start: number): number[] {
  const step = span / count;
  return Array.from({ length: count }, (_, i) => start + step * (i + 0.5));
}

function buildArduinoPins(): Pin[] {
  const pins: Pin[] = [];
  const halfW = ARDUINO_WIDTH / 2;
  const halfH = ARDUINO_HEIGHT / 2;

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

function buildMiniBreadboardPins(): Pin[] {
  const pins: Pin[] = [];
  const cols = 17;
  const colOffset = -Math.floor(cols / 2);

  for (let c = 0; c < cols; c++) {
    const colNum = c + 1;
    const x = colOffset + c;

    ["a", "b", "c", "d", "e"].forEach((row, i) => {
      pins.push({ id: `col_${colNum}_${row}`, label: `${colNum}${row.toUpperCase()}`, x, y: -5 + i, type: "passive" });
    });

    ["f", "g", "h", "i", "j"].forEach((row, i) => {
      pins.push({ id: `col_${colNum}_${row}`, label: `${colNum}${row.toUpperCase()}`, x, y: 1 + i, type: "passive" });
    });
  }
  return pins;
}

function buildStandardBreadboardPins(cols: number): Pin[] {
  const pins: Pin[] = [];
  const colOffset = -Math.floor(cols / 2);

  for (let c = 0; c < cols; c++) {
    const colNum = c + 1;
    const x = colOffset + c;

    pins.push({ id: `pwr_top_plus_${colNum}`, label: `+${colNum}`, x, y: -8, type: "power" });
    pins.push({ id: `pwr_top_minus_${colNum}`, label: `-${colNum}`, x, y: -7, type: "ground" });

    ["a", "b", "c", "d", "e"].forEach((row, i) => {
      pins.push({ id: `col_${colNum}_${row}`, label: `${colNum}${row.toUpperCase()}`, x, y: -5 + i, type: "passive" });
    });

    ["f", "g", "h", "i", "j"].forEach((row, i) => {
      pins.push({ id: `col_${colNum}_${row}`, label: `${colNum}${row.toUpperCase()}`, x, y: 1 + i, type: "passive" });
    });

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
      { id: "vcc", label: "VCC", x: -6, y: 5, type: "passive" },
      { id: "trig", label: "TRIG", x: -2, y: 5, type: "digital" },
      { id: "echo", label: "ECHO", x: 2, y: 5, type: "digital" },
      { id: "gnd", label: "GND", x: 6, y: 5, type: "passive" },
    ],
    defaultProperties: { distanceCm: DEFAULT_ULTRASONIC_DISTANCE_CM, detectionThresholdCm: 100 },
  },
  
  "active-buzzer": {
    type: "active-buzzer",
    displayName: "Active Buzzer",
    widthUnits: 10,
    heightUnits: 10,
    pins: [
      { id: "positive", label: "+", x: -1, y: 5, type: "passive" },
      { id: "negative", label: "−", x: 1, y: 5, type: "passive" },
    ],
    defaultProperties: { toneHz: 2500 }, // this buzzer's fixed internal pitch
  },

  "passive-buzzer": {
    type: "passive-buzzer",
    displayName: "Passive Buzzer",
    widthUnits: 10,
    heightUnits: 10,
    pins: [
      { id: "positive", label: "+", x: -1, y: 5, type: "passive" },
      { id: "negative", label: "−", x: 1, y: 5, type: "passive" },
    ],
    defaultProperties: {},
  },
  
  "servo-mg90": {
    type: "servo-mg90",
    displayName: "Servo MG90",
    widthUnits: 12,
    heightUnits: 20,
    pins: [
      { id: "signal", label: "SIG", x: -2.5, y: -10, type: "digital" },
      { id: "vcc", label: "VCC", x: 0, y: -10, type: "power" },
      { id: "gnd", label: "GND", x: 2.5, y: -10, type: "ground" },
    ],
    defaultProperties: {
      angle: 90,
      minAngle: 0,
      maxAngle: 180,
    },
  },

  "lcd-16x2-i2c": {
    type: "lcd-16x2-i2c",
    displayName: "LCD 16x2 I2C",
    widthUnits: 36,
    heightUnits: 12,
    pins: [
      {
        id: "vcc",
        label: "VCC",
        x: -18,
        y: -4,
        type: "power",
      },
      {
        id: "gnd",
        label: "GND",
        x: -18,
        y: -1,
        type: "ground",
      },
      {
        id: "sda",
        label: "SDA",
        x: -18,
        y: 2,
        type: "digital",
      },
      {
        id: "scl",
        label: "SCL",
        x: -18,
        y: 5,
        type: "digital",
      },
    ],
    defaultProperties: {
      address: 0x27,
      cols: 16,
      rows: 2,
      backlight: true,
    },
  },

  "rgb-led": {
    type: "rgb-led",
    displayName: "RGB LED",
    widthUnits: 4,
    heightUnits: 3,
    pins: [
      { id: "red", label: "Red", x: -1.5, y: 1.8, type: "passive" },
      { id: "green", label: "Green", x: -0.5, y: 1.8, type: "passive" },
      { id: "blue", label: "Blue", x: 0.5, y: 1.8, type: "passive" },
      { id: "gnd", label: "GND", x: 1.5, y: 1.8, type: "ground" },
    ],
    defaultProperties: {},
  },

  "toggle-switch": {
    type: "toggle-switch",
    displayName: "Toggle Switch",
    widthUnits: 4,
    heightUnits: 4,
    pins: [
      { id: "pin1", label: "1", x: -1.5, y: 2, type: "digital" },
      { id: "pin2", label: "2", x: 1.5, y: 2, type: "digital" },
    ],
    defaultProperties: { on: false },
  },
  
};

export function createPartInstance(type: string, x: number, y: number, idSuffix: string) {
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