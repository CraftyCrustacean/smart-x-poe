import { Link, useParams } from "react-router-dom";
import { useDeviceLive } from "../api/devices";
import { zoneLabel } from "../lib/format";
import CardBoundary from "../components/dashboard/CardBoundary";
import { ErrorNotice, Loading, Skeleton } from "../components/dashboard/LoadState";
import HistoryQuery from "../components/network/HistoryQuery";

export default function NetworkDevice() {
  const { deviceId } = useParams();
  const live = useDeviceLive(deviceId);
  const state = live.data?.state;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{deviceId}</h1>
          <p className="text-slate-500">
            {state
              ? `${state.category} · ${zoneLabel(state.zone)} · ${state.subzone}`
              : "Mesh route and telemetry history"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/network"
            className="px-3 py-1.5 rounded-md border border-orange-200 bg-white text-sm text-slate-600 hover:bg-orange-100 transition-colors"
          >
            Back
          </Link>
          <Link
            to={`/devices/${encodeURIComponent(deviceId)}`}
            className="px-3 py-1.5 rounded-md bg-orange-300 text-sm text-slate-900 hover:bg-orange-400 transition-colors"
          >
            Details
          </Link>
        </div>
      </div>

      {live.isLoading && (
        <Loading label="Loading device">
          <Skeleton className="h-40" />
        </Loading>
      )}

      {live.error && (
        <ErrorNotice
          message={`Couldn't load ${deviceId}. Check the ID is a registered device.`}
          error={live.error}
          onRetry={() => live.refetch()}
        />
      )}

      {state && (
        <section className="bg-white border border-slate-300 rounded-lg p-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
            Telemetry history (AVL tree)
          </h2>
          <CardBoundary what="history query" resetKey={deviceId}>
            <HistoryQuery deviceId={deviceId} category={state.category} />
          </CardBoundary>
        </section>
      )}
    </div>
  );
}
