import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const pipeline = [
  {
    title: "Simulated in Python",
    description:
      "A Python simulator generates sensor readings for devices along real South African pipelines whos data was provided by www.arcgis.com. 1200 devices are simulated, each providing either environmental readings, actuator state, or flow rate readings.",
  },
  {
    title: "Sent over MQTT",
    description:
      "Readings are published to a Mosquitto MQTT broker, mimicking the way real devices would send their data to a central broker.",
  },
  {
    title: "Processed in the backend",
    description:
      "The ASP.NET Core backend subscribes to the broker, decomposes the data into packets, and serves it to this dashboard.",
  },
];

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
    description: "Watch live telemetry and issue override commands.",
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
    <div className="min-h-full flex flex-col">
      <div className="flex-1 flex flex-col justify-center w-full max-w-[calc((100%_+_64rem)_/_2)] mx-auto">
        <h1 className="text-5xl font-bold text-center text-white text-shadow-lg/40">
          Welcome to Smart-X
        </h1>
        <p className="mt-3 mb-8 text-xl font-medium text-center text-white text-shadow-md/40">
          Monitor and manage a simulated pipeline sensor network based on real
          South African pipes.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((m) => (
            <div
              key={m.title}
              className={`bg-white border border-slate-300 rounded-lg p-6 min-h-64 flex flex-col ${
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

        <section className="bg-white border border-slate-300 rounded-lg p-6 mt-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            About Smart-X
          </h2>
          <p className="text-slate-500 text-sm mb-5">
            No physical sensors are involved. The data you see is simulated and
            moved through the system as follows:
          </p>
          <ol className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start">
            {pipeline.map((step, i) => (
              <li key={step.title} className="contents">
                {i > 0 && (
                  <ChevronRight
                    size={20}
                    strokeWidth={1}
                    aria-hidden="true"
                    className="hidden md:block self-center text-orange-400"
                  />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="text-slate-500 text-sm">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

export default Landing;
