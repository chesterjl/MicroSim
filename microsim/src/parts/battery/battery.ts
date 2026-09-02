import type { ComponentModel } from "../../engine/componentModel";

export const batteryModel: ComponentModel = {
  sourceVoltage(part) {
    return Number(part.properties?.voltage ?? 9);
  },
  isDeadSource(part) {
    return Number(part.properties?.voltage ?? 9) <= 0;
  },
};