import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Undo2 } from "lucide-react";
import { useCommandHistory, useUndoCommand } from "../api/commands";
import { commandLabel, describeTarget } from "../lib/commands";
import TimeAgo from "../components/TimeAgo";
import {
  ErrorNotice,
  Loading,
  Skeleton,
} from "../components/dashboard/LoadState";

function statusOf(command, { undoableId, currentBatch, graceBatches }) {
  if (command.undoneAtUtc)
    return { label: "Undone", className: "bg-slate-100 text-slate-600" };
  if (command.issuedAtBatch + graceBatches <= currentBatch)
    return { label: "Expired", className: "bg-slate-100 text-slate-600" };
  if (command.id === undoableId)
    return {
      label: "Next to undo",
      className: "bg-orange-100 text-orange-800",
    };
  return { label: "Active", className: "bg-green-50 text-green-700" };
}

function HistoryTable({ commands, caption, empty, status }) {
  if (commands.length === 0)
    return <p className="text-sm text-slate-500">{empty}</p>;

  return (
    <div className="max-h-[36rem] overflow-auto">
      <table className="w-full text-sm text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500 shadow-[inset_0_-1px_0_var(--color-slate-200)]">
          <tr>
            <th scope="col" className="px-3 py-2">
              Time
            </th>
            <th scope="col" className="px-3 py-2">
              Command
            </th>
            <th scope="col" className="px-3 py-2">
              Target
            </th>
            <th scope="col" className="px-3 py-2">
              Devices
            </th>
            {status && (
              <th scope="col" className="px-3 py-2">
                Status
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {commands.map((c) => {
            const s = status?.(c);
            return (
              <tr key={c.id} className={c.undoneAtUtc ? "text-slate-400" : ""}>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                  <TimeAgo iso={c.issuedAtUtc} />
                </td>
                <th
                  scope="row"
                  className="px-3 py-2 font-medium text-slate-900"
                >
                  {commandLabel(c.type, c.target)}
                </th>
                <td className="px-3 py-2">
                  {c.target.deviceId ? (
                    <Link
                      to={`/devices/${c.target.deviceId}`}
                      className="hover:underline"
                    >
                      {c.target.deviceId}
                    </Link>
                  ) : (
                    describeTarget(c.target)
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">{c.deviceIds.length}</td>
                {s && (
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${s.className}`}
                    >
                      {s.label}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const headingClass = "text-sm font-bold text-slate-500 uppercase tracking-wide";

function CommandHistory() {
  const { data, isLoading, error, refetch } = useCommandHistory();
  const undo = useUndoCommand();
  const history = data?.history ?? [];
  const undoable = history.filter((c) => c.undoable);
  const other = history.filter((c) => !c.undoable);
  const next = undoable.find((c) => c.id === data?.undoableId);

  const runUndo = () =>
    undo.mutate(undefined, {
      onSuccess: (record) =>
        toast.success(
          `Undone: ${commandLabel(record.type, record.target)} on ${describeTarget(record.target)}`,
        ),
      onError: (e) => toast.error(e.message),
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Command History</h1>
        <p className="text-slate-500">
          Commands issued from device pages and subzone cards, newest first.
        </p>
      </div>

      {isLoading ? (
        <Loading label="Loading command history…" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </Loading>
      ) : error ? (
        <ErrorNotice
          message="Couldn't load command history."
          error={error}
          onRetry={refetch}
        />
      ) : (
        <>
          <section className="bg-white border border-slate-300 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-transparent">
              <div>
                <h2 className={headingClass}>Valve overrides</h2>
                <p className="text-sm text-slate-500">
                  Undo reverts the most recent command, then the next in
                  sequence.
                </p>
              </div>
              <span
                title={next ? undefined : "Nothing to undo"}
                className="inline-flex"
              >
                <button
                  type="button"
                  onClick={runUndo}
                  disabled={!next || undo.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-orange-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-orange-300"
                >
                  <Undo2 size={16} aria-hidden="true" />
                  Undo latest
                </button>
              </span>
            </div>
            <HistoryTable
              commands={undoable}
              caption="Valve overrides, newest first"
              empty="No valve overrides yet."
              status={(c) => statusOf(c, data)}
            />
          </section>

          <section className="bg-white border border-slate-300 rounded-lg p-4 space-y-3">
            <div className="pb-2 border-b border-slate-200">
              <h2 className={headingClass}>Other commands</h2>
              <p className="text-sm text-slate-500">
                Reboots, mutes and acknowledgements.
              </p>
            </div>
            <HistoryTable
              commands={other}
              caption="Other commands, newest first"
              empty="No other commands yet."
            />
          </section>
        </>
      )}
    </div>
  );
}

export default CommandHistory;
