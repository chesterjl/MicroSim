import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { PinDot } from "../../components/parts/pin/PinDot";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

function hSeg(cx: number, cy: number, len: number, t: number) {
  const h = len / 2, ht = t / 2;
  return `${cx - h},${cy} ${cx - h + ht},${cy - ht} ${cx + h - ht},${cy - ht} ${cx + h},${cy} ${cx + h - ht},${cy + ht} ${cx - h + ht},${cy + ht}`;
}

function vSeg(cx: number, cy: number, len: number, t: number) {
  const h = len / 2, ht = t / 2;
  return `${cx},${cy - h} ${cx + ht},${cy - h + ht} ${cx + ht},${cy + h - ht} ${cx},${cy + h} ${cx - ht},${cy + h - ht} ${cx - ht},${cy - h + ht}`;
}

const OFF_COLOR = "#2a1512";
const ON_COLOR = "#ff8a1e";
const ON_GLOW = "#ffb066";
const CHARRED_BODY = "#1a1108";
const CHARRED_STROKE = "#7f1d1d";

interface SevenSegmentPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function SevenSegmentPart({ part, selected, pinStates, netlist, onPinClick }: SevenSegmentPartProps) {
  const def = partDefinitions["seven-segment"];
  const halfW = (def.widthUnits * GRID) / 2;
  const halfH = (def.heightUnits * GRID) / 2;

  const dHalfW = 17;
  const dHalfH = 30;
  const thickness = 7;
  const hLen = dHalfW * 2 - 6;
  const vLen = dHalfH - 4;

  const segPoints: Record<string, string> = {
    seg_a: hSeg(0, -dHalfH, hLen, thickness),
    seg_g: hSeg(0, 0, hLen, thickness),
    seg_d: hSeg(0, dHalfH, hLen, thickness),
    seg_f: vSeg(-dHalfW, -dHalfH / 2, vLen, thickness),
    seg_b: vSeg(dHalfW, -dHalfH / 2, vLen, thickness),
    seg_e: vSeg(-dHalfW, dHalfH / 2, vLen, thickness),
    seg_c: vSeg(dHalfW, dHalfH / 2, vLen, thickness),
  };

  // Same latch pattern as ResistorPart -- hasFlag alone would clear the
  // instant resolveVoltage stops re-flagging a destroyed part.
  const blown = (netlist?.hasFlag("sevenSegmentBlown", part.id) ?? false) || Boolean(part.properties?.destroyed);

  const isLit = (segId: string) => !blown && (netlist?.isSevenSegmentLit(part.id, segId) ?? false);
  const glow = (segId: string) => (isLit(segId) ? { filter: `drop-shadow(0 0 3px ${ON_GLOW})` } : undefined);

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>7-Segment Display{blown ? " -- BURNED OUT" : ""}</title>

      {/* Black plastic body */}
      <rect
        x={-halfW}
        y={-halfH}
        width={halfW * 2}
        height={halfH * 2}
        rx={4}
        fill={blown ? CHARRED_BODY : "#111111"}
        stroke={blown ? CHARRED_STROKE : selected ? "#4da3ff" : "#000000"}
        strokeWidth={blown || selected ? 2.5 : 1.5}
      />

      {!blown &&
        Object.entries(segPoints).map(([segId, points]) => (
          <polygon key={segId} points={points} fill={isLit(segId) ? ON_COLOR : OFF_COLOR} style={glow(segId)} />
        ))}

      {!blown && (
        <circle
          cx={dHalfW + 9}
          cy={dHalfH + 3}
          r={3.5}
          fill={isLit("seg_dp") ? ON_COLOR : OFF_COLOR}
          style={glow("seg_dp")}
        />
      )}

      {blown && <OvercurrentBurst cx={0} cy={0} size={Math.max(halfW, halfH) * 1.2} />}

      {def.pins.map((pin) => (
        <PinDot
          key={pin.id}
          x={pin.x * GRID}
          y={pin.y * GRID}
          pinId={pin.id}
          label={pin.label}
          state={pinStates?.[pin.id]}
          onClick={(e) => onPinClick?.(pin.id, e)}
        />
      ))}
    </g>
  );
}