import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

interface MosfetPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function MosfetPart({ part, selected, pinStates, netlist, onPinClick }: MosfetPartProps) {
  const def = partDefinitions.mosfet;

  const gateThresholdVoltage = (part.properties?.gateThresholdVoltage as number) ?? 2;

  const isOn = netlist?.hasFlag("mosfetOn", part.id) ?? false;
  const overloaded = netlist?.hasFlag("mosfetOverloaded", part.id) ?? false;
  const gateBlown = netlist?.hasFlag("mosfetGateBlown", part.id) ?? false;
  const damaged = overloaded || gateBlown;

  const tooltip = damaged
    ? gateBlown
      ? "MOSFET -- GATE BLOWN (Vgs exceeded rating -- gate oxide breakdown)"
      : "MOSFET -- BURNED OUT (drain current or Vds exceeded rating)"
    : `MOSFET (N-Channel) -- Vgs(th) ${gateThresholdVoltage.toFixed(1)}V -- ${isOn ? "ON (conducting)" : "OFF"}`;

  // TO-220 package geometry -- black flat-front body, rounded top corners,
  // a protruding metal mounting tab with a hole punched through it, three
  // legs exiting the bottom and bending straight down to the pin row.
  const bodyHalfW = 2.6 * GRID;
  const bodyTop = -4.4 * GRID;
  const bodyBottom = 2.6 * GRID;
  const cornerR = 5;

  const tabHalfW = 1.3 * GRID;
  const tabTop = bodyTop - 1.6 * GRID;

  const bodyFill = damaged ? "#1a1108" : "#0c0c0e";
  const outlineColor = damaged ? "#7f1d1d" : selected ? "#4da3ff" : "#000";
  const legColor = damaged ? "#4b2a2a" : "#c9c9c9";

  const bodyPathD = `
    M ${-bodyHalfW} ${bodyBottom}
    L ${-bodyHalfW} ${bodyTop + cornerR}
    Q ${-bodyHalfW} ${bodyTop} ${-bodyHalfW + cornerR} ${bodyTop}
    L ${bodyHalfW - cornerR} ${bodyTop}
    Q ${bodyHalfW} ${bodyTop} ${bodyHalfW} ${bodyTop + cornerR}
    L ${bodyHalfW} ${bodyBottom}
    Z
  `;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>{tooltip}</title>

      {/* Metal mounting tab, peeking above the body, with its hole */}
      <rect
        x={-tabHalfW}
        y={tabTop}
        width={tabHalfW * 2}
        height={bodyTop - tabTop + 6}
        rx={3}
        fill={damaged ? "#5c5c5c" : "#a8a8ac"}
        stroke="#6b6b70"
        strokeWidth={1}
      />
      <circle cx={0} cy={tabTop + (bodyTop - tabTop) * 0.45} r={4.5} fill="#0c0c0e" />
      <circle cx={0} cy={tabTop + (bodyTop - tabTop) * 0.45} r={4.5} fill="none" stroke="#6b6b70" strokeWidth={0.8} />

      {/* Main black body */}
      <path d={bodyPathD} fill={bodyFill} stroke={outlineColor} strokeWidth={selected ? 2.5 : 1.5} strokeLinejoin="round" />
    
      {/* Subtle top highlight, matching the reference photo's glossy plastic */}
      {!damaged && (
        <path
          d={`M ${-bodyHalfW + 4} ${bodyTop + cornerR}
              Q ${-bodyHalfW + 4} ${bodyTop + 4} ${-bodyHalfW + cornerR + 4} ${bodyTop + 4}
              L ${bodyHalfW - cornerR - 4} ${bodyTop + 4}`}
          fill="none"
          stroke="#3a3a3f"
          strokeWidth={1.5}
          opacity={0.6}
        />
      )}

      {/* Generic manufacturer-neutral marking */}
      <text
        x={0}
        y={(bodyTop + bodyBottom) / 2 + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={8.5}
        fontWeight={800}
        fill="#e5e5e5"
        fontFamily="system-ui, sans-serif"
        letterSpacing={0.5}
      >
        ST
      </text>

      {/* Conduction indicator */}
      {isOn && !damaged && (
        <circle cx={0} cy={bodyTop + 14} r={3} fill="#22c55e" opacity={0.9} />
      )}

      {damaged && <OvercurrentBurst cx={0} cy={0} size={bodyHalfW * 2.6} />}

      {/* Legs -- straight vertical drops, matching the photo's parallel
          bent legs (visually simplified to straight for clarity, same
          treatment the inductor/photoresistor already use) */}
      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={bodyBottom} x2={pin.x * GRID} y2={pin.y * GRID} color={legColor} width={2.5} />
          <Pin
            x={pin.x * GRID}
            y={pin.y * GRID}
            pinId={pin.id}
            label={pin.label}
            state={pinStates?.[pin.id]}
            onClick={(e) => onPinClick?.(pin.id, e)}
          />
        </g>
      ))}

      {/* G / D / S labels near each leg's exit point on the body */}
      {def.pins.map((pin) => (
        <text
          key={`label-${pin.id}`}
          x={pin.x * GRID}
          y={bodyBottom - 6}
          textAnchor="middle"
          fontSize={6}
          fontWeight={700}
          fill="#71717a"
        >
          {pin.label}
        </text>
      ))}
    </g>
  );
}