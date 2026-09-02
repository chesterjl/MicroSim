import type { ComponentModel } from "../../engine/componentModel";

export const hcsr04Model: ComponentModel = {
  driveAfterPower(part, ctx) {
    const vccRoot = ctx.pinRoot(part.id, "vcc");
    const gndRoot = ctx.pinRoot(part.id, "gnd");
    const powered = ctx.netPower.has(vccRoot) && ctx.netGround.has(gndRoot);
    const echoRoot = ctx.pinRoot(part.id, "echo");

    // NOTE: preserved verbatim from your current netlist.ts. buildNetlist()
    // already early-returns when !isRunning, so ctx.isRunning is always
    // true by the time this runs -- this branch appears unreachable today.
    // Kept identical rather than silently "fixed," since I don't know if
    // it was meant for a call site that builds a netlist with
    // isRunning=false but still wants a static echo preview. The real
    // timed echo pulse during an actual run is handled separately by
    // createUltrasonicDevice in circuitStore.ts either way.
    if (!ctx.isRunning) {
      const distanceCm = Number(part.properties?.distanceCm ?? 400);
      const thresholdCm = Number(part.properties?.detectionThresholdCm ?? 100);
      if (powered && distanceCm <= thresholdCm) {
        ctx.netDrivenHigh.add(echoRoot);
      } else {
        ctx.netDrivenLow.add(echoRoot);
      }
    }
  },
};