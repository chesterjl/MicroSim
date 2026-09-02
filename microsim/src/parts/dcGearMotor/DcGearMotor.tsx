import React from 'react';
import { GRID } from "../../types/types";
import type { PartInstance } from "../../types/types";
import type { NetState } from "../../engine/netlist";
import { partDefinitions } from "../../config/partDefinitions";
import { Pin } from "../../components/parts/pin/Pin";
import { PinLeg } from "../../components/parts/pin/PinLeg";

interface DcGearMotorPartProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export function DcGearMotorPart({ part, selected, pinStates, onPinClick }: DcGearMotorPartProps) {
  const def = partDefinitions["dc-gearmotor"];

  const isForward = pinStates?.positive === "HIGH" && pinStates?.negative === "LOW";
  const isReversed = pinStates?.positive === "LOW" && pinStates?.negative === "HIGH";
  const isSpinning = isForward || isReversed;

  const gearboxW = 66;
  const gearboxTop = -92;
  const gearboxBottom = 38;
  const motorBottom = 70;
  const connectorBottom = 96;
  const shaftTipY = 118;

  const wingY = gearboxTop + 32;
  const wingH = 16;
  const wingCenterY = wingY + wingH / 2;
  const wingW = 50;

  const leftWingX = -gearboxW / 2 - wingW;
  const rightWingX = gearboxW / 2;

  const negPin = def.pins.find((p) => p.id === "negative") ?? def.pins[0];
  const posPin = def.pins.find((p) => p.id === "positive") ?? def.pins[1];

  return (
    <g transform={`translate(${part.x}, ${part.y}) rotate(${part.rotation ?? 0})`}>
      <style>
        {`
          @keyframes pitchRotationForward {
            0% {
              transform: rotateX(0deg);
            }
            100% {
              transform: rotateX(360deg);
            }
          }
          @keyframes pitchRotationReverse {
            0% {
              transform: rotateX(360deg);
            }
            100% {
              transform: rotateX(0deg);
            }
          }
          @keyframes shaftSpinCw {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes shaftSpinCcw {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          .dual-wing-rotor {
            transform-style: preserve-3d;
          }
          .dual-wing-rotor.spinning-forward {
            animation: pitchRotationForward 0.35s linear infinite;
          }
          .dual-wing-rotor.spinning-reverse {
            animation: pitchRotationReverse 0.35s linear infinite;
          }
          .shaft-indicator.spinning-forward {
            animation: shaftSpinCw 0.35s linear infinite;
          }
          .shaft-indicator.spinning-reverse {
            animation: shaftSpinCcw 0.35s linear infinite;
          }
        `}
      </style>

      {/* Top shaft nub */}
      <rect x={-6} y={gearboxTop - 15} width={12} height={15} rx={2} fill="#f4d128" />

      {/* Yellow gearbox body */}
      <rect
        x={-gearboxW / 2}
        y={gearboxTop}
        width={gearboxW}
        height={gearboxBottom - gearboxTop}
        rx={6}
        fill="#f4d128"
        stroke={selected ? "#4da3ff" : "#c9a916"}
        strokeWidth={selected ? 2.5 : 1.2}
      />

      {/* 1. LEFT DUAL-WING ROTOR ASSEMBLY */}
      <g
        className={`dual-wing-rotor ${
          isSpinning ? (isForward ? "spinning-forward" : "spinning-reverse") : ""
        }`}
        style={{ transformOrigin: `${leftWingX + wingW / 2}px ${wingCenterY}px` }}
      >
        {/* Rear 3D Wing Shadow Layer */}
        <g style={{ transform: "translateZ(-3px) translateY(2px)" }}>
          <rect x={leftWingX} y={wingY} width={wingW + 4} height={wingH} rx={6} fill="#64748b" stroke="#475569" strokeWidth={1} />
        </g>
        {/* Front Wing Surface with Directional Color Marker */}
        <g style={{ transform: "translateZ(3px)" }}>
          <rect x={leftWingX} y={wingY} width={wingW + 4} height={wingH} rx={6} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />
        </g>
      </g>

      {/* 2. RIGHT DUAL-WING ROTOR ASSEMBLY */}
      <g
        className={`dual-wing-rotor ${
          isSpinning ? (isForward ? "spinning-forward" : "spinning-reverse") : ""
        }`}
        style={{ transformOrigin: `${rightWingX + wingW / 2 - 2}px ${wingCenterY}px` }}
      >
        {/* Rear 3D Wing Shadow Layer */}
        <g style={{ transform: "translateZ(-3px) translateY(2px)" }}>
          <rect x={rightWingX - 4} y={wingY} width={wingW + 4} height={wingH} rx={6} fill="#64748b" stroke="#475569" strokeWidth={1} />
        </g>
        {/* Front Wing Surface with Directional Color Marker */}
        <g style={{ transform: "translateZ(3px)" }}>
          <rect x={rightWingX - 4} y={wingY} width={wingW + 4} height={wingH} rx={6} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />
        </g>
      </g>

      {/* Gearbox Center Shaft Direction Indicator */}
      <g
        className={`shaft-indicator ${
          isSpinning ? (isForward ? "spinning-forward" : "spinning-reverse") : ""
        }`}
        style={{ transformOrigin: `0px ${gearboxTop + 40}px` }}
      >
        <circle cx={0} cy={gearboxTop + 40} r={10} fill="#eab308" stroke="#ca8a04" strokeWidth={1.5} />
        <line x1={0} y1={gearboxTop + 32} x2={0} y2={gearboxTop + 48} stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={-8} y1={gearboxTop + 40} x2={8} y2={gearboxTop + 40} stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" />
      </g>

      {/* Small side tab */}
      <rect x={gearboxW / 2 - 2} y={gearboxTop + 82} width={6} height={20} rx={2} fill="#f4d128" stroke="#c9a916" strokeWidth={1} />

      {/* Gray motor housing collar */}
      <rect
        x={-gearboxW / 2 + 4}
        y={gearboxBottom - 8}
        width={gearboxW - 8}
        height={motorBottom - gearboxBottom + 8}
        rx={4}
        fill="#e4e4e7"
        stroke="#a1a1aa"
        strokeWidth={1}
      />

      {/* Dark connector block */}
      <rect
        x={-gearboxW / 2 + 10}
        y={motorBottom - 4}
        width={gearboxW - 20}
        height={connectorBottom - motorBottom + 4}
        rx={2}
        fill="#27272a"
      />

      {/* Terminal eyelets */}
      <circle cx={-gearboxW / 2 + 6} cy={negPin.y * GRID} r={2.5} fill="#3f3f46" />
      <circle cx={-gearboxW / 2 + 6} cy={posPin.y * GRID} r={2.5} fill="#991b1b" />

      {/* Bottom shaft */}
      <rect x={-2.5} y={connectorBottom} width={5} height={shaftTipY - connectorBottom - 5} fill="#a1a1aa" />

      {def.pins.map((pin) => {
        const isPositive = pin.id === "positive";
        return (
          <g key={pin.id}>
            <PinLeg
              x1={pin.x * GRID}
              y1={pin.y * GRID}
              x2={-gearboxW / 2 + 4}
              y2={pin.y * GRID}
              color={isPositive ? "#dc2626" : "#18181b"}
              width={4}
            />
            <Pin
              x={pin.x * GRID}
              y={pin.y * GRID}
              pinId={pin.id}
              label={isPositive ? "+" : "−"}
              state={pinStates?.[pin.id]}
              onClick={(e) => onPinClick?.(pin.id, e)}
            />
          </g>
        );
      })}
    </g>
  );
}