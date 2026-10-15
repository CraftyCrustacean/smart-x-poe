import { X } from "lucide-react";
import { zoneLabel } from "../../lib/format";
import { ALERT_OPTIONS, SEARCH_KEYS } from "../../lib/search";

function Chip({ children, onRemove }) {
  return (
    <li className="inline-flex items-center gap-1 rounded-full bg-orange-100 py-0.5 pl-3 pr-1 text-sm text-orange-900">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${children}`}
        className="rounded-full p-0.5 hover:bg-orange-200"
      >
        <X size={12} aria-hidden="true" />
      </button>
    </li>
  );
}

const kmLabel = (min, max) =>
  min && max ? `${min}–${max} km` : min ? `From ${min} km` : `Up to ${max} km`;

export default function FilterChips({ params, update, lowBatteryPct }) {
  const q = params.get("q")?.trim() ?? "";
  const cats = params.getAll("cat");
  const alert = params.get("alert") ?? "all";
  const zone = params.get("zone");
  const subzone = params.get("subzone");
  const kmin = params.get("kmin");
  const kmax = params.get("kmax");

  const chips = [
    q && { key: "q", label: `ID contains "${q}"`, remove: () => update({ q: null }) },
    ...cats.map((c) => ({
      key: `cat-${c}`,
      label: c,
      remove: () => update({ cat: cats.filter((x) => x !== c) }),
    })),
    alert !== "all" && {
      key: "alert",
      label: ALERT_OPTIONS.find((o) => o.value === alert)?.label ?? alert,
      remove: () => update({ alert: null }),
    },
    zone && {
      key: "zone",
      label: zoneLabel(zone),
      remove: () => update({ zone: null, subzone: null }),
    },
    subzone && { key: "subzone", label: subzone, remove: () => update({ subzone: null }) },
    (kmin || kmax) && {
      key: "km",
      label: kmLabel(kmin, kmax),
      remove: () => update({ kmin: null, kmax: null }),
    },
    params.get("low") === "1" && {
      key: "low",
      label: `Battery ≤ ${lowBatteryPct ?? "…"}%`,
      remove: () => update({ low: null }),
    },
    params.get("ovr") === "1" && {
      key: "ovr",
      label: "Active override",
      remove: () => update({ ovr: null }),
    },
  ].filter(Boolean);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul className="flex flex-wrap gap-2" aria-label="Active filters">
        {chips.map((c) => (
          <Chip key={c.key} onRemove={c.remove}>
            {c.label}
          </Chip>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => update(Object.fromEntries(SEARCH_KEYS.map((k) => [k, null])))}
        className="text-sm text-orange-700 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
