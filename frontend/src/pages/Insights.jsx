import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import {
  useDismissInsight,
  useInsightModel,
  useInsights,
} from "../api/insights";
import {
  actionLabel,
  insightDetail,
  insightTitle,
  scopeLabel,
} from "../lib/insights";
import { METRICS, metricLabel } from "../lib/format";
import CommandDialog from "../components/commands/CommandDialog";
import SegmentedToggle from "../components/dashboard/SegmentedToggle";
import {
  ErrorNotice,
  Loading,
  Skeleton,
} from "../components/dashboard/LoadState";

const headingClass = "text-sm font-bold text-slate-500 uppercase tracking-wide";

const actionButton =
  "rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-orange-100 transition-colors";

function SuggestionItem({ s }) {
  const [staged, setStaged] = useState(false);
  const dismiss = useDismissInsight();
  const title = insightTitle(s);

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-sm text-slate-600">{insightDetail(s)}</p>
          <div className="flex flex-wrap items-center gap-2">
            {s.sources.map((src) => (
              <span
                key={src}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {src}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {s.action === "Inspect" ? (
            <Link to={`/devices/${s.deviceId}`} className={actionButton}>
              Inspect
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStaged(true)}
              className={actionButton}
            >
              Action
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              dismiss.mutate({ id: s.id, triggerVersion: s.triggerVersion })
            }
            disabled={dismiss.isPending}
            aria-label={`Dismiss: ${title}`}
            title="Dismiss until the cause changes"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      {staged && (
        <CommandDialog
          type={s.action}
          target={s.target}
          onClose={() => setStaged(false)}
        />
      )}
    </li>
  );
}

function Feed({ title, hint, items, empty }) {
  return (
    <section className="bg-white border border-slate-300 rounded-lg p-4 space-y-3">
      <div className="pb-2 border-b border-slate-200">
        <h2 className={headingClass}>{title}</h2>
        <p className="text-sm text-slate-500">{hint}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((s) => (
            <SuggestionItem key={s.id} s={s} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LearnedPatterns({ minSupport }) {
  const { data: model = [], isLoading, error, refetch } = useInsightModel();

  return (
    <section className="bg-white border border-slate-300 rounded-lg p-4 space-y-3">
      <div className="pb-2 border-b border-slate-200">
        <h2 className={headingClass}>Learned patterns</h2>
        <p className="text-sm text-slate-500">
          Commands and search clicks are credited to the nearest critical alert
          in the same subzone. Commands are suggested after it has happened{" "}
          {minSupport} times.
        </p>
      </div>
      {isLoading ? (
        <Loading label="Loading learned patterns…" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </Loading>
      ) : error ? (
        <ErrorNotice
          message="Couldn't load learned patterns."
          error={error}
          onRetry={refetch}
        />
      ) : model.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing learned yet.</p>
      ) : (
        <div className="max-h-[36rem] overflow-auto">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">
              Learned responses to each alert type
            </caption>
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500 shadow-[inset_0_-1px_0_var(--color-slate-200)]">
              <tr>
                <th scope="col" className="px-3 py-2">
                  After an alert on
                </th>
                <th scope="col" className="px-3 py-2">
                  Users
                </th>
                <th scope="col" className="px-3 py-2">
                  Times
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {model.map((t) => (
                <tr
                  key={`${t.metric}-${t.action}-${t.scope}`}
                  className={t.count < minSupport ? "text-slate-400" : ""}
                >
                  <th scope="row" className="px-3 py-2 font-normal">
                    {metricLabel(t.metric)}
                  </th>
                  <td className="px-3 py-2">
                    {actionLabel(t.action)} {scopeLabel(t.scope)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {t.count}
                    {t.count < minSupport && (
                      <span className="text-xs"> (needs {minSupport})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const TYPE_OPTIONS = [
  { value: "", label: "All" },
  ...Object.entries(METRICS).map(([value, m]) => ({ value, label: m.label })),
  { value: "Offline", label: "Offline" },
  { value: "Battery", label: "Low battery" },
];

function Insights() {
  const [params, setParams] = useSearchParams();
  const type = params.get("type") ?? "";
  const { data, isLoading, error, refetch } = useInsights(type || null);
  const suggestions = data?.suggestions ?? [];

  const setType = (value) =>
    setParams(
      (p) => {
        if (value) p.set("type", value);
        else p.delete("type");
        return p;
      },
      { replace: true },
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
        <p className="text-slate-500">
          {data
            ? `The top ${data.maxSuggestions} suggestions, updated each batch.`
            : "Suggestions updated each batch."}
        </p>
      </div>

      <SegmentedToggle
        label="Alert type"
        value={type}
        onChange={setType}
        options={TYPE_OPTIONS}
      />

      {isLoading ? (
        <Loading label="Loading suggestions…" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </Loading>
      ) : error ? (
        <ErrorNotice
          message="Couldn't load suggestions."
          error={error}
          onRetry={refetch}
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Feed
              title="Suggested actions"
              hint="Based on what users did after similar alerts."
              items={suggestions.filter((s) => s.kind === "Learned")}
              empty={`Nothing learned yet. A response needs to happen ${data.minSupport} times after the same alert type before its suggested.`}
            />
            <Feed
              title="Automated insights"
              hint="Baseline suggested actions."
              items={suggestions.filter((s) => s.kind === "Rule")}
              empty="Nothing flagged right now."
            />
          </div>
          <LearnedPatterns minSupport={data.minSupport} />
        </>
      )}
    </div>
  );
}

export default Insights;
