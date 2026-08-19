// Size of one grid unit in pixels. Every part's dimensions and pin
// offsets are expressed in grid units so snapping/wiring math stays simple.
export const GRID = 10;

export type PinElectricalType = "power" | "ground" | "digital" | "analog" | "passive";

export interface Pin {
  /** Unique within the part, e.g. "anode", "cathode", "pin1" */
  id: string;
  label: string;
  /** Offset from the part's origin, in grid units (pre-rotation) */
  x: number;
  y: number;
  type: PinElectricalType;
}

export interface PartDefinition {
  type: string; // "led" | "resistor" | "button" | "arduino-uno" ...
  displayName: string;
  widthUnits: number;
  heightUnits: number;
  pins: Pin[];
  defaultProperties: Record<string, unknown>;
}

export interface PartInstance {
  id: string; // unique instance id, e.g. "led-1"
  type: string; // references PartDefinition.type
  x: number; // canvas position (px), NOT grid units
  y: number;
  rotation: 0 | 90 | 180 | 270;
  properties: Record<string, unknown>;
}

export interface Wire {
  id: string;
  from: { partId: string; pinId: string };
  to: { partId: string; pinId: string };
}

export interface PinRef {
  partId: string;
  pinId: string;
}

/** Absolute position of a pin on the canvas, after applying part position + rotation */
export interface ResolvedPin extends PinRef {
  x: number;
  y: number;
  type: PinElectricalType;
}