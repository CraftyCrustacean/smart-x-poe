import { useEffect, useId, useRef, useState } from "react";
import { Funnel, Search } from "lucide-react";
import { activeFilters, FILTER_KEYS } from "../../lib/search";
import SearchFilters from "./SearchFilters";
import useSearchParamsState from "./useSearchParamsState";

export default function HeaderSearch() {
  const { params, update, onSearchPage } = useSearchParamsState();
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);
  const button = useRef(null);
  const panelId = useId();

  const urlQ = params.get("q") ?? "";
  const [text, setText] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setText(urlQ);
  }

  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), [onSearchPage]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!wrapper.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onChange = (e) => {
    const value = e.target.value;
    setText(value);
    if (!onSearchPage) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value }), 300);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    clearTimeout(timer.current);
    update({ q: text.trim() ? text : null });
  };

  const filterCount = activeFilters(params, FILTER_KEYS.filter((k) => k !== "q")).length;

  return (
    <div ref={wrapper} className="relative">
      <form
        role="search"
        onSubmit={onSubmit}
        className="flex items-center gap-2 bg-white rounded-full border border-slate-300 pl-3 pr-1 py-1 w-96 focus-within:border-orange-300"
      >
        <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
        <label htmlFor="header-search" className="sr-only">
          Search devices by ID or MAC
        </label>
        <input
          id="header-search"
          type="search"
          value={text}
          onChange={onChange}
          placeholder="Search devices by ID or MAC…"
          className="bg-transparent outline-none w-full text-sm"
        />
        <button
          ref={button}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={filterCount ? `Filters, ${filterCount} active` : "Filters"}
          title="Filters"
          className={`relative shrink-0 rounded-full p-1.5 transition-colors ${
            open || filterCount
              ? "bg-orange-100 text-slate-900"
              : "text-slate-500 hover:bg-orange-50 hover:text-orange-600"
          }`}
        >
          <Funnel size={16} strokeWidth={1.5} aria-hidden="true" />
          {filterCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white"
            >
              {filterCount}
            </span>
          )}
        </button>
      </form>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Search filters"
          className="absolute left-0 top-full z-30 mt-2 w-96 rounded-lg border border-slate-300 bg-white p-4 shadow-lg"
        >
          <SearchFilters params={params} update={update} />
        </div>
      )}
    </div>
  );
}
