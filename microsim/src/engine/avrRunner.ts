import {CPU,avrInstruction,portBConfig,portDConfig,AVRUSART,AVRIOPort,AVRTimer,timer0Config,timer1Config,timer2Config,AVRADC,adcConfig,usart0Config,AVRTWI,twiConfig,PinState} from "avr8js";
import type { PartInstance, Wire } from "../types/types";
import { buildNetlist } from "./netlist";
import type { Netlist } from "./netlist";
import { createI2CBus } from "./device/i2cLcdDevice";
import { setBuzzerTone, stopBuzzerTone, stopAllBuzzers } from "./device/buzzerVoice";
import { getPortAndBit } from "./device/arduinoPins";
import { buildExternalDevices } from "./deviceManager";
import { compileSketch, loadHexToProgmem } from "../services/compilerService";
import { computeNextCapacitorVoltage } from "./physics/capacitor";

export interface LcdScreenState {
  cells: number[][];
  cgram: number[][];
  backlightOn: boolean;
}

export interface BuzzerState {
  active: boolean;
  frequency: number;
}

export type DigitalPinsSnapshot = Record<number, { mode: "INPUT" | "OUTPUT"; value: "HIGH" | "LOW" }>;

export interface CircuitSnapshot {
  parts: PartInstance[];
  wires: Wire[];
  digitalPins: DigitalPinsSnapshot;
}

/**
 * Everything the runner needs from the outside world, and everything it
 * reports back. It never touches Zustand directly -- the store wires these
 * up to `set`/`get` so this file stays reusable (e.g. inside a worker later)
 */
export interface AVRRunnerCallbacks {
  /** Live circuit snapshot -- called every resync, so it must reflect current store state. */
  getCircuit: () => CircuitSnapshot;
  getBuzzerState: (partId: string) => BuzzerState | undefined;
  getStepperAngle: (partId: string) => number;
  getKeypadState: (partId: string) => { row: number | null; col: number | null };

  onLog: (line: string) => void;
  onDigitalPinsChange: (pins: DigitalPinsSnapshot) => void;
  onLcdScreenChange: (partId: string, cells: number[][], cgram: number[][], backlightOn: boolean) => void;
  onBuzzerStateChange: (partId: string, state: BuzzerState) => void;
  onServoAngleChange: (partId: string, angle: number) => void;
  onStepperAngleChange: (partId: string, angle: number) => void;
  onCapacitorVoltageChange: (partId: string, voltage: number) => void;
    
  /** Sketch failed to compile, or setup blew up before the sim loop started. */
  onCompileError: (message: string) => void;
  /** The sim loop itself threw mid-run. */
  onCrash: (message: string) => void;
}

const AVR_CLOCK_HZ = 16_000_000;
const FRAMES_PER_SECOND = 60;
const INSTRUCTIONS_PER_FRAME = AVR_CLOCK_HZ / FRAMES_PER_SECOND;
const FRAME_DT_SECONDS = 1 / FRAMES_PER_SECOND;
const CHUNK_SIZE = 100;
const DIGITAL_INPUT_RESYNC_INSTRUCTIONS = 10_000;

/* Forces external circuit state into any Arduino pin currently configured
   as INPUT that isn't already claimed by an ExternalDevice */
function syncSimpleDigitalInputs(
  netlist: Netlist,
  arduinoId: string,
  cpu: CPU,
  portB: AVRIOPort,
  portD: AVRIOPort,
  excludePins: Set<number>
) {
  for (let pin = 0; pin <= 13; pin++) {
    if (excludePins.has(pin)) continue;

    let isOutput: boolean;
    if (pin <= 7) {
      isOutput = (cpu.data[0x0a] & (1 << pin)) !== 0; // DDRD
    } else {
      isOutput = (cpu.data[0x04] & (1 << (pin - 8))) !== 0; // DDRB
    }
    if (isOutput) continue;

    const { port, bit } = getPortAndBit(pin, portB, portD);
    const netState = netlist.getPinState(arduinoId, `d${pin}`);
    if (netState === "FLOATING") continue;
    port.setPin(bit, netState === "HIGH");
  }
}

/**
 * Owns one AVR CPU instance for the lifetime of a single simulation run:
 * compiling the sketch, wiring avr8js peripherals (ports/timers/ADC/USART/
 * TWI), spinning up every ExternalDevice, and driving the requestAnimationFrame
 * loop that ticks the CPU and resyncs it against the circuit's netlist.
 *
 * The store only ever calls start()/stop() -- it never reaches into avr8js,
 * requestAnimationFrame, or the device layer directly.
 */
export class AVRRunner {
  private readonly callbacks: AVRRunnerCallbacks;
  private animationId: number | null = null;
  private running = false;
  private runToken = 0;

  constructor(callbacks: AVRRunnerCallbacks) {
    this.callbacks = callbacks;
  }

  isRunning(): boolean {
    return this.running;
  }

  async start(code: string): Promise<void> {
    // Invalidate any previous run (in-flight compile or active frame loop).
    this.stop();
    stopAllBuzzers();

    const token = ++this.runToken;

    try {
      const hex = await compileSketch(code);
      if (token !== this.runToken) return; // superseded while compiling

      this.callbacks.onLog("[Compilation successful. Initializing AVR CPU...]");
      this.running = true;

      const progmem = new Uint8Array(32768);
      loadHexToProgmem(hex, progmem);

      const cpu = new CPU(new Uint16Array(progmem.buffer));
      const portB = new AVRIOPort(cpu, portBConfig);
      const portD = new AVRIOPort(cpu, portDConfig);

      // Hardware timers -- enable millis(), delay(), and PWM output.
      new AVRTimer(cpu, timer0Config);
      new AVRTimer(cpu, timer1Config);
      new AVRTimer(cpu, timer2Config);

      const adc = new AVRADC(cpu, adcConfig);

      const initialCircuit = this.callbacks.getCircuit();
      const { externalDevices, lcdI2CDevices } = buildExternalDevices({
        portB,
        portD,
        parts: initialCircuit.parts,
        wires: initialCircuit.wires,
        digitalPins: initialCircuit.digitalPins,

        onServoAngleChange: this.callbacks.onServoAngleChange,

        onPassiveBuzzerFrequencyChange: (partId, frequencyHz) => {
          this.callbacks.onBuzzerStateChange(partId, { active: frequencyHz > 0, frequency: frequencyHz });
          setBuzzerTone(partId, frequencyHz);
        },

        getStepperAngle: this.callbacks.getStepperAngle,
        onStepperAngleChange: this.callbacks.onStepperAngleChange,
        getKeypadState: this.callbacks.getKeypadState,
        onLcdScreenChange: this.callbacks.onLcdScreenChange,
      });

      const claimedPins = new Set(externalDevices.flatMap((d) => d.claimedPins));

      // Attach TWI / I2C bus handler if LCD devices are active
      if (lcdI2CDevices.length > 0) {
        const twi = new AVRTWI(cpu, twiConfig, AVR_CLOCK_HZ);
        const bus = createI2CBus(lcdI2CDevices);

        const wrappedBus = {
          start: (repeated: boolean) => {
            console.log("[I2C] start", { repeated });
            bus.start();
            twi.completeStart();
          },
          stop: () => {
            console.log("[I2C] stop");
            bus.stop();
            twi.completeStop();
          },
          connectToSlave: (addr: number, write: boolean) => {
            console.log("[I2C] connectToSlave", { addr: addr.toString(16), write });
            const ack = bus.connectToSlave(addr, write);
            console.log("[I2C] ACK:", ack);
            twi.completeConnect(ack);
          },
          writeByte: (value: number) => {
            console.log("[I2C] writeByte", value.toString(16));
            const ack = bus.writeByte(value);
            twi.completeWrite(ack);
          },
          readByte: (ack: boolean) => {
            console.log("[I2C] readByte", { ack });
            const value = bus.readByte(ack);
            twi.completeRead(value);
          },
        };

        (twi as unknown as { eventHandler: typeof wrappedBus }).eventHandler = wrappedBus;
      }

      const updatePinState = () => {
        const nextPins: DigitalPinsSnapshot = {};

        for (let pin = 0; pin <= 7; pin++) {
          const pinVal = portD.pinState(pin);
          const isOutput = pinVal === PinState.Low || pinVal === PinState.High;
          const isHigh = pinVal === PinState.High || pinVal === PinState.InputPullUp;
          nextPins[pin] = { mode: isOutput ? "OUTPUT" : "INPUT", value: isHigh ? "HIGH" : "LOW" };
        }

        for (let pin = 0; pin <= 5; pin++) {
          const arduinoPin = pin + 8;
          const pinVal = portB.pinState(pin);
          const isOutput = pinVal === PinState.Low || pinVal === PinState.High;
          const isHigh = pinVal === PinState.High || pinVal === PinState.InputPullUp;
          nextPins[arduinoPin] = { mode: isOutput ? "OUTPUT" : "INPUT", value: isHigh ? "HIGH" : "LOW" };
        }

        this.callbacks.onDigitalPinsChange(nextPins);
      };

      portB.addListener(updatePinState);
      portD.addListener(updatePinState);
      updatePinState();

      const usart = new AVRUSART(cpu, usart0Config, AVR_CLOCK_HZ);
      let serialLineBuffer = "";

      usart.onByteTransmit = (value: number) => {
        const char = String.fromCharCode(value);
        if (char === "\r") return;
        if (char === "\n") {
          this.callbacks.onLog(serialLineBuffer);
          serialLineBuffer = "";
        } else {
          serialLineBuffer += char;
        }
      };

      const resyncDigitalInputs = (): Netlist | null => {
        const liveCircuit = this.callbacks.getCircuit();
        const activeArduino = liveCircuit.parts.find((p) => p.type === "arduino-uno");
        if (!activeArduino) return null;

        const liveNetlist = buildNetlist(liveCircuit.parts, liveCircuit.wires, liveCircuit.digitalPins, true);

        for (let i = 0; i <= 5; i++) {
          adc.channelValues[i] = liveNetlist.getAnalogVoltage(activeArduino.id, `a${i}`);
        }
        syncSimpleDigitalInputs(liveNetlist, activeArduino.id, cpu, portB, portD, claimedPins);
        return liveNetlist;
      };

      const executeFrame = () => {
        if (!this.running || token !== this.runToken) return;

        try {
          const currentCircuit = this.callbacks.getCircuit();
          const activeArduino = currentCircuit.parts.find((p) => p.type === "arduino-uno");
          const frameNetlist = resyncDigitalInputs();

          if (activeArduino && frameNetlist) {
            for (const part of currentCircuit.parts) {
              if (part.type !== "active-buzzer") continue;

              const isSounding = frameNetlist.isActiveBuzzerSounding(part.id);
              const toneHz = Number(part.properties?.toneHz ?? 2500);
              const nextActive = isSounding;
              const nextFrequency = isSounding ? toneHz : 0;

              const prev = this.callbacks.getBuzzerState(part.id);
              if (!prev || prev.active !== nextActive || prev.frequency !== nextFrequency) {
                this.callbacks.onBuzzerStateChange(part.id, { active: nextActive, frequency: nextFrequency });
                if (nextActive) {
                  setBuzzerTone(part.id, nextFrequency);
                } else {
                  stopBuzzerTone(part.id);
                }
              }
            }

            for (const part of currentCircuit.parts) {
              if (part.type !== "capacitor-polarized" && part.type !== "capacitor-nonpolarized") continue;

              const nextVoltage = computeNextCapacitorVoltage(part, frameNetlist, FRAME_DT_SECONDS);
              const prevVoltage = Number(part.properties?.storedVoltage ?? 0);

              if (Math.abs(nextVoltage - prevVoltage) > 0.001) {
                this.callbacks.onCapacitorVoltageChange(part.id, nextVoltage);
              }
            }
          }

          let remaining = INSTRUCTIONS_PER_FRAME;
          let instructionsSinceResync = 0;

          while (remaining > 0) {
            const batch = Math.min(CHUNK_SIZE, remaining);
            for (let i = 0; i < batch; i++) {
              avrInstruction(cpu);
              cpu.tick();
              for (const device of externalDevices) device.update(cpu);
            }
            remaining -= batch;
            instructionsSinceResync += batch;

            if (activeArduino && instructionsSinceResync >= DIGITAL_INPUT_RESYNC_INSTRUCTIONS) {
              resyncDigitalInputs();
              instructionsSinceResync = 0;
            }
          }
        } catch (err) {
          console.error("[executeFrame crashed]", err);
          this.callbacks.onCrash(err instanceof Error ? err.message : String(err));
          this.running = false;
          return;
        }

        this.animationId = requestAnimationFrame(executeFrame);
      };

      this.animationId = requestAnimationFrame(executeFrame);
    } catch (err) {
      if (token !== this.runToken) return; // superseded, ignore stale error
      this.callbacks.onCompileError(err instanceof Error ? err.message : String(err));
      this.running = false;
    }
  }

  stop(): void {
    // Bump the token so any in-flight compile/executeFrame from a previous
    // start() call becomes a no-op even if it resolves/fires after this.
    this.runToken++;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.running = false;
    stopAllBuzzers();
  }
}