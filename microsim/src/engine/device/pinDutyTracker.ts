import { PinState, type AVRIOPort } from "avr8js";

/**
 * Accumulates true high-time (in CPU cycles) for each Arduino digital pin
 * (0-13) between sample windows. analogWrite()'s hardware PWM toggles the
 * underlying AVR port at ~490Hz/980Hz -- far faster than our 60fps render
 * cadence -- so a single instantaneous snapshot catches an arbitrary,
 * flickery instant instead of the real average. This tracks every edge via
 * the port's own change listener and integrates exact high-time, so
 * whatever samples it at any cadence gets an accurate duty cycle -- and it
 * works identically for hardware PWM and for a hand-rolled bit-banged PWM
 * loop, which matters since Arduino learners write both.
 */
export class PinDutyTracker {
  private readonly getCycles: () => number;

  private highCycles = new Array(14).fill(0);
  private lastEdgeCycle = new Array(14).fill(0);
  private lastHigh = new Array(14).fill(false);
  private windowStartCycle = 0;

  constructor(portB: AVRIOPort, portD: AVRIOPort, getCycles: () => number) {
    this.getCycles = getCycles;

    // portB/portD only need to live long enough to register these
    // listeners -- nothing else on this class needs to hold onto them
    // afterward, so they're plain constructor params, not fields.
    portD.addListener(() => this.onPortChange(0, 7, portD));
    portB.addListener(() => this.onPortChange(8, 13, portB));
  }

  private onPortChange(startPin: number, endPin: number, port: AVRIOPort) {
    const now = this.getCycles();
    for (let pin = startPin; pin <= endPin; pin++) {
      const bit = pin - startPin;
      const isHigh = port.pinState(bit) === PinState.High;
      if (isHigh !== this.lastHigh[pin]) {
        if (this.lastHigh[pin]) {
          this.highCycles[pin] += now - this.lastEdgeCycle[pin];
        }
        this.lastHigh[pin] = isHigh;
        this.lastEdgeCycle[pin] = now;
      }
    }
  }

  /** Call once per sample window (we call this once per animation frame). Returns duty (0..1) per pin index 0-13, then resets the window. */
  sampleAndReset(): number[] {
    const now = this.getCycles();
    const windowCycles = Math.max(1, now - this.windowStartCycle);
    const duty = new Array(14).fill(0);

    for (let pin = 0; pin < 14; pin++) {
      let high = this.highCycles[pin];
      if (this.lastHigh[pin]) {
        high += now - this.lastEdgeCycle[pin];
      }
      duty[pin] = Math.max(0, Math.min(1, high / windowCycles));

      this.highCycles[pin] = 0;
      this.lastEdgeCycle[pin] = now;
    }

    this.windowStartCycle = now;
    return duty;
  }
}