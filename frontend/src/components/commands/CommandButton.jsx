import { useState } from "react";
import { COMMANDS, commandLabel } from "../../lib/commands";
import CommandDialog from "./CommandDialog";
import { useSendCommand } from "./useSendCommand";

export default function CommandButton({ type, target, disabledReason }) {
  const [open, setOpen] = useState(false);
  const { send, isPending } = useSendCommand();

  return (
    <>
      <span title={disabledReason} className="inline-flex">
        <button
          type="button"
          onClick={() => (COMMANDS[type].confirm === false ? send(type, target) : setOpen(true))}
          disabled={isPending || Boolean(disabledReason)}
          className="rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-orange-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
        >
          {commandLabel(type, target)}
        </button>
      </span>
      {open && <CommandDialog type={type} target={target} onClose={() => setOpen(false)} />}
    </>
  );
}
