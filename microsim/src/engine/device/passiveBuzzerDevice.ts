import { CPU, PinState, type AVRIOPort } from "avr8js";
import type { ExternalDevice } from "./externalDevice";
import { getPortAndBit } from "./arduinoPins";
import type { PartInstance } from "../../types/types";
import type { Netlist } from "../netlist";

/** Low-level AVR event listener device for passive buzzers */
export function createPassiveBuzzerDevice(
  portB: AVRIOPort,
  portD: AVRIOPort,
  partId: string,
  signalPin: number,
  onFrequencyChange: (partId: string, frequencyHz: number) => void
): ExternalDevice {
  const { port, bit } = getPortAndBit(signalPin, portB, portD);

  let lastLevel = port.pinState(bit) === PinState.High;
  let edgePending = false;
  let lastEdgeCycle: number | null = null;
  let currentFrequency = 0;
  let lastActivityCycle = 0;

  const SILENCE_TIMEOUT_CYCLES = Math.round(16_000_000 * 0.05);

  port.addListener(() => {
    const level = port.pinState(bit) === PinState.High;
    if (level !== lastLevel) edgePending = true;
    lastLevel = level;
  });

  return {
    claimedPins: [signalPin],
    update: (cpu: CPU) => {
      if (edgePending) {
        edgePending = false;
        if (lastEdgeCycle !== null) {
          const halfPeriodCycles = cpu.cycles - lastEdgeCycle;
          if (halfPeriodCycles > 0) {
            const freq = 16_000_000 / (2 * halfPeriodCycles);
            if (freq >= 20 && freq <= 20000) {
              const rounded = Math.round(freq);
              if (rounded !== currentFrequency) {
                currentFrequency = rounded;
                onFrequencyChange(partId, currentFrequency);
              }
            }
          }
        }
        lastEdgeCycle = cpu.cycles;
        lastActivityCycle = cpu.cycles;
      } else if (
        currentFrequency > 0 &&
        cpu.cycles - lastActivityCycle > SILENCE_TIMEOUT_CYCLES
      ) {
        currentFrequency = 0;
        onFrequencyChange(partId, 0);
      }
    },
  };
}

/** Setup orchestrator for all passive buzzer components on the canvas */
export function setupPassiveBuzzerDevices(
  portB: AVRIOPort,
  portD: AVRIOPort,
  parts: PartInstance[],
  wiringNetlist: Netlist,
  onFrequencyChange: (partId: string, frequencyHz: number) => void
): ExternalDevice[] {
  const devices: ExternalDevice[] = [];

  for (const part of parts) {
    if (part.type !== "passive-buzzer") continue;
    if (!wiringNetlist.hasFlag("passiveBuzzerReady", part.id)) continue;

    const isReversed = wiringNetlist.hasFlag("passiveBuzzerReversed", part.id);
    const signalPin = isReversed
      ? wiringNetlist.getConnectedArduinoPin(part.id, "negative")
      : wiringNetlist.getConnectedArduinoPin(part.id, "positive");

    if (signalPin === null) continue;

    devices.push(
      createPassiveBuzzerDevice(
        portB,
        portD,
        part.id,
        signalPin,
        onFrequencyChange
      )
    );
  }

  return devices;
}