import type { BudgetScenario, EventBudget } from "@/lib/budget";
import type { Dict, Lang } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";

/** Event budget for the families in Participants (no row = not attending). Directiva only. */
export function BudgetCard({ b, t, lang }: { b: EventBudget; t: Dict; lang: Lang }) {
  const $ = (c: number) => formatMoney(c, lang);
  const T = t.budget;
  const cols: [string, BudgetScenario][] = [[T.confirmed, b.confirmed]];

  // A row whose value is null (its Funds column is blank) is hidden, and so is an empty section.
  type Row = { label: string; value: (s: BudgetScenario) => number | null; strong?: boolean };
  const section = (title: string, rows: Row[]) => {
    const shown = rows.filter((r) => cols.some(([, s]) => r.value(s) !== null));
    if (shown.length === 0) return null;
    return (
      <>
        <tr>
          <th colSpan={cols.length + 1} className="pt-3 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
            {title}
          </th>
        </tr>
        {shown.map((r) => (
          <tr key={r.label} className={r.strong ? "border-t border-line" : ""}>
            <td className={`py-1 pr-3 ${r.strong ? "font-medium text-ink" : "text-ink-2"}`}>{r.label}</td>
            {cols.map(([name, s]) => {
              const v = r.value(s);
              return (
                <td key={name} className={`num whitespace-nowrap py-1 pl-2 text-right align-top sm:pl-3 ${r.strong ? "font-semibold text-ink" : "text-ink"}`}>
                  {v === null ? "—" : $(v)}
                </td>
              );
            })}
          </tr>
        ))}
      </>
    );
  };

  const price = (c: number | null) => (c === null ? "" : $(c));
  const c = b.confirmed;

  return (
    <div className="space-y-2">
      {/* Collapsed by default; the summary keeps the headcount in view. */}
      <details className="group/budget rounded-lg border border-line bg-surface-0">
        <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-x-3 gap-y-1 p-3 sm:px-4">
          <span className="font-semibold text-ink">
            <span aria-hidden className="mr-1 inline-block transition-transform group-open/budget:rotate-90">›</span>
            {T.title}
          </span>
          <span className="ml-auto text-right text-sm text-ink-2">
            {T.confirmed} <span className="text-xs text-ink-3">· {T.kidsAdults(c.families, c.kids, c.adults)}</span>
          </span>
        </summary>
        {/* No min-width: labels wrap so the amounts fit on a phone. */}
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <table className="w-full text-[13px] sm:text-sm">
            <tbody>
              {section(T.revenue, [
                { label: T.revenueKids(price(b.revenuePerKidCents)), value: (s) => s.revenueKidsCents },
                { label: T.revenueAdults(price(b.revenuePerAdultCents)), value: (s) => s.revenueAdultsCents },
                { label: T.revenueTotal, value: (s) => s.revenueCents, strong: true },
              ])}
              {section(T.costs, [
                { label: T.venueKids(price(b.venuePerKidCents)), value: (s) => s.venueKidsCents },
                { label: T.venueAdults(price(b.venuePerAdultCents)), value: (s) => s.venueAdultsCents },
                { label: T.venueFlat, value: (s) => s.venueFlatFeeCents },
                { label: T.venueSubtotal, value: (s) => s.venueSubtotalCents, strong: true },
                {
                  label: !c.drinksIsRemainder ? T.drinks : c.budgetSource === "revenue" ? T.drinksFromRevenue : T.drinksRemainder,
                  value: (s) => s.drinksCents,
                },
                { label: T.unallocated, value: (s) => s.unallocatedCents },
                // D18: a total_cost in Funds is fixed; otherwise venue subtotal + drinks/snacks.
                {
                  label: c.budgetSource === "fixed" ? T.totalFixed : c.budgetSource === "revenue" ? T.totalFromRevenue : T.totalCost,
                  value: (s) => s.totalCostCents,
                  strong: true,
                },
              ])}
            </tbody>
          </table>
        </div>
      </details>
      {/* Warnings stay visible while the budget is collapsed. */}
      {c.overCents > 0 && (
        <p className="text-xs text-bad">⚠ {(c.budgetSource === "revenue" ? T.overRevenue : T.over)($(c.overCents))}</p>
      )}
      {b.unreadableRows > 0 && <p className="text-xs text-ink">⚠ {T.unreadable(b.unreadableRows)}</p>}
    </div>
  );
}
