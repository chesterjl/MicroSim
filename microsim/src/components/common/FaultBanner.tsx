import { AlertTriangle, AlertOctagon, X } from "lucide-react";
import type { FaultType, FaultSeverity } from "../../engine/faults/faultTypes";

const FAULT_LABELS: Record<FaultType, string> = {
  "short-circuit": "Short Circuit",
  "conflicting-voltage-sources": "Conflicting Sources",
  "floating-node": "Floating Node",
  "disconnected-component": "Disconnected Component",
  "no-ground-reference": "No Ground Reference",
  "invalid-connection": "Invalid Connection",
  "overloaded-component": "Overloaded Component",
};

interface FaultBannerProps {
  faultType: FaultType;
  severity: FaultSeverity;
  message: string;
  onClose: () => void;
}

export function FaultBanner({ faultType, severity, message, onClose }: FaultBannerProps) {
  const critical = severity === "critical";
  
  return (
    <div
      className={`flex items-start gap-2 w-72 sm:w-80 rounded-lg border px-2.5 py-2 shadow-lg backdrop-blur-sm ${
        critical
          ? "bg-red-950/90 border-red-700/60 text-red-100"
          : "bg-amber-950/90 border-amber-700/60 text-amber-100"
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {critical ? (
          <AlertOctagon className="w-4 h-4 text-red-400" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[9px] font-bold uppercase tracking-wide ${critical ? "text-red-300" : "text-amber-300"}`}>
          {FAULT_LABELS[faultType] ?? faultType}
        </p>
        <p className="text-[11px] leading-snug mt-0.5 line-clamp-2">{message}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss fault"
        className={`shrink-0 p-0.5 rounded transition-colors ${
          critical ? "text-red-300 hover:text-white hover:bg-red-800/60" : "text-amber-300 hover:text-white hover:bg-amber-800/60"
        }`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}