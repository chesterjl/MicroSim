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
  - **Right**: a parts palette (`+ Add` buttons for LED / Resistor /
    Pushbutton) above an SVG circuit canvas with a pre-placed Arduino Uno.
- **Wiring** — I can see the wiring when i click the led but it doesnt yet connect to the others parts
- **Deleting parts** — select a part to reveal a red × button at its corner.
- **Real simulation** — we pass the code in the backend in (`src/state/circuitStore.ts`) this file call the backend and it returns the response. A netlist engine (`src/netlist.ts`, union-find over wires + button
  internals) resolves every pin's live HIGH/LOW/floating state each render,
  so LEDs actually light up, and pin dots color green/gray/amber to match.
- Try it: the default sketch blinks pin 13. Wire an LED's anode to pin 13
  and its cathode to any GND pin, hit Run, and watch it blink.

## Project structure

- `src/types.ts` — core data model: Pin, PartDefinition, PartInstance, Wire
- `src/partDefinitions.ts` — the "what a part IS" registry, including the
  programmatically-laid-out Arduino Uno header pins
- `src/parts/*.tsx` — the "what a part LOOKS LIKE" — one SVG component per part
- `src/parts/registry.tsx` — maps a part type string to its component
- `src/geometry.ts` — rotation-aware pin position math, grid snapping
- `src/netlist.ts` — union-find netlist builder; resolves HIGH/LOW/floating
  per pin from wires + GND/power pins + Arduino output pins + button state
- `src/state/circuitStore.ts` — Zustand store: parts, wires, selection,
  in-progress wiring, sketch code, compile code, running state, digital pin states, console log
- `src/CircuitCanvas.tsx` — SVG canvas: drag, pin click-to-wire, delete button, live pin coloring
- `src/WireLayer.tsx` — renders wires as curved paths, click to delete
- `src/PartsPalette.tsx` — horizontal "add a part" strip
- `src/CodeEditor.tsx` — left-column code editor + Run/Stop + console
- `src/LandingPage.tsx` / `src/SimulatorPage.tsx` — the two top-level pages
- `src/App.tsx` — switches between landing and simulator (simple view state)


## Next steps (in priority order)

1. **Variables & expressions** in the interpreter (`int ledPin = 13;`,
   arithmetic, `for`/`while` loops) — the current parser only understands
   literal pin numbers and values.
2. **Analog support** — `analogWrite`/`analogRead`, PWM-aware LED brightness.
3. **More parts** — potentiometer, buzzer, servo, breadboard power rails.
4. **Persistence** — serialize `{ parts, wires, code }` to JSON; save/load
   from localStorage or a downloadable file.
5. **Multi-board support** — the landing page already has ESP32/Pico slots
   wired up as disabled placeholders; adding a board is: new `PartDefinition`
   + new visual component + register in `partComponentRegistry`.
