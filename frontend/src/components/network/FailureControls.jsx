import { useId, useMemo, useState } from "react";
import { useRestoreFailure, useSetFailure } from "../../api/mesh";
import { ZONE_ORDER, zoneLabel } from "../../lib/format";
import { formatCount } from "../../lib/history";
import { failedGroups, subzonesByZone } from "../../lib/mesh";
import SegmentedToggle from "../dashboard/SegmentedToggle";
import DeviceSuggestInput from "../search/DeviceSuggestInput";

const SCOPES = [
  { value: "subzone", label: "Subzone" },
  { value: "point", label: "Monitoring point" },
  { value: "device", label: "Device" },
];

const SCOPE_HELP = {
  subzone: "Shut off every device in a subzone. Can split the mesh.",
  point: "Three devices at one monitoring point. Use any of their ids.",
  device: "One device. Its siblings at the same point keep relaying.",
};

const inputClass =
  "mt-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900";

export default function FailureControls({ topology, state }) {
  const [scope, setScope] = useState("subzone");
  const [zone, setZone] = useState(ZONE_ORDER[0]);
  const [subzone, setSubzone] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [result, setResult] = useState(null);
  const deviceInputId = useId();

  const fail = useSetFailure();
  const restore = useRestoreFailure();
  const busy = fail.isPending || restore.isPending;

  const subzones = useMemo(() => subzonesByZone(topology.vertices), [topology]);
  const zoneSubzones = subzones[zone] ?? [];
  const chosenSubzone = zoneSubzones.includes(subzone)
    ? subzone
    : (zoneSubzones[0] ?? "");
  const groups = failedGroups(topology.vertices, state.status);
  const failedTotal = state.summary.counts.failed;

  const request = () =>
    scope === "subzone"
      ? { scope, zone, subzone: chosenSubzone }
      : { scope, deviceId: deviceId.trim() };
  const ready =
    scope === "subzone" ? Boolean(chosenSubzone) : Boolean(deviceId.trim());

  const run = (mutation, body, verb) =>
    mutation.mutate(body, {
      onSuccess: (data) =>
        setResult({
          tone: "ok",
          text:
            data.changed === 0
              ? `Nothing to ${verb}: already in that state.`
              : `${verb === "fail" ? "Failed" : "Restored"} ${formatCount(data.changed)} device${data.changed === 1 ? "" : "s"}. ${formatCount(data.summary.counts.cutOff)} now cut off.`,
        }),
      onError: (error) => setResult({ tone: "error", text: error.message }),
    });

  return (
    <div className="space-y-4">
      <SegmentedToggle
        label="What to fail"
        size="sm"
        options={SCOPES}
        value={scope}
        onChange={(value) => {
          setScope(value);
          setResult(null);
        }}
      />
      <p className="text-xs text-slate-500">{SCOPE_HELP[scope]}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) run(fail, request(), "fail");
        }}
        className="flex flex-wrap items-end gap-3"
      >
        {scope === "subzone" ? (
          <>
            <label className="flex flex-col text-xs text-slate-500">
              Pipeline
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className={inputClass}
              >
                {ZONE_ORDER.map((z) => (
                  <option key={z} value={z}>
                    {zoneLabel(z)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-xs text-slate-500">
              Subzone
              <select
                value={chosenSubzone}
                onChange={(e) => setSubzone(e.target.value)}
                className={inputClass}
              >
                {zoneSubzones.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <div className="flex flex-col text-xs text-slate-500">
            <label htmlFor={deviceInputId}>Device ID</label>
            <DeviceSuggestInput
              id={deviceInputId}
              value={deviceId}
              onChange={setDeviceId}
              onSelect={setDeviceId}
              className="mt-1 w-64"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!ready || busy}
          className="px-3 py-1.5 rounded-md bg-red-600 text-sm text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          Simulate failure
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => run(restore, request(), "restore")}
          className="px-3 py-1.5 rounded-md border border-orange-200 bg-white text-sm text-slate-700 hover:bg-orange-100 disabled:opacity-50 transition-colors"
        >
          Restore
        </button>
      </form>

      {result && (
        <p
          role={result.tone === "error" ? "alert" : "status"}
          className={`text-sm ${result.tone === "error" ? "text-red-700" : "text-slate-700"}`}
        >
          {result.text}
        </p>
      )}

      <div className="border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">
            Currently failed: {formatCount(failedTotal)}
          </p>
          {failedTotal > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(restore, {}, "restore")}
              className="px-3 py-1 rounded-md border border-orange-200 bg-white text-xs text-slate-700 hover:bg-orange-100 disabled:opacity-50 transition-colors"
            >
              Restore all
            </button>
          )}
        </div>
        {groups.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {groups.map((g) => (
              <li
                key={`${g.zone}|${g.subzone}`}
                className="flex items-center gap-2"
              >
                <span className="text-slate-700">
                  {zoneLabel(g.zone)} - {g.subzone}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {formatCount(g.count)} device{g.count === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(
                      restore,
                      { scope: "subzone", zone: g.zone, subzone: g.subzone },
                      "restore",
                    )
                  }
                  className="ml-auto text-xs text-slate-600 underline decoration-slate-300 hover:decoration-orange-400 disabled:opacity-50"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
