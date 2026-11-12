import { Link } from "react-router-dom";
import { useMeshHealing } from "../../api/mesh";
import { formatCount } from "../../lib/history";
import { formatCost, statusColour, statusLabel } from "../../lib/mesh";
import { ErrorNotice, Loading, Skeleton } from "../dashboard/LoadState";

function DeviceLink({ id }) {
  return (
    <Link
      to={`/network/devices/${encodeURIComponent(id)}`}
      className="font-mono text-xs text-slate-900 underline decoration-slate-300 hover:decoration-orange-400"
    >
      {id}
    </Link>
  );
}

function byDown(entries) {
  const groups = new Map();
  for (const e of entries) {
    if (!groups.has(e.down))
      groups.set(e.down, { down: e.down, status: e.downStatus, entries: [] });
    groups.get(e.down).entries.push(e);
  }
  return [...groups.values()];
}

export default function HealingReport() {
  const { data, isLoading, error, refetch } = useMeshHealing();

  if (isLoading)
    return (
      <Loading label="Loading the healing report">
        <Skeleton className="h-32" />
      </Loading>
    );
  if (error)
    return (
      <ErrorNotice
        message="Couldn't load the healing report."
        error={error}
        onRetry={() => refetch()}
      />
    );

  if (data.down === 0)
    return (
      <p className="text-sm text-slate-500">
        Every device is up. Fail a subzone with the controls to see which
        devices reroute.
      </p>
    );

  const isolated = data.entries.filter((e) => e.newNextHop == null).length;
  const groups = byDown(data.entries);

  return (
    <div>
      <p className="text-sm text-slate-700 tabular-nums">
        {formatCount(data.down)} down - {formatCount(data.cutOff)} cut off -{" "}
        {formatCount(data.entries.length - isolated)} rerouted -{" "}
        {formatCount(isolated)} isolated
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Lists the devices directly below a disconnected device in mesh.
      </p>

      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No route had to change.</p>
      ) : (
        <ul className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
          {groups.map((g) => (
            <li key={g.down} className="rounded-md border border-slate-200 p-3">
              <p className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: statusColour(g.status) }}
                />
                <DeviceLink id={g.down} />
                <span className="text-xs text-slate-500">
                  {statusLabel(g.status).toLowerCase()}
                </span>
              </p>
              <ul className="mt-2 space-y-1 pl-4">
                {g.entries.map((e) => (
                  <li key={e.dependant} className="text-sm text-slate-700">
                    <span aria-hidden="true" className="text-slate-400">
                      {" "}
                    </span>
                    <DeviceLink id={e.dependant} />{" "}
                    {e.newNextHop == null ? (
                      <span className="text-violet-700">
                        isolated, cant reach gateway
                      </span>
                    ) : (
                      <>
                        now routes through <DeviceLink id={e.newNextHop} />{" "}
                        <span className="text-xs text-slate-500 tabular-nums">
                          ({e.newHops} hops, cost {formatCost(e.newCost)})
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
