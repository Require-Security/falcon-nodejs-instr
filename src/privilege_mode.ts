// Copyright 2023, Require Security Inc, All Rights Reserved
/**
 * This file encapsulates calculations that are performed when a privilege access
 * occurs to decide if learning or learned (training or enforcement).  It doesn't do
 * anything when in the "learn" or "enforce" command modes, because the privilege mode never
 * changes for those modes.
 */

import { CommandModeType, DashboardMode } from "./types/types";
import { PrivilegeMode } from "./types/types"
import { State } from "./global_state";

class ManualControl {
  readonly name: string = "MANUAL CONTROL"
  currentMode: PrivilegeMode

  constructor(startMode: PrivilegeMode) {
    this.currentMode = startMode
  }

  getPrivilegeMode(): PrivilegeMode {
    return this.currentMode
  }

  setPrivilegeMode(mode: DashboardMode): boolean {
    const state = State()
    const oldBlockSensitivity = state.blockSensitivity
    const oldMode = this.currentMode

    switch (mode) {
      case "learn":
        break // UI sending learn is ignored
      case "allow":
        this.currentMode = "protection"
        state.blockSensitivity = Infinity
        break
      case "block":
        this.currentMode = "protection"
        state.blockSensitivity = state.eventThreshold
        break
    }

    return oldMode != this.currentMode
           || oldBlockSensitivity != state.blockSensitivity
  }
}

let commandMode: ManualControl

export function initAccessOutcomes(command: CommandModeType) {
  let mode: PrivilegeMode
  switch(command) {
    case "learn":
      mode = "training"
      break
    case "enforce":
      mode = "protection"
      break
  }
  commandMode = new ManualControl(mode)
}

/**
 * Get the current privilege mode, either we are learing or we are learned (enforcing).
 * If in auto mode, this calls the strategy's function for noting a privilege access and
 * calculating the mode.
 *
 * @returns the current privilege mode: learning or learned
 */
export function getPrivilegeMode(): PrivilegeMode {
  return commandMode.getPrivilegeMode()
}

export function setPrivilegeMode(mode: DashboardMode): boolean {
  return commandMode.setPrivilegeMode(mode)
}