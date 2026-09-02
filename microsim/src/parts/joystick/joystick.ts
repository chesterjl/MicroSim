import type { ComponentModel } from "../../engine/componentModel";

export const joystickModel: ComponentModel = {
  connect(part, ctx) {
    if (part.properties?.pressed) {
      ctx.uf.union(ctx.key(part.id, "sw"), ctx.key(part.id, "gnd"));
    }
  },

  resolveVoltage(part, ctx) {
    const vccRoot = ctx.pinRoot(part.id, "vcc");
    const gndRoot = ctx.pinRoot(part.id, "gnd");
    const powered = ctx.netPower.has(vccRoot) && ctx.netGround.has(gndRoot);
    const vccVoltage = powered ? ctx.resolveNetVoltage(vccRoot) : 0;

    const xPos = (part.properties?.x as number) ?? 0.5;
    const yPos = (part.properties?.y as number) ?? 0.5;

    ctx.netVoltageOverride.set(ctx.pinRoot(part.id, "vrx"), powered ? vccVoltage * xPos : 0);
    ctx.netVoltageOverride.set(ctx.pinRoot(part.id, "vry"), powered ? vccVoltage * yPos : 0);
  },
};