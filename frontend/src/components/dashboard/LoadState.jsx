export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse motion-reduce:animate-none rounded bg-slate-100 ${className}`}
    />
  );
}

export function Loading({ label, className = "", children }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function ErrorNotice({ message, error, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      <span>
        {message}
        {error?.message && (
          <span className="text-red-600"> ({error.message})</span>
        )}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={() => onRetry()}
          className="rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
