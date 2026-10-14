import { formatSimDate } from "../../lib/format";

export default function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  const items = payload
    .filter((item) => typeof item.value === "number")
    .sort((a, b) => b.value - a.value);
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1.5 font-medium text-slate-500">{formatSimDate(label)}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.dataKey} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-slate-600">{item.name}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums text-slate-900">
              {format ? format(item.value) : item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
