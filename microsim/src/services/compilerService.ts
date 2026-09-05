export async function compileSketch(code: string): Promise<string> {
  const response = await fetch("http://localhost:3001/api/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error);
  }

  return data.hex;
}

export function loadHexToProgmem(hex: string, progmem: Uint8Array) {
  for (const line of hex.split("\n")) {
    if (line.startsWith(":")) {
      const bytes = parseInt(line.substring(1, 3), 16);
      const addr = parseInt(line.substring(3, 7), 16);
      const type = parseInt(line.substring(7, 9), 16);
      if (type === 0) {
        for (let i = 0; i < bytes; i++) {
          progmem[addr + i] = parseInt(line.substring(9 + i * 2, 11 + i * 2), 16);
        }
      }
    }
  }
}