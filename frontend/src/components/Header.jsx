import { useLive } from "../realtime/liveContext";
import NotificationBell from "./NotificationBell";
import HeaderSearch from "./search/HeaderSearch";

function Header() {
  return (
    <header className="h-16 px-6 flex items-center justify-between bg-white border-b border-slate-300">
      <HeaderSearch />

      <div className="flex items-center gap-4">
        <LiveIndicator />
        <NotificationBell />
      </div>
    </header>
  );
}

const STATUS = {
  connected: { label: "Live", dot: "bg-green-500" },
  connecting: { label: "Connecting", dot: "bg-amber-400" },
  reconnecting: { label: "Reconnecting", dot: "bg-amber-400 animate-pulse" },
  disconnected: { label: "Offline", dot: "bg-red-500" },
};

function LiveIndicator() {
  const { status } = useLive();
  const { label, dot } = STATUS[status];
  return (
    <span
      className="flex items-center gap-2 text-sm text-slate-600"
      aria-live="polite"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export default Header;
