import { useQuery } from "@tanstack/react-query";

function FeatureDemo() {
  const { data: validation, isLoading: validationLoading } = useQuery({
    queryKey: ["feature-validate"],
    queryFn: () =>
      fetch("http://localhost:8080/api/topology/validate").then((res) =>
        res.json(),
      ),
  });

  const { data: flowRates, isLoading: flowRatesLoading } = useQuery({
    queryKey: ["feature-flowrate"],
    queryFn: () =>
      fetch("http://localhost:8080/api/topology/flowrate").then((res) =>
        res.json(),
      ),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Diagnostics Demo
      </h1>
      <p className="text-slate-500 mb-6">
        Live provision validation and flowrate aggregation, calculated using
        recursive tree traversal and custom operator overloading.
      </p>

      <div className="bg-white border border-slate-300 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Structural Validation
        </h2>
        {validationLoading && <p className="text-slate-500">Loading...</p>}
        {validation && (
          <div>
            <p
              className={
                validation.isValid
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {validation.isValid
                ? "All zones and subzones pass structural validation."
                : `${validation.errors.length} issue(s) found:`}
            </p>
            {!validation.isValid && (
              <ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc list-inside">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-300 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Regional Flow-Rate Aggregation
        </h2>
        {flowRatesLoading && <p className="text-slate-500">Loading...</p>}
        {flowRates && (
          <ul className="divide-y divide-slate-200">
            {flowRates.map((agg, i) => (
              <li key={i} className="py-2 flex gap-2 text-sm">
                <span className="text-slate-900">
                  {agg.locationId || "Region"}:
                </span>
                <span className="text-slate-500">
                  {agg.flowRateTotal?.toFixed(2)} / 40 000  Litres per second
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default FeatureDemo;
