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
};