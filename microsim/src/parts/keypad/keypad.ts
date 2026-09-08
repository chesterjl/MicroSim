import type { ComponentModel } from "../../engine/componentModel";

export const keypadModel: ComponentModel = {
  connect(part, ctx) {
    const pressedRow = part.properties?.pressedRow;
    const pressedCol = part.properties?.pressedCol;
    if (typeof pressedRow === "number" && typeof pressedCol === "number") {
      ctx.uf.union(
        ctx.key(part.id, `row${pressedRow + 1}`),
        ctx.key(part.id, `col${pressedCol + 1}`)
      );
    }
  },
  contributeElectricalBranches(part, ctx) {
    const pressedRow = part.properties?.pressedRow;
    const pressedCol = part.properties?.pressedCol;

    if (
      typeof pressedRow !== "number" ||
      typeof pressedCol !== "number"
    ) {
      return;
    }

    ctx.addResistiveBranch({
      nodeA: ctx.electricalNodeId!(part.id, `row${pressedRow + 1}`),
      nodeB: ctx.electricalNodeId!(part.id, `col${pressedCol + 1}`),
      ohms: 0.01,
    });
  },
};