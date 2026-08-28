import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useCircuitStore } from "../../../store/circuitStore";

export function CodeEditor() {
  const code = useCircuitStore((s) => s.code);
  const setCode = useCircuitStore((s) => s.setCode);
  const running = useCircuitStore((s) => s.running);
  const runSimulation = useCircuitStore((s) => s.runSimulation);
  const stopSimulation = useCircuitStore((s) => s.stopSimulation);
  const consoleLog = useCircuitStore((s) => s.consoleLog);

  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLog]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-[#333]">
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#333]">
        <span className="text-xs font-mono text-zinc-400">sketch.ino</span>
        {running ? (
          <button onClick={stopSimulation} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition-colors">
            ■ Stop
          </button>
        ) : (
          <button
            onClick={runSimulation}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs rounded transition-colors"
          >
            ▶ Run
          </button>
        )}
      </div>

      {/* Syntax-Highlighted Code Editor */}
      <div className="flex-1 relative min-h-0">
        <Editor
          height="100%"
          defaultLanguage="cpp"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            readOnly: running,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          }}
        />
      </div>

      <div className="h-40 border-t border-[#333] flex flex-col">
        <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-zinc-400 bg-[#252526]">
          Console
        </div>
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-emerald-300 bg-[#1e1e1e] whitespace-pre-wrap">
          {consoleLog.length === 0 ? (
            <div className="text-zinc-500">Press Run to start the simulation.</div>
          ) : (
            consoleLog.map((line, i) => (
              <div key={i} className="min-h-[1.25rem]">
                {line || "\u00A0"}
              </div>
            ))
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
}