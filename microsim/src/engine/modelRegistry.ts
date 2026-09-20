import { activeBuzzerModel } from "../parts/activeBuzzer/activeBuzzer";
import { arduinoUnoModel } from "../parts/arduino/arduinoUno";
import { batteryModel } from "../parts/battery/battery";
import { breadboardModel } from "../parts/breadboard/breadboard";
import { capacitorModel } from "../parts/capacitor/capacitor";
import { currentSourceModel } from "../parts/currentSource/currentSource";
import { dcGearMotorModel } from "../parts/dcGearMotor/dcGearMotor";
import { diodeModel } from "../parts/diode/diode";
import { zenerDiodeModel } from "../parts/diode/zenerDiode";
import { hcsr04Model } from "../parts/hcSr04/HcSr04";
import { inductorModel } from "../parts/inductor/inductor";
import { joystickModel } from "../parts/joystick/joystick";
import { keypadModel } from "../parts/keypad/keypad";
import { ledModel } from "../parts/led/led";
import { mosfetModel } from "../parts/mosfet/mosfet";
import { passiveBuzzerModel } from "../parts/passiveBuzzer/passiveBuzzer";
import { photoresistorModel } from "../parts/photoresistor/photoresistor";
import { potentiometerModel } from "../parts/potentiometer/potentiometer";
import { powerSupplyModel } from "../parts/powerSupply/powerSupply";
import { pushbuttonModel } from "../parts/pushbutton/pushbutton";
import { relayModel } from "../parts/relay/relay";
import { resistorModel } from "../parts/resistor/resistor";
import { rgbLedModel } from "../parts/rgbLed/rgbLed";
import { servoMg90Model } from "../parts/servomg90/servoMg90";
import { sevenSegmentModel } from "../parts/sevenSegment/sevenSegment";
import { stepper28byj48Model } from "../parts/stepper28byj48/stepper28byj48";
import { toggleSwitchModel } from "../parts/toggleSwitch/toggleSwitch";
import { transistorNpnModel } from "../parts/transistor/transistorNpn";
import { uln2003Model } from "../parts/uln2003Driver/ul2003Driver";
import type { ComponentModel } from "./componentModel";

export const componentModelRegistry: Record<string, ComponentModel> = {
    "led": ledModel,
    "rgb-led": rgbLedModel,
    "active-buzzer": activeBuzzerModel,
    "arduino-uno": arduinoUnoModel,
    "battery": batteryModel,
    "breadboard-mini": breadboardModel,
    "breadboard-half": breadboardModel,
    "breadboard-full": breadboardModel,
    "capacitor-polarized": capacitorModel,
    "capacitor-nonpolarized": capacitorModel,
    "dc-gearmotor": dcGearMotorModel,
    "ultrasonic-hcsr04": hcsr04Model,
    "joystick": joystickModel,
    "keypad-4x4": keypadModel,
    "passive-buzzer": passiveBuzzerModel,
    "photoresistor": photoresistorModel,
    "potentiometer": potentiometerModel,
    "pushbutton": pushbuttonModel,
    "relay": relayModel,
    "resistor": resistorModel,
    "seven-segment": sevenSegmentModel,
    "toggle-switch": toggleSwitchModel,
    "uln2003-driver": uln2003Model,
    "servo-mg90": servoMg90Model,
    "stepper-28byj48": stepper28byj48Model,
    "inductor": inductorModel, 
    "diode": diodeModel,
    "transistor-npn": transistorNpnModel,
    "power-supply": powerSupplyModel,
    "zener-diode": zenerDiodeModel,
    "mosfet": mosfetModel,
    "current-source": currentSourceModel,
  };

export function getComponentModel(type: string): ComponentModel | undefined {
  return componentModelRegistry[type];
}