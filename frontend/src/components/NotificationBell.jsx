import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useLive } from "../realtime/liveContext";
import { formatAgo, formatValue, metricLabel, zoneLabel } from "../lib/format";

const alertKey = (a) => `${a.deviceId}-${a.metric}-${a.raisedAtUtc}`;

function NotificationBell() {
  const { recentAlerts, unreadAlerts, markAlertsRead } = useLive();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(() => new Set());
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setHighlighted(
        new Set(recentAlerts.slice(0, unreadAlerts).map(alertKey)),
      );
      markAlertsRead();
    }
    setOpen(!open);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Critical alerts${unreadAlerts ? `, ${unreadAlerts} new` : ""}`}
        className="relative flex rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <Bell size={20} />
        {unreadAlerts > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white tabular-nums"
          >
            {unreadAlerts > 9 ? "9+" : unreadAlerts}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-300 bg-white shadow-lg">
          <h2 className="px-4 py-3 text-sm font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200">
            Critical alerts
          </h2>

          {recentAlerts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              None since you opened the app.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {recentAlerts.map((a) => (
                <li key={alertKey(a)}>
                  <Link
                    to={`/devices/${a.deviceId}`}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-2 text-sm transition-colors hover:bg-orange-50 ${
                      highlighted.has(alertKey(a)) ? "bg-red-50/60" : ""
                    }`}
                  >
                    <span className="block font-medium text-slate-900 truncate">
                      {a.deviceId}
                    </span>
                    <span className="block text-slate-600">
                      {metricLabel(a.metric)}{" "}
                      <span className="font-medium tabular-nums text-red-700">
                        {formatValue(a.metric, a.value)}
                      </span>
                    </span>
                    <span className="block text-xs text-slate-500">
                      {zoneLabel(a.zone)} · {a.subzone} ·{" "}
                      {formatAgo(a.raisedAtUtc)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/command-stream"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-center text-sm text-orange-700 hover:underline border-t border-slate-200"
          >
            View dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
