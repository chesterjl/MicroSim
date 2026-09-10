import { useEffect, useState } from "react";
import type { Fault } from "../../engine/faults/faultTypes";
import { FaultBanner } from "./FaultBanner";

interface FaultStackProps {
  faults: Fault[];
  isSimulating: boolean;
}

/* Identifies the same logical fault even when its message changes
 (for example, a short-circuit current changing from 1.20A to 1.35A). */
function faultKey(fault: Fault): string {
  return `${fault.type}:${fault.partIds.slice().sort().join(",")}`;
}

export function FaultStack({ faults, isSimulating }: FaultStackProps) {
  /* Only dismissal is persistent during a simulation run.
   * We intentionally DO NOT persist the detected faults themselves.
   * `faults` is the live result of the current simulation frame. */ 
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  // Starting a new simulation run clears previous dismissals.
  useEffect(() => {
    if (!isSimulating) return;

    setDismissedKeys(new Set());
  }, [isSimulating]);

  if (!isSimulating) return null;

  /* `faults` is the LIVE fault state.
   *
   * Do not keep a separate `shownFaults` state here.
   * If a fault disappears from `faults`, it should disappear
   * from the UI immediately.
   */
  const visibleFaults = faults.filter((fault) => !dismissedKeys.has(faultKey(fault)));

  if (visibleFaults.length === 0) return null;

  const handleClose = (fault: Fault) => {
    const key = faultKey(fault);

    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  return (
    <div className="absolute top-4 right-4 z-30 flex flex-col gap-1.5 max-h-[65%] overflow-y-auto pr-1 scrollbar-none pointer-events-none">
      {visibleFaults.map((fault) => {
        const key = faultKey(fault);

        return (
          <div key={key} className="pointer-events-auto">
            <FaultBanner
              faultType={fault.type}
              severity={fault.severity}
              message={fault.message}
              onClose={() => handleClose(fault)}
            />
          </div>
        );
      })}
    </div>
  );
}