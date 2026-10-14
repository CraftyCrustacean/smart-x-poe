const SIZES = {
  md: { group: "text-sm", button: "px-3 py-1" },
  sm: { group: "text-xs", button: "px-2 py-1" },
};

export default function SegmentedToggle({
  label,
  options,
  value,
  onChange,
  size = "md",
}) {
  const s = SIZES[size];
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex rounded-md border border-slate-300 overflow-hidden ${s.group}`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`${s.button} transition-colors disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
            value === o.value
              ? "bg-orange-100 text-slate-900"
              : "bg-white text-slate-600 hover:bg-orange-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
