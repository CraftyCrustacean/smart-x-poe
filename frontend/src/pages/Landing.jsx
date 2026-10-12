import { Link } from "react-router-dom";

const modules = [
  {
    title: "Sensor Data Ingestion and Telemetry",
    description:
      "View registered devices, monitor live status, and manage device records across the network.",
    to: "/devices",
    cta: "Open Device List",
  },
  {
    title: "Real-Time Command Stream and History",
    description:
      "Watch live telemetry, issue override commands with undo, and review suggested actions.",
    to: "/command-stream",
    cta: "Open Command Stream",
  },
  {
    title: "Network Topology and Mesh Routing",
    description: "Visualise the pipeline mesh and routing paths.",
    to: null,
    cta: "Available in the final PoE",
  },
];

function Landing() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Welcome to Smart-X</h1>
      <p className="text-slate-500 mb-6">
        Monitor and manage a simulated pipeline sensor network based on real
        South African pipes.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((m) => (
          <div
            key={m.title}
            className={`bg-white border border-slate-300 rounded-lg p-6 flex flex-col ${
              m.to ? "" : "grayscale opacity-60"
            }`}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              {m.title}
            </h2>
            <p className="text-slate-500 text-sm mb-4 flex-1">
              {m.description}
            </p>
            {m.to ? (
              <Link
                to={m.to}
                className="self-start px-4 py-2 rounded-md bg-orange-300 text-sm font-medium text-slate-900 hover:bg-orange-400 transition-colors"
              >
                {m.cta}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="self-start px-4 py-2 rounded-md bg-slate-200 text-sm text-slate-500"
              >
                {m.cta}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Landing;
