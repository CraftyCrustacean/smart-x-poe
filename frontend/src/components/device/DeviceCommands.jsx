import { useDeviceLive } from "../../api/devices";
import CommandButton from "../commands/CommandButton";
import MuteToggle from "../commands/MuteToggle";

export default function DeviceCommands({ deviceId, category }) {
  const { data } = useDeviceLive(deviceId);
  const target = { deviceId };
  const unacknowledged = data
    ? data.activeAlerts.filter((m) => !data.acknowledgedAlerts.includes(m))
    : [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MuteToggle deviceId={deviceId} muted={data?.muted} />
      {category === "Actuator" && (
        <>
          <CommandButton type="OpenValve" target={target} />
          <CommandButton type="CloseValve" target={target} />
        </>
      )}
      <CommandButton
        type="Acknowledge"
        target={target}
        disabledReason={unacknowledged.length === 0 ? "No unacknowledged alerts" : undefined}
      />
      <CommandButton type="Reboot" target={target} />
    </div>
  );
}
