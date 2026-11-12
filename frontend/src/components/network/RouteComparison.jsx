import { formatCost, ROUTE_KINDS } from "../../lib/mesh";

export default function RouteComparison({ routes, selected, onSelect }) {
  const cheapestCost = routes.cheapest.cost;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <caption className="sr-only">
          Three routes from {routes.deviceId} to the gateway
        </caption>
        <thead className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
          <tr>
            <th scope="col" className="px-3 py-2">
              Route
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Hops
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Cost
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              vs cheapest
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ROUTE_KINDS.map((kind) => {
            const route = routes[kind.field];
            const isSelected = kind.key === selected;
            const ratio =
              route.cost != null && cheapestCost
                ? route.cost / cheapestCost
                : null;
            return (
              <tr key={kind.key} className={isSelected ? "bg-orange-50" : ""}>
                <th scope="row" className="px-3 py-2 font-normal">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(kind.key)}
                    className="text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`inline-block h-3 w-3 rounded-full border ${isSelected ? "border-orange-500 bg-orange-500" : "border-slate-400"}`}
                      />
                      <span className="font-medium text-slate-900">
                        {kind.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({kind.algorithm})
                      </span>
                    </span>
                    <span className="mt-0.5 block pl-5 text-xs text-slate-500">
                      {kind.note}
                    </span>
                  </button>
                </th>
                <td className="px-3 py-2 text-right tabular-nums">
                  {route.path.length ? route.hops : "–"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCost(route.cost)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {ratio == null ? "–" : `${ratio.toFixed(2)}×`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
