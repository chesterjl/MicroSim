import type { ComponentModel } from "../../engine/componentModel";

export const potentiometerModel: ComponentModel = {
  connect(part, ctx) {
    const wiperPosition = (part.properties?.wiperPosition as number) ?? 0.5;
    // Digital snap: which side the wiper "touches" depends on sweep half.
    // The real linear interpolation for analogRead() happens separately
    // in resolveVoltage below.
    if (wiperPosition >= 0.5) {
      ctx.uf.union(ctx.key(part.id, "wiper"), ctx.key(part.id, "pin2"));
    } else {
      ctx.uf.union(ctx.key(part.id, "wiper"), ctx.key(part.id, "pin1"));
    }
  },

  resolveVoltage(part, ctx) {
    const pin1Root = ctx.pinRoot(part.id, "pin1");
    const pin2Root = ctx.pinRoot(part.id, "pin2");
    const wiperRoot = ctx.pinRoot(part.id, "wiper");
    const wiperPosition = (part.properties?.wiperPosition as number) ?? 0.5;

    const pin1V = ctx.resolveNetVoltage(pin1Root);
    const pin2V = ctx.resolveNetVoltage(pin2Root);
    ctx.netVoltageOverride.set(wiperRoot, pin1V + (pin2V - pin1V) * wiperPosition);
  },
};