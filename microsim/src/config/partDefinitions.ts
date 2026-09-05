import type { PartDefinition, PartInstance, Pin } from "../types/types";

const ARDUINO_WIDTH = 32; 
const ARDUINO_HEIGHT = 22; 

export const DEFAULT_ULTRASONIC_DISTANCE_CM = 50;

export const DHT11_TEMPERATURE_RANGE = { min: 0, max: 50 } as const;
export const DHT11_HUMIDITY_RANGE = { min: 20, max: 90 } as const;
export const DHT11_TEMPERATURE_ACCURACY_C = 2.0;
export const DHT11_HUMIDITY_ACCURACY_PERCENT = 5.0;
export const DEFAULT_DHT11_TEMPERATURE_C = 25;
export const DEFAULT_DHT11_HUMIDITY_PERCENT = 50;

// DHT22 (AM2302) — wider range, tighter accuracy, slower sampling.
export const DHT22_TEMPERATURE_RANGE = { min: -40, max: 80 } as const;
export const DHT22_HUMIDITY_RANGE = { min: 0, max: 100 } as const;
export const DHT22_TEMPERATURE_ACCURACY_C = 0.5;
export const DHT22_HUMIDITY_ACCURACY_PERCENT = 2.0;
export const DEFAULT_DHT22_TEMPERATURE_C = 25;
export const DEFAULT_DHT22_HUMIDITY_PERCENT = 50;

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

export const CAPACITANCE_UNIT_TO_FARADS: Record<string, number> = {
  F: 1,
  mF: 1e-3,
  "µF": 1e-6,
  nF: 1e-9,
  pF: 1e-12,
};

export function getCapacitanceFarads(part: PartInstance): number {
  const value = Number(part.properties?.capacitanceValue ?? 100);
  const unit = (part.properties?.capacitanceUnit as string) ?? "µF";
  const multiplier = CAPACITANCE_UNIT_TO_FARADS[unit] ?? 1e-6;
  return value * multiplier;
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
      // Whole grid units only. y: ±3 lands cleanly on row C (top) / row H
      // (bottom) -- far enough past the base (half-height 2) to clear the
      // breadboard's own center trench, and far enough past row e/f that
      // it doesn't try to occupy the trench gap itself.
      { id: "pin1", label: "1b", x: -1, y: -3, type: "digital" },
      { id: "pin2", label: "2b", x: 1, y: -3, type: "digital" },
      { id: "pin3", label: "1a", x: -1, y: 3, type: "digital" },
      { id: "pin4", label: "2a", x: 1, y: 3, type: "digital" },
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
      { id: "negative", label: "−", x: -9, y: -1.5, type: "ground" },
      { id: "positive", label: "+", x: -9, y: 1.5, type: "power" },
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
    heightUnits: 8,
    pins: [
      { id: "vcc", label: "VCC", x: -1, y: 4, type: "passive" },
      { id: "trig", label: "TRIG", x: 0, y: 4, type: "digital" },
      { id: "echo", label: "ECHO", x: 1, y: 4, type: "digital" },
      { id: "gnd", label: "GND", x: 2, y: 4, type: "passive" },
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
      { id: "signal", label: "SIG", x: -2.5, y: -9.5, type: "digital" },
      { id: "vcc", label: "VCC", x: 0, y: -9.5, type: "power" },
      { id: "gnd", label: "GND", x: 2.5, y: -9.5, type: "ground" },
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
    widthUnits: 30, 
    heightUnits: 10,
    pins: [
      { id: "gnd", label: "GND", x: -16, y: -2, type: "passive" }, 
      { id: "vcc", label: "VCC", x: -16, y: -1, type: "passive" }, 
      { id: "sda", label: "SDA", x: -16, y: 0, type: "digital" }, 
      { id: "scl", label: "SCL", x: -16, y: 1, type: "digital" }, 
    ],
    defaultProperties: { address: 0x27, cols: 16, rows: 2, backlight: true },
  },

  "lcd-20x4-i2c": {
    type: "lcd-20x4-i2c",
    displayName: "LCD 20x4 I2C",
    widthUnits: 34,
    heightUnits: 16,
    pins: [
      { id: "gnd", label: "GND", x: -18, y: -5, type: "passive" },
      { id: "vcc", label: "VCC", x: -18, y: -4, type: "passive" },
      { id: "sda", label: "SDA", x: -18, y: -3, type: "digital" },
      { id: "scl", label: "SCL", x: -18, y: -2, type: "digital" },
    ],
    defaultProperties: { address: 0x27, cols: 20, rows: 4, backlight: true },
  },

  "rgb-led": {
    type: "rgb-led",
    displayName: "RGB LED",
    widthUnits: 4,
    heightUnits: 3,
    pins: [
      { id: "red", label: "Red", x: -1, y: 2, type: "passive" },
      { id: "green", label: "Green", x: 0, y: 2, type: "passive" },
      { id: "blue", label: "Blue", x: 1, y: 2, type: "passive" },
      { id: "gnd", label: "GND", x: 2, y: 2, type: "ground" },
    ],
    defaultProperties: {},
  },

  "toggle-switch": {
    type: "toggle-switch",
    displayName: "Toggle Switch",
    widthUnits: 4,
    heightUnits: 4,
    pins: [
      { id: "pin1", label: "1", x: -2, y: 2, type: "digital" },
      { id: "pin2", label: "2", x: 2, y: 2, type: "digital" },
    ],
    defaultProperties: { on: false },
  },

  "joystick": {
    type: "joystick",
    displayName: "Joystick",
    widthUnits: 11,
    heightUnits: 10,
    pins: [
      { id: "gnd", label: "GND", x: -4, y: 3.8, type: "ground" },
      { id: "vcc", label: "+5V", x: -2, y: 3.8, type: "power" },
      { id: "vrx", label: "VRx", x: 0, y: 3.8, type: "analog" },
      { id: "vry", label: "VRy", x: 2, y: 3.8, type: "analog" },
      { id: "sw", label: "SW", x: 4, y: 3.8, type: "digital" },
    ],
    defaultProperties: { x: 0.5, y: 0.5, pressed: false },
  },

  "keypad-4x4": {
    type: "keypad-4x4",
    displayName: "4x4 Keypad",
    widthUnits: 12,
    heightUnits: 18,
    pins: [
      { id: "row1", label: "R1", x: -4, y: 9, type: "passive" },
      { id: "row2", label: "R2", x: -3, y: 9, type: "passive" },
      { id: "row3", label: "R3", x: -2, y: 9, type: "passive" },
      { id: "row4", label: "R4", x: -1, y: 9, type: "passive" },
      { id: "col1", label: "C1", x: 1, y: 9, type: "passive" },
      { id: "col2", label: "C2", x: 2, y: 9, type: "passive" },
      { id: "col3", label: "C3", x: 3, y: 9, type: "passive" },
      { id: "col4", label: "C4", x: 4, y: 9, type: "passive" },
    ],
    defaultProperties: { pressedRow: null, pressedCol: null },
  },

  photoresistor: {
    type: "photoresistor",
    displayName: "Photoresistor",
    widthUnits: 3,
    heightUnits: 4,
    pins: [
      { id: "pin1", label: "1", x: -1, y: 3, type: "passive" },
      { id: "pin2", label: "2", x: 1, y: 3, type: "passive" },
    ],
    defaultProperties: { lightLevel: 0.5 },
  },

  "ir-receiver": {
    type: "ir-receiver",
    displayName: "IR Receiver",
    widthUnits: 5,
    heightUnits: 6,
    pins: [
      { id: "gnd", label: "GND", x: -1, y: 3, type: "ground" },
      { id: "vcc", label: "VCC", x: 0, y: 3, type: "power" },
      { id: "out", label: "OUT", x: 1, y: 3, type: "digital" },
    ],
    defaultProperties: {},
  },

  "ir-remote": {
    type: "ir-remote",
    displayName: "IR Remote Control",
    widthUnits: 14,
    heightUnits: 30,
    pins: [], // wireless -- broadcasts to any powered ir-receiver on canvas, no wiring
    defaultProperties: { lastButton: null, lastCode: null, sentToken: 0 },
  },

  "seven-segment": {
    type: "seven-segment",
    displayName: "7-Segment Display",
    widthUnits: 7,
    heightUnits: 9,
    pins: [
      // Top row, left to right
      { id: "seg_g", label: "G", x: -2.4, y: -4.5, type: "digital" },
      { id: "seg_f", label: "F", x: -1.2, y: -4.5, type: "digital" },
      { id: "seg_a", label: "A", x: 0, y: -4.5, type: "digital" },
      { id: "com2", label: "COM", x: 1.2, y: -4.5, type: "passive" },
      { id: "seg_b", label: "B", x: 2.4, y: -4.5, type: "digital" },

      // Bottom row, left to right
      { id: "seg_e", label: "E", x: -2.4, y: 4.5, type: "digital" },
      { id: "seg_d", label: "D", x: -1.2, y: 4.5, type: "digital" },
      { id: "com1", label: "COM", x: 0, y: 4.5, type: "passive" },
      { id: "seg_c", label: "C", x: 1.2, y: 4.5, type: "digital" },
      { id: "seg_dp", label: "DP", x: 2.4, y: 4.5, type: "digital" },
    ],
    defaultProperties: { commonType: "cathode" },
  },

  dht11: {
    type: "dht11",
    displayName: "Temperature & Humidity Sensor (DHT11)",
    widthUnits: 8,
    heightUnits: 13,
    pins: [
      // Bottom edge, left to right — matches the real module's 3-pin header
      // (VCC / DATA / GND). Whole grid-unit x/y only, same rule learned
      // from the ultrasonic sensor, so these can land on breadboard holes.
      { id: "vcc", label: "VCC", x: -2, y: 6, type: "passive" },
      { id: "data", label: "DATA", x: 0, y: 6, type: "digital" },
      { id: "gnd", label: "GND", x: 2, y: 6, type: "passive" },
    ],
    defaultProperties: {
      temperatureC: DEFAULT_DHT11_TEMPERATURE_C,
      humidityPercent: DEFAULT_DHT11_HUMIDITY_PERCENT,
    },
  },

  dht22: {
    type: "dht22",
    displayName: "DHT22 Temperature & Humidity Sensor",
    widthUnits: 10,
    heightUnits: 16,
    pins: [
      // Left to right, matching the real module's 4-pin header order.
      { id: "vcc", label: "VCC", x: -3, y: 8, type: "power" },
      { id: "data", label: "DATA", x: -1, y: 8, type: "digital" },
      { id: "nc", label: "NC", x: 1, y: 8, type: "passive" },
      { id: "gnd", label: "GND", x: 3, y: 8, type: "ground" },
    ],
    defaultProperties: {
      temperatureC: DEFAULT_DHT22_TEMPERATURE_C,
      humidityPercent: DEFAULT_DHT22_HUMIDITY_PERCENT,
    },
  },

  "stepper-28byj48": {
    type: "stepper-28byj48",
    displayName: "Stepper Motor (28BYJ-48)",
    widthUnits: 20,
    heightUnits: 20,
    pins: [
      { id: "coilA", label: "Blue", x: -7, y: 12, type: "passive" },
      { id: "coilB", label: "Pink", x: -3.5, y: 12, type: "passive" },
      { id: "coilC", label: "Yellow", x: 0, y: 12, type: "passive" },
      { id: "coilD", label: "Orange", x: 3.5, y: 12, type: "passive" },
      { id: "com", label: "Red", x: 7, y: 12, type: "power" },
    ],
    defaultProperties: { rotorAngleDeg: 0 }, // CHANGED — was {}
  },

  "uln2003-driver": {
    type: "uln2003-driver",
    displayName: "ULN2003 Stepper Driver Board",
    widthUnits: 22,
    heightUnits: 16,
    pins: [
      // Bottom edge -- IN1..IN7, matches the board's silkscreen exactly.
      // Only IN1-IN4 are electrically meaningful (wired to outA-D below);
      // IN5-IN7 exist on the real board's silkscreen but aren't connected
      // to anything internally.
      { id: "in1", label: "IN1", x: -9, y: 7, type: "digital" },
      { id: "in2", label: "IN2", x: -6, y: 7, type: "digital" },
      { id: "in3", label: "IN3", x: -3, y: 7, type: "digital" },
      { id: "in4", label: "IN4", x: 0, y: 7, type: "digital" },
      { id: "in5", label: "IN5", x: 3, y: 7, type: "digital" },
      { id: "in6", label: "IN6", x: 6, y: 7, type: "digital" },
      { id: "in7", label: "IN7", x: 9, y: 7, type: "digital" },

      // Right edge -- board power input
      { id: "gnd", label: "GND", x: 10, y: 2, type: "ground" },
      { id: "vcc", label: "+5V", x: 10, y: -1.5, type: "power" },
      
      // Top edge -- 5-pin motor connector, mirrors the stepper's 5 wires
      { id: "outA", label: "Blue", x: -7, y: -7.3, type: "passive" },
      { id: "outB", label: "Pink", x: -3.5, y: -7.3, type: "passive" },
      { id: "outC", label: "Yellow", x: 0, y: -7.3, type: "passive" },
      { id: "outD", label: "Orange", x: 3.5, y: -7.3, type: "passive" },
      { id: "outCOM", label: "Red", x: 7, y: -7.3, type: "power" },
    ],
    defaultProperties: {},
  },

  "dc-gearmotor": {
    type: "dc-gearmotor",
    displayName: "Hobby DC Gear Motor",
    widthUnits: 12,
    heightUnits: 24,
    pins: [
      { id: "negative", label: "Negative", x: -4.5, y: 4.5, type: "passive" },
      { id: "positive", label: "Positive", x: -4.5, y: 6.0, type: "passive" },
    ],
    defaultProperties: {},
  },

  relay: {
    type: "relay",
    displayName: "Relay Module (1-Channel)",
    widthUnits: 18,
    heightUnits: 10,
    pins: [
      // Left header (protrudes past PCB edge for cable connection)
      { id: "vcc", label: "VCC", x: -6.4, y: -3, type: "power" },
      { id: "gnd", label: "GND", x: -6.4, y: 0, type: "ground" },
      { id: "in", label: "IN", x: -6.4, y: 3, type: "digital" },
      // Right screw terminal (inset on board)
      { id: "no", label: "NO", x: 7, y: -3, type: "passive" },
      { id: "com", label: "COM", x: 7, y: 0, type: "passive" },
      { id: "nc", label: "NC", x: 7, y: 3, type: "passive" },
    ],
    defaultProperties: { activeLow: true },
  },

  "capacitor-polarized": {
    type: "capacitor-polarized",
    displayName: "Capacitor (Polarized)",
    widthUnits: 4,
    heightUnits: 5,
    pins: [
      { id: "positive", label: "+", x: -1, y: 3, type: "passive" },
      { id: "negative", label: "-", x: 1, y: 3, type: "passive" },
    ],
    defaultProperties: {
      capacitanceValue: 100,
      capacitanceUnit: "µF",
      voltageRating: 16,
      storedVoltage: 0,
    },
  },
  
  "capacitor-nonpolarized": {
    type: "capacitor-nonpolarized",
    displayName: "Capacitor (Ceramic)",
    widthUnits: 4,
    heightUnits: 4,
    pins: [
      { id: "pin1", label: "1", x: -1, y: 2, type: "passive" },
      { id: "pin2", label: "2", x: 1, y: 2, type: "passive" },
    ],
    defaultProperties: {
      capacitanceValue: 100,
      capacitanceUnit: "nF",
      storedVoltage: 0,
    },
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