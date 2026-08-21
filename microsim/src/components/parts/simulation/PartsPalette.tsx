import { useState, useRef, useEffect } from "react";
import { useCircuitStore } from "../../../store/circuitStore";

interface PartOption {
  type: string;
  label: string;
  category: "Basic" | "Display" | "Microcontrollers" | "Breadboards" | "Sensor";
  icon: string;
}

// Transparent SVG Data URIs for catalog icons
const ICONS = {
  led: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21V29" stroke="%23A1A1AA" stroke-width="2" stroke-linecap="round"/><path d="M20 21V28" stroke="%2371717A" stroke-width="2" stroke-linecap="round"/><path d="M10 20H22V21H10V20Z" fill="%2352525B"/><path d="M9 14C9 10.134 12.134 7 16 7C19.866 7 23 10.134 23 14V20H9V14Z" fill="%23EF4444"/><path d="M8 19.5C8 19.2239 8.22386 19 8.5 19H23.5C23.7761 19 24 19.2239 24 19.5V20.5C24 20.7761 23.7761 21 23.5 21H8.5C8.22386 21 8 20.7761 8 20.5V19.5Z" fill="%23DC2626"/><path d="M12 10.5C13.1 9.5 14.5 9 16 9" stroke="%23FFAAAA" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/></svg>`,
  resistor: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 16H8L11 8L15 24L19 8L23 24L26 16H30" stroke="%23F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pushbutton: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="20" height="20" rx="4" fill="%233F3F46" stroke="%2371717A" stroke-width="1.5"/><circle cx="16" cy="16" r="6" fill="%2371717A"/><circle cx="16" cy="16" r="4.5" fill="%2327272A"/></svg>`,
  potentiometer: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="7" width="18" height="18" rx="3" fill="%230284C7"/><circle cx="16" cy="16" r="6" fill="%23E4E4E7"/><circle cx="16" cy="16" r="1.5" fill="%2371717A"/><path d="M16 10V12" stroke="%2371717A" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  breadboard: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="24" height="16" rx="2" fill="%23E4E4E7" stroke="%23A1A1AA" stroke-width="1.5"/><circle cx="9" cy="12" r="1" fill="%2352525B"/><circle cx="13" cy="12" r="1" fill="%2352525B"/><circle cx="17" cy="12" r="1" fill="%2352525B"/><circle cx="21" cy="12" r="1" fill="%2352525B"/><circle cx="25" cy="12" r="1" fill="%2352525B"/><circle cx="9" cy="20" r="1" fill="%2352525B"/><circle cx="13" cy="20" r="1" fill="%2352525B"/><circle cx="17" cy="20" r="1" fill="%2352525B"/><circle cx="21" cy="20" r="1" fill="%2352525B"/><circle cx="25" cy="20" r="1" fill="%2352525B"/></svg>`,
  battery: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="10" width="4" height="12" rx="1" fill="%231C1C1C"/><rect x="8" y="8" width="8" height="16" fill="%23E2965A"/><rect x="16" y="8" width="12" height="16" rx="2" fill="%232B2B2E"/><path d="M20 12V20" stroke="%23E5E5E5" stroke-width="1.5" stroke-linecap="round"/><path d="M17.5 16H22.5" stroke="%23E5E5E5" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  arduino: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6" width="24" height="20" rx="2" fill="%230284C7"/><rect x="6" y="8" width="5" height="5" fill="%23A1A1AA"/><rect x="22" y="9" width="4" height="14" fill="%2318181B"/><circle cx="14" cy="16" r="2.5" fill="%2318181B"/></svg>`,
  esp32: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="20" height="24" rx="2" fill="%2315803D"/><rect x="10" y="8" width="12" height="10" rx="1" fill="%23A1A1AA"/><rect x="8" y="20" width="16" height="6" fill="%2318181B"/></svg>`,
  lcd: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="28" height="20" rx="2" fill="%231ca063" stroke="%23127a44" stroke-width="1"/><rect x="6" y="10" width="20" height="12" fill="%231a1a1a"/><rect x="8" y="12" width="16" height="8" fill="%231d3f75"/></svg>`,
  ultrasonic: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="8" width="26" height="16" rx="3" fill="%230f6ea8" stroke="%230a4a73" stroke-width="1.5"/><circle cx="11" cy="16" r="5" fill="%233a3a3a"/><circle cx="21" cy="16" r="5" fill="%233a3a3a"/><circle cx="11" cy="16" r="2.5" fill="%235a5a5a"/><circle cx="21" cy="16" r="2.5" fill="%235a5a5a"/></svg>`,
};

const PART_CATALOG: PartOption[] = [
  { type: "led", label: "LED", category: "Basic", icon: ICONS.led },
  { type: "resistor", label: "Resistor", category: "Basic", icon: ICONS.resistor },
  { type: "pushbutton", label: "Pushbutton", category: "Basic", icon: ICONS.pushbutton },
  { type: "potentiometer", label: "Potentiometer", category: "Basic", icon: ICONS.potentiometer },
  { type: "battery", label: "9V Battery", category: "Basic", icon: ICONS.battery },
    
  { type: "ultrasonic-hcsr04", label: "Ultrasonic Sensor (HC-SR04)", category: "Sensor", icon: ICONS.ultrasonic },

  { type: "breadboard-mini", label: "Small Breadboard", category: "Breadboards", icon: ICONS.breadboard },
  { type: "breadboard-half", label: "Medium Breadboard", category: "Breadboards", icon: ICONS.breadboard },
  { type: "breadboard-full", label: "Large Breadboard", category: "Breadboards", icon: ICONS.breadboard },

  { type: "arduino-uno", label: "Arduino Uno", category: "Microcontrollers", icon: ICONS.arduino },
  { type: "esp32", label: "ESP32", category: "Microcontrollers", icon: ICONS.esp32 },

  { type: "lcd-16x2-i2c", label: "LCD 16x2 (I2C)", category: "Display", icon: ICONS.lcd },
];

export function PartsPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const addPart = useCircuitStore((s) => s.addPart);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPart = (type: string) => {
    // Spawn new parts in canvas center area
    addPart(type, 400 + Math.random() * 40, 300 + Math.random() * 40);
    setIsOpen(false);
    setSearch("");
  };
  
  const filteredCatalog = PART_CATALOG.filter((part) =>
    part.label.toLowerCase().includes(search.toLowerCase()) || part.category.toLocaleLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(filteredCatalog.map((p) => p.category)));

  return (
    <div ref={menuRef} className="relative">

      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Add a new part"
        className="w-[38px] h-[38px] rounded-full bg-sky-600 hover:bg-sky-500 text-white border-none flex items-center justify-center shadow-lg transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-12 left-0 w-[280px] max-h-[400px] bg-[#1e1e22] border border-[#333338] rounded-lg shadow-2xl z-[1000] flex flex-col overflow-hidden">
          {/* Search Header */}
          <div className="p-2.5 border-b border-[#2a2a30]">
            <input
              type="text"
              placeholder="Search parts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-[#121214] border border-[#3a3a40] rounded-md text-white text-xs outline-none focus:border-cyan-500 transition-colors"
              autoFocus
            />
          </div>

          {/* Catalog List */}
          <div className="flex-1 overflow-y-auto py-1.5">
            {filteredCatalog.length === 0 ? (
              <div className="p-5 text-center text-zinc-500 text-xs">No components found</div>
            ) : (
              categories.map((cat) => (
                <div key={cat}>
                  <div className="px-4 pt-2 pb-1 text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    {cat}
                  </div>
                  {filteredCatalog
                    .filter((item) => item.category === cat)
                    .map((item) => (
                      <button
                        key={item.type}
                        onClick={() => handleSelectPart(item.type)}
                        className="w-full px-4 py-2 bg-transparent hover:bg-zinc-800 text-zinc-200 text-xs text-left flex items-center gap-3 transition-colors border-none"
                      >
                        <img
                          src={item.icon}
                          alt={item.label}
                          className="w-5 h-5 object-contain shrink-0 pointer-events-none"
                        />
                        <span>{item.label}</span>
                      </button>
                    ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}