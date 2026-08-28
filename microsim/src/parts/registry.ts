import type { PartInstance } from "../types/types";
import type { buildNetlist, NetState } from "../engine/netlist";
import { LedPart } from "./Led";
import { ResistorPart } from "./Resistor";
import { PushbuttonPart } from "./Pushbutton";
import { ArduinoUnoPart } from "./ArduinoUno";
import { SmallBreadboardPart } from "./SmallBreadboard";
import { MediumBreadboardPart } from "./MediumBreadboard";
import { LargeBreadboardPart } from "./LargeBreadboard";
import { BatteryPart } from "./Battery";
import { PotentiometerPart } from "./Potentiometer";
import { HcSr04Part } from "./HcSr04";
import { LcdPart } from "./Lcd";
import { CapacitorPart } from "./Capacitor";
import { ActiveBuzzerPart } from "./ActiveBuzzer";
import { PassiveBuzzerPart } from "./PassiveBuzzer";
import { ServoMG90Part } from "./ServoMG90";
import { RgbLedPart } from "./RgbLed";
import { ToggleSwitchPart } from "./ToggleSwitch";
import { JoystickPart } from "./Joystick";

export interface PartComponentProps {
  part: PartInstance;
  selected: boolean;
  onToggle?: (partId: string) => void;
  pinStates?: Record<string, NetState>;
  netlist?: ReturnType<typeof buildNetlist>; // <-- Add this property
  isSimulating?: boolean; // ADD THIS LINE
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export const partComponentRegistry: Record<string, React.FC<PartComponentProps>> = {
  led: LedPart,
  resistor: ResistorPart,
  pushbutton: PushbuttonPart,
  "breadboard-mini": SmallBreadboardPart,
  "breadboard-half": MediumBreadboardPart,
  "breadboard-full": LargeBreadboardPart,
  battery: BatteryPart,
  potentiometer: PotentiometerPart,
  "ultrasonic-hcsr04": HcSr04Part,
  "lcd-16x2-i2c": LcdPart,
  "arduino-uno": ArduinoUnoPart,
  capacitor: CapacitorPart,
  "active-buzzer": ActiveBuzzerPart,
  "passive-buzzer": PassiveBuzzerPart,
  "servo-mg90": ServoMG90Part,
  "rgb-led": RgbLedPart,
  "toggle-switch": ToggleSwitchPart,
  joystick: JoystickPart,

};