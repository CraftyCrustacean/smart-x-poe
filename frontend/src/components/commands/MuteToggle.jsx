import { useSendCommand } from "./useSendCommand";

export default function MuteToggle({ deviceId, muted }) {
  const { send, isPending } = useSendCommand();
  const known = muted != null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(muted)}
      onClick={() => send(muted ? "Unmute" : "Mute", { deviceId })}
      disabled={!known || isPending}
      className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 rounded-full transition-colors ${
          muted ? "bg-orange-400" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            muted ? "translate-x-4" : ""
          }`}
        />
      </span>
      Mute alerts
    </button>
  );
}
