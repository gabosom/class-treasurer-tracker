import type { Cell } from "./schema";

/** Parses a Sheets cell into integer cents. Returns null for blank, NaN for unparseable. */
export function toCents(cell: Cell): number | null {
  if (cell === null || cell === undefined || cell === "") return null;
  if (typeof cell === "number") return Math.round(cell * 100);
  if (typeof cell === "boolean") return NaN;
  const cleaned = cell.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return NaN;
  return Math.round(parseFloat(cleaned) * 100);
}

export function formatMoney(cents: number, lang: "es" | "en" = "es"): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const s = (abs / 100).toLocaleString(lang === "es" ? "es-US" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${s}`;
}

/** Accepts YYYY-MM-DD or M/D/YYYY; returns YYYY-MM-DD or null. */
export function toIsoDate(cell: Cell): string | null {
  if (cell === null || cell === undefined || cell === "") return null;
  const s = String(cell).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return iso(+m[3], +m[1], +m[2]);
  return null;
}

function iso(y: number, mo: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysBetween(fromIso: string, to: Date): number {
  const from = Date.parse(fromIso + "T00:00:00Z");
  const today = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.max(0, Math.round((today - from) / 86_400_000));
}
