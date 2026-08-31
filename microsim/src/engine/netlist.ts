import type { PartInstance, Wire } from "../types/types";
import { partDefinitions } from "../config/partDefinitions";

export type NetState = "high" | "low" | "floating";

export interface DigitalPinState {
  mode: "INPUT" | "OUTPUT" | "INPUT_PULLUP";
  value: "HIGH" | "LOW";
}

function pinKey(partId: string, pinId: string) {
  return `${partId}::${pinId}`;
}

export const CAPACITOR_HIGH_THRESHOLD_V = 2;

class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export interface Netlist {
  getPinState: (partId: string, pinId: string) => NetState;
  getPartBrightness: (partId: string) => number;
  getRgbChannelBrightness: (
    partId: string,
    channel: "red" | "green" | "blue"
  ) => number;
  isSevenSegmentLit: (partId: string, segmentId: string) => boolean;
  isRelayEnergized: (partId: string) => boolean;
  isPowered: (partId: string) => boolean;
  isActiveBuzzerSounding: (partId: string) => boolean;
  getAnalogVoltage: (partId: string, pinId: string) => number;
  getConnectedArduinoPin: (partId: string, pinId: string) => number | null;
  arePinsConnected: (partIdA: string, pinIdA: string, partIdB: string, pinIdB: string) => boolean;

  // Capacitor extensions
  getCapacitorStoredVoltage: (partId: string) => number;
  getExternalSupplyVoltage: (partId: string, pinId: string) => number;
  isNetGrounded: (partId: string, pinId: string) => boolean;
  getLoadResistanceOnNet: (partId: string, pinId: string) => number;
}

function calculateBrightness(totalOhms: number): number {
  if (totalOhms <= 0) return 1.0;
  if (totalOhms >= 100000) return 0;
  const baseOhms = 220;
  const ratio = baseOhms / totalOhms;
  return Math.max(0, Math.min(1, ratio));
}

function photoresistorOhms(lightLevel: number): number {
  const darkOhms = 1_000_000;
  const brightOhms = 100;
  const clamped = Math.max(0, Math.min(1, lightLevel));
  const logDark = Math.log10(darkOhms);
  const logBright = Math.log10(brightOhms);
  const logOhms = logDark + (logBright - logDark) * clamped;
  return Math.round(Math.pow(10, logOhms));
}

export function buildNetlist(
  parts: PartInstance[],
  wires: Wire[],
  digitalPins: Record<number, DigitalPinState>,
  isRunning: boolean = false
): Netlist {
  if (!isRunning) {
    return {
      getPinState: () => "floating",
      getPartBrightness: () => 0,
      getRgbChannelBrightness: () => 0,
      isSevenSegmentLit: () => false,
      isRelayEnergized: () => false,
      isPowered: () => false,
      isActiveBuzzerSounding: () => false,
      getAnalogVoltage: () => 0,
      getConnectedArduinoPin: () => null,
      arePinsConnected: () => false,
      getCapacitorStoredVoltage: (partId) => Number(parts.find((p) => p.id === partId)?.properties?.storedVoltage ?? 0),
      getExternalSupplyVoltage: () => 0,
      isNetGrounded: () => false,
      getLoadResistanceOnNet: () => 0,
    };
  }

  const uf = new UnionFind();

  for (const part of parts) {
    const def = partDefinitions[part.type];
    if (!def) continue;
    for (const pin of def.pins) uf.find(pinKey(part.id, pin.id));
  }

  for (const wire of wires) {
    uf.union(pinKey(wire.from.partId, wire.from.pinId), pinKey(wire.to.partId, wire.to.pinId));
  }

  for (const part of parts) {
    if (part.type === "resistor") {
      uf.union(pinKey(part.id, "pin1"), pinKey(part.id, "pin2"));
    }
  }

  for (const part of parts) {
    if (part.type === "photoresistor") {
      uf.union(pinKey(part.id, "pin1"), pinKey(part.id, "pin2"));
    }
  }

  for (const part of parts) {
    if (part.type !== "seven-segment") continue;
    uf.union(pinKey(part.id, "com1"), pinKey(part.id, "com2"));
  }

  for (const part of parts) {
    if (part.type !== "potentiometer") continue;
    const wiperPosition = (part.properties?.wiperPosition as number) ?? 0.5;
    if (wiperPosition >= 0.5) {
      uf.union(pinKey(part.id, "wiper"), pinKey(part.id, "pin2"));
    } else {
      uf.union(pinKey(part.id, "wiper"), pinKey(part.id, "pin1"));
    }
  }

  for (const part of parts) {
    if (part.type !== "uln2003-driver") continue;
    uf.union(pinKey(part.id, "in1"), pinKey(part.id, "outA"));
    uf.union(pinKey(part.id, "in2"), pinKey(part.id, "outB"));
    uf.union(pinKey(part.id, "in3"), pinKey(part.id, "outC"));
    uf.union(pinKey(part.id, "in4"), pinKey(part.id, "outD"));
    uf.union(pinKey(part.id, "vcc"), pinKey(part.id, "outCOM"));
  }

  for (const part of parts) {
    if (part.type !== "pushbutton") continue;
    uf.union(pinKey(part.id, "pin1"), pinKey(part.id, "pin2"));
    uf.union(pinKey(part.id, "pin3"), pinKey(part.id, "pin4"));
    if (part.properties?.pressed) {
      uf.union(pinKey(part.id, "pin1"), pinKey(part.id, "pin3"));
    }
  }

  for (const part of parts) {
    if (part.type !== "joystick") continue;
    if (part.properties?.pressed) {
      uf.union(pinKey(part.id, "sw"), pinKey(part.id, "gnd"));
    }
  }

  for (const part of parts) {
    if (part.type !== "toggle-switch") continue;
    if (part.properties?.on) {
      uf.union(pinKey(part.id, "pin1"), pinKey(part.id, "pin2"));
    }
  }

  const breadboards = parts.filter((p) => p.type.startsWith("breadboard"));
  for (const part of breadboards) {
    const def = partDefinitions[part.type];
    if (!def) continue;

    const columnGroups = new Map<string, { top: string[]; bottom: string[] }>();
    const railGroups: Record<string, string[]> = {
      pwr_top_plus: [],
      pwr_top_minus: [],
      pwr_bot_plus: [],
      pwr_bot_minus: [],
    };

    for (const pin of def.pins) {
      const colMatch = /^col_(\d+)_([a-j])$/.exec(pin.id);
      if (colMatch) {
        const [, colNum, row] = colMatch;
        const group = columnGroups.get(colNum) ?? { top: [], bottom: [] };
        if ("abcde".includes(row)) group.top.push(pin.id);
        else group.bottom.push(pin.id);
        columnGroups.set(colNum, group);
        continue;
      }
      const railMatch = /^pwr_(top|bot)_(plus|minus)_\d+$/.exec(pin.id);
      if (railMatch) {
        railGroups[`pwr_${railMatch[1]}_${railMatch[2]}`]?.push(pin.id);
      }
    }

    for (const group of columnGroups.values()) {
      for (let i = 1; i < group.top.length; i++) uf.union(pinKey(part.id, group.top[0]), pinKey(part.id, group.top[i]));
      for (let i = 1; i < group.bottom.length; i++) uf.union(pinKey(part.id, group.bottom[0]), pinKey(part.id, group.bottom[i]));
    }

    for (const pins of Object.values(railGroups)) {
      for (let i = 1; i < pins.length; i++) uf.union(pinKey(part.id, pins[0]), pinKey(part.id, pins[i]));
    }
  }

  const netGround = new Set<string>();
  const netPower = new Set<string>();
  const netDrivenHigh = new Set<string>();
  const netDrivenLow = new Set<string>();
  const netPullup = new Set<string>();
  const netVoltageSource = new Map<string, number>(); // root -> volts, for real sources only
  const netCapacitorVoltage = new Map<string, number>();
  const netCapacitorHigh = new Set<string>();

  function getSourceVoltageForPin(part: PartInstance, pinId: string): number | null {
    if (part.type === "battery") return Number(part.properties?.voltage ?? 9);
    if (part.type === "arduino-uno") {
      if (pinId === "5v") return 5;
      if (pinId === "3v3") return 3.3;
    }
    return 5;
  }

  for (const part of parts) {
    const def = partDefinitions[part.type];
    if (!def) continue;

    for (const pin of def.pins) {
      const root = uf.find(pinKey(part.id, pin.id));
      if (pin.type === "ground") netGround.add(root);
      if (pin.type === "power") {
        const isDeadBattery = part.type === "battery" && Number(part.properties?.voltage ?? 9) <= 0;
        if (!isDeadBattery) {
          netPower.add(root);
          const srcVoltage = getSourceVoltageForPin(part, pin.id);
          if (srcVoltage !== null) netVoltageSource.set(root, srcVoltage);
        }
      }
    }

    // Capacitor positive-pin state evaluation -- FIXED to match the actual
    // part types/pins from partDefinitions.ts ("capacitor-polarized" with
    // positive/negative, "capacitor-nonpolarized" with pin1/pin2).
    if (part.type === "capacitor-polarized" || part.type === "capacitor-nonpolarized") {
      const isPolarized = part.type === "capacitor-polarized";
      const positivePinId = isPolarized ? "positive" : "pin1";
      const root = uf.find(pinKey(part.id, positivePinId));
      const storedVoltage = Number(part.properties?.storedVoltage ?? 0);

      if (storedVoltage > 0.05) {
        netCapacitorVoltage.set(root, storedVoltage);
        if (storedVoltage >= CAPACITOR_HIGH_THRESHOLD_V) {
          netCapacitorHigh.add(root);
        }
      }
    }

    if (part.type === "arduino-uno") {
      for (const pin of def.pins) {
        const digitalMatch = /^d(\d+)$/.exec(pin.id);
        if (digitalMatch) {
          const root = uf.find(pinKey(part.id, pin.id));
          const state = digitalPins[Number(digitalMatch[1])];
          if (state?.mode === "OUTPUT") {
            (state.value === "HIGH" ? netDrivenHigh : netDrivenLow).add(root);
          } else if (state?.mode === "INPUT_PULLUP") {
            netPullup.add(root);
          }
        }
      }
    }
  }

  for (const part of parts) {
    if (part.type !== "ultrasonic-hcsr04") continue;

    const vccRoot = uf.find(pinKey(part.id, "vcc"));
    const gndRoot = uf.find(pinKey(part.id, "gnd"));
    const powered = netPower.has(vccRoot) && netGround.has(gndRoot);

    const echoRoot = uf.find(pinKey(part.id, "echo"));

    if (!isRunning) {
      const distanceCm = Number(part.properties?.distanceCm ?? 400);
      const thresholdCm = Number(part.properties?.detectionThresholdCm ?? 100);
      if (powered && distanceCm <= thresholdCm) {
        netDrivenHigh.add(echoRoot);
      } else {
        netDrivenLow.add(echoRoot);
      }
    }
  }

  function resolveNetState(root: string): NetState {
    if (netGround.has(root)) return "low";
    if (netDrivenLow.has(root)) return "low";
    if (netPower.has(root)) return "high";
    if (netDrivenHigh.has(root)) return "high";
    if (netPullup.has(root)) return "high";
    if (netCapacitorHigh.has(root)) return "high";
    return "floating";
  }

  function isPartPowered(partId: string): boolean {
    const vccRoot = uf.find(pinKey(partId, "vcc"));
    const gndRoot = uf.find(pinKey(partId, "gnd"));
    return netPower.has(vccRoot) && netGround.has(gndRoot);
  }

  const relayEnergized = new Set<string>();

  for (const part of parts) {
    if (part.type !== "relay") continue;

    const vccRoot = uf.find(pinKey(part.id, "vcc"));
    const gndRoot = uf.find(pinKey(part.id, "gnd"));
    const coilPowered = netPower.has(vccRoot) && netGround.has(gndRoot);

    const inState = resolveNetState(uf.find(pinKey(part.id, "in")));
    const activeLow = part.properties?.activeLow !== false;
    const triggered = activeLow ? inState === "low" : inState === "high";

    const energized = coilPowered && triggered;
    if (energized) relayEnergized.add(part.id);

    if (energized) {
      uf.union(pinKey(part.id, "com"), pinKey(part.id, "no"));
    } else {
      uf.union(pinKey(part.id, "com"), pinKey(part.id, "nc"));
    }
  }

  function isActiveBuzzerSoundingImpl(partId: string): boolean {
    const posRoot = uf.find(pinKey(partId, "positive"));
    const negRoot = uf.find(pinKey(partId, "negative"));
    return resolveNetState(posRoot) === "high" && resolveNetState(negRoot) === "low";
  }

  const netVoltageOverride = new Map<string, number>();

  function resolveNetVoltage(root: string): number {
    if (netVoltageOverride.has(root)) return netVoltageOverride.get(root)!;
    if (netGround.has(root)) return 0;
    if (netVoltageSource.has(root)) return netVoltageSource.get(root)!;
    if (netCapacitorVoltage.has(root)) return netCapacitorVoltage.get(root)!;
    return 0;
  }

  for (const part of parts) {
    if (part.type !== "potentiometer") continue;
    const pin1Root = uf.find(pinKey(part.id, "pin1"));
    const pin2Root = uf.find(pinKey(part.id, "pin2"));
    const wiperRoot = uf.find(pinKey(part.id, "wiper"));
    const wiperPosition = (part.properties?.wiperPosition as number) ?? 0.5;

    const pin1V = resolveNetVoltage(pin1Root);
    const pin2V = resolveNetVoltage(pin2Root);
    netVoltageOverride.set(wiperRoot, pin1V + (pin2V - pin1V) * wiperPosition);
  }

  for (const part of parts) {
    if (part.type !== "joystick") continue;

    const vccRoot = uf.find(pinKey(part.id, "vcc"));
    const gndRoot = uf.find(pinKey(part.id, "gnd"));
    const powered = netPower.has(vccRoot) && netGround.has(gndRoot);
    const vccVoltage = powered ? resolveNetVoltage(vccRoot) : 0;

    const xPos = (part.properties?.x as number) ?? 0.5;
    const yPos = (part.properties?.y as number) ?? 0.5;

    const vrxRoot = uf.find(pinKey(part.id, "vrx"));
    const vryRoot = uf.find(pinKey(part.id, "vry"));

    netVoltageOverride.set(vrxRoot, powered ? vccVoltage * xPos : 0);
    netVoltageOverride.set(vryRoot, powered ? vccVoltage * yPos : 0);
  }

  for (const part of parts) {
    if (part.type !== "keypad-4x4") continue;
    const pressedRow = part.properties?.pressedRow;
    const pressedCol = part.properties?.pressedCol;
    if (typeof pressedRow === "number" && typeof pressedCol === "number") {
      uf.union(pinKey(part.id, `row${pressedRow + 1}`), pinKey(part.id, `col${pressedCol + 1}`));
    }
  }

  function getConnectedArduinoPinImpl(partId: string, pinId: string): number | null {
    const targetRoot = uf.find(pinKey(partId, pinId));
    for (const part of parts) {
      if (part.type !== "arduino-uno") continue;
      for (let i = 0; i <= 13; i++) {
        if (uf.find(pinKey(part.id, `d${i}`)) === targetRoot) return i;
      }
    }
    return null;
  }

  function sumSeriesResistance(componentRoots: Set<string>): number {
    let totalOhms = 0;

    for (const p of parts) {
      if (p.type === "resistor") {
        const rRoot = uf.find(pinKey(p.id, "pin1"));
        if (componentRoots.has(rRoot)) {
          const rawRes = p.properties?.resistance;
          const ohms = typeof rawRes === "number" ? rawRes : parseFloat(String(rawRes)) || 220;
          totalOhms += ohms;
        }
      } else if (p.type === "potentiometer") {
        const p1Root = uf.find(pinKey(p.id, "pin1"));
        const wiperRoot = uf.find(pinKey(p.id, "wiper"));
        const p2Root = uf.find(pinKey(p.id, "pin2"));

        if (componentRoots.has(p1Root) || componentRoots.has(wiperRoot) || componentRoots.has(p2Root)) {
          const maxRes = (p.properties?.maxResistance as number) ?? 10000;
          let ohms = p.properties?.value as number;
          if (ohms === undefined && typeof p.properties?.wiperPosition === "number") {
            ohms = Math.round(maxRes * p.properties.wiperPosition);
          }
          if (ohms === undefined) ohms = 5000;
          totalOhms += ohms;
        }
      } else if (p.type === "photoresistor") {
        const r1Root = uf.find(pinKey(p.id, "pin1"));
        if (componentRoots.has(r1Root)) {
          const lightLevel = (p.properties?.lightLevel as number) ?? 0.5;
          totalOhms += photoresistorOhms(lightLevel);
        }
      }
    }

    return totalOhms;
  }

  function calculatePartBrightness(partId: string): number {
    const part = parts.find((p) => p.id === partId);
    if (!part) return 0;

    const def = partDefinitions[part.type];
    if (!def) return 0;

    if (part.type === "led") {
      const anodeRoot = uf.find(pinKey(part.id, "anode"));
      const cathodeRoot = uf.find(pinKey(part.id, "cathode"));

      const anodeState = resolveNetState(anodeRoot);
      const cathodeState = resolveNetState(cathodeRoot);

      if (anodeState !== "high" || cathodeState !== "low") {
        return 0;
      }
    } else {
      const componentRoots = new Set(def.pins.map((pin) => uf.find(pinKey(part.id, pin.id))));
      let hasHigh = false;
      let hasLow = false;

      for (const root of componentRoots) {
        const state = resolveNetState(root);
        if (state === "high") hasHigh = true;
        if (state === "low") hasLow = true;
      }

      if (!hasHigh || !hasLow) return 0;
    }

    const componentRoots = new Set(def.pins.map((pin) => uf.find(pinKey(part.id, pin.id))));
    const totalOhms = sumSeriesResistance(componentRoots);

    return calculateBrightness(totalOhms > 0 ? totalOhms : 220);
  }

  function isSevenSegmentLitImpl(partId: string, segmentId: string): boolean {
    const part = parts.find((p) => p.id === partId && p.type === "seven-segment");
    if (!part) return false;

    const commonType = (part.properties?.commonType as string) ?? "cathode";
    const commonRoot = uf.find(pinKey(partId, "com1"));
    const segRoot = uf.find(pinKey(partId, segmentId));

    const commonState = resolveNetState(commonRoot);
    const segState = resolveNetState(segRoot);

    if (commonType === "cathode") {
      return commonState === "low" && segState === "high";
    }
    return commonState === "high" && segState === "low";
  }

  function calculateRgbChannelBrightness(partId: string, channel: "red" | "green" | "blue"): number {
    const part = parts.find((p) => p.id === partId);
    if (!part || part.type !== "rgb-led") return 0;

    const channelRoot = uf.find(pinKey(part.id, channel));
    const gndRoot = uf.find(pinKey(part.id, "gnd"));

    const channelState = resolveNetState(channelRoot);
    const gndState = resolveNetState(gndRoot);

    if (channelState !== "high" || gndState !== "low") {
      return 0;
    }

    let totalOhms = 0;

    for (const p of parts) {
      if (p.type === "resistor") {
        const r1Root = uf.find(pinKey(p.id, "pin1"));
        const r2Root = uf.find(pinKey(p.id, "pin2"));

        if (r1Root === channelRoot || r2Root === channelRoot) {
          const rawRes = p.properties?.resistance;
          const ohms = typeof rawRes === "number" ? rawRes : parseFloat(String(rawRes)) || 220;
          totalOhms += ohms;
        }
      } else if (p.type === "photoresistor") {
        const r1Root = uf.find(pinKey(p.id, "pin1"));
        const r2Root = uf.find(pinKey(p.id, "pin2"));
        if (r1Root === channelRoot || r2Root === channelRoot) {
          const lightLevel = (p.properties?.lightLevel as number) ?? 0.5;
          totalOhms += photoresistorOhms(lightLevel);
        }
      }
    }

    return calculateBrightness(totalOhms > 0 ? totalOhms : 220);
  }

  return {
    getPinState: (partId, pinId) => resolveNetState(uf.find(pinKey(partId, pinId))),
    getPartBrightness: (partId) => calculatePartBrightness(partId),
    getRgbChannelBrightness: (partId, channel) => calculateRgbChannelBrightness(partId, channel),
    isSevenSegmentLit: (partId, segmentId) => isSevenSegmentLitImpl(partId, segmentId),
    isRelayEnergized: (partId) => relayEnergized.has(partId),
    isPowered: (partId) => isPartPowered(partId),
    isActiveBuzzerSounding: (partId) => isActiveBuzzerSoundingImpl(partId),
    getAnalogVoltage: (partId, pinId) => resolveNetVoltage(uf.find(pinKey(partId, pinId))),
    getConnectedArduinoPin: (partId, pinId) => getConnectedArduinoPinImpl(partId, pinId),
    arePinsConnected: (partIdA, pinIdA, partIdB, pinIdB) => uf.find(pinKey(partIdA, pinIdA)) === uf.find(pinKey(partIdB, pinIdB)),

    getCapacitorStoredVoltage: (partId) => Number(parts.find((p) => p.id === partId)?.properties?.storedVoltage ?? 0),
    getExternalSupplyVoltage: (partId, pinId) => {
      const root = uf.find(pinKey(partId, pinId));
      return netVoltageSource.get(root) ?? 0;
    },
    isNetGrounded: (partId, pinId) => {
      const root = uf.find(pinKey(partId, pinId));
      return netGround.has(root);
    },
    getLoadResistanceOnNet: (partId, pinId) => {
      const root = uf.find(pinKey(partId, pinId));
      return sumSeriesResistance(new Set([root]));
    },
  };
}