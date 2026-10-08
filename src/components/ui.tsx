import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface-1 p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-lg font-semibold text-ink">{children}</h2>;
}

export function Stat({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <Card>
      <div className="text-sm text-ink-2">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {help && <div className="mt-1 text-xs text-ink-3">{help}</div>}
    </Card>
  );
}

/** Progress meter: accent fill on a lighter track of the same hue. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      title={label}
      className="h-3 w-full overflow-hidden rounded-full bg-accent-track"
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Notice({ kind, children }: { kind: "warning" | "error"; children: ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-lg border border-line px-4 py-3 text-sm text-ink ${kind === "error" ? "bg-error-bg" : "bg-notice"}`}
    >
      {children}
    </div>
  );
}
