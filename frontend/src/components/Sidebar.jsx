import { Link, NavLink } from "react-router-dom";
import smartx_logo from "../assets/smartx_logo.svg";
import { useEffect, useId, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  RotateCcwClock,
  ChevronDown,
  Gauge,
  Network,
  RadioTower,
  Shrimp,
} from "lucide-react";

function ModuleSection({
  id,
  title,
  paths = [],
  children,
  disabled = false,
  defaultOpen = false,
}) {
  const storageKey = `sidebar-open:${id}`;
  const { pathname } = useLocation();
  const containsActive = paths.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const [open, setOpen] = useState(() => {
    if (containsActive) return true;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === null ? defaultOpen : stored === "true";
    } catch {
      return defaultOpen;
    }
  });

  const [prevContainsActive, setPrevContainsActive] = useState(containsActive);
  if (containsActive !== prevContainsActive) {
    setPrevContainsActive(containsActive);
    if (containsActive) setOpen(true);
  }

  const contentId = useId();

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(open));
    } catch {
      // If can store in localStorage, just don't persist the state.
    }
  }, [storageKey, open]);

  return (
    <section className={disabled ? "opacity-60" : ""}>
      <h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={contentId}
          className="mb-1 flex w-full items-center justify-between gap-2 px-3 py-1 rounded border border-transparent text-left text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-orange-100"
        >
          <span>{title}</span>
          <ChevronDown
            size={14}
            strokeWidth={1}
            aria-hidden="true"
            className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
          />
        </button>
      </h2>
      <div
        id={contentId}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded border border-transparent transition-colors ${
          isActive
            ? "bg-orange-100 text-slate-900"
            : "hover:border-orange-200 hover:bg-orange-50 text-slate-600 "
        }`
      }
    >
      <Icon size={18} strokeWidth={1} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

function DisabledNavItem({ icon: Icon, label, note }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded border border-transparent text-slate-500 cursor-not-allowed">
      <Icon size={18} strokeWidth={1} aria-hidden="true" />
      <span className="flex flex-col">
        <span>{label}</span>
        <span className="text-xs">{note}</span>
      </span>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-white text-slate-900 flex flex-col border-r border-slate-300">
      <Link
        to="/"
        className="h-20 px-4 flex items-center gap-2 border-b border-slate-300"
      >
        <img src={smartx_logo} alt="Smart-X logo" className="h-10 w-auto" />
        <span className="text-3xl font-bold">Smart-X</span>
      </Link>
      <nav className="flex flex-col gap-5 p-3">
        <ModuleSection
          id="telemetry"
          title="Sensor Data Ingestion and Telemetry"
          paths={["/devices", "/feature"]}
        >
          <NavItem to="/devices" icon={RadioTower} label="Device Details" />
          {/* Timothy the shrimp bless these apis please */}
          <NavItem to="/feature" icon={Shrimp} label="Feature Demo" />
        </ModuleSection>

        <ModuleSection
          id="command-stream"
          title="Real-Time Command Stream and History"
          paths={["/command-stream"]}
        >
          <NavItem to="/command-stream" icon={Gauge} label="Command Stream" />

          <NavItem
            to="/command-history"
            icon={RotateCcwClock}
            label="Command History"
          />
        </ModuleSection>

        <ModuleSection
          id="topology"
          title="Network Topology and Mesh Routing"
          disabled
        >
          <DisabledNavItem
            icon={Network}
            label="Topology"
            note="Available in the final PoE"
          />
        </ModuleSection>
      </nav>
    </aside>
  );
}

export default Sidebar;
