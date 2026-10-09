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
  const planned = b.confirmed.totalCostCents;
  const mismatch = b.fundTotalCostCents !== null && planned !== null && b.fundTotalCostCents !== planned;

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
              { label: T.revenueKids(price(b.revenuePerKidCents)), value: (s) => s.revenueKidsCents },
              { label: T.revenueAdults(price(b.revenuePerAdultCents)), value: (s) => s.revenueAdultsCents },
              { label: T.revenueTotal, value: (s) => s.revenueCents, strong: true },
            ])}
            {section(T.costs, [
              { label: T.venueKids(price(b.venuePerKidCents)), value: (s) => s.venueKidsCents },
              { label: T.venueAdults(price(b.venuePerAdultCents)), value: (s) => s.venueAdultsCents },
              { label: T.venueFlat, value: (s) => s.venueFlatFeeCents },
              { label: T.venueSubtotal, value: (s) => s.venueSubtotalCents, strong: true },
              { label: T.drinks, value: (s) => s.drinksCents },
              // Subtotal local + bebidas y snacks adicionales = costo total planificado
              { label: T.totalCost, value: (s) => s.totalCostCents, strong: true },
            ])}
          </tbody>
        </table>
      </div>
      {mismatch && <p className="mt-2 text-xs text-ink">⚠ {T.totalMismatch($(b.fundTotalCostCents!))}</p>}
      {b.unreadableRows > 0 && <p className="mt-2 text-xs text-ink">⚠ {T.unreadable(b.unreadableRows)}</p>}
    </div>
  );
}
