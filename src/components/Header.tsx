import Link from "next/link";
import { isDemo } from "@/lib/data";
import type { Dict, Lang } from "@/lib/i18n";
import { LanguageSelect, RefreshButton } from "./client";

export function Header({
  t,
  lang,
  fetchedAt,
  active,
  showNav,
}: {
  t: Dict;
  lang: Lang;
  fetchedAt?: string;
  active?: "families" | "directiva";
  showNav?: boolean;
}) {
  const updated = fetchedAt
    ? new Date(fetchedAt).toLocaleString(lang === "es" ? "es-US" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Los_Angeles",
      })
    : null;
  const link = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`rounded-md px-2 py-1 text-sm ${on ? "bg-surface-1 font-medium text-ink" : "text-ink-2 hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="border-b border-line">
      {isDemo() && (
        <div role="status" className="bg-notice px-4 py-2 text-center text-sm font-medium text-ink">
          {t.demoBanner}
        </div>
      )}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">{t.appTitle}</h1>
          <p className="text-sm text-ink-3">{t.schoolYear}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showNav && (
            <nav className="flex gap-1">
              {link("/", t.familiesView, active === "families")}
              {link("/directiva", t.directiva, active === "directiva")}
            </nav>
          )}
          <LanguageSelect lang={lang} label={t.language} />
        </div>
      </div>
      {updated && (
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 pb-3">
          <span className="text-xs text-ink-3">
            {t.updated}: {updated}
          </span>
          <RefreshButton label={t.refresh} />
        </div>
      )}
    </header>
  );
}
