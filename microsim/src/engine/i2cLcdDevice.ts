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

/**
 * Decodes the actual HD44780-over-PCF8574 4-bit protocol into real
 * character data -- not a level-only approximation. The library sends
 * each 8-bit HD44780 command/character as two 4-bit nibbles, each nibble
 * latched into the LCD controller on the FALLING edge of the EN
 * ("enable") bit. We watch for that falling edge, capture the nibble
 * that was present while EN was high, and pair up two of them into a
 * real byte.
 *
 * Known simplification: only Clear Display (0x01) and Set DDRAM Address
 * (0x80+addr) commands are interpreted -- enough to correctly track
 * what lcd.print()/lcd.setCursor()/lcd.clear() actually display.
 * Other commands (function set, display on/off, entry mode, custom
 * characters) are accepted (ACKed) but otherwise ignored, since they
 * don't affect what text ends up on screen for typical sketches.
 */
export function createHd44780Device(
  address: number,
  cols: number,
  rowCount: number,
  onChange: (lines: string[], backlightOn: boolean) => void
): I2CDevice {
  let lastByte = 0;
  let backlightOn = true;
  let highNibble: number | null = null;
  let rsForPendingByte = 0;

  const rows: string[][] = Array.from(
    { length: rowCount },
    () => Array(cols).fill(" ")
  );

  let cursorRow = 0;
  let cursorCol = 0;

  const ROW_OFFSETS_2 = [0x00, 0x40];
  const ROW_OFFSETS_4 = [0x00, 0x40, 0x14, 0x54];

  function emit() {
    onChange(rows.map((r) => r.join("")), backlightOn);
  }

  function handleFullByte(rs: number, byte: number) {
    if (rs === 0) {
      if (byte === 0x01) {
        // Clear display
        for (let row = 0; row < rowCount; row++) {
          rows[row] = Array(cols).fill(" ");
        }

        cursorRow = 0;
        cursorCol = 0;
        emit();
      } else if ((byte & 0x80) !== 0) {
        // Set DDRAM address -- HD44780 uses different row offsets
        // depending on whether the display is 16x2 or 20x4.
        const addr = byte & 0x7f;

        const rowOffsets =
          rowCount === 4 ? ROW_OFFSETS_4 : ROW_OFFSETS_2;

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
      }

      // Function set / display control / entry mode: accepted, no-op.
    } else {
      // Data byte -- a printable character at the current cursor position.
      if (
        cursorCol >= 0 &&
        cursorCol < cols &&
        cursorRow >= 0 &&
        cursorRow < rowCount
      ) {
        rows[cursorRow][cursorCol] = String.fromCharCode(byte);
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
        // Falling edge -- this is the moment the HD44780 actually latches data.
        const nibble = (lastByte >> 4) & 0x0f;
        const rs = lastByte & RS_BIT;

        if (highNibble === null) {
          highNibble = nibble;
          rsForPendingByte = rs;
        } else {
          handleFullByte(
            rsForPendingByte,
            (highNibble << 4) | nibble
          );
          highNibble = null;
        }
      }

      lastByte = value;
      return true; // always ACK
    },
  };
}