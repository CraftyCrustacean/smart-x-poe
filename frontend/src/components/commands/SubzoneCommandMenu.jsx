import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { COMMANDS, describeTarget } from "../../lib/commands";
import CommandDialog from "./CommandDialog";

const GROUPS = [
  { title: "Valves", types: ["OpenValve", "CloseValve"] },
  { title: "Alerts", types: ["Acknowledge", "Mute", "Unmute"] },
  { title: "Devices", types: ["Reboot"] },
];

function BulkMenu({ target, onClose }) {
  const ref = useRef(null);
  const titleId = useId();
  const [type, setType] = useState(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <>
      <dialog
        ref={ref}
        onClose={onClose}
        aria-labelledby={titleId}
        className="m-auto w-full max-w-sm rounded-lg border border-slate-300 p-0 shadow-xl backdrop:bg-slate-900/40"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              Issue bulk command
            </h2>
            <p className="text-sm text-slate-500">{describeTarget(target)}</p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                {g.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {g.types.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-orange-100 transition-colors"
                  >
                    {COMMANDS[t].bulkLabel}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </dialog>
      {type && (
        <CommandDialog
          type={type}
          target={target}
          onClose={() => setType(null)}
          onSent={() => ref.current?.close()}
        />
      )}
    </>
  );
}

export default function SubzoneCommandMenu({ zone, subzone }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-orange-50"
      >
        Command {subzone}…
      </button>
      {open && <BulkMenu target={{ zone, subzone }} onClose={() => setOpen(false)} />}
    </div>
  );
}
