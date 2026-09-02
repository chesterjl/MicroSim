import type { PartInstance } from "../types/types.ts";
import { ArduinoUnoPart } from "./arduino/ArduinoUno.tsx";
import { Lcd16x2I2CPart } from "./lcd16x2I2C/Lcd16x2I2C.tsx";
import { HcSr04Part } from "./hcsr04/HcSr04.tsx";
import { ServoMG90Part } from "./servomg90/ServoMG90.tsx";
import { RgbLedPart } from "./rgbLed/RgbLed.tsx";
import { IrReceiverPart } from "./irReceiver/IrReceiver.tsx";
import { IrRemotePart } from "./irRemote/IrRemote.tsx";
import { Lcd20x4I2CPart } from "./lcd20x4I2C/Lcd20x4I2C.tsx";
import { Dht11Part } from "./dht/Dht11.tsx";
import { Stepper28byj48Part } from "./stepper28byj48/Stepper28byj48.tsx";
import { Uln2003DriverPart } from "./uln2003Driver/Uln2003Driver.tsx";
import { Dht22Part } from "./dht/Dht22.tsx";
import { CapacitorPolarizedPart } from "./capacitor/CapacitorPolarized.tsx";
import { CapacitorNonPolarizedPart } from "./capacitor/CapacitorNonPolarized.tsx";
import { BreadboardMiniPart } from "./breadboard/BreadboardMini.tsx";
import { breadboardHalfPart } from "./breadboard/BreadboardHalf.tsx";
import { BreadboardFullPart } from "./breadboard/BreadboardFull.tsx";
import { LedPart } from "./led/Led.tsx";
import { ResistorPart } from "./resistor/Resistor.tsx";
import { PushbuttonPart } from "./pushbutton/Pushbutton.tsx";
import { BatteryPart } from "./battery/Battery.tsx";
import { PotentiometerPart } from "./potentiometer/Potentiometer.tsx";
import { ActiveBuzzerPart } from "./activeBuzzer/ActiveBuzzer.tsx";
import { PassiveBuzzerPart } from "./passiveBuzzer/PassiveBuzzer.tsx";
import { ToggleSwitchPart } from "./toggleSwitch/ToggleSwitch.tsx";
import { JoystickPart } from "./joystick/Joystick.tsx";
import { KeypadPart } from "./keypad/Keypad.tsx";
import { PhotoresistorPart } from "./photoresistor/Photoresistor.tsx";
import { SevenSegmentPart } from "./sevenSegment/SevenSegment.tsx";
import { RelayPart } from "./relay/Relay.tsx";
import { DcGearMotorPart } from "./dcGearMotor/DcGearMotor.tsx";
import type { Netlist, NetState } from "../engine/netlist.ts";

export interface PartComponentProps {
  part: PartInstance;
  selected: boolean;
  onToggle?: (partId: string) => void;
  pinStates?: Record<string, NetState>;
  netlist?: Netlist;
  isSimulating?: boolean;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}

export const partComponentRegistry: Record<string, React.FC<PartComponentProps>> = {
  led: LedPart,
  resistor: ResistorPart,
  pushbutton: PushbuttonPart,
  "breadboard-mini": BreadboardMiniPart,
  "breadboard-half": breadboardHalfPart,
  "breadboard-full": BreadboardFullPart,
  battery: BatteryPart,
  potentiometer: PotentiometerPart,
  "ultrasonic-hcsr04": HcSr04Part,
  "lcd-16x2-i2c": Lcd16x2I2CPart,
  "arduino-uno": ArduinoUnoPart,
  "active-buzzer": ActiveBuzzerPart,
  "passive-buzzer": PassiveBuzzerPart,
  "servo-mg90": ServoMG90Part,
  "rgb-led": RgbLedPart,
  "toggle-switch": ToggleSwitchPart,
  joystick: JoystickPart,
  "keypad-4x4": KeypadPart,
  photoresistor: PhotoresistorPart,
  "ir-receiver": IrReceiverPart,
  "ir-remote": IrRemotePart,
  "lcd-20x4-i2c": Lcd20x4I2CPart,
  "seven-segment": SevenSegmentPart,
  dht11: Dht11Part,
  "stepper-28byj48": Stepper28byj48Part,
  "uln2003-driver": Uln2003DriverPart,
  "dc-gearmotor": DcGearMotorPart,
  relay: RelayPart,
  dht22: Dht22Part,
  "capacitor-polarized": CapacitorPolarizedPart,
  "capacitor-nonpolarized": CapacitorNonPolarizedPart,
};