import { Link } from "react-router-dom";
import { formatCost } from "../../lib/mesh";

function Hop({ id, current, gateway }) {
  if (id === current)
    return (
      <span className="font-mono text-xs font-semibold text-slate-900">
        {id}
      </span>
    );
  if (id === gateway)
    return <span className="text-xs font-semibold text-slate-900">{id}</span>;
  return (
    <Link
      to={`/network/devices/${encodeURIComponent(id)}`}
      className="font-mono text-xs text-slate-900 underline decoration-slate-300 hover:decoration-orange-400"
    >
      {id}
    </Link>
  );
}

export default function RouteHopTable({ route, deviceId }) {
  if (route.steps.length === 0)
    return (
      <p className="text-sm text-slate-500">
        This route has no path to the gateway.
      </p>
    );

  const totalKm = route.steps.reduce((sum, s) => sum + s.distanceKm, 0);
  const gateway = route.path[route.path.length - 1];

  return (
    <div className="max-h-96 overflow-auto rounded-md border border-slate-200">
      <table className="w-full text-sm text-left">
        <caption className="sr-only">
          Route from {deviceId} to the gateway
        </caption>
        <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
          <tr>
            <th scope="col" className="px-3 py-2 text-right">
              Hop
            </th>
            <th scope="col" className="px-3 py-2">
              From
            </th>
            <th scope="col" className="px-3 py-2">
              To
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Distance
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Cost
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {route.steps.map((step, i) => (
            <tr key={i}>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">
                {i + 1}
              </td>
              <td className="px-3 py-1.5">
                <Hop id={step.from} current={deviceId} gateway={gateway} />
              </td>
              <td className="px-3 py-1.5">
                <Hop id={step.to} current={deviceId} gateway={gateway} />
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {step.distanceKm.toFixed(2)} km
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {formatCost(step.cost)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 bg-slate-50 text-sm font-medium border-t border-slate-200">
          <tr>
            <th scope="row" colSpan={3} className="px-3 py-2 text-left">
              Total over {route.hops} hops
            </th>
            <td className="px-3 py-2 text-right tabular-nums">
              {totalKm.toFixed(1)} km
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatCost(route.cost)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
