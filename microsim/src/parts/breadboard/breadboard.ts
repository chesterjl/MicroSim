import type { ComponentModel, SimContext } from "../../engine/componentModel";
import type { PartInstance } from "../../types/types";
import { partDefinitions } from "../../config/partDefinitions";

function connect(part: PartInstance, ctx: SimContext) {
  const def = partDefinitions[part.type];
  if (!def) return;

  const columnGroups = new Map<string, { top: string[]; bottom: string[] }>();
  const railGroups: Record<string, string[]> = {
    pwr_top_plus: [],
    pwr_top_minus: [],
    pwr_bot_plus: [],
    pwr_bot_minus: [],
  };

  for (const pin of def.pins) {
    const colMatch = /^col_(\d+)_([a-j])$/.exec(pin.id);
    if (colMatch) {
      const [, colNum, row] = colMatch;
      const group = columnGroups.get(colNum) ?? { top: [], bottom: [] };
      if ("abcde".includes(row)) group.top.push(pin.id);
      else group.bottom.push(pin.id);
      columnGroups.set(colNum, group);
      continue;
    }
    const railMatch = /^pwr_(top|bot)_(plus|minus)_\d+$/.exec(pin.id);
    if (railMatch) {
      railGroups[`pwr_${railMatch[1]}_${railMatch[2]}`]?.push(pin.id);
    }
  }

  for (const group of columnGroups.values()) {
    for (let i = 1; i < group.top.length; i++) {
      ctx.uf.union(ctx.key(part.id, group.top[0]), ctx.key(part.id, group.top[i]));
    }
    for (let i = 1; i < group.bottom.length; i++) {
      ctx.uf.union(ctx.key(part.id, group.bottom[0]), ctx.key(part.id, group.bottom[i]));
    }
  }

  for (const pins of Object.values(railGroups)) {
    for (let i = 1; i < pins.length; i++) {
      ctx.uf.union(ctx.key(part.id, pins[0]), ctx.key(part.id, pins[i]));
    }
  }
}

export const breadboardModel: ComponentModel = { connect };