import type { PartInstance } from "../types/types";
import type { NetState } from "../engine/netlist";

export interface BreadboardProps {
  part: PartInstance;
  selected: boolean;
  pinStates?: Record<string, NetState>;
  onPinClick?: (pinId: string, e: React.MouseEvent) => void;
}