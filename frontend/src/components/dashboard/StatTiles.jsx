import {
  CalendarClock,
  RadioTower,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { formatSimDate } from "../../lib/format";
import { Loading, Skeleton } from "./LoadState";

export function Tile({
  icon: Icon,
  label,
  value,
  detail,
  critical = false,
  compact = false,
}) {
  return (
    <div
      className={`bg-white border border-slate-300 rounded-lg ${compact ? "px-3 py-2" : "p-4"}`}
    >
      <div
        className={`flex items-center gap-2 text-slate-500 ${compact ? "text-xs" : "text-sm"}`}
      >
        <Icon
          size={compact ? 14 : 16}
          strokeWidth={1.5}
          aria-hidden="true"
          className={`shrink-0 ${critical ? "text-red-600" : ""}`}
        />
        <span className={compact ? "truncate" : ""}>{label}</span>
      </div>
      <p
        className={`font-semibold text-slate-900 tabular-nums ${compact ? "text-xl" : "mt-1 text-3xl"}`}
      >
        {value}
      </p>
      {detail && (
        <p
          title={compact ? detail : undefined}
          className={`text-xs text-slate-500 ${compact ? "truncate" : "mt-1"}`}
        >
          {detail}
        </p>
      )}
    </div>
  );
}

export function StatTiles({ summary }) {
  const online = summary.registered - summary.offline - summary.neverReported;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tile
        icon={RadioTower}
        label="Online"
        value={online}
        detail={`of ${summary.registered} registered`}
      />
      <Tile
        icon={WifiOff}
        label="Offline"
        value={summary.offline}
        detail={
          summary.neverReported
            ? `+ ${summary.neverReported} never reported`
            : "missed the last batch"
        }
      />
      <Tile
        icon={TriangleAlert}
        label="Active critical alerts"
        value={summary.activeAlerts}
        critical={summary.activeAlerts > 0}
        detail="device and metric pairs past threshold"
      />
      <Tile
        icon={CalendarClock}
        label="Last batch"
        value={
          summary.lastBatchTimestamp
            ? formatSimDate(summary.lastBatchTimestamp)
            : "—"
        }
        detail={`${summary.lastBatchPackets} packets in one simulated day`}
      />
    </div>
  );
}

export function StatTilesSkeleton() {
  return (
    <Loading label="Loading network summary…" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[114px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-5 w-1/2" />
    </Loading>
  );
}

export function CategoryStrip({ categories }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
      {categories.map((c) => (
        <li key={c.category}>
          <span className="font-medium text-slate-900">{c.category}</span>{" "}
          {c.total}
          {c.offline > 0 && (
            <span className="text-slate-500"> ({c.offline} offline)</span>
          )}
        </li>
      ))}
    </ul>
  );
}
