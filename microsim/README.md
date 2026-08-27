# MicroSim

A browser-based, TypeScript + React + SVG playground for building and
simulating microcontroller circuits — Tinkercad/Wokwi-style. Land on a
microcontroller-picker landing page, click Arduino Uno, and get a two-column
simulator: code on the left, live circuit on the right.

## Run it

```bash
npm install
npm run dev
```

## What works right now
- **Landing page** — MicroSim intro, "how it works", and a board picker
  (Arduino Uno is live; ESP32 / Pico are marked "coming soon" placeholders).
- **Simulator page** — two columns:
  - **Left**: a code editor (`sketch.ino`) with Run/Stop and a console log
    of executed pin operations.
  - **Right**: a parts palette (`+` buttons for adding electronic parts in canvas) above an SVG circuit canvas with a pre-placed Arduino Uno.
- **Wiring** — Connect the pins to other pins using wire and custom style position and colors.
- **Deleting parts** — select a part to reveal a delete button above of every parts to delete it from the canvas.
- **Real simulation** — we pass the code in the backend in (`src/state/circuitStore.ts`) this file call the backend and it returns the response. A netlist engine (`src/netlist.ts`, union-find over wires + button
  internals) resolves every pin's live HIGH/LOW/floating state each render,
  so LEDs actually light up, and pin dots color green/gray/amber to match.
- Try it: the default sketch blinks pin 13. Wire an LED's anode to pin 13
  and its cathode to any GND pin, hit Run, and watch it blink.

## Project structure

- `src/types/types.ts` — core data model: Pin, PartDefinition, PartInstance, Wire (Shared TypeScript interfaces & types)
- `src/config/partDefinitions.ts` — the "what a part IS" registry, including the (Static hardware specs & component metadata)
  programmatically-laid-out Arduino Uno header pins
- `src/parts/*.tsx` — the "what a part LOOKS LIKE" — one SVG component per part
- `src/components/parts/{part_name}/{part_name}.tsx` — This is a modal component for each component that has properties to change like (led colors, resistor ohms value,. etc.)
- `src/components/common/ComponentPropertiesModal.tsx` — this is a parent folder for the modal component for each part this is what we call and inside this file is where we call the exact modal component for each parts so we dont import 1 by 1 inside tha CircuitCanvas.tsx the modal component.
- `src/parts/registry.tsx` — maps a part type string to its component
- `src/utils/geometry.ts` — rotation-aware pin position math, grid snapping (Math and canvas helper functions)
- `src/engine/netlist.ts` — union-find netlist builder; resolves HIGH/LOW/floating (Core simulation & electrical calculations)
  per pin from wires + GND/power pins + Arduino output pins + button state
- `src/store/circuitStore.ts` — Zustand store: parts, wires, selection,
  in-progress wiring, sketch code, compile code, running state, digital pin states, console log (Global application state (Zustand))
- `src/CircuitCanvas.tsx` — SVG canvas: drag, pin click-to-wire, delete button, live pin coloring
- `src/WireLayer.tsx` — renders wires as curved paths, click to delete
- `src/PartsPalette.tsx` — horizontal "add a part" strip
- `src/CodeEditor.tsx` — left-column code editor + Run/Stop + console
- `src/LandingPage.tsx` / `src/SimulatorPage.tsx` — the two top-level pages
- `src/App.tsx` — switches between landing and simulator (simple view state)


## Next steps (in priority order)
1. **Analog support** — `analogWrite`/`analogRead`, PWM-aware LED brightness.
2. **More parts** — buzzer, servo, more parts.
3. **Persistence** — serialize `{ parts, wires, code }` to JSON; save/load
   from localStorage or a downloadable file.
4. **Multi-board support** — the landing page already has ESP32/Pico slots
   wired up as disabled placeholders; adding a board is: new `PartDefinition`
   + new visual component + register in `partComponentRegistry`.