import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { withChanges } from "../lib/search";
import { useLive } from "../realtime/liveContext";
import NotificationBell from "./NotificationBell";

function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const onSearchPage = pathname === "/search";

  const urlQ = onSearchPage ? (params.get("q") ?? "") : "";
  const [text, setText] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setText(urlQ);
  }

  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), [onSearchPage]);

  const setQuery = (q) =>
    setParams((prev) => withChanges(prev, { q }), { replace: true });

  const onChange = (e) => {
    const value = e.target.value;
    setText(value);
    if (!onSearchPage) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuery(value), 300);
  };

  const onSearch = (e) => {
    e.preventDefault();
    clearTimeout(timer.current);
    const q = text.trim();
    if (onSearchPage) setQuery(text);
    else navigate(q ? `/search?${new URLSearchParams({ q })}` : "/search");
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
          value={text}
          onChange={onChange}
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
