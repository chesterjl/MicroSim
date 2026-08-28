import { useState } from "react";
import {ChevronDown, CircuitBoard, Cpu, Search, SlidersHorizontal} from "lucide-react";
import type { BoardType, FilterOption } from "../../types/types";

interface FilterTabProps {
  value: BoardType;
  onChange: (value: BoardType) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  className?: string;
}

const FILTER_OPTIONS: FilterOption<BoardType>[] = [
  {
    label: "All Projects",
    value: "all",
    icon: <CircuitBoard className="w-4 h-4" />,
  },
  {
    label: "Arduino",
    value: "arduino",
    icon: <Cpu className="w-3.5 h-3.5" />,
  },
  {
    label: "ESP32",
    value: "esp32",
    icon: <Cpu className="w-3.5 h-3.5" />,
  },
  {
    label: "Raspberry Pi",
    value: "raspberry-pi",
    icon: <Cpu className="w-3.5 h-3.5" />,
  },
];

export default function FilterTab({value, onChange, searchQuery, onSearchChange, className = ""}: FilterTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = FILTER_OPTIONS.find((option) => option.value === value) ?? FILTER_OPTIONS[0];
  
  return (
    <div className={`flex flex-col gap-3 mb-8 pb-4 border-b border-zinc-800/80 ${className}`}>
      <div className="relative w-full md:max-w-sm md:self-end">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search projects..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/10 transition-all"
        />
      </div>

      <div className="relative md:hidden">
        <button type="button" onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:border-zinc-700 transition-all">
          <span className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400 shrink-0" />

            <span className="truncate">
              Filter: {selectedOption.label}
            </span>
          </span>

          <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}/>
        </button>

        {isOpen && (
          <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-40 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/40">
            <div className="flex flex-col gap-1">
              {FILTER_OPTIONS.map((option) => {
                const active = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all ${
                      active
                        ? "bg-cyan-500/15 text-cyan-400"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    }`}
                  >
                    {option.icon && (
                      <span className="shrink-0">{option.icon}</span>
                    )}

                    <span className="truncate">
                      {option.label}
                    </span>

                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:block overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 w-max p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          {FILTER_OPTIONS.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-cyan-500 text-black shadow-sm shadow-cyan-500/10"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70"
                }`}
              >
                {option.icon && (
                  <span className="shrink-0">{option.icon}</span>
                )}

                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}