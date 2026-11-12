import { zoneColour } from "./format";

export const STATUS = {
  Online: { label: "Online", colour: "#059669" },
  Offline: { label: "Offline", colour: "#94a3b8" },
  Failed: { label: "Simulated failure", colour: "#dc2626" },
  CutOff: { label: "Cut off", colour: "#7c3aed" },
};

export const statusLabel = (status) => STATUS[status]?.label ?? status;
export const statusColour = (status) => STATUS[status]?.colour ?? "#64748b";

export const formatCost = (cost) =>
  cost == null
    ? "–"
    : cost.toLocaleString("en-GB", {
        maximumFractionDigits: cost < 100 ? 1 : 0,
      });

export const ROUTE_KINDS = [
  {
    key: "mst",
    field: "mst",
    label: "MST",
    algorithm: "Prim's",
    note: "Lowest total energy for the whole network.",
  },
  {
    key: "hops",
    field: "fewestHops",
    label: "Fewest hops",
    algorithm: "BFS",
    note: "Fewest jumps, ignoring how long each jump is.",
  },
  {
    key: "cheapest",
    field: "cheapest",
    label: "Cheapest for this device",
    algorithm: "Dijkstra",
    note: "Lowest total cost for this one device.",
  },
];

const STATUS_PRIORITY = ["Failed", "CutOff", "Offline"];

export function pointColour(point, status) {
  for (const s of STATUS_PRIORITY)
    if (point.members.some((v) => status[v] === s)) return statusColour(s);
  return zoneColour(point.zone);
}

export function buildMapPoints(vertices) {
  const byLocation = new Map();
  vertices.forEach((v, i) => {
    if (v.isGateway) return;
    const key = `${v.latitude.toFixed(5)},${v.longitude.toFixed(5)}`;
    if (!byLocation.has(key)) byLocation.set(key, []);
    byLocation.get(key).push(i);
  });

  const pointOf = new Array(vertices.length).fill(-1);
  const points = [];
  for (const members of byLocation.values()) {
    const first = vertices[members[0]];
    members.forEach((v) => (pointOf[v] = points.length));
    points.push({
      position: [first.latitude, first.longitude],
      members,
      zone: first.zone,
      subzone: first.subzone,
      chainageKm: first.chainageKm,
    });
  }

  const gateway = vertices.findIndex((v) => v.isGateway);
  const gatewayPosition = [
    vertices[gateway].latitude,
    vertices[gateway].longitude,
  ];

  const lats = vertices.map((v) => v.latitude);
  const lngs = vertices.map((v) => v.longitude);

  return {
    points,
    pointOf,
    gateway,
    gatewayPosition,
    bounds: [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ],
  };
}

export const positionOf = (map, v) =>
  v === map.gateway ? map.gatewayPosition : map.points[map.pointOf[v]].position;

export function boundsAround(positions) {
  const lats = positions.map((p) => p[0]);
  const lngs = positions.map((p) => p[1]);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

export function pointSegments(pairs, map) {
  const positionOf = (pointIndex) =>
    pointIndex < 0 ? map.gatewayPosition : map.points[pointIndex].position;

  const seen = new Set();
  const segments = [];
  for (const [a, b] of pairs) {
    const pa = map.pointOf[a];
    const pb = map.pointOf[b];
    if (pa === pb) continue;
    const key = pa < pb ? `${pa}:${pb}` : `${pb}:${pa}`;
    if (seen.has(key)) continue;
    seen.add(key);
    segments.push([positionOf(pa), positionOf(pb)]);
  }
  return segments;
}

export function treeDepths(parent) {
  const depth = new Array(parent.length).fill(-2);
  const pending = [];
  for (let v = 0; v < parent.length; v++) {
    let u = v;
    while (depth[u] === -2) {
      if (parent[u] < 0) {
        depth[u] = u === 0 ? 0 : -1;
        break;
      }
      pending.push(u);
      u = parent[u];
    }
    let d = depth[u];
    while (pending.length) {
      d = d < 0 ? -1 : d + 1;
      depth[pending.pop()] = d;
    }
  }
  return depth;
}

export function subzonesByZone(vertices) {
  const start = new Map();
  for (const v of vertices) {
    if (v.isGateway) continue;
    const key = `${v.zone}|${v.subzone}`;
    const seen = start.get(key);
    if (!seen || v.chainageKm < seen.km)
      start.set(key, { zone: v.zone, subzone: v.subzone, km: v.chainageKm });
  }
  const result = {};
  for (const { zone, subzone } of [...start.values()].sort(
    (a, b) => a.km - b.km,
  ))
    (result[zone] ??= []).push(subzone);
  return result;
}

export function failedGroups(vertices, status) {
  const groups = new Map();
  status.forEach((s, v) => {
    if (s !== "Failed") return;
    const { zone, subzone } = vertices[v];
    const key = `${zone}|${subzone}`;
    if (!groups.has(key)) groups.set(key, { zone, subzone, count: 0 });
    groups.get(key).count++;
  });
  return [...groups.values()];
}
