import type { PartInstance, Wire } from "../../types/types";
import { partDefinitions } from "../../config/partDefinitions";
import { getResolvedPins } from "../physics/geometry";
import { UnionFind } from "../unionFind";

export const BREADBOARD_CONTACT_EPSILON_PX = 2;

export interface ElectricalGraph {
  nodeId(partId: string, pinId: string): number;
  readonly groundNodeId: number;
  readonly nodeCount: number;
}

function pinKey(partId: string, pinId: string) {
  return `${partId}::${pinId}`;
}

/**
 * Builds the electrical graph used by the MNA solver.
 *
 * Only actual conductors are unioned here:
 *   - user wires
 *   - breadboard internal connections
 *   - physical component/breadboard contact
 *   - global ground reference
 *
 * Resistive components such as resistors, potentiometers and photoresistors
 * are NOT shorted here. Their two terminals must remain separate so that
 * contributeElectricalBranches() can place a resistor between them.
 */
export function buildElectricalGraph(
  parts: PartInstance[],
  wires: Wire[]
): ElectricalGraph {
  const uf = new UnionFind();

  // 1. Seed every pin.
  // This gives every physical pin a Union-Find entry, but it does NOT mean
  // every pin becomes an MNA unknown. mnaSolver.ts filters untouched nodes.
  for (const part of parts) {
    const def = partDefinitions[part.type];
    if (!def) continue;

    for (const pin of def.pins) {
      uf.find(pinKey(part.id, pin.id));
    }
  }

  // 2. User-created wires are real conductors.
  for (const wire of wires) {
    uf.union(
      pinKey(wire.from.partId, wire.from.pinId),
      pinKey(wire.to.partId, wire.to.pinId)
    );
  }

  for (const breadboard of parts) {
    if (!breadboard.type.startsWith("breadboard")) {
      continue;
    }

    const def = partDefinitions[breadboard.type];
    if (!def) continue;

    const columnGroups = new Map<
      string,
      {
        top: string[];
        bottom: string[];
      }
    >();

    const railGroups: Record<string, string[]> = {
      pwr_top_plus: [],
      pwr_top_minus: [],
      pwr_bot_plus: [],
      pwr_bot_minus: [],
    };

    for (const pin of def.pins) {
      // ---------------------------------------------------------------
      // Breadboard terminal strips:
      //
      // col_1_a ... col_1_e
      // col_1_f ... col_1_j
      // ---------------------------------------------------------------
      const colMatch = /^col_(\d+)_([a-j])$/.exec(pin.id);

      if (colMatch) {
        const [, colNum, row] = colMatch;

        const group = columnGroups.get(colNum) ?? {
            top: [],
            bottom: [],
          };

        if ("abcde".includes(row)) {
          group.top.push(pin.id);
        } else {
          group.bottom.push(pin.id);
        }

        columnGroups.set(colNum, group);
        continue;
      }

      // Breadboard power rails.
      // pwr_top_plus_1 ,  pwr_top_plus_2
      const railMatch =
        /^pwr_(top|bot)_(plus|minus)_\d+$/.exec(pin.id);

      if (railMatch) {
        const groupName =
          `pwr_${railMatch[1]}_${railMatch[2]}`;

        railGroups[groupName]?.push(pin.id);
      }
    }

    // Union each five-hole terminal strip.
    for (const group of columnGroups.values()) {
      // a-e
      for (let i = 1; i < group.top.length; i++) {
        uf.union(
          pinKey(breadboard.id, group.top[0]),
          pinKey(breadboard.id, group.top[i])
        );
      }

      // f-j
      for (let i = 1; i < group.bottom.length; i++) {
        uf.union(
          pinKey(breadboard.id, group.bottom[0]),
          pinKey(breadboard.id, group.bottom[i])
        );
      }
    }

    // Union each power rail.
    for (const pins of Object.values(railGroups)) {
      if (pins.length === 0) continue;

      for (let i = 1; i < pins.length; i++) {
        uf.union(
          pinKey(breadboard.id, pins[0]),
          pinKey(breadboard.id, pins[i])
        );
      }
    }
  }

  // 4. Physical contact between component pins and breadboard holes.
  // - This is useful when a component pin is physically sitting directly in a
  // breadboard hole, even if there is no explicit wire object between them.
  // - The slightly relaxed 2px tolerance prevents tiny floating-point / geometry
  // differences from making a visually snapped connection electrically open.
  const breadboards = parts.filter((p) => p.type.startsWith("breadboard"));

  if (breadboards.length > 0) {
    const breadboardPins = breadboards.flatMap((bb) => getResolvedPins(bb).map((pin) => ({...pin, bbPartId: bb.id})));

    for (const part of parts) {
      if (part.type.startsWith("breadboard")) continue;

      const componentPins = getResolvedPins(part);

      for (const pin of componentPins) {
        for (const bbPin of breadboardPins) {
          const distance = Math.hypot(bbPin.x - pin.x, bbPin.y - pin.y);

          if (distance < BREADBOARD_CONTACT_EPSILON_PX) {
            uf.union(
              pinKey(part.id, pin.pinId),
              pinKey(bbPin.bbPartId, bbPin.pinId)
            );
          }
        }
      }
    }
  }

  // 5. Collapse every GND pin into one global ground node.
  // MNA reserves node 0 for ground.
  let groundRoot: string | null = null;

  for (const part of parts) {
    const def = partDefinitions[part.type];
    if (!def) continue;

    for (const pin of def.pins) {
      if (pin.type !== "ground") continue;

      const root = uf.find(pinKey(part.id, pin.id));

      if (groundRoot === null) {
        groundRoot = root;
      } else {
        groundRoot = uf.find(groundRoot);
      }

      uf.union(groundRoot, root);
      groundRoot = uf.find(groundRoot);
    }
  }

  // 6. Convert Union-Find roots into compact MNA node IDs.
  //
  // Node 0 = ground.
  // Other nodes are assigned lazily when nodeId() is requested.
  //
  // mnaSolver.ts will additionally filter out nodes that aren't referenced
  // by any electrical branch/source.
  const rootToNode = new Map<string, number>();

  let nextId = 1;

  if (groundRoot !== null) rootToNode.set(uf.find(groundRoot), 0);

  function nodeId(partId: string, pinId: string): number {
    const root = uf.find(pinKey(partId, pinId));

    let id = rootToNode.get(root);

    if (id === undefined) {
      id = nextId++;
      rootToNode.set(root, id);
    }

    return id;
  }

  // 7. Pre-assign every pin.
  // This keeps nodeCount stable before electrical branches are contributed.
  //
  // NOTE:
  // mnaSolver.ts no longer assumes all of these nodes are electrically relevant. 
  // It filters them down to only nodes referenced by branches and sources.
  for (const part of parts) {
    const def = partDefinitions[part.type];
    if (!def) continue;

    for (const pin of def.pins) nodeId(part.id, pin.id);
  }
  return {
    nodeId,
    groundNodeId: 0,

    get nodeCount() {
      return nextId;
    },
  };
}