import { Search } from "lucide-react";
import { useLive } from "../realtime/liveContext";
import NotificationBell from "./NotificationBell";

function Header() {
  return (
    <header className="h-16 px-6 flex items-center justify-between bg-white border-b border-slate-300">
      <div className="flex items-center gap-2 bg-white rounded rounded-full border border-slate-300 px-3 py-2 w-80">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent outline-none w-full text-sm"
        />
      </div>

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
