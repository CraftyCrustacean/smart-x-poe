import { STATUS } from "../../lib/mesh";
import { ZONE_ORDER, zoneColour, zoneLabel } from "../../lib/format";
import { formatCount } from "../../lib/history";

const DOWN_STATUSES = [
  ["Failed", "failed"],
  ["CutOff", "cutOff"],
  ["Offline", "offline"],
];

function Dot({ colour }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ background: colour }}
    />
  );
}

export default function MeshLegend({ counts }) {
  return (
    <div className="mt-3 space-y-2 text-xs text-slate-600">
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {ZONE_ORDER.map((zone) => (
          <li key={zone} className="flex items-center gap-1.5">
            <Dot colour={zoneColour(zone)} />
            {zoneLabel(zone)}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 bg-slate-900"
          />
          Gateway (Durban)
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-0.5 w-5 bg-slate-700"
          />
          MST link
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-0.5 w-5 bg-slate-400"
          />
          Radio link (within 12 km)
        </li>
      </ul>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        <li className="text-slate-500">Points with a device down:</li>
        {DOWN_STATUSES.map(([key, countKey]) => (
          <li key={key} className="flex items-center gap-1.5">
            <Dot colour={STATUS[key].colour} />
            {STATUS[key].label}{" "}
            <span className="tabular-nums text-slate-400">
              ({formatCount(counts[countKey])} devices)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
