import {
  CircleOff,
  Gauge,
  Network,
  RadioTower,
  Route,
  Timer,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { Tile } from "../dashboard/StatTiles";
import { formatCost } from "../../lib/mesh";
import { formatCount } from "../../lib/history";

export default function MeshStatTiles({ state }) {
  const { summary } = state;
  const { counts } = summary;

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <Tile
        compact
        icon={RadioTower}
        label="Online"
        value={formatCount(counts.online)}
        detail={`of ${formatCount(counts.devices)} devices`}
      />
      <Tile
        compact
        icon={WifiOff}
        label="Offline"
        value={formatCount(counts.offline)}
        detail="didnt report last batch"
      />
      <Tile
        compact
        icon={CircleOff}
        label="Simulated failures"
        value={formatCount(counts.failed)}
        critical={counts.failed > 0}
        detail="set using the failure controls"
      />
      <Tile
        compact
        icon={TriangleAlert}
        label="Cut off"
        value={formatCount(counts.cutOff)}
        critical={counts.cutOff > 0}
        detail="devices cant reach the gateway"
      />
      <Tile
        compact
        icon={Network}
        label="MST total cost"
        value={formatCost(summary.mstTotalCost)}
        detail="sum of distance² + 1 "
      />
      <Tile
        compact
        icon={Gauge}
        label="MST vs every link"
        value={`${state.mstPercentOfAllLinks.toFixed(1)}%`}
        detail={`of the ${formatCost(state.allLinksCost)} cost of every link`}
      />
      <Tile
        compact
        icon={Route}
        label="Longest MST route"
        value={`${state.longestMstHops} hops`}
        detail={`longest BFS route: ${state.longestFewestHops}`}
      />
      <Tile
        compact
        icon={Timer}
        label="Rebuild time"
        value={`${summary.rebuildMs.toFixed(1)} ms`}
        detail={`batch ${formatCount(summary.batch)}`}
      />
    </div>
  );
}
