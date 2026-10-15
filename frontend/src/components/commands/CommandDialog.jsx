import { useEffect, useRef } from "react";
import { useDeviceLive } from "../../api/devices";
import { COMMANDS, commandLabel, describeTarget } from "../../lib/commands";
import { useSendCommand } from "./useSendCommand";

export default function CommandDialog({ type, target, onClose, onSent }) {
  const ref = useRef(null);
  const issue = useSendCommand();
  const { data: live } = useDeviceLive(target.deviceId);
  const notReporting = live && (live.offline || live.state.lastSeenUtc == null);
  const meta = COMMANDS[type];
  const label = commandLabel(type, target);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const confirm = () =>
    issue.send(type, target, {
      onSuccess: () => {
        ref.current?.close();
        onSent?.();
      },
      onError: () => {},
    });

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="command-dialog-title"
      className="m-auto w-full max-w-md rounded-lg border border-slate-300 p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="space-y-3 p-5">
        <h2 id="command-dialog-title" className="text-lg font-semibold text-slate-900">
          {label}?
        </h2>
        <p className="text-sm text-slate-600">
          Target: <span className="font-medium text-slate-900">{describeTarget(target)}</span>
        </p>
        <p className="text-sm text-slate-600">{meta.description}</p>
        {notReporting && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This device is offline. The command will still be recorded, but you
            won't see its effect until the device reports again.
          </p>
        )}
        {meta.undoable && (
          <p className="text-sm text-slate-500">You can undo this from Command History.</p>
        )}
        {meta.irreversible && (
          <p className="text-sm font-medium text-red-700">This command cannot be undone.</p>
        )}
        {issue.error && (
          <p role="alert" className="text-sm text-red-700">
            {issue.error.message}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
        <button
          type="button"
          autoFocus
          onClick={() => ref.current?.close()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={issue.isPending}
          className="rounded-md bg-orange-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-orange-400 disabled:opacity-60"
        >
          {issue.isPending ? "Sending…" : "Confirm"}
        </button>
      </div>
    </dialog>
  );
}
