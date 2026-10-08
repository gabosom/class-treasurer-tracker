import type { BudgetScenario, EventBudget } from "@/lib/budget";
import type { Dict, Lang } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";

/** Event budget: confirmed families vs. max (if unconfirmed families also attend). Directiva only. */
export function BudgetCard({ b, t, lang }: { b: EventBudget; t: Dict; lang: Lang }) {
  const $ = (c: number) => formatMoney(c, lang);
  const T = t.budget;
  const showMax = b.unresolvedFamilies > 0;
  const cols: [string, BudgetScenario][] = showMax
    ? [[T.confirmed, b.confirmed], [T.max, b.max]]
    : [[T.confirmed, b.confirmed]];

  type Row = { label: string; value: (s: BudgetScenario) => string; strong?: boolean; help?: string };
  const section = (title: string, rows: Row[]) => (
    <>
      <tr>
        <th colSpan={cols.length + 1} className="pt-3 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
          {title}
        </th>
      </tr>
      {rows.map((r) => (
        <tr key={r.label} className={r.strong ? "border-t border-line" : ""}>
          <td className={`py-1 pr-3 ${r.strong ? "font-medium text-ink" : "text-ink-2"}`}>
            {r.label}
            {r.help && <div className="text-xs font-normal text-ink-3">{r.help}</div>}
          </td>
          {cols.map(([name, s]) => (
            <td key={name} className={`num whitespace-nowrap py-1 pl-2 text-right align-top sm:pl-3 ${r.strong ? "font-semibold text-ink" : "text-ink"}`}>
              {r.value(s)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  const signed = (c: number | null) => (c === null ? "—" : `${c > 0 ? "+" : ""}${$(c)}`);
  const kidP = $(b.revenuePerKidCents);
  const adultP = $(b.revenuePerAdultCents);

  return (
    <div className="rounded-lg border border-line bg-surface-0 p-3 sm:p-4">
      <h4 className="font-semibold text-ink">{T.title}</h4>
      <div>
        {/* No min-width: labels wrap so both columns fit on a phone. */}
        <table className="w-full text-[13px] sm:text-sm">
          <thead>
            <tr className="text-ink-2">
              <th />
              {cols.map(([name, s]) => (
                <th key={name} className="w-[30%] pl-2 text-right align-bottom font-medium sm:w-auto sm:pl-3">
                  {name}
                  <div className="text-xs font-normal text-ink-3">
                    {T.kidsAdults(s.families, s.kids, s.adults)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section(T.revenue, [
              { label: T.revenueKids(kidP), value: (s) => $(s.revenueKidsCents) },
              { label: T.revenueAdults(adultP), value: (s) => $(s.revenueAdultsCents) },
              { label: T.revenueTotal, value: (s) => $(s.revenueCents), strong: true },
            ])}
            {section(T.costs, [
              { label: T.venueKids($(b.venuePerKidCents)), value: (s) => $(s.venueKidsCents) },
              { label: T.venueAdults($(b.venuePerAdultCents)), value: (s) => $(s.venueAdultsCents) },
              { label: T.venueFlat, value: (s) => $(s.venueFlatFeeCents) },
              { label: T.venueSubtotal, value: (s) => $(s.venueSubtotalCents), strong: true },
              { label: T.drinks, value: (s) => (s.drinksCents === null ? "—" : $(s.drinksCents)), help: T.drinksHelp },
            ])}
            {section(T.result, [
              { label: T.totalCost, value: () => (b.totalCostCents === null ? "—" : $(b.totalCostCents)) },
              {
                label: `${T.surplus} / ${T.deficit.toLowerCase()}`,
                value: (s) => signed(s.surplusCents),
                strong: true,
              },
            ])}
          </tbody>
        </table>
      </div>
      {showMax && (
        <p className="mt-2 text-xs text-ink-3">
          {T.maxAssumption(b.unresolvedFamilies, b.assumedPerFamily.kids, b.assumedPerFamily.adults)}
        </p>
      )}
    </div>
  );
}
