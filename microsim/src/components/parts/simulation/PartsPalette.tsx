import { useState, useRef, useEffect } from "react";
import { useCircuitStore } from "../../../store/circuitStore";

interface PartOption {
  type: string;
  label: string;
  category: "Basic" | "Display" | "Microcontrollers" | "Breadboards" | "Sensor" | "Motors" | "Input" | "Actuators";
  icon: string;
}

const ICONS = {
  led: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21V29" stroke="%23A1A1AA" stroke-width="2" stroke-linecap="round"/><path d="M20 21V28" stroke="%2371717A" stroke-width="2" stroke-linecap="round"/><path d="M10 20H22V21H10V20Z" fill="%2352525B"/><path d="M9 14C9 10.134 12.134 7 16 7C19.866 7 23 10.134 23 14V20H9V14Z" fill="%23EF4444"/><path d="M8 19.5C8 19.2239 8.22386 19 8.5 19H23.5C23.7761 19 24 19.2239 24 19.5V20.5C24 20.7761 23.7761 21 23.5 21H8.5C8.22386 21 8 20.7761 8 20.5V19.5Z" fill="%23DC2626"/><path d="M12 10.5C13.1 9.5 14.5 9 16 9" stroke="%23FFAAAA" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/></svg>`,
  resistor: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 16H8L11 8L15 24L19 8L23 24L26 16H30" stroke="%23F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  capacitor: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="4" width="12" height="18" rx="2" fill="%2318181B" stroke="%233F3F46" stroke-width="1.5"/><rect x="18" y="7" width="3" height="12" fill="%233F3F46"/><path d="M10 5C10 5 16 3 22 5" stroke="%2371717A" stroke-width="1.5"/><path d="M13 22V28" stroke="%23A1A1AA" stroke-width="2" stroke-linecap="round"/><path d="M19 22V26" stroke="%2371717A" stroke-width="2" stroke-linecap="round"/></svg>`,
  pushbutton: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="20" height="20" rx="4" fill="%233F3F46" stroke="%2371717A" stroke-width="1.5"/><circle cx="16" cy="16" r="6" fill="%2371717A"/><circle cx="16" cy="16" r="4.5" fill="%2327272A"/></svg>`,
  potentiometer: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="7" width="18" height="18" rx="3" fill="%230284C7"/><circle cx="16" cy="16" r="6" fill="%23E4E4E7"/><circle cx="16" cy="16" r="1.5" fill="%2371717A"/><path d="M16 10V12" stroke="%2371717A" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  breadboard: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="24" height="16" rx="2" fill="%23E4E4E7" stroke="%23A1A1AA" stroke-width="1.5"/><circle cx="9" cy="12" r="1" fill="%2352525B"/><circle cx="13" cy="12" r="1" fill="%2352525B"/><circle cx="17" cy="12" r="1" fill="%2352525B"/><circle cx="21" cy="12" r="1" fill="%2352525B"/><circle cx="25" cy="12" r="1" fill="%2352525B"/><circle cx="9" cy="20" r="1" fill="%2352525B"/><circle cx="13" cy="20" r="1" fill="%2352525B"/><circle cx="17" cy="20" r="1" fill="%2352525B"/><circle cx="21" cy="20" r="1" fill="%2352525B"/><circle cx="25" cy="20" r="1" fill="%2352525B"/></svg>`,
  battery: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="10" width="4" height="12" rx="1" fill="%231C1C1C"/><rect x="8" y="8" width="8" height="16" fill="%23E2965A"/><rect x="16" y="8" width="12" height="16" rx="2" fill="%232B2B2E"/><path d="M20 12V20" stroke="%23E5E5E5" stroke-width="1.5" stroke-linecap="round"/><path d="M17.5 16H22.5" stroke="%23E5E5E5" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  arduino: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6" width="24" height="20" rx="2" fill="%230284C7"/><rect x="6" y="8" width="5" height="5" fill="%23A1A1AA"/><rect x="22" y="9" width="4" height="14" fill="%2318181B"/><circle cx="14" cy="16" r="2.5" fill="%2318181B"/></svg>`,
  esp32: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="20" height="24" rx="2" fill="%2315803D"/><rect x="10" y="8" width="12" height="10" rx="1" fill="%23A1A1AA"/><rect x="8" y="20" width="16" height="6" fill="%2318181B"/></svg>`,
  lcd: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="28" height="20" rx="2" fill="%231ca063" stroke="%23127a44" stroke-width="1"/><rect x="6" y="10" width="20" height="12" fill="%231a1a1a"/><rect x="8" y="12" width="16" height="8" fill="%231d3f75"/></svg>`,
  ultrasonic: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="8" width="26" height="16" rx="3" fill="%230f6ea8" stroke="%230a4a73" stroke-width="1.5"/><circle cx="11" cy="16" r="5" fill="%233a3a3a"/><circle cx="21" cy="16" r="5" fill="%233a3a3a"/><circle cx="11" cy="16" r="2.5" fill="%235a5a5a"/><circle cx="21" cy="16" r="2.5" fill="%235a5a5a"/></svg>`,
  activeBuzzer: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="11" fill="%2318181B" stroke="%233F3F46" stroke-width="1.5"/><circle cx="16" cy="16" r="7" fill="%2309090B" stroke="%2352525B" stroke-width="1"/><circle cx="16" cy="16" r="4" fill="%2318181B"/><circle cx="16" cy="16" r="1.5" fill="%2309090B"/><path d="M25 11C27 13 27 19 25 21" stroke="%23F59E0B" stroke-width="1.5" stroke-linecap="round"/><path d="M27 9C30 12 30 20 27 23" stroke="%23F59E0B" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/><path d="M7 25V29" stroke="%23A1A1AA" stroke-width="2" stroke-linecap="round"/><path d="M23 25V29" stroke="%2371717A" stroke-width="2" stroke-linecap="round"/></svg>`,
  passiveBuzzer: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="11" fill="%2318181B" stroke="%233F3F46" stroke-width="1.5"/><circle cx="16" cy="16" r="7" fill="%2309090B" stroke="%2352525B" stroke-width="1"/><circle cx="16" cy="16" r="4" fill="%2318181B"/><circle cx="16" cy="16" r="1.5" fill="%2309090B"/><path d="M10 9C13 7 19 7 22 9" stroke="%23A1A1AA" stroke-width="1.2" stroke-linecap="round"/><path d="M24 11C26 13 26 19 24 21" stroke="%23F59E0B" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/><path d="M26 9C29 12 29 20 26 23" stroke="%23F59E0B" stroke-width="1" stroke-linecap="round" opacity="0.6"/><path d="M7 25V29" stroke="%23A1A1AA" stroke-width="2" stroke-linecap="round"/><path d="M23 25V29" stroke="%2371717A" stroke-width="2" stroke-linecap="round"/></svg>`,
  servoMG90: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="5" width="14" height="23" rx="2" fill="%231684C4" stroke="%23075585" stroke-width="1.5"/><rect x="11" y="2" width="10" height="5" rx="1" fill="%2318181B"/><circle cx="16" cy="16" r="4" fill="%23E5E7EB" stroke="%236B7280"/><circle cx="16" cy="16" r="1.5" fill="%2371717A"/><rect x="15" y="8" width="2" height="8" rx="1" fill="%23F3F4F6"/><circle cx="16" cy="10" r="0.5" fill="%2371717A"/><circle cx="16" cy="12.5" r="0.5" fill="%2371717A"/><circle cx="16" cy="14.5" r="0.5" fill="%2371717A"/></svg>`,
  rgbLed: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 21V29" stroke="%23A1A1AA" stroke-width="2" stroke-linecap="round"/><path d="M13.3 21V28" stroke="%2371717A" stroke-width="2" stroke-linecap="round"/><path d="M18.7 21V29" stroke="%2371717A" stroke-width="2" stroke-linecap="round"/><path d="M24 21V28" stroke="%2371717A" stroke-width="2" stroke-linecap="round"/><path d="M7 19.5C7 19.2239 7.22386 19 7.5 19H24.5C24.7761 19 25 19.2239 25 19.5V21C25 21.2761 24.7761 21.5 24.5 21.5H7.5C7.22386 21.5 7 21.2761 7 21V19.5Z" fill="%233F3F46"/><path d="M8 14C8 10.134 11.582 7 16 7C20.418 7 24 10.134 24 14V20H8V14Z" fill="%2318181B" stroke="%233F3F46" stroke-width="1"/><circle cx="12" cy="15" r="2.2" fill="%23EF4444"/><circle cx="16" cy="15" r="2.2" fill="%2322C55E"/><circle cx="20" cy="15" r="2.2" fill="%233B82F6"/><path d="M10.5 10.5C12 9.3 14 8.7 16 8.7" stroke="%23FFFFFF" stroke-width="1.4" stroke-linecap="round" opacity="0.45"/></svg>`,
  toggleSwitch: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="11" width="18" height="15" rx="3" fill="%233F3F46" stroke="%2352525B" stroke-width="1.2"/><circle cx="10" cy="28" r="2" fill="%2371717A"/><circle cx="22" cy="28" r="2" fill="%2371717A"/><line x1="10" y1="26" x2="10" y2="28" stroke="%2371717A" stroke-width="1.5"/><line x1="22" y1="26" x2="22" y2="28" stroke="%2371717A" stroke-width="1.5"/><circle cx="16" cy="14" r="3" fill="%2327272A" stroke="%2371717A" stroke-width="1"/><line x1="16" y1="14" x2="21" y2="6" stroke="%2322C55E" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="14" r="1.5" fill="%23E4E4E7"/></svg>`,
  joystick: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="26" height="24" rx="3" fill="%231a7a3c"/><circle cx="16" cy="15" r="9" fill="%23141414"/><circle cx="16" cy="15" r="7" fill="%238a8a8e" stroke="%2338bdf8" stroke-width="1.5"/><polygon points="16,8 13,12 19,12" fill="%23e4e4e7" opacity="0.85"/></svg>`,
  keypad: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="26" height="24" rx="3" fill="%233a3a3e" stroke="%231c1c1f" stroke-width="1"/><rect x="6" y="6" width="7" height="7" rx="1.5" fill="%235b8fd6"/><rect x="14.5" y="6" width="7" height="7" rx="1.5" fill="%235b8fd6"/><rect x="6" y="14.5" width="7" height="7" rx="1.5" fill="%235b8fd6"/><rect x="14.5" y="14.5" width="7" height="7" rx="1.5" fill="%23dc4b4b"/></svg>`, 
  photoresistor: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="20" x2="12" y2="27" stroke="%23A1A1AA" stroke-width="2"/><line x1="20" y1="20" x2="20" y2="27" stroke="%23A1A1AA" stroke-width="2"/><ellipse cx="16" cy="14" rx="10" ry="8" fill="%23c46a2e"/><ellipse cx="16" cy="14" rx="8" ry="6.2" fill="%23e8d9a8"/><circle cx="11.5" cy="14" r="1" fill="%23b89368" opacity="0.6"/><circle cx="20.5" cy="14" r="1" fill="%23b89368" opacity="0.6"/><path d="M20 17.2L12.5 17.2A1.2 1.2 0 0 1 12.5 14.8L19.5 14.8A1.2 1.2 0 0 0 19.5 12.4L12.5 12.4A1.2 1.2 0 0 1 12.5 10L19.5 10" fill="none" stroke="%23c46a2e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  irReceiver: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="20" x2="10" y2="27" stroke="%23A1A1AA" stroke-width="2"/><line x1="16" y1="20" x2="16" y2="27" stroke="%23A1A1AA" stroke-width="2"/><line x1="22" y1="20" x2="22" y2="27" stroke="%23A1A1AA" stroke-width="2"/><rect x="6" y="6" width="20" height="16" rx="3" fill="%23141414"/><path d="M9 14Q16 6 23 14" fill="none" stroke="%233a3a3a" stroke-width="2"/></svg>`,
  irRemote: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="2" width="16" height="28" rx="6" fill="%23fafafa" stroke="%23d4d4d8" stroke-width="1.5"/><circle cx="13" cy="8" r="2.5" fill="%23dc2626"/><circle cx="19" cy="8" r="2.5" fill="%23ffffff" stroke="%233f3f46"/></svg>`,
  lcd20x4: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="28" height="22" rx="2" fill="%231ca063" stroke="%23127a44" stroke-width="1"/><rect x="5" y="8" width="22" height="16" fill="%231a1a1a"/><rect x="7" y="10" width="18" height="12" fill="%231d3f75"/></svg>`,
  sevenSegment: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="20" height="24" rx="2" fill="%23111111"/><polygon points="12,10 13,9 19,9 20,10 19,11 13,11" fill="%23ff8a1e"/><polygon points="20,10 21,11 21,15 20,16 19,15 19,11" fill="%23ff8a1e"/><polygon points="20,17 21,18 21,22 20,23 19,22 19,18" fill="%23ff8a1e"/><polygon points="12,24 13,23 19,23 20,24 19,25 13,25" fill="%232a1512"/><polygon points="11,17 12,18 12,22 11,23 10,22 10,18" fill="%232a1512"/><polygon points="11,10 12,11 12,15 11,16 10,15 10,11" fill="%232a1512"/><polygon points="12,17 13,16 19,16 20,17 19,18 13,18" fill="%232a1512"/></svg>`,  
  dht11: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="2" width="14" height="22" rx="3" fill="%234b8bc4" stroke="%232f5f8f" stroke-width="1.5"/><rect x="11" y="6" width="10" height="9" rx="1" fill="%23eef4f8"/><text x="16" y="20" font-size="4.5" font-family="monospace" fill="%23ffffff" text-anchor="middle">DHT</text><line x1="12" y1="24" x2="12" y2="29" stroke="%23c7c7c7" stroke-width="1.5"/><line x1="16" y1="24" x2="16" y2="29" stroke="%23c7c7c7" stroke-width="1.5"/><line x1="20" y1="24" x2="20" y2="29" stroke="%23c7c7c7" stroke-width="1.5"/></svg>`,
  stepperMotor: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="17" cy="14" r="10" fill="%23d4d6d8" stroke="%238a8a8a" stroke-width="1.2"/><rect x="13" y="20" width="8" height="6" rx="2" fill="%232563eb"/><path d="M9 24 Q6 25 6 28" stroke="%233b82f6" stroke-width="1.5" fill="none"/><path d="M12 25 Q10 27 10 29" stroke="%23ec4899" stroke-width="1.5" fill="none"/><path d="M16 26 L16 30" stroke="%23eab308" stroke-width="1.5"/><path d="M20 25 Q22 27 22 29" stroke="%23f97316" stroke-width="1.5" fill="none"/><path d="M23 24 Q26 25 26 28" stroke="%23ef4444" stroke-width="1.5" fill="none"/></svg>`,
  uln2003: `data:image/svg+xml;utf8,<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="26" height="20" rx="2" fill="%231ca063" stroke="%23127a44" stroke-width="1.2"/><rect x="8" y="12" width="16" height="8" rx="1" fill="%231a1a1a"/><circle cx="10" cy="9" r="1.4" fill="%2322ff55"/><circle cx="14" cy="9" r="1.4" fill="%23164a2e"/><circle cx="18" cy="9" r="1.4" fill="%23164a2e"/><circle cx="22" cy="9" r="1.4" fill="%2322ff55"/></svg>`,
};

const PART_CATALOG: PartOption[] = [
  { type: "led", label: "LED", category: "Basic", icon: ICONS.led },
  { type: "resistor", label: "Resistor", category: "Basic", icon: ICONS.resistor },
  { type: "capacitor", label: "Capacitor", category: "Basic", icon: ICONS.capacitor },
  { type: "pushbutton", label: "Pushbutton", category: "Basic", icon: ICONS.pushbutton },
  { type: "potentiometer", label: "Potentiometer", category: "Basic", icon: ICONS.potentiometer },
  { type: "battery", label: "9V Battery", category: "Basic", icon: ICONS.battery },
  { type: "active-buzzer", label: "Active Buzzer", category: "Basic", icon: ICONS.activeBuzzer },
  { type: "passive-buzzer", label: "Passive Buzzer", category: "Basic", icon: ICONS.passiveBuzzer },

  { type: "lcd-16x2-i2c", label: "LCD 16x2 (I2C)", category: "Display", icon: ICONS.lcd },
  { type: "lcd-20x4-i2c", label: "LCD 20x4 (I2C)", category: "Display", icon: ICONS.lcd20x4 },
  { type: "rgb-led", label: "RGB LED", category: "Display", icon: ICONS.rgbLed },
  { type: "seven-segment", label: "7-Segment Display", category: "Display", icon: ICONS.sevenSegment },
  
  { type: "toggle-switch", label: "Toggle Switch", category: "Input", icon: ICONS.toggleSwitch },
  { type: "joystick", label: "Joystick", category: "Input", icon: ICONS.joystick },
  { type: "keypad-4x4", label: "4x4 Keypad", category: "Input", icon: ICONS.keypad },

  { type: "ultrasonic-hcsr04", label: "Ultrasonic Sensor (HC-SR04)", category: "Sensor", icon: ICONS.ultrasonic },
  { type: "photoresistor", label: "Photoresistor", category: "Sensor", icon: ICONS.photoresistor },
  { type: "ir-receiver", label: "IR Receiver", category: "Sensor", icon: ICONS.irReceiver },
  { type: "ir-remote", label: "IR Remote Control", category: "Sensor", icon: ICONS.irRemote },
  { type: "dht11", label: "DHT11", category: "Sensor", icon: ICONS.dht11 },

  { type: "breadboard-mini", label: "Small Breadboard", category: "Breadboards", icon: ICONS.breadboard },
  { type: "breadboard-half", label: "Medium Breadboard", category: "Breadboards", icon: ICONS.breadboard },
  { type: "breadboard-full", label: "Large Breadboard", category: "Breadboards", icon: ICONS.breadboard },

  { type: "arduino-uno", label: "Arduino Uno", category: "Microcontrollers", icon: ICONS.arduino },
  { type: "esp32", label: "ESP32", category: "Microcontrollers", icon: ICONS.esp32 },

  { type: "servo-mg90", label: "Servo MG90", category: "Motors", icon: ICONS.servoMG90},
  { type: "stepper-28byj48", label: "Stepper Motor (28BYJ-48)", category: "Motors", icon: ICONS.stepperMotor },
  
  { type: "uln2003-driver", label: "ULN2003 Driver Board", category: "Actuators", icon: ICONS.uln2003 },
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
    addPart(type, 3700 + Math.random() * 80, 3700 + Math.random() * 80);
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