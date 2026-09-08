import type { AVRIOPort } from "avr8js";
import type { PartInstance, Wire } from "../types/types";
import type { ExternalDevice } from "./device/externalDevice";
import { setupLcdI2CDevices, type I2CDevice } from "./device/i2cLcdDevice";
import { buildNetlist, type DigitalPinState } from "./netlist";

import { setupServoDevices } from "./device/servoDevice";
import { setupPassiveBuzzerDevices } from "./device/passiveBuzzerDevice";
import { setupHcsr04Devices } from "./device/hcsr04Device";
import { setupKeypadDevices } from "./device/keypadDevice";
import { setupIrReceiverDevices } from "./device/irReceiverDevice";
import { setupStepper28byj48Devices } from "./device/stepper28byj48Device";

export interface DeviceSetupContext {
  portB: AVRIOPort;
  portD: AVRIOPort;
  parts: PartInstance[];
  wires: Wire[];
  digitalPins: Record<number, DigitalPinState>;
  // Callbacks and Accessors
  onServoAngleChange?: (partId: string, angle: number) => void;
  onPassiveBuzzerFrequencyChange?: (partId: string, frequencyHz: number) => void;
  getStepperAngle: (partId: string) => number;
  onStepperAngleChange: (partId: string, angle: number) => void;
  getKeypadState: (partId: string) => { row: number | null; col: number | null };
  onLcdScreenChange: (
    partId: string,
    cells: number[][],
    cgram: number[][],
    backlightOn: boolean
  ) => void;
}

export interface BuildDevicesResult {
  externalDevices: ExternalDevice[];
  lcdI2CDevices: I2CDevice[];
}

export function buildExternalDevices(ctx: DeviceSetupContext): BuildDevicesResult {
  const arduinoPart = ctx.parts.find((p) => p.type === "arduino-uno");
  if (!arduinoPart) return { externalDevices: [], lcdI2CDevices: [] };

  const wiringNetlist = buildNetlist(ctx.parts, ctx.wires, ctx.digitalPins, true);
  const externalDevices: ExternalDevice[] = [];

  // Servo setup
  if (ctx.onServoAngleChange) {
    externalDevices.push(
      ...setupServoDevices(ctx.portB, ctx.portD, ctx.parts, wiringNetlist, ctx.onServoAngleChange)
    );
  }

  // Passive Buzzer setup
  if (ctx.onPassiveBuzzerFrequencyChange) {
    externalDevices.push(
      ...setupPassiveBuzzerDevices(
        ctx.portB,
        ctx.portD,
        ctx.parts,
        wiringNetlist,
        ctx.onPassiveBuzzerFrequencyChange
      )
    );
  }
  
  // General External Devices
  externalDevices.push(...setupHcsr04Devices(ctx.portB, ctx.portD, ctx.parts, wiringNetlist));
  externalDevices.push(
    ...setupStepper28byj48Devices(
      ctx.portB,
      ctx.portD,
      ctx.parts,
      wiringNetlist,
      ctx.getStepperAngle,
      ctx.onStepperAngleChange
    )
  );
  externalDevices.push(
    ...setupKeypadDevices(ctx.portB, ctx.portD, ctx.parts, wiringNetlist, ctx.getKeypadState)
  );
  externalDevices.push(...setupIrReceiverDevices(ctx.portB, ctx.portD, ctx.parts, wiringNetlist));

  // I2C Devices (LCD 16x2 & 20x4)
  const lcdI2CDevices = setupLcdI2CDevices(
    ctx.parts,
    ctx.wires,
    ctx.digitalPins,
    ctx.onLcdScreenChange
  );

  return { externalDevices, lcdI2CDevices };
}