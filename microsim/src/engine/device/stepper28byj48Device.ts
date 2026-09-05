import { PinState, type AVRIOPort } from "avr8js";
import type { ExternalDevice } from "./externalDevice";
import { getPortAndBit } from "./arduinoPins";
import type { PartInstance } from "../../types/types";
import type { Netlist } from "../netlist";

export function createStepper28byj48Device(
  portB: AVRIOPort,
  portD: AVRIOPort,
  inPins: [number, number, number, number],
  getCurrentAngle: () => number,
  onAngleChange: (nextAngle: number) => void
): ExternalDevice {
  const inputs = inPins.map((pin) => getPortAndBit(pin, portB, portD));
  const DEGREES_PER_STEP = 360 / 512;

  let lastActiveIndex: number | null = null;

  function readActiveIndex(): number | null {
    for (let i = 0; i < inputs.length; i++) {
      const { port, bit } = inputs[i];
      if (port.pinState(bit) === PinState.High) return i;
    }
    return null;
  }

  function onPinChange() {
    const active = readActiveIndex();

    if (active === null || active === lastActiveIndex) {
      lastActiveIndex = active;
      return;
    }

    if (lastActiveIndex !== null) {
      const forwardDist = (active - lastActiveIndex + 4) % 4;
      const direction = forwardDist === 1 ? 1 : forwardDist === 3 ? -1 : 0;

      if (direction !== 0) {
        const currentAngle = getCurrentAngle();
        const nextAngle = (currentAngle + direction * DEGREES_PER_STEP + 360) % 360;
        onAngleChange(nextAngle);
      }
    }

    lastActiveIndex = active;
  }

  for (const { port, bit } of inputs) {
    port.addListener(() => onPinChange());
    void bit;
  }

  return {
    claimedPins: [...inPins],
    update: () => {},
  };
}

export function setupStepper28byj48Devices(
  portB: AVRIOPort,
  portD: AVRIOPort,
  parts: PartInstance[],
  netlist: Netlist,
  getStepperAngle: (partId: string) => number,
  onStepperAngleChange: (partId: string, angle: number) => void
): ExternalDevice[] {
  const devices: ExternalDevice[] = [];

  for (const driverPart of parts) {
    if (driverPart.type !== "uln2003-driver") continue;

    const in1 = netlist.getConnectedArduinoPin(driverPart.id, "in1");
    const in2 = netlist.getConnectedArduinoPin(driverPart.id, "in2");
    const in3 = netlist.getConnectedArduinoPin(driverPart.id, "in3");
    const in4 = netlist.getConnectedArduinoPin(driverPart.id, "in4");

    if (in1 === null || in2 === null || in3 === null || in4 === null) continue;

    const stepperPart = parts.find(
      (p) =>
        p.type === "stepper-28byj48" &&
        netlist.arePinsConnected(driverPart.id, "outA", p.id, "coilA")
    );

    if (!stepperPart) continue;

    devices.push(
      createStepper28byj48Device(
        portB,
        portD,
        [in1, in2, in3, in4],
        () => getStepperAngle(stepperPart.id),
        (nextAngle) => onStepperAngleChange(stepperPart.id, nextAngle)
      )
    );
  }

  return devices;
}