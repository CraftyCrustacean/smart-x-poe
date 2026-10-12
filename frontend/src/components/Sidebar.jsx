import { Link, NavLink } from "react-router-dom";
import smartx_logo from "../assets/smartx_logo.svg";
import { useEffect, useId, useState } from "react";
import {
  Activity,
  ChevronDown,
  Gauge,
  Network,
  RadioTower,
  Shrimp,
} from "lucide-react";

function ModuleSection({
  title,
  children,
  disabled = false,
  defaultOpen = false,
}) {
  const storageKey = `sidebar-open:${title}`;
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === null ? defaultOpen : stored === "true";
    } catch {
      return defaultOpen;
    }
  });
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
      {open && (
        <div id={contentId} className="flex flex-col gap-2">
          {children}
        </div>
      )}
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
        <ModuleSection title="Sensor Data Ingestion and Telemetry">
          <NavItem to="/devices" icon={RadioTower} label="Device Details" />
          {/* Timothy the shrimp bless these apis please */}
          <NavItem to="/feature" icon={Shrimp} label="Feature Demo" />
        </ModuleSection>

        <ModuleSection title="Real Time Command Stream">
          <NavItem to="/telemetry" icon={Gauge} label="Telemetry Dashboard" />
          <NavItem
            to="/command-stream"
            icon={Activity}
            label="Command Stream"
          />
        </ModuleSection>

        <ModuleSection
          title="Network Topology and Mesh Routing (Coming Soon)"
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
