export type DigitalValue = "HIGH" | "LOW";
export type PinMode = "INPUT" | "OUTPUT" | "INPUT_PULLUP";

export type Stmt =
  | { kind: "varDecl"; name: string; expr: string }
  | { kind: "pinMode"; pinExpr: string; modeExpr: string }
  | { kind: "digitalWrite"; pinExpr: string; valExpr: string }
  | { kind: "delay"; msExpr: string }
  | { kind: "serialPrint"; expr: string; newline: boolean }
  | { kind: "if"; pinExpr: string; expect: DigitalValue; then: Stmt[]; else: Stmt[] };

export interface Executor {
  pinMode: (pin: number, mode: PinMode) => void;
  digitalWrite: (pin: number, value: DigitalValue) => void;
  digitalRead: (pin: number) => DigitalValue;
  delay: (ms: number) => Promise<void>;
  serialPrint: (message: string) => void;
  shouldContinue: () => boolean;
}

/** Parses setup() and loop() blocks into simple statement AST trees. */
export function parseSketch(code: string): { setup: Stmt[]; loop: Stmt[] } {
  const stripped = code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return {
    setup: parseBlock(extractFunctionBody(stripped, "setup")),
    loop: parseBlock(extractFunctionBody(stripped, "loop")),
  };
}

function extractFunctionBody(code: string, name: string): string {
  const match = new RegExp(`void\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(code);
  if (!match) return "";
  return readBraceBlock(code, match.index + match[0].length - 1).body;
}

function readBraceBlock(text: string, openBraceIndex: number): { body: string; end: number } {
  let depth = 1;
  let i = openBraceIndex + 1;
  const start = i;
  for (; i < text.length && depth > 0; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") depth--;
  }
  return { body: text.slice(start, i - 1), end: i };
}

function parseBlock(block: string): Stmt[] {
  const stmts: Stmt[] = [];
  let i = 0;

  while (i < block.length) {
    while (i < block.length && /\s/.test(block[i])) i++;
    if (i >= block.length) break;

    // if (digitalRead(...) == HIGH/LOW)
    const ifMatch = /^if\s*\(\s*digitalRead\s*\(\s*(.+?)\s*\)\s*==\s*(HIGH|LOW)\s*\)\s*\{/.exec(block.slice(i));
    if (ifMatch) {
      const pinExpr = ifMatch[1].trim();
      const expect = ifMatch[2] as DigitalValue;
      const thenResult = readBraceBlock(block, i + ifMatch[0].length - 1);
      i = thenResult.end;

      let elseStmts: Stmt[] = [];
      const elseMatch = /^\s*else\s*\{/.exec(block.slice(i));
      if (elseMatch) {
        const elseResult = readBraceBlock(block, i + elseMatch[0].length - 1);
        elseStmts = parseBlock(elseResult.body);
        i = elseResult.end;
      }

      stmts.push({ kind: "if", pinExpr, expect, then: parseBlock(thenResult.body), else: elseStmts });
      continue;
    }

    const semiIndex = block.indexOf(";", i);
    if (semiIndex === -1) break;
    const text = block.slice(i, semiIndex).trim();
    i = semiIndex + 1;
    if (!text) continue;

    // Variable declarations (int, float, bool, auto, etc.)
    const varMatch = /^(?:const\s+)?(?:\w+)\s+([a-zA-Z_]\w*)\s*=\s*(.+)$/.exec(text);
    if (varMatch) {
      stmts.push({ kind: "varDecl", name: varMatch[1], expr: varMatch[2] });
      continue;
    }

    // pinMode(pin, mode)
    const pinModeMatch = /^pinMode\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/.exec(text);
    if (pinModeMatch) {
      stmts.push({ kind: "pinMode", pinExpr: pinModeMatch[1], modeExpr: pinModeMatch[2] });
      continue;
    }

    // digitalWrite(pin, value)
    const writeMatch = /^digitalWrite\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/.exec(text);
    if (writeMatch) {
      stmts.push({ kind: "digitalWrite", pinExpr: writeMatch[1], valExpr: writeMatch[2] });
      continue;
    }

    // delay(ms)
    const delayMatch = /^delay\s*\(\s*(.+?)\s*\)$/.exec(text);
    if (delayMatch) {
      stmts.push({ kind: "delay", msExpr: delayMatch[1] });
      continue;
    }

    // Serial.begin(speed)
    const serialBeginMatch = /^Serial\.begin\s*\(\s*(.+?)\s*\)$/.exec(text);
    if (serialBeginMatch) {
      stmts.push({
        kind: "serialPrint",
        expr: `"[Serial initialized @ " + ${serialBeginMatch[1]} + " baud]"`,
        newline: true,
      });
      continue;
    }

    // Serial.println(expr) or Serial.print(expr)
    const serialPrintMatch = /^Serial\.(println|print)\s*\(\s*(.*)\s*\)$/.exec(text);
    if (serialPrintMatch) {
      stmts.push({
        kind: "serialPrint",
        expr: serialPrintMatch[2],
        newline: serialPrintMatch[1] === "println",
      });
      continue;
    }
  }

  return stmts;
}

type Env = Record<string, any>;

/** Evaluates identifiers, strings, numbers, and basic boolean/digital constants */
function evalExpr(expr: string, env: Env): any {
  const trimmed = expr.trim();
  
  if (trimmed === "HIGH" || trimmed === "1" || trimmed === "true") return "HIGH";
  if (trimmed === "LOW" || trimmed === "0" || trimmed === "false") return "LOW";

  // String literals
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  // Numbers
  if (!isNaN(Number(trimmed))) {
    return Number(trimmed);
  }

  // Variable environment lookup
  if (trimmed in env) {
    return env[trimmed];
  }

  return trimmed;
}

async function runStatements(stmts: Stmt[], exec: Executor, env: Env): Promise<void> {
  for (const stmt of stmts) {
    if (!exec.shouldContinue()) return;

    switch (stmt.kind) {
      case "varDecl": {
        env[stmt.name] = evalExpr(stmt.expr, env);
        break;
      }
      case "pinMode": {
        const pin = Number(evalExpr(stmt.pinExpr, env));
        const mode = String(evalExpr(stmt.modeExpr, env)) as PinMode;
        exec.pinMode(pin, mode);
        break;
      }
      case "digitalWrite": {
        const pin = Number(evalExpr(stmt.pinExpr, env));
        const rawVal = evalExpr(stmt.valExpr, env);
        const val: DigitalValue = rawVal === "HIGH" || rawVal === 1 ? "HIGH" : "LOW";
        exec.digitalWrite(pin, val);
        break;
      }
      case "delay": {
        const ms = Number(evalExpr(stmt.msExpr, env));
        await exec.delay(isNaN(ms) ? 0 : ms);
        break;
      }
      case "serialPrint": {
        const val = evalExpr(stmt.expr, env);
        exec.serialPrint(String(val ?? ""));
        break;
      }
      case "if": {
        const pin = Number(evalExpr(stmt.pinExpr, env));
        const actual = exec.digitalRead(pin);
        await runStatements(actual === stmt.expect ? stmt.then : stmt.else, exec, env);
        break;
      }
    }
  }
}

export async function runSketch(code: string, exec: Executor): Promise<void> {
  const { setup, loop } = parseSketch(code);
  const globalEnv: Env = {};

  await runStatements(setup, exec, globalEnv);

  while (exec.shouldContinue()) {
    await runStatements(loop, exec, globalEnv);
    if (!exec.shouldContinue()) break;
    await exec.delay(0);
  }
}

export const DEFAULT_SKETCH = `
void setup() {
  // put your setup code here, to run once:

}

void loop() {
  // put your main code here, to run repeatedly:
}
`;