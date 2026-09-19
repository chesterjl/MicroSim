import { useEffect, useRef, useState } from "react";
import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState, Netlist } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { useCircuitStore } from "../../store/circuitStore";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";
import { MAX_CURRENT_LIMIT, MAX_VOLTAGE, MIN_CURRENT_LIMIT, MIN_VOLTAGE, powerSupplySourceId } from "./powerSupply.ts";

interface PowerSupplyPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  isSimulating?: boolean;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

type KnobMode = "voltage" | "current";

const VOLTAGE_STEP = 0.1;
const CURRENT_STEP = 0.01;
const KNOB_MIN_ANGLE = -135;
const KNOB_MAX_ANGLE = 135;
const KNOB_SWEEP = KNOB_MAX_ANGLE - KNOB_MIN_ANGLE;
const CLICK_MOVE_THRESHOLD_PX = 4;

interface KnobDragState {
  pointerId: number;
  mode: KnobMode;
  centerX: number;
  centerY: number;
  moved: boolean;
}

export function PowerSupplyPart({
  part,
  selected,
  pinStates,
  netlist,
  isSimulating,
  onPinClick,
}: PowerSupplyPartProps) {
  const def = partDefinitions["power-supply"];
  const updatePartProperties = useCircuitStore((s) => s.updatePartProperties);

  const poweredOn = Boolean(part.properties?.poweredOn);
  // When simulation stops, automatically switch the power supply OFF.
  // The setpoints (voltageSetpoint & currentLimitAmps) remain saved in part.properties.
  useEffect(() => {
    if (!isSimulating && poweredOn) {
      updatePartProperties(part.id, { poweredOn: false });
    }
  }, [isSimulating, poweredOn, part.id, updatePartProperties]);

  const voltageSetpoint = Math.min(
    MAX_VOLTAGE,
    Math.max(MIN_VOLTAGE, Number(part.properties?.voltageSetpoint ?? 5))
  );

  const currentLimitAmps = Math.min(
    MAX_CURRENT_LIMIT,
    Math.max(MIN_CURRENT_LIMIT, Number(part.properties?.currentLimitAmps ?? 1))
  );

  const realCurrentAmps = isSimulating && poweredOn
      ? Math.abs(netlist?.getSourceCurrent(powerSupplySourceId(part.id)) ?? 0)
      : 0;

  const [flickerCurrent, setFlickerCurrent] = useState<number | null>(null);
  const flickerIntervalRef = useRef<number | null>(null);
  const flickerTimeoutRef = useRef<number | null>(null);

  function startFlicker() {
    if (flickerTimeoutRef.current) window.clearTimeout(flickerTimeoutRef.current);
    if (flickerIntervalRef.current) window.clearInterval(flickerIntervalRef.current);
    flickerIntervalRef.current = window.setInterval(() => {
      setFlickerCurrent(Math.random() * Math.max(currentLimitAmps, 0.5));
    }, 55);
  }

  function scheduleStopFlicker() {
    if (flickerTimeoutRef.current) window.clearTimeout(flickerTimeoutRef.current);
    flickerTimeoutRef.current = window.setTimeout(() => {
      if (flickerIntervalRef.current) window.clearInterval(flickerIntervalRef.current);
      flickerIntervalRef.current = null;
      setFlickerCurrent(null);
    }, 350);
  }

  useEffect(() => {
    return () => {
      if (flickerIntervalRef.current) window.clearInterval(flickerIntervalRef.current);
      if (flickerTimeoutRef.current) window.clearTimeout(flickerTimeoutRef.current);
    };
  }, []);

  const displayCurrent = flickerCurrent ?? realCurrentAmps;
  const displayCurrentMa = Math.round(displayCurrent * 1000);

  const dragRef = useRef<KnobDragState | null>(null);

  function commitVoltage(next: number) {
    const clamped = Math.min(
      MAX_VOLTAGE,
      Math.max(MIN_VOLTAGE, Math.round(next / VOLTAGE_STEP) * VOLTAGE_STEP)
    );
    if (Math.abs(clamped - voltageSetpoint) > 1e-6) {
      updatePartProperties(part.id, { voltageSetpoint: clamped });
    }
  }

  function commitCurrentLimit(next: number) {
    const clamped = Math.min(
      MAX_CURRENT_LIMIT,
      Math.max(MIN_CURRENT_LIMIT, Math.round(next / CURRENT_STEP) * CURRENT_STEP)
    );
    if (Math.abs(clamped - currentLimitAmps) > 1e-6) {
      updatePartProperties(part.id, { currentLimitAmps: clamped });
    }
  }

  function handleKnobPointerDown(mode: KnobMode) {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      if (!isSimulating) return; // Prevent adjustment when simulation is stopped
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      const rect = e.currentTarget.getBoundingClientRect();
      dragRef.current = {
        pointerId: e.pointerId,
        mode,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        moved: false,
      };
      startFlicker();
    };
  }

  function handleKnobPointerMove(e: React.PointerEvent<SVGCircleElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !isSimulating) return;

    const dx = e.clientX - drag.centerX;
    const dy = e.clientY - drag.centerY;
    if (Math.hypot(dx, dy) > CLICK_MOVE_THRESHOLD_PX) drag.moved = true;

    let angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI);
    angleDeg = Math.max(KNOB_MIN_ANGLE, Math.min(KNOB_MAX_ANGLE, angleDeg));
    const ratio = (angleDeg - KNOB_MIN_ANGLE) / KNOB_SWEEP;

    if (drag.mode === "voltage") {
      commitVoltage(MIN_VOLTAGE + ratio * (MAX_VOLTAGE - MIN_VOLTAGE));
    } else {
      commitCurrentLimit(MIN_CURRENT_LIMIT + ratio * (MAX_CURRENT_LIMIT - MIN_CURRENT_LIMIT));
    }
  }

  function handleKnobPointerUp(mode: KnobMode) {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      e.currentTarget.releasePointerCapture(e.pointerId);

      if (!drag.moved && isSimulating) {
        const rect = e.currentTarget.getBoundingClientRect();
        const direction = e.clientX > rect.left + rect.width / 2 ? 1 : -1;
        if (mode === "voltage") {
          commitVoltage(voltageSetpoint + direction * VOLTAGE_STEP);
        } else {
          commitCurrentLimit(currentLimitAmps + direction * CURRENT_STEP);
        }
      }

      dragRef.current = null;
      scheduleStopFlicker();
    };
  }

  function handlePowerToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isSimulating) return; // Prevent turning on/off while simulation is stopped
    updatePartProperties(part.id, { poweredOn: !poweredOn });
  }

  const chassisW = def.widthUnits * GRID;
  const chassisH = def.heightUnits * GRID;
  const halfW = chassisW / 2;
  const halfH = chassisH / 2;

  const panelInset = 6;
  const panelX = -halfW + panelInset;
  const panelY = -halfH + panelInset;
  const panelW = chassisW - panelInset * 2;
  const panelH = chassisH - panelInset * 2;

  const knobR = 17;
  const knobGap = 14;
  const leftZoneStart = panelX + 14;

  const voltageKnobCx = leftZoneStart + knobR;
  const currentKnobCx = voltageKnobCx + knobR * 2 + knobGap;
  const knobCy = panelY + panelH * 0.26;

  const dividerX = currentKnobCx + knobR + 20;

  const switchCx = (voltageKnobCx + currentKnobCx) / 2;
  const switchCy = panelY + panelH * 0.74;
  const switchW = knobR * 2.6;
  const switchH = 34;

  const screenMargin = 14;
  const screenX = dividerX + screenMargin;
  const screenW = panelX + panelW - screenX;
  const screenY = panelY + panelH * 0.08;
  const screenH = panelH * 0.6;
  
  const voltageAngle =
    KNOB_MIN_ANGLE +
    ((voltageSetpoint - MIN_VOLTAGE) / (MAX_VOLTAGE - MIN_VOLTAGE)) * KNOB_SWEEP;
  const currentAngle =
    KNOB_MIN_ANGLE +
    ((currentLimitAmps - MIN_CURRENT_LIMIT) / (MAX_CURRENT_LIMIT - MIN_CURRENT_LIMIT)) *
      KNOB_SWEEP;

  function Knob({
    cx,
    cy,
    angle,
    mode,
    accentColor,
    disabled,
  }: {
    cx: number;
    cy: number;
    angle: number;
    mode: KnobMode;
    accentColor: string;
    disabled: boolean;
  }) {
    return (
      <g opacity={disabled ? 0.5 : 1}>
        <circle cx={cx} cy={cy} r={knobR + 4} fill="#111827" stroke="#020617" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={knobR} fill="#1f2937" stroke="#0f172a" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={knobR - 5} fill={accentColor} />
        <circle cx={cx} cy={cy - 4} r={knobR - 9} fill="#ffffff" opacity={0.18} />

        <g transform={`rotate(${angle} ${cx} ${cy})`}>
          <circle cx={cx} cy={cy - (knobR - 8)} r={2.4} fill="#ffffff" />
        </g>

        {[KNOB_MIN_ANGLE, 0, KNOB_MAX_ANGLE].map((tick) => (
          <line
            key={tick}
            x1={cx}
            y1={cy - (knobR + 2)}
            x2={cx}
            y2={cy - (knobR + 5)}
            stroke="#475569"
            strokeWidth={1}
            transform={`rotate(${tick} ${cx} ${cy})`}
          />
        ))}

        <circle
          cx={cx}
          cy={cy}
          r={knobR + 4}
          fill="transparent"
          style={{ cursor: isSimulating ? "grab" : "not-allowed" }}
          onPointerDown={handleKnobPointerDown(mode)}
          onPointerMove={handleKnobPointerMove}
          onPointerUp={handleKnobPointerUp(mode)}
        />
      </g>
    );
  }

  const isDisplayActive = isSimulating && poweredOn;

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <title>
        {isDisplayActive
          ? `DC Power Supply -- ${voltageSetpoint.toFixed(1)}V, limit ${currentLimitAmps.toFixed(2)}A`
          : "DC Power Supply -- OFF"}
      </title>

      {/* Outer chassis */}
      <rect
        x={-halfW}
        y={-halfH}
        width={chassisW + 5}
        height={chassisH}
        rx={8}
        fill="#2d3238"
        stroke={selected ? "#3b82f6" : "#1e2227"}
        strokeWidth={selected ? 3 : 2}
      />

      {/* Front panel */}
      <rect x={panelX} y={panelY} width={panelW + 5} height={panelH} rx={5} fill="#e2e8f0" />

      {/* Divider */}
      <line x1={dividerX} y1={panelY} x2={dividerX} y2={panelY + panelH} stroke="#cbd5e1" strokeWidth={1.5} />

      {/* Voltage + current knobs */}
      <Knob cx={voltageKnobCx} cy={knobCy} angle={voltageAngle} mode="voltage" accentColor="#f59e0b" disabled={!isSimulating} />
      <Knob cx={currentKnobCx} cy={knobCy} angle={currentAngle} mode="current" accentColor="#3b82f6" disabled={!isSimulating} />

      <text x={voltageKnobCx} y={knobCy + knobR + 14} textAnchor="middle" fontSize={7} fontWeight={700} fill="#475569">
        VOLTS
      </text>
      <text x={currentKnobCx} y={knobCy + knobR + 14} textAnchor="middle" fontSize={7} fontWeight={700} fill="#475569">
        AMPS
      </text>

      {/* Power rocker switch */}
      <g onClick={handlePowerToggle} style={{ cursor: isSimulating ? "pointer" : "not-allowed" }} opacity={!isSimulating ? 0.5 : 1}>
        <rect
          x={switchCx - switchW / 2}
          y={switchCy - switchH / 2}
          width={switchW}
          height={switchH}
          rx={6}
          fill="#0f172a"
          stroke="#020617"
          strokeWidth={1.5}
        />
        <rect
          x={switchCx - switchW / 2 + 3}
          y={switchCy - switchH / 2 + 3}
          width={switchW - 6}
          height={switchH - 6}
          rx={4}
          fill="#1e293b"
        />
        <rect
          x={switchCx - switchW / 2 + 4}
          y={isDisplayActive ? switchCy - switchH / 2 + 4 : switchCy + 1}
          width={switchW - 8}
          height={switchH / 2 - 5}
          rx={3}
          fill={isDisplayActive ? "#22c55e" : "#64748b"}
        />
        <circle cx={switchCx} cy={isDisplayActive ? switchCy - switchH / 4 : switchCy + switchH / 4} r={2.5} fill="#0f172a" opacity={0.6} />
      </g>
      
      <text x={switchCx} y={switchH + switchCy - 5} textAnchor="middle" fontSize={6.5} fontWeight={700} fill="#475569">
        POWER
      </text>

      {/* Readout screen */}
      <rect x={screenX} y={screenY} width={screenW} height={screenH} rx={4} fill="#180505" stroke="#000" strokeWidth={1.5} />

      <text
        x={screenX + screenW - 28}
        y={screenY + screenH * 0.42}
        textAnchor="end"
        fontSize={25}
        fontWeight={800}
        fill={isDisplayActive ? "#ff2222" : "#4a1111"}
        fontFamily="monospace"
        letterSpacing={1}
      >
        {isDisplayActive ? voltageSetpoint.toFixed(1) : "0.0"}
      </text>
      <text x={screenX + screenW - 20} y={screenY + screenH * 0.42} fontSize={10} fontWeight={700} fill={isDisplayActive ? "#ff2222" : "#4a1111"}>
        V
      </text>

      <text
        x={screenX + screenW - 28}
        y={screenY + screenH * 0.88}
        textAnchor="end"
        fontSize={21}
        fontWeight={800}
        fill={isDisplayActive ? "#ff2222" : "#4a1111"}
        fontFamily="monospace"
        letterSpacing={1}
      >
        {isDisplayActive ? displayCurrentMa : "0"}
      </text>
      <text x={screenX + screenW - 20} y={screenY + screenH * 0.88} fontSize={9} fontWeight={700} fill={isDisplayActive ? "#ff2222" : "#4a1111"}>
        mA
      </text>

      {/* Binding posts + pins */}
      {def.pins.map((pin) => {
        const isPositive = pin.id === "positive";
        const pinX = pin.x * GRID;
        const pinY = pin.y * GRID;

        return (
          <g key={pin.id}>
            <circle cx={pinX} cy={pinY} r={10} fill={isPositive ? "#7f1d1d" : "#090d16"} />
            <circle cx={pinX} cy={pinY} r={6} fill={isPositive ? "#ef4444" : "#334155"} />
            <circle cx={pinX} cy={pinY} r={3} fill={isPositive ? "#7f1d1d" : "#0f172a"} />

            <PinLeg x1={pinX} y1={pinY} x2={pinX} y2={pinY} color={isPositive ? "#7f1d1d" : "#0f172a"} />
            <Pin
              x={pinX}
              y={pinY}
              pinId={pin.id}
              label={`${pin.label}${isDisplayActive ? ` (${voltageSetpoint.toFixed(1)}V)` : ""}`}
              state={pinStates?.[pin.id]}
              onClick={(e) => onPinClick?.(pin.id, e)}
            />
          </g>
        );
      })}
    </g>
  );
}