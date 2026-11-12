import { useMeshData } from "../api/mesh";
import CardBoundary from "../components/dashboard/CardBoundary";
import {
  ErrorNotice,
  Loading,
  Skeleton,
} from "../components/dashboard/LoadState";
import DevicePicker from "../components/network/DevicePicker";
import FailureControls from "../components/network/FailureControls";
import HealingReport from "../components/network/HealingReport";
import MeshLegend from "../components/network/MeshLegend";
import MeshMap from "../components/network/MeshMap";
import MeshStatTiles from "../components/network/MeshStatTiles";
import ReachabilityPanel from "../components/network/ReachabilityPanel";

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

export default function NetworkOverview() {
  const { topology, state, ready, error, refetch } = useMeshData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Network Topology and Mesh Routing
        </h1>
        <p className="text-slate-500">
          How devices relay data between each other to the Durban gateway
        </p>
      </div>

      {error && (
        <ErrorNotice
          message="Couldn't load the mesh."
          error={error}
          onRetry={refetch}
        />
      )}

      {!error && !ready && (
        <Loading label="Loading the mesh">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-[4.5rem]" />
            ))}
          </div>
          <Skeleton className="mt-6 h-[60vh]" />
        </Loading>
      )}

      {ready && (
        <>
          <CardBoundary what="mesh statistics" resetKey={state.summary.batch}>
            <MeshStatTiles state={state} />
          </CardBoundary>

          <section className="bg-white border border-slate-300 rounded-lg px-4 py-2.5">
            <DevicePicker />
            <p className="mt-1.5 text-xs text-slate-500">
              Search a device to query its history.
            </p>
          </section>

          <Card title="Mesh map">
            <CardBoundary what="mesh map" resetKey={state.summary.batch}>
              <MeshMap topology={topology} state={state} />
              <MeshLegend counts={state.summary.counts} />
            </CardBoundary>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Simulate failures">
              <CardBoundary
                what="failure controls"
                resetKey={state.summary.batch}
              >
                <FailureControls topology={topology} state={state} />
              </CardBoundary>
            </Card>
            <Card title="Self healing report">
              <CardBoundary
                what="healing report"
                resetKey={state.summary.batch}
              >
                <HealingReport />
              </CardBoundary>
            </Card>
          </div>

          <Card title="Reachability (BFS)">
            <p className="mb-4 text-sm text-slate-600">
              Search a device to see which devices it can reach.
            </p>
            <CardBoundary
              what="reachability table"
              resetKey={state.summary.batch}
            >
              <ReachabilityPanel />
            </CardBoundary>
          </Card>
        </>
      )}
    </div>
  );
}
