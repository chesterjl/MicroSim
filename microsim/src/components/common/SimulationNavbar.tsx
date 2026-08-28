import { useEffect, useRef, useState } from "react";
import { EllipsisVertical, RotateCcw, ZoomIn, ZoomOut, Code2, CircuitBoard, Columns, Check } from "lucide-react";

export type ViewMode = "split" | "code" | "canvas";

interface SimulationNavbarProps {
  onBackToHome: () => void;
  zoomLevel: number;
  onZoom: (delta: number) => void;
  onResetView: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function SimulationNavbar({ onBackToHome, zoomLevel, onZoom, onResetView, viewMode, onViewModeChange}: SimulationNavbarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReset = () => {
    onResetView();
    setIsSettingsOpen(false);
  };

  const handleSelectView = (mode: ViewMode) => {
    onViewModeChange(mode);
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#18181b] border-b border-[#27272a] z-30 select-none">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <button onClick={onBackToHome} className="text-sky-400 font-bold text-sm hover:text-sky-300 transition-colors">
          ← MicroSim
        </button>
        <span className="text-zinc-600 text-xs">|</span>
        <span className="text-zinc-400 text-xs font-mono">Arduino Uno</span>
      </div>

      {/* Right Dropdown Menu */}
      <div ref={settingsRef} className="relative">
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="text-zinc-400 text-xl font-bold p-1 px-2 rounded hover:bg-zinc-800 transition-colors flex items-center justify-center"
          aria-label="Settings"
        >
          <EllipsisVertical size={20} />
        </button>

        {isSettingsOpen && (
          <div className="absolute top-9 right-0 w-52 bg-[#1e1e22] border border-[#333338] rounded-md shadow-2xl py-1 z-50">
            {/* View Selection Section */}
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-[#27272a]">
              Workspace Layout
            </div>

            <button
              onClick={() => handleSelectView("code")}
              className="w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Code2 size={16} className="shrink-0 text-zinc-400" />
                <span>Code Only</span>
              </div>
              {viewMode === "code" && <Check size={14} className="text-sky-400" />}
            </button>

            <button
              onClick={() => handleSelectView("canvas")}
              className="w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <CircuitBoard size={16} className="shrink-0 text-zinc-400" />
                <span>Canvas Only</span>
              </div>
              {viewMode === "canvas" && <Check size={14} className="text-sky-400" />}
            </button>

            <button
              onClick={() => handleSelectView("split")}
              className="w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Columns size={16} className="shrink-0 text-zinc-400" />
                <span>Split View</span>
              </div>
              {viewMode === "split" && <Check size={14} className="text-sky-400" />}
            </button>

            {/* Canvas Zoom Section */}
            <div className="mt-1 px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-t border-b border-[#27272a]">
              Canvas View ({Math.round(zoomLevel * 100)}%)
            </div>

            <button
              onClick={() => onZoom(0.15)}
              className="w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
            >
              <ZoomIn size={16} className="shrink-0 text-zinc-400" />
              <span>Zoom In</span>
            </button>

            <button
              onClick={() => onZoom(-0.15)}
              className="w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
            >
              <ZoomOut size={16} className="shrink-0 text-zinc-400" />
              <span>Zoom Out</span>
            </button>

            <button
              onClick={handleReset}
              className="w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
            >
              <RotateCcw size={16} className="shrink-0 text-zinc-400" />
              <span>Reset View</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimulationNavbar;