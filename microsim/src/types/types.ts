export const GRID = 10;

export type PinElectricalType = "power" | "ground" | "digital" | "analog" | "passive";

export interface Pin {
  id: string;
  label: string;
  x: number;
  y: number;
  type: PinElectricalType;
}

export interface PartDefinition {
  type: string;
  displayName: string;
  widthUnits: number;
  heightUnits: number;
  pins: Pin[];
  defaultProperties: Record<string, unknown>;
}

export interface PartInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  properties: Record<string, unknown>;
}

export interface Wire {
  id: string;
  from: { partId: string; pinId: string };
  to: { partId: string; pinId: string };
  color?: string; // Custom color per wire instance
  waypoints?: { x: number; y: number }[]; // Canvas click points for corners
}

export interface PinRef {
  partId: string;
  pinId: string;
}

export interface ResolvedPin extends PinRef {
  x: number;
  y: number;
  type: PinElectricalType;
}