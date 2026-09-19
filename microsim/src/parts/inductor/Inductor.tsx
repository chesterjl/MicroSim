import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { OvercurrentBurst } from "../../components/parts/effects/OvercurrentBurst";

const CHARRED_BODY = "#1a1108";
const CHARRED_STROKE = "#7f1d1d";

interface InductorPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

// Visible wire wraps rendered around the toroid core -- purely cosmetic,
// not tied to any real turn count property.
const NUM_WRAPS = 26;

export function InductorPart({ part, selected, pinStates, netlist, onPinClick }: InductorPartProps) {
  const def = partDefinitions.inductor;

  const inductanceValue = (part.properties?.inductanceValue as number) ?? 100;
  const inductanceUnit = (part.properties?.inductanceUnit as string) ?? "µH";
  const storedCurrent = (part.properties?.storedCurrent as number) ?? 0;

  const overloaded = netlist?.hasFlag("inductorOverloaded", part.id) ?? false;

  const tooltip = overloaded
    ? `Inductor -- BURNED OUT (${storedCurrent.toFixed(2)}A exceeded rated current)`
    : `Inductor -- ${inductanceValue}${inductanceUnit} -- ${storedCurrent.toFixed(2)}A`;

  // Toroid core geometry -- a copper wire wound around a donut-shaped
  // ferrite ring, viewed roughly head-on like the real component. Drawn
  // as a squashed ellipse so it reads as slightly tilted, matching the
  // reference photo instead of a flat top-down circle.
  const outerR = 2.6 * GRID;
  const innerR = 1.1 * GRID;
  const squash = 0.82;
  const ringBottomY = outerR * squash - 3;

  const coreFill = overloaded ? CHARRED_BODY : "#3a2c18"; // dark ferrite peeking through winding gaps
  const copperColor = overloaded ? "#5c2b2b" : "#e0894a"; // single-tone copper, per request

  const wraps = Array.from({ length: NUM_WRAPS }, (_, i) => {
    const angle = (i / NUM_WRAPS) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x1: cos * (innerR + 1),
      y1: sin * (innerR + 1) * squash,
      x2: cos * (outerR - 1),
      y2: sin * (outerR - 1) * squash,
    };
  });

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>{tooltip}</title>

      {/* Ferrite core ring, showing through the gaps between windings */}
      <ellipse
        cx={0}
        cy={0}
        rx={outerR}
        ry={outerR * squash}
        fill={coreFill}
        stroke={overloaded ? CHARRED_STROKE : "#5c4322"}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      <ellipse cx={0} cy={0} rx={innerR} ry={innerR * squash} fill={overloaded ? "#0f0906" : "#161616"} />

      {/* Wound copper wire -- many short radial strokes around the ring,
          single-tone so it reads as one continuous coil of wire */}
      {!overloaded &&
        wraps.map((w, i) => (
          <line
            key={i}
            x1={w.x1}
            y1={w.y1}
            x2={w.x2}
            y2={w.y2}
            stroke={copperColor}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}

      {overloaded && (
        <ellipse
          cx={0}
          cy={0}
          rx={outerR}
          ry={outerR * squash}
          fill="none"
          stroke={CHARRED_STROKE}
          strokeWidth={2}
          strokeDasharray="3 3"
        />
      )}

      {selected && !overloaded && (
        <ellipse
          cx={0}
          cy={0}
          rx={outerR + 3}
          ry={outerR * squash + 3}
          fill="none"
          stroke="#4da3ff"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}

      {overloaded && <OvercurrentBurst cx={0} cy={0} size={outerR * 1.5} />}

      {/* Legs -- straight vertical drops from the ring's bottom edge down
          to each pin, same pattern as the photoresistor's PinLeg usage */}
      {def.pins.map((pin) => (
        <g key={pin.id}>
          <PinLeg x1={pin.x * GRID} y1={ringBottomY} x2={pin.x * GRID} y2={pin.y * GRID} />
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
    </g>
  );
}