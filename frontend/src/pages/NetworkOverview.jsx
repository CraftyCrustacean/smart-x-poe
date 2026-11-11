import DevicePicker from "../components/network/DevicePicker";

export default function NetworkOverview() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Network Topology and Mesh Routing</h1>
      <p className="text-slate-500 mb-6">
        Mesh routes between devices and the gateway, and each device's telemetry history
      </p>

      <section className="bg-white border border-slate-300 rounded-lg p-6">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
          Mesh overview
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Search a device to view its full history.
        </p>
        <DevicePicker />
      </section>
    </div>
  );
}
