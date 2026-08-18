const express = require("express");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const util = require("util");

const execAsync = util.promisify(exec);
const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Compile endpoint
app.post("/api/compile", async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ success: false, error: "No sketch code provided" });
  }

  // Create unique temp directory for thread-safe isolation
  const reqId = Math.random().toString(36).substring(2, 9);
  const sketchDir = path.join(os.tmpdir(), `sketch_${reqId}`);
  const buildDir = path.join(sketchDir, "build");
  // arduino-cli requires the .ino file name to match the parent directory name
  const inoFile = path.join(sketchDir, `sketch_${reqId}.ino`);

  try {
    await fs.mkdir(sketchDir, { recursive: true });
    await fs.writeFile(inoFile, code, "utf-8");

    // Run compilation for Arduino Uno (ATmega328P)
    const cmd = `arduino-cli compile --fqbn arduino:avr:uno --output-dir "${buildDir}" "${sketchDir}"`;
    await execAsync(cmd);

    // Read generated HEX binary
    const hexPath = path.join(buildDir, `sketch_${reqId}.ino.hex`);
    const hex = await fs.readFile(hexPath, "utf-8");

    return res.json({
      success: true,
      hex: hex,
    });
  } catch (err) {
    // Return stdout/stderr compile errors (syntax errors, missing headers, etc.)
    const errorMessage = err.stderr || err.stdout || err.message || "Compilation failed";
    return res.status(400).json({
      success: false,
      error: errorMessage,
    });
  } finally {
    // Always clean up temp files
    await fs.rm(sketchDir, { recursive: true, force: true }).catch(() => {});
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MicroSim Compiler Service listening on port ${PORT}`);
});