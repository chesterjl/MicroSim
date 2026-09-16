import type { ComponentModel, SimContext } from "../../engine/componentModel";
import type { PartInstance } from "../../types/types";
import { DEFAULT_LED_FORWARD_VOLTAGE, MAX_SAFE_CURRENT_AMPS, MIN_VISIBLE_CURRENT_AMPS, isOvercurrent } from "../../engine/physics/ohmsLaw";

const SEGMENT_IDS = ["seg_a", "seg_b", "seg_c", "seg_d", "seg_e", "seg_f", "seg_g", "seg_dp"] as const;
type SegmentId = (typeof SEGMENT_IDS)[number];

const SEGMENT_FORWARD_VOLTAGE = DEFAULT_LED_FORWARD_VOLTAGE; // 2.0V
const SEGMENT_SERIES_OHMS = 10.0;

function commonType(part: PartInstance): "cathode" | "anode" {
  return (part.properties?.commonType as string) === "anode" ? "anode" : "cathode";
}

function isDigitallyLit(part: PartInstance, segmentId: SegmentId, ctx: SimContext): boolean {
  const type = commonType(part);
  const commonState = ctx.resolveNetState(ctx.pinRoot(part.id, "com1"));
  const segState = ctx.resolveNetState(ctx.pinRoot(part.id, segmentId));
  return type === "cathode" ? commonState === "LOW" && segState === "HIGH" : commonState === "HIGH" && segState === "LOW";
}

export const sevenSegmentModel: ComponentModel = {
  connect(part, ctx) {
    ctx.uf.union(ctx.key(part.id, "com1"), ctx.key(part.id, "com2"));
  },

   // NEW -- see componentModel.ts for why this is separate from connect() above.
  electricalAliases() {
    return [["com1", "com2"]];
  },

  contributeElectricalBranches(part, ctx) {
    if (part.properties?.destroyed) return;

    const type = commonType(part);
    const comNode = ctx.electricalNodeId!(part.id, "com1");

    for (const segId of SEGMENT_IDS) {
      // Only stamp a branch for segments the digital layer actually says
      // should be lit -- avoids forcing an ideal source onto a floating
      // or unselected pin.
      if (!isDigitallyLit(part, segId, ctx)) continue;

      const segNode = ctx.electricalNodeId!(part.id, segId);
      const [nodeA, nodeB] = type === "cathode" ? [segNode, comNode] : [comNode, segNode];

      ctx.addVoltageSource({
        id: `sevenseg:${part.id}:${segId}`,
        partId: part.id,
        nodeA,
        nodeB,
        volts: SEGMENT_FORWARD_VOLTAGE,
        seriesOhms: SEGMENT_SERIES_OHMS,
        isJunctionDrop: true,
      });
    }
  },

  resolveVoltage(part, ctx) {
    if (part.properties?.destroyed) return;

    let activeCount = 0;
    let underLimitedCount = 0; // segments drawing more current than a real resistor would ever allow

    for (const segId of SEGMENT_IDS) {
      if (!isDigitallyLit(part, segId, ctx)) continue;
      activeCount++;

      const currentAmps = Math.abs(ctx.getSourceCurrent(`sevenseg:${part.id}:${segId}`));
      const segVoltage = ctx.getNodeVoltage(part.id, segId);
      const comVoltage = ctx.getNodeVoltage(part.id, "com1");
      const loopVoltage = Math.abs(segVoltage - comVoltage);
      const totalResistanceOhms = currentAmps > 0 ? loopVoltage / currentAmps : Infinity;

      ctx.setElectricalReading(`${part.id}:${segId}`, {
        loopVoltage,
        totalResistanceOhms,
        currentAmps,
        forwardVoltageDrop: SEGMENT_FORWARD_VOLTAGE,
      });

      if (isOvercurrent(currentAmps, MAX_SAFE_CURRENT_AMPS)) {
        // No (or too small a) series resistor -- current is only limited
        // by the junction's own ~10ohm internal resistance. This does
        // NOT go dark and does NOT explode on its own; it's flagged
        // per-segment purely so the ONE aggregate warning below can name
        // exactly which segments need a resistor.
        ctx.setFlag(`sevenSegmentMissingResistor:${segId}`, part.id);
        underLimitedCount++;
      }
    }

    if (underLimitedCount > 0) {
      // Single part-level flag -- the only one actually registered in
      // FLAG_FAULT_REGISTRY, so this is always exactly ONE banner no
      // matter how many segments triggered it.
      ctx.setFlag("sevenSegmentMissingResistor", part.id);
    }

    // Whole-package destruction only when EVERY currently-lit segment is
    // under-limited at once -- the entire display had no current limiting
    // anywhere, not just one forgotten resistor on an otherwise-fine
    // circuit. A partial miss stays lit and just carries the warning above.
    if (activeCount > 0 && underLimitedCount === activeCount) {
      ctx.setFlag("sevenSegmentBlown", part.id);
    }
  },

  isSegmentLit(part, segmentId, ctx) {
    if (part.properties?.destroyed) return false;
    if (ctx.hasFlag("sevenSegmentBlown", part.id)) return false; // whole package destroyed -- everything's dark

    // Digital match is necessary but not sufficient -- a breadboard rail
    // typed "power"/"ground" can read HIGH/LOW even with nothing real
    // powering it, so real solved current is still required before
    // rendering "on" (same guard LED/RGB LED use).
    if (!isDigitallyLit(part, segmentId as SegmentId, ctx)) return false;

    const reading = ctx.getElectricalReading(`${part.id}:${segmentId}`);
    return (reading?.currentAmps ?? 0) > MIN_VISIBLE_CURRENT_AMPS;
  },
};