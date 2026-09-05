import { PinState, type AVRIOPort } from "avr8js";
import type { ExternalDevice } from "./externalDevice";
import { getPortAndBit } from "./arduinoPins";
import type { PartInstance } from "../../types/types";
import type { Netlist } from "../netlist";

type KeypadPressedKey = {
  row: number | null;
  col: number | null;
};

export function createKeypadDevice(
  portB: AVRIOPort,
  portD: AVRIOPort,
  rowPins: (number | null)[],
  colPins: (number | null)[],
  getPressedKey: () => KeypadPressedKey

): ExternalDevice {
  const rowPorts = rowPins.map((pin) =>
    pin === null ? null : getPortAndBit(pin, portB, portD)
  );

  const colPorts = colPins.map((pin) =>
    pin === null ? null : getPortAndBit(pin, portB, portD)
  );

  function applyRowStates() {
    const { row: pressedRow, col: pressedCol } = getPressedKey();

    for (let r = 0; r < rowPorts.length; r++) {
      const rowPort = rowPorts[r];

      if (!rowPort) continue;

      let shouldBeLow = false;

      if (
        typeof pressedRow === "number" &&
        pressedRow === r &&
        typeof pressedCol === "number"
      ) {
        const colPort = colPorts[pressedCol];

        if (
          colPort &&
          colPort.port.pinState(colPort.bit) === PinState.Low
        ) {
          shouldBeLow = true;
        }
      }

      rowPort.port.setPin(rowPort.bit, !shouldBeLow);
    }
  }

  for (const colPort of colPorts) {
    colPort?.port.addListener(applyRowStates);
  }

  return {
    claimedPins: [...rowPins, ...colPins].filter(
      (p): p is number => p !== null
    ),

    update: () => {
      applyRowStates();
    },
  };
}


export function setupKeypadDevices(
  portB: AVRIOPort,
  portD: AVRIOPort,
  parts: PartInstance[],
  netlist: Netlist,
  getKeypadState: (partId: string) => { row: number | null; col: number | null }
): ExternalDevice[] {
  const devices: ExternalDevice[] = [];

  for (const part of parts) {
    if (part.type !== "keypad-4x4") continue;

    const rowPins: (number | null)[] = [];
    const colPins: (number | null)[] = [];

    for (let r = 1; r <= 4; r++) {
      rowPins.push(netlist.getConnectedArduinoPin(part.id, `row${r}`));
    }
    for (let c = 1; c <= 4; c++) {
      colPins.push(netlist.getConnectedArduinoPin(part.id, `col${c}`));
    }

    if (rowPins.some((p) => p !== null) && colPins.some((p) => p !== null)) {
      devices.push(
        createKeypadDevice(
          portB,
          portD,
          rowPins,
          colPins,
          () => getKeypadState(part.id)
        )
      );
    } else {
      console.warn("[keypad] needs at least one row AND one column wired — device NOT created", {
        rowPins,
        colPins,
      });
    }
  }

  return devices;
}