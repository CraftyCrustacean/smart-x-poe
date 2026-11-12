import { Link, useParams, useSearchParams } from "react-router-dom";
import { useDeviceLive } from "../api/devices";
import { useMeshData, useMeshRoute } from "../api/mesh";
import { zoneLabel } from "../lib/format";
import {
  formatCost,
  ROUTE_KINDS,
  statusColour,
  statusLabel,
} from "../lib/mesh";
import CardBoundary from "../components/dashboard/CardBoundary";
import {
  ErrorNotice,
  Loading,
  Skeleton,
} from "../components/dashboard/LoadState";
import HistoryQuery from "../components/network/HistoryQuery";
import MeshMap from "../components/network/MeshMap";
import RouteComparison from "../components/network/RouteComparison";
import RouteHopTable from "../components/network/RouteHopTable";

function Card({ title, children }) {
  return (
    <section className="bg-white border border-slate-300 rounded-lg p-6">
      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function NetworkDevice() {
  const { deviceId } = useParams();
  const [params, setParams] = useSearchParams();
  const live = useDeviceLive(deviceId);
  const routes = useMeshRoute(deviceId);
  const mesh = useMeshData();
  const device = live.data?.state;

  const selectedKey = ROUTE_KINDS.some((k) => k.key === params.get("route"))
    ? params.get("route")
    : "mst";
  const selectedKind = ROUTE_KINDS.find((k) => k.key === selectedKey);
  const selectRoute = (key) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (key === "mst") next.delete("route");
        else next.set("route", key);
        return next;
      },
      { replace: true },
    );

  const route = routes.data?.[selectedKind.field];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{deviceId}</h1>
          <p className="text-slate-500">
            {device
              ? `${device.category} - ${zoneLabel(device.zone)} - ${device.subzone}`
              : "Mesh routes and telemetry history"}
          </p>
          {routes.data && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-sm text-slate-700">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: statusColour(routes.data.status) }}
              />
              {statusLabel(routes.data.status)}
            </p>
          )}
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

      {(live.error || routes.error) && (
        <ErrorNotice
          message={`Couldn't load ${deviceId}. Confirm the ID is correct.`}
          error={live.error ?? routes.error}
          onRetry={() => {
            live.refetch();
            routes.refetch();
          }}
        />
      )}

      {routes.isLoading && (
        <Loading label="Loading routes">
          <Skeleton className="h-40" />
        </Loading>
      )}

      {routes.data && (
        <>
          {routes.data.message && routes.data.status === "Failed" && (
            <p
              role="status"
              className="rounded-md border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900"
            >
              {routes.data.message}
            </p>
          )}

          {routes.data.healing.length > 0 && (
            <Card title="Rerouted after a failure">
              <ul className="space-y-1 text-sm text-slate-700">
                {routes.data.healing.map((h) => (
                  <li key={h.down}>
                    Device{" "}
                    <Link
                      to={`/network/devices/${encodeURIComponent(h.down)}`}
                      className="font-mono text-xs underline decoration-slate-300 hover:decoration-orange-400"
                    >
                      {h.down}
                    </Link>{" "}
                    {h.downStatus === "Failed"
                      ? "is unreachable"
                      : "is offline"}
                    .{" "}
                    {h.newNextHop == null ? (
                      <span className="text-violet-700">
                        No neighbour reaches the gateway.
                      </span>
                    ) : (
                      <>
                        Now routing through{" "}
                        <Link
                          to={`/network/devices/${encodeURIComponent(h.newNextHop)}`}
                          className="font-mono text-xs underline decoration-slate-300 hover:decoration-orange-400"
                        >
                          {h.newNextHop}
                        </Link>{" "}
                        ({h.newHops} hops, cost {formatCost(h.newCost)}).
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Routing Methods">
            <CardBoundary what="route comparison" resetKey={deviceId}>
              <RouteComparison
                routes={routes.data}
                selected={selectedKey}
                onSelect={selectRoute}
              />
              <p className="mt-3 text-xs text-slate-500">
                The MST minimises energy of the whole network not of each
                device. This can lead to a device taking a suboptimal route for
                the sake of the network.
              </p>
            </CardBoundary>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title={`${selectedKind.label}: map view`}>
              <CardBoundary
                what="route map"
                resetKey={`${deviceId}-${selectedKey}`}
              >
                {mesh.ready ? (
                  <MeshMap
                    key={`${deviceId}-${selectedKey}`}
                    topology={mesh.topology}
                    state={mesh.state}
                    zone={route?.path.length ? undefined : device?.zone}
                    route={route?.path}
                    focus={deviceId}
                  />
                ) : mesh.error ? (
                  <ErrorNotice
                    message="Couldn't load the map."
                    error={mesh.error}
                    onRetry={mesh.refetch}
                  />
                ) : (
                  <Loading label="Loading the map">
                    <Skeleton className="h-80" />
                  </Loading>
                )}
              </CardBoundary>
            </Card>

            <Card title={`${selectedKind.label}: devices route`}>
              <CardBoundary
                what="route table"
                resetKey={`${deviceId}-${selectedKey}`}
              >
                <RouteHopTable route={route} deviceId={deviceId} />
              </CardBoundary>
            </Card>
          </div>
        </>
      )}

      {device && (
        <Card title="Telemetry history">
          <CardBoundary what="history query" resetKey={deviceId}>
            <HistoryQuery deviceId={deviceId} category={device.category} />
          </CardBoundary>
        </Card>
      )}
    </div>
  );
}
