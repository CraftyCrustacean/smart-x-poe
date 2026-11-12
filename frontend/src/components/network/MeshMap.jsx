import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Maximize } from "lucide-react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { zoneLabel } from "../../lib/format";
import {
  boundsAround,
  buildMapPoints,
  pointColour,
  pointSegments,
  positionOf,
  statusColour,
  statusLabel,
  treeDepths,
} from "../../lib/mesh";

const TILE_BASE = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
const TILE_URL = `${TILE_BASE}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
const LABEL_URL = `${TILE_BASE}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;
const TILE_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_MAX_ZOOM = 16;
const FIT_PADDING = [24, 24];
const POINT_RADIUS = 5;

const GATEWAY_ICON = L.divIcon({
  className: "",
  html: '<div style="width:12px;height:12px;background:#0f172a;border:2px solid #fff;box-shadow:0 0 0 1px #0f172a"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export default function MeshMap({ topology, state, zone, route, focus }) {
  const [map, setMap] = useState(null);

  const mesh = useMemo(() => buildMapPoints(topology.vertices), [topology]);
  const idIndex = useMemo(
    () => new Map(topology.vertices.map((v, i) => [v.id, i])),
    [topology],
  );
  const routePositions = useMemo(
    () =>
      (route ?? [])
        .map((id) => idIndex.get(id))
        .filter((i) => i !== undefined)
        .map((i) => positionOf(mesh, i)),
    [route, idIndex, mesh],
  );
  const focusIndex = focus ? idIndex.get(focus) : undefined;
  const homeBounds = useMemo(() => {
    if (routePositions.length > 1) return boundsAround(routePositions);
    if (zone) {
      const inZone = topology.vertices.flatMap((v, i) =>
        v.zone === zone ? [positionOf(mesh, i)] : [],
      );
      if (inZone.length) return boundsAround([...inZone, mesh.gatewayPosition]);
    }
    return mesh.bounds;
  }, [routePositions, zone, topology, mesh]);

  const linkSegments = useMemo(
    () =>
      pointSegments(
        topology.links.map((l) => [l.a, l.b]),
        mesh,
      ),
    [topology, mesh],
  );
  const mstSegments = useMemo(
    () =>
      pointSegments(
        state.mstParent.flatMap((p, v) => (p < 0 ? [] : [[v, p]])),
        mesh,
      ),
    [state.mstParent, mesh],
  );
  const mstHops = useMemo(() => treeDepths(state.mstParent), [state.mstParent]);

  const counts = state.summary.counts;
  const label = `Mesh map: ${counts.online} online, ${counts.offline} offline, ${counts.failed} failed, ${counts.cutOff} cut off. The reachability table lists the same devices.`;

  return (
    <div className="relative isolate">
      <div className="sr-only">{label}</div>
      <MapContainer
        ref={setMap}
        bounds={homeBounds}
        boundsOptions={{ padding: FIT_PADDING }}
        preferCanvas
        scrollWheelZoom
        maxZoom={TILE_MAX_ZOOM}
        className="h-[60vh] min-h-[360px] w-full rounded-md border border-slate-200"
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          maxZoom={TILE_MAX_ZOOM}
        />
        <TileLayer url={LABEL_URL} maxZoom={TILE_MAX_ZOOM} />

        <Polyline
          positions={linkSegments}
          pathOptions={{
            color: "#94a3b8",
            weight: 1,
            opacity: 0.5,
            interactive: false,
          }}
        />

        <Polyline
          positions={mstSegments}
          pathOptions={{
            color: "#334155",
            weight: 1.5,
            opacity: 0.8,
            interactive: false,
          }}
        />

        {mesh.points.map((point, i) => (
          <CircleMarker
            key={i}
            center={point.position}
            radius={POINT_RADIUS}
            pathOptions={{
              color: "#ffffff",
              weight: 1,
              fillColor: pointColour(point, state.status),
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <PointSummary
                point={point}
                topology={topology}
                state={state}
                mstHops={mstHops}
              />
              <div className="mt-1 text-xs text-slate-400">
                Click the point to open its devices.
              </div>
            </Tooltip>
            <Popup>
              <PointSummary
                point={point}
                topology={topology}
                state={state}
                mstHops={mstHops}
                links
              />
              <div className="mt-2 text-xs text-slate-400">
                Choose a device to see its routes.
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#ff1493",
              weight: 4,
              opacity: 1,
              lineJoin: "round",
              lineCap: "round",
              interactive: false,
            }}
          />
        )}
        {focusIndex !== undefined && (
          <CircleMarker
            center={positionOf(mesh, focusIndex)}
            radius={POINT_RADIUS + 4}
            pathOptions={{
              color: "#0f172a",
              weight: 2,
              fill: false,
              interactive: false,
            }}
          />
        )}

        <Marker position={mesh.gatewayPosition} icon={GATEWAY_ICON}>
          <Tooltip direction="top" offset={[0, -8]}>
            Gateway ({topology.gatewayId})
          </Tooltip>
        </Marker>
      </MapContainer>

      <button
        type="button"
        aria-label="Reset view"
        title="Reset view"
        disabled={!map}
        onClick={() => map?.fitBounds(homeBounds, { padding: FIT_PADDING })}
        className="absolute top-2.5 right-2.5 z-[1000] flex h-[30px] w-[30px] items-center justify-center rounded border-2 border-black/20 bg-white bg-clip-padding text-slate-700 hover:bg-slate-50"
      >
        <Maximize size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function PointSummary({ point, topology, state, mstHops, links = false }) {
  return (
    <div className="w-64 text-sm">
      <div className="font-medium text-slate-900">{zoneLabel(point.zone)}</div>
      <div className="text-xs text-slate-500">
        {point.subzone} - {point.chainageKm?.toFixed(1)} km along the pipeline
      </div>
      <ul className="mt-2 space-y-1.5">
        {point.members.map((v) => {
          const vertex = topology.vertices[v];
          const status = state.status[v];
          return (
            <li key={v} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: statusColour(status) }}
              />
              {links ? (
                <Link
                  to={`/network/devices/${encodeURIComponent(vertex.id)}`}
                  className="truncate font-mono text-xs text-slate-900! underline decoration-slate-300 hover:decoration-orange-400"
                >
                  {vertex.id}
                </Link>
              ) : (
                <span className="truncate font-mono text-xs text-slate-900">
                  {vertex.id}
                </span>
              )}
              <span className="ml-auto whitespace-nowrap text-xs text-slate-500">
                {status === "Online"
                  ? `${mstHops[v]} hops`
                  : statusLabel(status)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
