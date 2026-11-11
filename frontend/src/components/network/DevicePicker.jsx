import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { logSearchClick, useSearchSuggestions } from "../../api/search";
import { zoneLabel } from "../../lib/format";
import Highlight from "../search/Highlight";
import useDismiss from "../search/useDismiss";

export default function DevicePicker() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [suggestQ, setSuggestQ] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const combo = useRef(null);
  const timer = useRef(null);
  const listId = useId();
  const inputId = useId();

  useEffect(() => () => clearTimeout(timer.current), []);

  const closeList = () => {
    setListOpen(false);
    setActive(-1);
  };
  useDismiss(combo, listOpen, closeList);

  const { data: suggestions = [], isFetching } = useSearchSuggestions(suggestQ);
  const hasText = text.trim() !== "";
  const showList = listOpen && hasText && suggestQ.trim() !== "";

  const onChange = (e) => {
    const value = e.target.value;
    setText(value);
    setListOpen(true);
    setActive(-1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSuggestQ(value), 150);
  };

  const openDevice = (deviceId) => {
    clearTimeout(timer.current);
    closeList();
    logSearchClick(deviceId, { q: [text.trim()] });
    navigate(`/network/devices/${encodeURIComponent(deviceId)}`);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (showList && active >= 0 && active < suggestions.length)
      openDevice(suggestions[active].deviceId);
    else if (suggestions.length > 0 && suggestQ.trim() !== "") openDevice(suggestions[0].deviceId);
    else if (hasText) navigate(`/network/devices/${encodeURIComponent(text.trim())}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" && hasText) {
      e.preventDefault();
      setListOpen(true);
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Escape" && showList) {
      e.preventDefault();
      closeList();
    }
  };

  const optionId = (i) => `${listId}-${i}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <div ref={combo} className="relative">
        <label htmlFor={inputId} className="flex flex-col text-xs text-slate-500">
          Device
        </label>
        <div className="mt-1 flex w-80 items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1 focus-within:border-orange-300">
          <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input
            id={inputId}
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
            placeholder="Search by ID or MAC…"
            className="w-full bg-transparent text-sm text-slate-900 outline-none"
          />
        </div>

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
          </ul>
        )}
      </div>
      <button
        type="submit"
        className="px-3 py-1.5 rounded-md bg-orange-300 text-sm text-slate-900 hover:bg-orange-400 transition-colors"
      >
        Open
      </button>
    </form>
  );
}
