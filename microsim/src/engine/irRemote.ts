import type { CPU, AVRIOPort } from "avr8js";
import { useCircuitStore } from "../store/circuitStore";

const CPU_HZ = 16_000_000;
const CYCLES_PER_US = CPU_HZ / 1_000_000; // 16

function usToCycles(us: number): number {
  return Math.round(us * CYCLES_PER_US);
}

// NEC frame layout: raw = (~cmd << 24) | (cmd << 16) | (~addr << 8) | addr.
// This remote uses address 0x00 for every button (matches the classic
// 21-key NEC mini remote's real code table, so "5" -> 0xE31CFF00 exactly
// like real IRremote.hpp hardware would decode).
function necRawCode(cmd: number, addr: number = 0x00): number {
  const invCmd = (~cmd) & 0xff;
  const invAddr = (~addr) & 0xff;
  return ((invCmd << 24) | (cmd << 16) | (invAddr << 8) | addr) >>> 0;
}

export const IR_BUTTON_CODES: Record<string, number> = {
  power: necRawCode(0x45),
  menu: necRawCode(0x47),
  test: necRawCode(0x46),
  plus: necRawCode(0x15),
  back: necRawCode(0x09),
  prev: necRawCode(0x44),
  play: necRawCode(0x43),
  next: necRawCode(0x40),
  zero: necRawCode(0x16),
  minus: necRawCode(0x07),
  c: necRawCode(0x19),
  one: necRawCode(0x0c),
  two: necRawCode(0x18),
  three: necRawCode(0x5e),
  four: necRawCode(0x08),
  five: necRawCode(0x1c), // matches your example's 0xE31CFF00
  six: necRawCode(0x5a),
  seven: necRawCode(0x42),
  eight: necRawCode(0x52),
  nine: necRawCode(0x4a),
};

interface PulseSegment {
  mark: boolean; // true = IR burst present (receiver OUT driven LOW -- active-low)
  cycles: number;
}

/**
 * Builds the real NEC pulse-distance timeline for a 32-bit raw code:
 * 9ms leading mark, 4.5ms leading space, then 32 bits (562.5us mark each,
 * followed by 562.5us space for a 0 or 1687.5us space for a 1), finished
 * with a trailing 562.5us mark. Bit order walks the raw value LSB-first,
 * which is exactly the order NEC transmits address/~address/command/
 * ~command on the wire.
 */
function buildNecSegments(rawCode: number): PulseSegment[] {
  const segments: PulseSegment[] = [];
  segments.push({ mark: true, cycles: usToCycles(9000) });
  segments.push({ mark: false, cycles: usToCycles(4500) });

  for (let bit = 0; bit < 32; bit++) {
    const bitValue = (rawCode >>> bit) & 1;
    segments.push({ mark: true, cycles: usToCycles(562.5) });
    segments.push({ mark: false, cycles: usToCycles(bitValue ? 1687.5 : 562.5) });
  }

  segments.push({ mark: true, cycles: usToCycles(562.5) });
  return segments;
}

export interface ExternalDevice {
  claimedPins: number[];
  update: (cpu: CPU) => void;
}

const POLL_INTERVAL_CYCLES = 800; // ~50us at 16MHz -- far faster than a human click

/**
 * Emulates an IR receiver module. Idles OUT high. Any ir-remote part's
 * button press is tracked via that remote's own `sentToken` counter (so
 * pressing the same button twice in a row still registers as new), and
 * once detected this bit-bangs the genuine NEC pulse train onto OUT with
 * real microsecond timing, so the compiled IRremote.hpp code decodes it
 * exactly like real hardware would -- no shortcuts on the protocol.
 */
export function createIrReceiverDevice(
  port: AVRIOPort,
  bit: number,
  outPin: number,
  powered: boolean
): ExternalDevice {
  let lastPollCycle = 0;
  let initialized = false;
  const seenTokens = new Map<string, number>();

  let segments: PulseSegment[] | null = null;
  let segmentIndex = 0;
  let segmentStartCycle = 0;
  let pinHigh = true;

  const setPin = (high: boolean) => {
    if (pinHigh === high) return;
    pinHigh = high;
    port.setPin(bit, high);
  };

  return {
    claimedPins: [outPin],
    update: (cpu: CPU) => {
      if (!powered) return;

      if (segments) {
        const seg = segments[segmentIndex];
        setPin(!seg.mark); // mark = IR burst present = active-low OUT
        if (cpu.cycles - segmentStartCycle >= seg.cycles) {
          segmentIndex++;
          segmentStartCycle = cpu.cycles;
          if (segmentIndex >= segments.length) {
            segments = null;
            setPin(true);
          }
        }
        return;
      }

      if (cpu.cycles - lastPollCycle < POLL_INTERVAL_CYCLES) return;
      lastPollCycle = cpu.cycles;

      const remotes = useCircuitStore.getState().parts.filter((p) => p.type === "ir-remote");

      // First poll just seeds the baseline tokens so a stale press from a
      // previous run doesn't immediately replay on simulation start.
      if (!initialized) {
        for (const remote of remotes) {
          seenTokens.set(remote.id, Number(remote.properties?.sentToken ?? 0));
        }
        initialized = true;
        return;
      }

      for (const remote of remotes) {
        const token = Number(remote.properties?.sentToken ?? 0);
        const lastSeen = seenTokens.get(remote.id) ?? 0;
        if (token > lastSeen) {
          seenTokens.set(remote.id, token);
          const code = Number(remote.properties?.lastCode ?? 0);
          if (code) {
            segments = buildNecSegments(code);
            segmentIndex = 0;
            segmentStartCycle = cpu.cycles;
          }
          break;
        }
      }
    },
  };
}