/**
 * Hobby servo motor emulation.
 *
 * Servo.attach()/write() doesn't send any protocol data -- it just uses
 * Timer1 to emit a plain PWM-like pulse on the attached pin: a fixed
 * ~20ms period, with the HIGH portion of each pulse lasting roughly
 * 500-2500us, where ~1500us is "center" (90 degrees) and the two
 * extremes map to 0 and 180 degrees.
 *
 * avr8js's AVRTimer already reproduces that toggle cycle-accurately, so
 * the real electrical waveform appears on the pin exactly like it would
 * on real hardware -- this device's only job is to *read* that waveform
 * back out (via the port's own change listener, same technique already
 * used for the ultrasonic sensor's trigger pin and the passive buzzer's
 * tone detection) and convert pulse width into an angle the ServoPart
 * SVG can rotate to.
 */
import type { AVRIOPort, CPU } from "avr8js";
import { PinState } from "avr8js";

export interface ServoExternalDevice {
  claimedPins: number[];
  update: (cpu: CPU) => void;
}

const CPU_HZ = 16_000_000;
const MIN_PULSE_US = 500;
const MAX_PULSE_US = 2500;
export const SERVO_CENTER_PULSE_US = 1500;

// A little slack around the nominal 500-2500us range so we don't
// reject a slightly-out-of-spec sketch, but still ignore obvious noise
// from other digitalWrite() activity on the same pin before attach().
const PULSE_TOLERANCE_US = 50;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pulseWidthToAngle(pulseUs: number): number {
  const clamped = clamp(pulseUs, MIN_PULSE_US, MAX_PULSE_US);
  const ratio = (clamped - MIN_PULSE_US) / (MAX_PULSE_US - MIN_PULSE_US);
  return Math.round(ratio * 180);
}

export function createServoDevice(
  port: AVRIOPort,
  bit: number,
  signalPin: number,
  onAngleChange: (angleDegrees: number) => void
): ServoExternalDevice {
  let lastHigh = port.pinState(bit) === PinState.High;
  let risingEdgeCycle: number | null = null;
  let lastAngle = -1;
  let edgePending: "rising" | "falling" | null = null;

  port.addListener(() => {
    const isHigh = port.pinState(bit) === PinState.High;
    if (isHigh === lastHigh) return;
    edgePending = isHigh ? "rising" : "falling";
    lastHigh = isHigh;
  });

  return {
    claimedPins: [signalPin],
    update: (cpu: CPU) => {
      if (!edgePending) return;

      if (edgePending === "rising") {
        risingEdgeCycle = cpu.cycles;
      } else if (edgePending === "falling" && risingEdgeCycle !== null) {
        const pulseCycles = cpu.cycles - risingEdgeCycle;
        const pulseUs = (pulseCycles / CPU_HZ) * 1_000_000;
        risingEdgeCycle = null;

        if (
          pulseUs >= MIN_PULSE_US - PULSE_TOLERANCE_US &&
          pulseUs <= MAX_PULSE_US + PULSE_TOLERANCE_US
        ) {
          const angle = pulseWidthToAngle(pulseUs);
          if (angle !== lastAngle) {
            lastAngle = angle;
            onAngleChange(angle);
          }
        }
      }

      edgePending = null;
    },
  };
}