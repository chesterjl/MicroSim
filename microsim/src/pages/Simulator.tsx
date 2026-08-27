import { useEffect, useState, useRef } from "react";
import { useCircuitStore } from "../store/circuitStore";
import { CodeEditor } from "../components/parts/simulation/CodeEditor";
import { CircuitCanvas } from "../components/parts/simulation/CircuitCanvas";
import type { PartInstance } from "../types/types";
import { PartsPalette } from "../components/parts/simulation/PartsPalette";
import { ComponentPropertiesModal } from "../components/common/ComponentPropertiesModal";
import SimulationNavbar, { type ViewMode } from "../components/common/SimulationNavbar";

export default function Simulator({ onBackToHome }: { onBackToHome: () => void }) {
  const parts = useCircuitStore((s) => s.parts);
  const addPart = useCircuitStore((s) => s.addPart);
  const running = useCircuitStore((s) => s.running);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [activePropertyPart, setActivePropertyPart] = useState<PartInstance | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");

  const hasInitializedArduino = useRef(false);

  useEffect(() => {
    if (!hasInitializedArduino.current) {
      hasInitializedArduino.current = true;
      if (!parts.some((p) => p.type === "arduino-uno")) {
        addPart("arduino-uno", 4200, 4000);
      }
    }
  }, [parts, addPart]);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(Math.max(prev + delta, 0.4), 3.0));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#121212]">
      {/* Extracted Navbar */}
      <SimulationNavbar
        onBackToHome={onBackToHome}
        zoomLevel={zoomLevel}
        onZoom={handleZoom}
        onResetView={handleResetView}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Responsive Workspace */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Code Editor View */}
        {(viewMode === "code" || viewMode === "split") && (
          <div className={`${
                viewMode === "split"
                  ? "hidden md:block md:w-[38%] md:min-w-[340px]"
                  : "w-full"
              } h-full border-r border-[#27272a] `}>
            <CodeEditor />
          </div>
        )}

        {(viewMode === "canvas" || viewMode === "split") && (
          <div className={`${
            viewMode === "split" ?
             "w-full md:flex-1" : 
             "w-full"} flex flex-col relative min-w-0 bg-[#161616] overflow-hidden h-full`}>

            {!running && (
              <div className="absolute top-4 left-4 z-20">
                <PartsPalette />
              </div>
            )}

            <div className="flex-1 min-h-0 w-full h-full relative overflow-hidden">
              <CircuitCanvas
                zoomLevel={zoomLevel}
                panOffset={panOffset}
                setPanOffset={setPanOffset}
                isSimulating={running}
                onOpenProperties={(part) => setActivePropertyPart(part)}
              />
            </div>
          </div>
        )}
      </div>

      <ComponentPropertiesModal
        part={activePropertyPart}
        onClose={() => setActivePropertyPart(null)}
      />
    </div>
  );
}
