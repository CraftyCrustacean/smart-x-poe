import { Link } from "react-router-dom";

function Landing() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Welcome to Smart-X</h1>
      <p className="text-slate-500 mb-6">
        Monitor and manage a simulated pipeline sensor network based on real South African pipes.
      </p>

      <div className="bg-white border border-slate-300 rounded-lg p-6 max-w-md">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Sensor Data Ingestion and Telemetry
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          View registered devices, monitor live status, and manage device
          records across the network.
        </p>
        <Link
          to="/devices"
          className="inline-block px-4 py-2 rounded-md bg-orange-300 text-sm font-medium text-slate-900 hover:bg-orange-400 transition-colors"
        >
          Open Device List
        </Link>
      </div>
    </div>
  );
}

export default Landing;
