import type { ComponentModel } from "../../engine/componentModel";

export const POTENTIOMETER_RATED_WATTAGE_DEFAULT = 0.5; // watts -- typical hobby trimmer/panel pot rating

export const potentiometerModel: ComponentModel = {
  connect(part, ctx) {
    if (part.properties?.destroyed) return; // burned-out track -- open circuit, no digital short either

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

    if (part.properties?.destroyed) return; // already open -- nothing left to overload

    const maxRes = (part.properties?.maxResistance as number) ?? 10000;
    const toPin1 = Math.max(1, Math.round(maxRes * wiperPosition));
    const toPin2 = Math.max(1, maxRes - toPin1);

    // Real node voltages on either side of each segment -- NOT the same
    // as netVoltageOverride above, which is the simplified digital
    // divider used by analogRead(). This is the MNA-solved value, so it
    // reflects whatever's actually loading pin1/pin2/wiper right now.
    const v1 = ctx.getNodeVoltage(part.id, "pin1");
    const vWiper = ctx.getNodeVoltage(part.id, "wiper");
    const v2 = ctx.getNodeVoltage(part.id, "pin2");

    const current1 = Math.abs(v1 - vWiper) / toPin1;
    const current2 = Math.abs(vWiper - v2) / toPin2;
    const powerWatts = current1 * current1 * toPin1 + current2 * current2 * toPin2;

    // Representative single-branch reading for the tooltip -- whichever
    // segment is carrying more current is the one actually cooking.
    const dominantCurrent = Math.max(current1, current2);
    const dominantOhms = current1 >= current2 ? toPin1 : toPin2;

    ctx.setElectricalReading(part.id, {
      loopVoltage: v1 - v2,
      totalResistanceOhms: dominantOhms,
      currentAmps: dominantCurrent,
      forwardVoltageDrop: 0,
    });

    const ratedWattage = Number(part.properties?.wattageRating ?? POTENTIOMETER_RATED_WATTAGE_DEFAULT);
    if (powerWatts > ratedWattage) {
      ctx.setFlag("potentiometerOverloaded", part.id);
    }
  },

  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return; // open circuit -- no branches at all

    const maxRes = (part.properties?.maxResistance as number) ?? 10000;
    const wiperPosition = (part.properties?.wiperPosition as number) ?? 0.5;
    // Min 1Ω at either extreme -- a literal 0Ω branch is skipped by the
    // solver (that's "short," which belongs in the topology graph, not
    // here), which would wrongly look like an open connection instead.
    const toPin1 = Math.max(1, Math.round(maxRes * wiperPosition));
    const toPin2 = Math.max(1, maxRes - toPin1);

    const pin1 = ctx.electricalNodeId!(part.id, "pin1");
    const wiper = ctx.electricalNodeId!(part.id, "wiper");
    const pin2 = ctx.electricalNodeId!(part.id, "pin2");

    ctx.addResistiveBranch({ nodeA: pin1, nodeB: wiper, ohms: toPin1 });
    ctx.addResistiveBranch({ nodeA: wiper, nodeB: pin2, ohms: toPin2 });
  },

  seriesResistanceContribution(part, roots, ctx) {
    if (part.properties?.destroyed) return 0; // open circuit -- contributes nothing to any series chain

    const p1Root = ctx.pinRoot(part.id, "pin1");
    const wiperRoot = ctx.pinRoot(part.id, "wiper");
    const p2Root = ctx.pinRoot(part.id, "pin2");

    if (!roots.has(p1Root) && !roots.has(wiperRoot) && !roots.has(p2Root)) return 0;

    const maxRes = (part.properties?.maxResistance as number) ?? 10000;
    let ohms = part.properties?.value as number;
    if (ohms === undefined && typeof part.properties?.wiperPosition === "number") {
      ohms = Math.round(maxRes * part.properties.wiperPosition);
    }
    return ohms ?? 5000;
  },
};