import { zoneLabel } from "./format";

export const COMMANDS = {
  OpenValve: {
    label: "Open valve",
    bulkLabel: "Open all valves",
    description: "Shows the valve as open for 3 batches (about 30 s), then live readings take over again.",
    undoable: true,
  },
  CloseValve: {
    label: "Close valve",
    bulkLabel: "Close all valves",
    description: "Shows the valve as closed for 3 batches (about 30 s), then live readings take over again.",
    undoable: true,
  },
  Reboot: {
    label: "Reboot",
    bulkLabel: "Reboot all devices",
    description: "Shows the device as rebooting for 3 batches (about 30 s).",
    irreversible: true,
  },
  Mute: {
    label: "Mute alerts",
    bulkLabel: "Mute all devices",
    description: "New alerts are still recorded and counted, but not announced, until unmuted.",
    confirm: false,
  },
  Unmute: {
    label: "Unmute alerts",
    bulkLabel: "Unmute all devices",
    description: "New alerts are announced again.",
    confirm: false,
  },
  Acknowledge: {
    label: "Acknowledge alerts",
    bulkLabel: "Acknowledge all alerts",
    description: "Marks the active alerts as seen. Each acknowledgement ends when its alert clears.",
    confirm: false,
  },
};

export const commandLabel = (type, target) =>
  target?.deviceId ? COMMANDS[type].label : COMMANDS[type].bulkLabel;

export const describeTarget = (target) =>
  target.deviceId ?? `${target.subzone}, ${zoneLabel(target.zone)}`;
