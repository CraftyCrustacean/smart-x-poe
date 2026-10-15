import { Link } from "react-router-dom";
import { useCommandHistory } from "../../api/commands";
import { commandLabel, describeTarget } from "../../lib/commands";
import TimeAgo from "../TimeAgo";
import { ErrorNotice, Loading, Skeleton } from "../dashboard/LoadState";

const LIMIT = 5;

export default function DeviceRecentCommands({ deviceId }) {
  const { data, isLoading, error, refetch } = useCommandHistory();

  if (isLoading)
    return (
      <Loading label="Loading recent commands…">
        <Skeleton className="h-6" />
      </Loading>
    );
  if (error)
    return (
      <ErrorNotice
        message="Couldn't load recent commands."
        error={error}
        onRetry={refetch}
      />
    );

  const recent = data.history
    .filter((c) => c.deviceIds.includes(deviceId))
    .slice(0, LIMIT);

  if (recent.length === 0)
    return <p className="text-sm text-slate-500">No commands sent to this device yet.</p>;

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-slate-100 text-sm">
        {recent.map((c) => (
          <li
            key={c.id}
            className={`flex flex-wrap items-baseline gap-x-3 py-1.5 ${
              c.undoneAtUtc ? "text-slate-400" : "text-slate-700"
            }`}
          >
            <span className="tabular-nums text-slate-500">
              <TimeAgo iso={c.issuedAtUtc} />
            </span>
            <span className={c.undoneAtUtc ? "" : "font-medium text-slate-900"}>
              {commandLabel(c.type, c.target)}
            </span>
            {!c.target.deviceId && (
              <span className="text-xs text-slate-500">
                via {describeTarget(c.target)}
              </span>
            )}
            {c.undoneAtUtc && <span className="text-xs">(undone)</span>}
          </li>
        ))}
      </ul>
      <Link to="/command-history" className="text-sm text-orange-700 hover:underline">
        View full command history
      </Link>
    </div>
  );
}
