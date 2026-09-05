import { CPU, PinState, type AVRIOPort } from "avr8js";
import { getPortAndBit } from "./arduinoPins";
import type { ExternalDevice } from "./externalDevice";
import { useCircuitStore } from "../../store/circuitStore";
import type { PartInstance } from "../../types/types";
import type { Netlist } from "../netlist";

export function createHcsr04Device(
    portB: AVRIOPort, 
    portD: AVRIOPort,
    partId: string, 
    trigPin: number,
    echoPin: number,
    powered: boolean) : ExternalDevice {
  const { port: trigPort, bit: trigBit } = getPortAndBit(trigPin, portB, portD);
  const { port: echoPort, bit: echoBit } = getPortAndBit(echoPin, portB, portD);

  type EchoState = "idle" | "pending" | "echoing";
  let state: EchoState = "idle";
  let stateChangedAtCycle = 0;
  let lastTrigHigh = false;
  let echoHigh = false;
  let echoDistanceCm = 400;

  const TRIGGER_TO_ECHO_DELAY_CYCLES = Math.round(150 * 16);

  const setEcho = (high: boolean) => {
    if (echoHigh === high) return;
    echoHigh = high;
    echoPort.setPin(echoBit, high);
  };

  trigPort.addListener(() => {
    if (!powered) return;
    const isHigh = trigPort.pinState(trigBit) === PinState.High;
    if (isHigh && !lastTrigHigh && state === "idle") {
      state = "pending";
      stateChangedAtCycle = 0;
    }
    lastTrigHigh = isHigh;
  });

  let justTriggered = false;
  trigPort.addListener(() => {
    if (!powered) return;
    if (state === "pending" && stateChangedAtCycle === 0) justTriggered = true;
  });

  return {
    claimedPins: [trigPin, echoPin],
    update: (cpu: CPU) => {
      if (state === "pending") {
        if (justTriggered) {
          stateChangedAtCycle = cpu.cycles;
          justTriggered = false;
        }
        if (stateChangedAtCycle > 0 && cpu.cycles - stateChangedAtCycle >= TRIGGER_TO_ECHO_DELAY_CYCLES) {
          setEcho(true);
          state = "echoing";
          stateChangedAtCycle = cpu.cycles;

          const livePart = useCircuitStore.getState().parts.find((p) => p.id === partId);
          echoDistanceCm = Math.max(0, Math.min(400, Number(livePart?.properties?.distanceCm ?? 400)));
        }
      } else if (state === "echoing") {
        const pulseCycles = Math.round(echoDistanceCm * 58 * 16);
        if (cpu.cycles - stateChangedAtCycle >= pulseCycles) {
          setEcho(false);
          state = "idle";
        }
      }
    },
  };
}

export function setupHcsr04Devices(
  portB: AVRIOPort,
  portD: AVRIOPort,
  parts: PartInstance[],
  netlist: Netlist
): ExternalDevice[] {
  const devices: ExternalDevice[] = [];

  for (const part of parts) {
    if (part.type !== "ultrasonic-hcsr04") continue;

    const trigPin = netlist.getConnectedArduinoPin(part.id, "trig");
    const echoPin = netlist.getConnectedArduinoPin(part.id, "echo");
    if (trigPin === null || echoPin === null) continue;

    const powered = netlist.isPowered(part.id);
    devices.push(createHcsr04Device(portB, portD, part.id, trigPin, echoPin, powered));
  }

  return devices;
}