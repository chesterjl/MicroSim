import { assets } from "../assets/asset";

interface BoardOption {
  id: string;
  name: string;
  image: string;
  available: boolean;
  tagline: string;
  badge?: string;
}

const BOARDS: BoardOption[] = [
  {
    id: "arduino-uno",
    name: "Arduino Uno R3",
    image: assets.arduino,
    available: true,
    tagline: "ATmega328P • Standard 5V logic • Best for beginners",
    badge: "Most Popular",
  },
  {
    id: "esp32",
    name: "ESP32 DevKit V1",
    image: assets.esp32,
    available: false,
    tagline: "Dual-core • Wi-Fi & Bluetooth • 3.3V logic",
    badge: "Coming Soon",
  },
  {
    id: "raspberry-pi-pico",
    name: "Raspberry Pi Pico",
    image: assets.raspberry,
    available: false,
    tagline: "RP2040 Dual ARM Cortex-M0+ • Programmable I/O",
    badge: "In Development",
  },
];

export function LandingPage({
  onSelectBoard,
}: {
  onSelectBoard: (boardId: string) => void;
}) {
  return (
    <div className="min-h-screen w-full bg-[#0b0c10] text-zinc-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="h-full w-full bg-zinc-950 rounded-[7px] flex items-center justify-center font-black text-cyan-400 text-sm">
              <img src={assets.chromeLogo}/>
            </div>
          </div>
          <span className="font-bold tracking-tight text-lg text-white">
            MicroSim
          </span>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          v1.0-beta
        </span>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 text-xs font-medium mb-6">
            Interactive Hardware Emulation Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
            Build, simulate & code circuits{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              in your browser.
            </span>
          </h1>

          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
            Drag hardware parts onto a interactive grid canvas, run wiring nets, write real code, and watch hardware react in real-time.
          </p>
        </div>

        {/* How It Works Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-20">
          <Step
            number="01"
            title="Pick a Controller"
            text="Select an MCU target like Arduino Uno or ESP32 to initialize your board."
          />
          <Step
            number="02"
            title="Wire the Canvas"
            text="Place LEDs, resistors, or displays. Connect pin-to-pin nodes with interactive wires."
          />
          <Step
            number="03"
            title="Run Live Code"
            text="Write C++/Arduino sketches inside the embedded editor and simulate logic instantly."
          />
        </div>

        {/* Microcontroller Selection Grid */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Select Hardware Target
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Choose a board profile to boot the simulator environment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"> 
            {BOARDS.map((board) => ( 
              <div  
                key={board.id} 
                onClick={() => board.available && onSelectBoard(board.id)} 
                className={`relative flex flex-col justify-between p-6 rounded-2xl border transition-all duration-200 ${ 
                  board.available 
                    ? "group bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 hover:border-cyan-500/50 cursor-pointer shadow-xl hover:shadow-cyan-500/10" 
                    : "bg-zinc-950/40 border-zinc-900 opacity-60 cursor-not-allowed" 
                }`} 
              > 
                {/* Badge Header */} 
                <div className="flex items-center justify-between mb-6"> 
                  {board.badge && ( 
                    <span 
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${ 
                        board.available 
                          ? "bg-cyan-950/80 text-cyan-300 border-cyan-800/60" 
                          : "bg-zinc-800/80 text-zinc-400 border-zinc-700/60" 
                      }`} 
                    > 
                      {board.badge} 
                    </span> 
                  )} 
                </div> 

                {/* Board Graphic Display */} 
                <div className="h-32 w-full flex items-center justify-center p-4 mb-6 rounded-xl bg-zinc-950/80 border border-zinc-800/60 group-hover:border-zinc-700 transition-colors"> 
                  {/* Smart Image Rendering Fallback */} 
                  {typeof board.image === "string" && (board.image.startsWith("/") || board.image.startsWith("http") || board.image.startsWith("data:")) ? ( 
                    <img 
                      src={board.image} 
                      alt={board.name} 
                      className="max-h-full max-w-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform" 
                    /> 
                  ) : ( 
                    /* Fallback emoji/icon renderer if string asset path is unavailable */ 
                    <span className="text-5xl select-none group-hover:scale-110 transition-transform"> 
                      {board.image || "🎛️"} 
                    </span> 
                  )} 
                </div> 

                {/* Content */} 
                <div> 
                  <h3 className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors flex items-center justify-between"> 
                    {board.name} 
                    {board.available && ( 
                      <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"> 
                        → 
                      </span> 
                    )} 
                  </h3> 
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed"> 
                    {board.tagline} 
                  </p> 
                </div> 

                {/* Action CTA */} 
                <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs font-semibold"> 
                  <span 
                    className={ 
                      board.available ? "text-emerald-400" : "text-zinc-500" 
                    } 
                  > 
                    {board.available ? "Ready to simulate" : "Unavailable"} 
                  </span> 
                  <span 
                    className={ 
                      board.available ? "text-cyan-400" : "text-zinc-600" 
                    } 
                  > 
                    {board.available ? "Launch Simulator" : "Locked"} 
                  </span> 
                </div> 
              </div> 
            ))} 
          </div>
        </div>
      </main>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col justify-between">
      <div className="font-mono text-xs font-bold text-cyan-400 mb-3 tracking-wider">
        {number}
      </div>
      <div>
        <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}