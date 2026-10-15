import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Funnel, Search } from "lucide-react";
import { logSearchClick, useSearchSuggestions } from "../../api/search";
import { zoneLabel } from "../../lib/format";
import { activeFilters, FILTER_KEYS } from "../../lib/search";
import SearchFilters from "./SearchFilters";
import useSearchParamsState from "./useSearchParamsState";

const normalise = (s) => s.replace(/[\s:-]/g, "").toUpperCase();

function Highlight({ id, q }) {
  const needle = normalise(q);
  const positions = [];
  let norm = "";
  for (let i = 0; i < id.length; i++) {
    if (/[\s:-]/.test(id[i])) continue;
    positions.push(i);
    norm += id[i].toUpperCase();
  }
  const at = needle ? norm.indexOf(needle) : -1;
  if (at < 0) return id;
  const start = positions[at];
  const end = positions[at + needle.length - 1] + 1;
  return (
    <>
      {id.slice(0, start)}
      <mark className="bg-orange-100 text-slate-900 rounded-sm">{id.slice(start, end)}</mark>
      {id.slice(end)}
    </>
  );
}

function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!ref.current?.contains(e.target)) onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [ref, open, onClose]);
}

export default function HeaderSearch() {
  const navigate = useNavigate();
  const { params, update, onSearchPage } = useSearchParamsState();

  const urlQ = params.get("q") ?? "";
  const [text, setText] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setText(urlQ);
  }

  const [suggestQ, setSuggestQ] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const combo = useRef(null);
  const listId = useId();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = useRef(null);
  const filterButton = useRef(null);
  const panelId = useId();

  const queryTimer = useRef(null);
  const suggestTimer = useRef(null);
  const clearTimers = () => {
    clearTimeout(queryTimer.current);
    clearTimeout(suggestTimer.current);
  };
  useEffect(() => clearTimers, [onSearchPage]);

  const closeList = () => {
    setListOpen(false);
    setActive(-1);
  };
  useDismiss(combo, listOpen, closeList);
  useDismiss(filters, filtersOpen, () => setFiltersOpen(false));

  const { data: suggestions = [], isFetching } = useSearchSuggestions(suggestQ);
  const hasText = text.trim() !== "";
  const showList = listOpen && hasText && suggestQ.trim() !== "";
  const optionCount = suggestions.length + 1;

  const onChange = (e) => {
    const value = e.target.value;
    setText(value);
    setListOpen(true);
    setActive(-1);
    clearTimers();
    suggestTimer.current = setTimeout(() => setSuggestQ(value), 150);
    if (onSearchPage) queryTimer.current = setTimeout(() => update({ q: value }), 300);
  };

  const showAll = () => {
    clearTimers();
    closeList();
    update({ q: hasText ? text : null });
  };

  const openDevice = (deviceId) => {
    clearTimers();
    closeList();
    logSearchClick(deviceId, { q: [text.trim()] });
    setText("");
    setSuggestQ("");
    navigate(`/devices/${deviceId}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" && hasText) {
      e.preventDefault();
      setListOpen(true);
      setActive((a) => Math.min(a + 1, optionCount - 1));
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter" && showList && active >= 0 && active < suggestions.length) {
      e.preventDefault();
      openDevice(suggestions[active].deviceId);
    } else if (e.key === "Escape" && showList) {
      e.preventDefault();
      closeList();
    }
  };

  const filterCount = activeFilters(params, FILTER_KEYS.filter((k) => k !== "q")).length;
  const optionId = (i) => `${listId}-${i}`;

  return (
    <div className="flex items-center gap-2">
      <div ref={combo} className="relative">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            showAll();
          }}
          className="flex items-center gap-2 bg-white rounded-full border border-slate-300 px-3 py-2 w-80 focus-within:border-orange-300"
        >
          <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
          <label htmlFor="header-search" className="sr-only">
            Search devices by ID or MAC
          </label>
          <input
            id="header-search"
            type="search"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
            value={text}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={() => hasText && setListOpen(true)}
            placeholder="Search devices by ID or MAC…"
            className="bg-transparent outline-none w-full text-sm"
          />
        </form>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Matching devices"
            className="absolute left-0 top-full z-40 mt-2 w-96 overflow-hidden rounded-lg border border-slate-300 bg-white py-1 shadow-lg"
          >
            {suggestions.length === 0 && !isFetching && (
              <li className="px-3 py-2 text-sm text-slate-500">No matching devices</li>
            )}
            {suggestions.map((s, i) => (
              <li
                key={s.deviceId}
                id={optionId(i)}
                role="option"
                aria-selected={active === i}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => openDevice(s.deviceId)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                  active === i ? "bg-orange-50" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    s.inAlert ? "bg-red-500" : s.offline ? "bg-slate-300" : "bg-green-500"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-slate-900">
                    <Highlight id={s.deviceId} q={suggestQ} />
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {s.category} · {zoneLabel(s.zone)} · {s.subzone}
                    {s.inAlert ? " · In alert" : s.offline ? " · Offline" : ""}
                  </span>
                </span>
              </li>
            ))}
            <li
              id={optionId(suggestions.length)}
              role="option"
              aria-selected={active === suggestions.length}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(suggestions.length)}
              onClick={showAll}
              className={`flex cursor-pointer items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-sm text-orange-700 ${
                active === suggestions.length ? "bg-orange-50" : ""
              }`}
            >
              <span className="truncate">See all results for “{text.trim()}”</span>
              <ArrowRight size={14} aria-hidden="true" className="shrink-0" />
            </li>
          </ul>
        )}
      </div>

      <div ref={filters} className="relative">
        <button
          ref={filterButton}
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && filtersOpen) setFiltersOpen(false);
          }}
          aria-expanded={filtersOpen}
          aria-controls={panelId}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors ${
            filtersOpen || filterCount
              ? "border-orange-300 bg-orange-100 text-slate-900"
              : "border-slate-300 bg-white text-slate-600 hover:bg-orange-50"
          }`}
        >
          <Funnel size={16} strokeWidth={1.5} aria-hidden="true" />
          Filters
          {filterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-xs font-semibold text-white">
              <span className="sr-only">, </span>
              {filterCount}
              <span className="sr-only"> active</span>
            </span>
          )}
        </button>

        {filtersOpen && (
          <div
            id={panelId}
            role="region"
            aria-label="Search filters"
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              setFiltersOpen(false);
              filterButton.current?.focus();
            }}
            className="absolute left-0 top-full z-30 mt-2 w-96 rounded-lg border border-slate-300 bg-white p-4 shadow-lg"
          >
            <SearchFilters params={params} update={update} />
          </div>
        )}
      </div>
    </div>
  );
}
