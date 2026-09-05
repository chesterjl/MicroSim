import type { AVRIOPort } from "avr8js";

export function getPortAndBit(pin: number, portB: AVRIOPort, portD: AVRIOPort): { port: AVRIOPort; bit: number } {
  return pin <= 7 ? { port: portD, bit: pin } : { port: portB, bit: pin - 8 };
}
