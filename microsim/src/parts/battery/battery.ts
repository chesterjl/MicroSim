import type { ComponentModel } from "../../engine/componentModel";

export const batteryModel: ComponentModel = {
  sourceVoltage(part) {
    return Number(part.properties?.voltage ?? 9);
  },
  isDeadSource(part) {
    return Number(part.properties?.voltage ?? 9) <= 0;
  },
  
  contributeElectricalBranches(part, ctx) {
    const voltage = Number(part.properties?.voltage ?? 9);
    if (voltage <= 0) return; // dead battery -- no source contribution
    ctx.addVoltageSource({
      id: `battery:${part.id}`,
      nodeA: ctx.electricalNodeId!(part.id, "positive"),
      nodeB: ctx.electricalNodeId!(part.id, "negative"),
      volts: voltage,
      seriesOhms: 1.5
    });
  },
};