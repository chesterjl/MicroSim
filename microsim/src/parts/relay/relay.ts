// parts/relay/relay.ts
import type { ComponentModel, SimContext } from "../../engine/componentModel";
import type { PartInstance } from "../../types/types";
import { isPartElectricallyIsolated } from "../../engine/solver/isolation";

/**
 * Two independent failure surfaces:
 *
 * 1. COIL (vcc/gnd) -- modeled as a fixed resistive load so a real
 *    current can be derived via Ohm's law from whatever's driving vcc.
 *    Drive it from 9V/12V instead of its rated 5V and it draws well past
 *    safe current -- once burned, it's an open circuit and can never
 *    energize the armature again.
 *
 * 2. CONTACTS (com/no/nc) -- has nothing to do with the coil. This is
 *    whatever load current the user routes through the relay's switch
 *    side. Exceed the contact's rated current and they weld shut --
 *    permanently bridged in whichever position was closed at the moment
 *    of failure, independent of coil state from then on.
 */

const RELAY_COIL_RESISTANCE_OHMS = 70; // ~71mA @ 5V, typical for a 5V relay module coil
const MAX_SAFE_COIL_CURRENT_AMPS = 0.15; // ~2x rated -- a 9V/12V source blows past this fast

const CLOSED_CONTACT_OHMS = 0.01; // near-zero but nonzero -- mnaSolver.ts skips literal 0Ω branches on purpose
const MAX_SAFE_CONTACT_CURRENT_AMPS = 10; // mirrors a common 1-channel module (e.g. SRD-05VDC-SL-C), rated ~10A

type DestroyReason = "coil-burned" | "contacts-welded";

function activeContactPin(part: PartInstance, ctx: SimContext): "no" | "nc" {
  const reason = part.properties?.destroyedReason as DestroyReason | undefined;
  if (reason === "contacts-welded") {
    return (part.properties?.weldedPosition as "no" | "nc") ?? "no";
  }
  return ctx.hasFlag("relayEnergized", part.id) ? "no" : "nc";
}

export const relayModel: ComponentModel = {
  postResolve(part, ctx) {
    const reason = part.properties?.destroyedReason as DestroyReason | undefined;
    const coilBurned = reason === "coil-burned";
    const contactsWelded = reason === "contacts-welded";

    if (coilBurned) ctx.setFlag("relayCoilBurned", part.id);
    if (contactsWelded) ctx.setFlag("relayContactsWelded", part.id);

    // Welded contacts don't care what the coil does anymore -- lock the
    // digital union into whichever position they fused in.
    if (contactsWelded) {
      const weldedPosition = (part.properties?.weldedPosition as "no" | "nc") ?? "no";
      if (weldedPosition === "no") ctx.setFlag("relayEnergized", part.id);
      ctx.uf.union(ctx.key(part.id, "com"), ctx.key(part.id, weldedPosition));
      return;
    }

    const vccRoot = ctx.pinRoot(part.id, "vcc");
    const gndRoot = ctx.pinRoot(part.id, "gnd");
    const coilPowered = !coilBurned && ctx.netPower.has(vccRoot) && ctx.netGround.has(gndRoot);

    const inState = ctx.resolveNetState(ctx.pinRoot(part.id, "in"));
    const activeLow = part.properties?.activeLow !== false;
    const triggered = activeLow ? inState === "LOW" : inState === "HIGH";

    const energized = coilPowered && triggered;
    if (energized) ctx.setFlag("relayEnergized", part.id);

    if (energized) {
      ctx.uf.union(ctx.key(part.id, "com"), ctx.key(part.id, "no"));
    } else {
      ctx.uf.union(ctx.key(part.id, "com"), ctx.key(part.id, "nc"));
    }
  },

  contributeElectricalBranches(part, ctx) {
    // Bare, unwired relay -- don't inject a floating branch (same fix as
    // the LED/RGB LED isolation bug).
    if (isPartElectricallyIsolated(part, ctx.parts, ctx.electricalNodeId!)) return;

    const reason = part.properties?.destroyedReason as DestroyReason | undefined;

    // Coil load -- open circuit once burned, same convention as a blown LED.
    if (reason !== "coil-burned") {
      ctx.addResistiveBranch({
        nodeA: ctx.electricalNodeId!(part.id, "vcc"),
        nodeB: ctx.electricalNodeId!(part.id, "gnd"),
        ohms: RELAY_COIL_RESISTANCE_OHMS,
      });
    }

    // Contact branch -- present whether switching normally or permanently
    // welded into position.
    const activePin = activeContactPin(part, ctx);
    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, "com"),
      nodeB: ctx.electricalNodeId!(part.id, activePin),
      ohms: CLOSED_CONTACT_OHMS,
    });
  },

  resolveVoltage(part, ctx) {
    // Already failed -- nothing new to detect.
    if (part.properties?.destroyedReason) return;

    // --- Coil current, via Ohm's law across the coil branch above ---
    const coilVoltage = ctx.getNodeVoltage(part.id, "vcc") - ctx.getNodeVoltage(part.id, "gnd");
    const coilCurrentAmps = Math.abs(coilVoltage) / RELAY_COIL_RESISTANCE_OHMS;

    if (coilCurrentAmps > MAX_SAFE_COIL_CURRENT_AMPS) {
      ctx.setFlag("relayCoilBurned", part.id);
      part.properties = { ...part.properties, destroyed: true, destroyedReason: "coil-burned" };
      return; // coil just died this frame -- contact position is moot until the next run
    }

    // --- Contact current, via Ohm's law across the closed-contact branch ---
    const activePin = activeContactPin(part, ctx);
    const contactVoltage = ctx.getNodeVoltage(part.id, "com") - ctx.getNodeVoltage(part.id, activePin);
    const contactCurrentAmps = Math.abs(contactVoltage) / CLOSED_CONTACT_OHMS;

    if (contactCurrentAmps > MAX_SAFE_CONTACT_CURRENT_AMPS) {
      ctx.setFlag("relayContactsWelded", part.id);
      part.properties = {
        ...part.properties,
        destroyed: true,
        destroyedReason: "contacts-welded",
        weldedPosition: activePin,
      };
    }
  },
};