// /engine/i2cLcdDevice.ts (LCD 16x2 I2C, LCD 20x4 I2C)

export const DOTS_W = 5;
export const DOTS_H = 8;

export const DOT_SIZE = 2.2;
export const DOT_GAP = 0.1;
export const DOT_PITCH = DOT_SIZE + DOT_GAP;

export const CHAR_GAP_X = 2.0;
export const ROW_GAP_Y = 4.0;

export const CHAR_BLOCK_W = (DOTS_W - 1) * DOT_PITCH + DOT_SIZE;
export const CHAR_BLOCK_H = (DOTS_H - 1) * DOT_PITCH + DOT_SIZE;

/**
 * A minimal, generic I2C device on the bus -- one per address. Multiple
 * devices can share the same physical bus (that's the whole point of
 * I2C); the bus multiplexer below routes each transaction to whichever
 * device's address matches.
 */
export interface I2CDevice {
  address: number; // 7-bit I2C address, e.g. 0x27
  handleStart?: () => void;
  handleStop?: () => void;
  writeByte: (value: number) => boolean; // return true to ACK
  readByte?: (ack: boolean) => number;
}

/**
 * Fans a single physical I2C bus out to multiple devices by address --
 * mirrors how AVRTWI expects ONE event handler for the whole bus, even
 * though real I2C supports many addressable devices sharing it. Add a
 * future I2C part (another sensor, a second display, etc.) by just
 * including it in the `devices` array; this dispatcher doesn't change.
 *
 * NOTE: the exact shape AVRTWI expects here (method names: start/stop/
 * connectToSlave/writeByte/readByte) is inferred from avr8js's typical
 * TWIEventHandler pattern (matching NoopTWIEventHandler, which is
 * exported and worth checking directly if anything below doesn't
 * line up -- `node -e "console.log(require('avr8js').NoopTWIEventHandler.toString())"`
 * will print its actual method names straight from your installed version.
 */
export function createI2CBus(devices: I2CDevice[]) {
  let activeDevice: I2CDevice | null = null;

  return {
    start: () => {
      activeDevice = null;
      for (const d of devices) d.handleStart?.();
    },
    stop: () => {
      for (const d of devices) d.handleStop?.();
      activeDevice = null;
    },
    connectToSlave: (addr: number, _write: boolean) => {
      const device = devices.length === 1 ? devices[0] : devices.find((d) => d.address === addr);
      activeDevice = device ?? null;
      return device !== undefined;
    },
    writeByte: (value: number) => {
      if (!activeDevice) return false;
      return activeDevice.writeByte(value);
    },
    readByte: (ack: boolean) => {
      if (!activeDevice || !activeDevice.readByte) return 0xff;
      return activeDevice.readByte(ack);
    },
  };
}


// PCF8574 I/O-expander pin mapping used by the "LiquidCrystal I2C"
// (Frank de Brabander) library -- the standard one virtually every
// I2C LCD tutorial uses. Each I2C byte sets these 8 output pins at once.
const RS_BIT = 0x01;
// RW_BIT = 0x02 -- present on the wire but unused here, we don't model reads
const EN_BIT = 0x04;
const BACKLIGHT_BIT = 0x08;

export function createHd44780Device(
  address: number,
  cols: number,
  rowCount: number,
  onChange: (cells: number[][], cgram: number[][], backlightOn: boolean) => void
): I2CDevice {
  let lastByte = 0;
  let backlightOn = true;
  let highNibble: number | null = null;
  let rsForPendingByte = 0;

  // DDRAM: one character CODE (0-255) per cell -- NOT pre-rendered text.
  // Keeping raw codes means a code in the 0-7 range gets re-resolved
  // against whatever's currently in CGRAM at RENDER time, not baked in
  // here -- exactly like real hardware, where redefining a custom
  // character with lcd.createChar() after it's already been printed
  // updates every on-screen instance of it immediately.
  const cells: number[][] = Array.from({ length: rowCount }, () => Array(cols).fill(0x20));

  // CGRAM: 8 programmable character slots, 8 rows each, lower 5 bits of
  // each byte used (bit4 = leftmost pixel, bit0 = rightmost) -- matches
  // the real HD44780U's CGRAM layout exactly, so lcd.createChar() just
  // works without any special-casing above this layer.
  const cgram: number[][] = Array.from({ length: 8 }, () => Array(8).fill(0));

  let addressMode: "ddram" | "cgram" = "ddram";
  let cgramAddress = 0;

  let cursorRow = 0;
  let cursorCol = 0;

  const ROW_OFFSETS_2 = [0x00, 0x40];
  const ROW_OFFSETS_4 = [0x00, 0x40, 0x14, 0x54];

  function emit() {
    onChange(
      cells.map((row) => [...row]),
      cgram.map((slot) => [...slot]),
      backlightOn
    );
  }

  function handleFullByte(rs: number, byte: number) {
    if (rs === 0) {
      if (byte === 0x01) {
        // Clear display
        for (let row = 0; row < rowCount; row++) {
          cells[row] = Array(cols).fill(0x20);
        }
        cursorRow = 0;
        cursorCol = 0;
        addressMode = "ddram";
        emit();
      } else if ((byte & 0xc0) === 0x40) {
        // Set CGRAM address -- subsequent data bytes write one row of
        // one custom character slot each, instead of printing to the
        // screen, until a "set DDRAM address" command switches back.
        cgramAddress = byte & 0x3f;
        addressMode = "cgram";
      } else if ((byte & 0x80) !== 0) {
        // Set DDRAM address
        const addr = byte & 0x7f;
        const rowOffsets = rowCount === 4 ? ROW_OFFSETS_4 : ROW_OFFSETS_2;

        let matchedRow = 0;
        let matchedOffset = rowOffsets[0];

        for (let row = 0; row < rowOffsets.length; row++) {
          if (rowOffsets[row] <= addr && rowOffsets[row] >= matchedOffset) {
            matchedRow = row;
            matchedOffset = rowOffsets[row];
          }
        }

        cursorRow = matchedRow;
        cursorCol = addr - matchedOffset;
        addressMode = "ddram";
      }
      // Function set / display control / entry mode: accepted, no-op.
    } else if (addressMode === "cgram") {
      // Custom character data -- lower 5 bits are the pixel row, upper
      // 3 ignored (matches the real chip; lcd.createChar() callers
      // conventionally pass 0b000xxxxx anyway).
      const slot = (cgramAddress >> 3) & 0x07;
      const row = cgramAddress & 0x07;
      cgram[slot][row] = byte & 0x1f;
      cgramAddress = (cgramAddress + 1) & 0x3f;
      emit();
    } else {
      // Data byte -- a character CODE at the current cursor position.
      if (cursorCol >= 0 && cursorCol < cols && cursorRow >= 0 && cursorRow < rowCount) {
        cells[cursorRow][cursorCol] = byte;
      }
      cursorCol++;
      emit();
    }
  }

  return {
    address,
    writeByte: (value: number) => {
      backlightOn = (value & BACKLIGHT_BIT) !== 0;

      const enNow = (value & EN_BIT) !== 0;
      const enWasHigh = (lastByte & EN_BIT) !== 0;

      if (enWasHigh && !enNow) {
        const nibble = (lastByte >> 4) & 0x0f;
        const rs = lastByte & RS_BIT;

        if (highNibble === null) {
          highNibble = nibble;
          rsForPendingByte = rs;
        } else {
          handleFullByte(rsForPendingByte, (highNibble << 4) | nibble);
          highNibble = null;
        }
      }

      lastByte = value;
      return true;
    },
  };
}