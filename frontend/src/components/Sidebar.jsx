import { Link, NavLink, useLocation } from "react-router-dom";
import smartx_logo from "../assets/smartx_logo.svg";
import { createContext, useContext, useEffect, useId, useState } from "react";
import {
  RotateCcwClock,
  ChevronDown,
  Gauge,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  RadioTower,
  Shrimp,
} from "lucide-react";

const SidebarCollapsedContext = createContext(false);

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
  const collapsed = useContext(SidebarCollapsedContext);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(open));
    } catch {
      // If can store in localStorage, just don't persist the state.
    }
  }, [storageKey, open]);

  if (collapsed) {
    return (
      <section
        aria-label={title}
        className={`flex flex-col gap-2 pt-3 border-t border-slate-200 first:pt-0 first:border-t-0 ${
          disabled ? "opacity-60" : ""
        }`}
      >
        {children}
      </section>
    );
  }

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
  const collapsed = useContext(SidebarCollapsedContext);

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap font-medium rounded border border-transparent transition-colors ${
          isActive
            ? "bg-orange-100 text-slate-900"
            : "hover:border-orange-200 hover:bg-orange-50 text-slate-600 "
        }`
      }
    >
      <Icon size={18} strokeWidth={1} aria-hidden="true" className="shrink-0" />
      <span className={collapsed ? "sr-only" : ""}>{label}</span>
    </NavLink>
  );
}

function DisabledNavItem({ icon: Icon, label, note }) {
  const collapsed = useContext(SidebarCollapsedContext);

  return (
    <div
      aria-disabled="true"
      title={collapsed ? `${label} (${note})` : undefined}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded border border-transparent text-slate-500 cursor-not-allowed"
    >
      <Icon size={18} strokeWidth={1} aria-hidden="true" className="shrink-0" />
      <span className={collapsed ? "sr-only" : "flex flex-col"}>
        <span>{label}</span>
        <span className="text-xs">{note}</span>
      </span>
    </div>
  );
}

const COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // If can't store in localStorage, just don't persist the state.
    }
  }, [collapsed]);

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <SidebarCollapsedContext.Provider value={collapsed}>
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } shrink-0 h-screen bg-white text-slate-900 border-r border-slate-300 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none`}
      >
        <div className={`${collapsed ? "w-16" : "w-64"} h-full flex flex-col`}>
          <Link
            to="/"
            aria-label={collapsed ? "Smart-X home" : undefined}
            className="h-16 shrink-0 flex items-center gap-2 px-3.5 border-b border-slate-300"
          >
            <img
              src={smartx_logo}
              alt={collapsed ? "" : "Smart-X logo"}
              className="h-10 w-auto shrink-0"
            />
            {!collapsed && <span className="text-3xl font-bold">Smart-X</span>}
          </Link>
          <nav className="flex-1 overflow-y-auto flex flex-col gap-5 p-3">
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
              <NavItem
                to="/command-stream"
                icon={Gauge}
                label="Command Stream"
              />

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
          <div className="shrink-0 p-3 border-t border-slate-300">
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-label={toggleLabel}
              title={toggleLabel}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap rounded border border-transparent text-slate-600 transition-colors hover:border-orange-100"
            >
              <ToggleIcon
                size={18}
                strokeWidth={1}
                aria-hidden="true"
                className="shrink-0"
              />
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
    </SidebarCollapsedContext.Provider>
  );
}

export default Sidebar;
