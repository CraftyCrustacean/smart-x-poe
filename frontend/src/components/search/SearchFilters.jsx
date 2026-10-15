import { useRef, useState } from "react";
import { useLatestSnapshots } from "../../api/dashboard";
import { ZONE_ORDER, zoneLabel } from "../../lib/format";
import { activeFilters, ALERT_OPTIONS, CATEGORIES, FILTER_KEYS } from "../../lib/search";

const field = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700";
const heading = "text-xs font-medium text-slate-500";

function KmInput({ label, value, onCommit }) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setText(value);
  }

  const timer = useRef(null);

  const commit = (raw) => {
    clearTimeout(timer.current);
    const n = raw.trim() === "" ? null : Number(raw);
    if (n === null || Number.isFinite(n)) {
      if (String(n ?? "") !== value) onCommit(n);
    } else setText(value);
  };

  const onChange = (e) => {
    const raw = e.target.value;
    setText(raw);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(raw), 500);
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        placeholder={label}
        value={text}
        onChange={onChange}
        onBlur={() => commit(text)}
        onKeyDown={(e) => e.key === "Enter" && commit(text)}
        className={`${field} w-full`}
      />
    </label>
  );
}

export default function SearchFilters({ params, update }) {
  const cats = params.getAll("cat");
  const alert = params.get("alert") ?? "all";
  const zone = params.get("zone") ?? "";
  const subzone = params.get("subzone") ?? "";

  const { data: scopes = [] } = useLatestSnapshots(zone || null);
  const subzones = zone ? scopes.map((s) => s.subzone) : [];

  const toggleCat = (c) =>
    update({ cat: cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c] });

  const filtersSet = activeFilters(params, FILTER_KEYS.filter((k) => k !== "q")).length > 0;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1">
        <legend className={`${heading} mb-1`}>Category</legend>
        <div className="inline-flex rounded-md border border-slate-300 overflow-hidden text-sm">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cats.includes(c)}
              onClick={() => toggleCat(c)}
              className={`flex-1 px-3 py-1.5 transition-colors ${
                cats.includes(c)
                  ? "bg-orange-100 text-slate-900"
                  : "bg-white text-slate-600 hover:bg-orange-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className={heading}>State</span>
        <select
          className={field}
          value={alert}
          onChange={(e) => update({ alert: e.target.value })}
        >
          {ALERT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={heading}>Zone</span>
          <select
            className={field}
            value={zone}
            onChange={(e) => update({ zone: e.target.value, subzone: null })}
          >
            <option value="">All zones</option>
            {ZONE_ORDER.map((z) => (
              <option key={z} value={z}>
                {zoneLabel(z)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={heading}>Subzone</span>
          <select
            className={`${field} disabled:opacity-50`}
            value={subzone}
            disabled={!zone}
            onChange={(e) => update({ subzone: e.target.value })}
          >
            <option value="">All subzones</option>
            {subzones.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className={`${heading} mb-1`}>Chainage range (km)</legend>
        <div className="grid grid-cols-2 gap-2">
          <KmInput
            label="Min"
            value={params.get("kmin") ?? ""}
            onCommit={(n) => update({ kmin: n })}
          />
          <KmInput
            label="Max"
            value={params.get("kmax") ?? ""}
            onCommit={(n) => update({ kmax: n })}
          />
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={params.get("low") === "1"}
            onChange={(e) => update({ low: e.target.checked ? "1" : null })}
          />
          Low battery
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={params.get("ovr") === "1"}
            onChange={(e) => update({ ovr: e.target.checked ? "1" : null })}
          />
          Active override
        </label>
      </div>

      <button
        type="button"
        disabled={!filtersSet}
        onClick={() =>
          update(
            Object.fromEntries(FILTER_KEYS.filter((k) => k !== "q").map((k) => [k, null])),
          )
        }
        className="rounded-md border border-orange-300 bg-white px-3 py-1.5 text-sm text-slate-900 hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:hover:bg-white"
      >
        Reset filters
      </button>
    </div>
  );
}
