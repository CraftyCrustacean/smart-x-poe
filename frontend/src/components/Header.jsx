import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLive } from "../realtime/liveContext";
import NotificationBell from "./NotificationBell";

function Header() {
  const navigate = useNavigate();

  const onSearch = (e) => {
    e.preventDefault();
    const input = e.currentTarget.elements.q;
    const q = input.value.trim();
    navigate(q ? `/command-stream?${new URLSearchParams({ q })}` : "/command-stream");
    input.value = "";
  };

  return (
    <header className="h-16 px-6 flex items-center justify-between bg-white border-b border-slate-300">
      <form
        role="search"
        onSubmit={onSearch}
        className="flex items-center gap-2 bg-white rounded rounded-full border border-slate-300 px-3 py-2 w-80"
      >
        <Search size={18} className="text-slate-400" aria-hidden="true" />
        <label htmlFor="header-search" className="sr-only">
          Search devices by ID or MAC
        </label>
        <input
          id="header-search"
          name="q"
          type="search"
          placeholder="Search devices by ID or MAC…"
          className="bg-transparent outline-none w-full text-sm"
        />
      </form>

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
