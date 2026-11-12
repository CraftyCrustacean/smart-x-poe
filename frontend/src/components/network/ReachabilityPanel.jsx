import { Fragment, useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useReachability } from "../../api/mesh";
import { zoneLabel } from "../../lib/format";
import { formatCount } from "../../lib/history";
import { ErrorNotice, Loading, Skeleton } from "../dashboard/LoadState";
import DeviceSuggestInput from "../search/DeviceSuggestInput";

export default function ReachabilityPanel() {
  const [params, setParams] = useSearchParams();
  const from = params.get("from") ?? "";
  const [draft, setDraft] = useState(from);
  const inputId = useId();
  const { data, isLoading, isFetching, error, refetch } = useReachability({
    from,
  });

  const setFrom = (value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("from", value);
        else next.delete("from");
        return next;
      },
      { replace: true },
    );

  const fromGateway = !from;
  const unreachableLabel = fromGateway ? "Cut off" : "Unreachable";

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFrom(draft.trim());
        }}
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <div className="flex flex-col text-xs text-slate-500">
          <label htmlFor={inputId}>Search outwards from</label>
          <DeviceSuggestInput
            id={inputId}
            value={draft}
            onChange={setDraft}
            onSelect={setDraft}
            placeholder="The gateway (or a device ID)"
            className="mt-1 w-72"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-1.5 rounded-md bg-orange-300 text-sm text-slate-900 hover:bg-orange-400 transition-colors"
        >
          Run BFS
        </button>
        {from && (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              setFrom("");
            }}
            className="px-3 py-1.5 rounded-md border border-orange-200 bg-white text-sm text-slate-600 hover:bg-orange-100 transition-colors"
          >
            From the gateway
          </button>
        )}
      </form>

      {isLoading && (
        <Loading label="Running the search">
          <Skeleton className="h-48" />
        </Loading>
      )}
      {error && (
        <ErrorNotice
          message={
            from
              ? `Couldn't search from ${from}. Check the ID.`
              : "Couldn't load reachability."
          }
          error={error}
          onRetry={() => refetch()}
        />
      )}

      {data && !error && (
        <div aria-busy={isFetching}>
          <p className="mb-3 text-sm text-slate-700 tabular-nums">
            From{" "}
            {fromGateway ? (
              "the gateway"
            ) : (
              <span className="font-mono">{data.from}</span>
            )}
            : {formatCount(data.reachable)} reachable -{" "}
            {formatCount(data.unreachable)} {unreachableLabel.toLowerCase()} -{" "}
            {formatCount(data.down)} down
          </p>

          <div className="max-h-[28rem] overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-sm text-left">
              <caption className="sr-only">Devices reachable by BFS</caption>
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Subzone
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Devices
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Reachable
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    {unreachableLabel}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Down
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.subzones.map((row, i) => (
                  <Fragment key={`${row.zone}|${row.subzone}`}>
                    {(i === 0 || data.subzones[i - 1].zone !== row.zone) && (
                      <tr className="bg-slate-50">
                        <th
                          scope="rowgroup"
                          colSpan={5}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600"
                        >
                          {zoneLabel(row.zone)}
                        </th>
                      </tr>
                    )}
                    <tr>
                      <th
                        scope="row"
                        className="px-3 py-1.5 font-normal text-slate-700"
                      >
                        {row.subzone}
                      </th>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {row.total}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {row.reachable}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right tabular-nums ${row.unreachable ? "font-medium text-violet-700" : ""}`}
                      >
                        {row.unreachable}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right tabular-nums ${row.down ? "font-medium text-red-700" : ""}`}
                      >
                        {row.down}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {data.unreachableIds.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-slate-700">
                {unreachableLabel} devices (
                {formatCount(data.unreachableIds.length)})
              </summary>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {data.unreachableIds.map((id) => (
                  <li key={id}>
                    <Link
                      to={`/network/devices/${encodeURIComponent(id)}`}
                      className="font-mono text-xs text-slate-900 underline decoration-slate-300 hover:decoration-orange-400"
                    >
                      {id}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
