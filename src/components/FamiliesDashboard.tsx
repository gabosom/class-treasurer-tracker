import { formatMoney } from "@/lib/money";
import { type Dict, type Lang, formatDate } from "@/lib/i18n";
import type { FamiliesView } from "@/lib/views";
import { Card, Meter, SectionTitle, Stat } from "./ui";

export function FamiliesDashboard({ v, t, lang }: { v: FamiliesView; t: Dict; lang: Lang }) {
  const $ = (c: number) => formatMoney(c, lang);
  const total = v.pots.class + v.pots.events;

  return (
    <div className="space-y-6">
      {/* Hero: the one number this view leads with */}
      <Card>
        <div className="text-sm text-ink-2">{t.available}</div>
        <div className="mt-1 text-5xl font-semibold tracking-tight text-ink">{$(total)}</div>
        <div className="mt-1 text-sm text-ink-3">{t.availableHelp}</div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t.classPot} value={$(v.pots.class)} />
        <Stat label={t.eventsPot} value={$(v.pots.events)} help={t.eventsPotHelp} />
        <Stat label={t.pendingReimb} value={$(v.pendingReimbursementsCents)} help={t.pendingReimbHelp} />
      </div>

      {v.classFunds.map((f) => (
        <Card key={f.id}>
          <SectionTitle>{f.name}</SectionTitle>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="text-2xl font-semibold text-ink">{$(f.collectedCents)}</span>{" "}
              <span className="text-sm text-ink-2">{t.raised}</span>
            </div>
            {f.goalCents > 0 && (
              <div className="text-sm text-ink-2">
                {t.goal}: <span className="font-medium text-ink">{$(f.goalCents)}</span>
              </div>
            )}
          </div>
          {f.goalCents > 0 && (
            <Meter value={f.collectedCents} max={f.goalCents} label={`${$(f.collectedCents)} / ${$(f.goalCents)}`} />
          )}
          {f.payingCount > 0 && <p className="mt-2 text-sm text-ink-2">{t.studentsPaid(f.paidCount, f.payingCount)}</p>}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-2">{t.spent}</dt>
              <dd className="num font-medium text-ink">{$(f.spentCents)}</dd>
            </div>
            <div>
              <dt className="text-ink-2">{t.balance}</dt>
              <dd className="num font-medium text-ink">{$(f.balanceCents)}</dd>
            </div>
          </dl>
          {f.notes && <p className="mt-3 text-sm text-ink-3">{f.notes}</p>}
        </Card>
      ))}

      <section>
        <SectionTitle>{t.events}</SectionTitle>
        {v.events.length === 0 ? (
          <p className="text-sm text-ink-3">{t.noEvents}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {v.events.map((e) => (
              <Card key={e.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-ink">{e.name}</h3>
                    <p className="text-sm text-ink-3">{formatDate(e.date, lang)}</p>
                  </div>
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-2">
                    {e.status === "closed" ? t.closed : t.open}
                  </span>
                </div>
                {e.totalCostCents !== null && e.totalCostCents > 0 && (
                  <div className="mt-3">
                    <Meter
                      value={e.collectedCents}
                      max={e.totalCostCents}
                      label={`${$(e.collectedCents)} / ${$(e.totalCostCents)}`}
                    />
                  </div>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <Row label={t.totalCost} value={e.totalCostCents === null ? "—" : $(e.totalCostCents)} />
                  <Row label={t.collected} value={$(e.collectedCents)} />
                  <Row label={t.spent} value={$(e.spentCents)} />
                  <Row label={e.balanceCents < 0 ? t.shortfall : t.balance} value={$(e.balanceCents)} />
                </dl>
                {e.movedToPoolCents !== 0 && (
                  <p className="mt-2 text-sm text-ink-2">
                    {e.movedToPoolCents > 0 ? t.movedToPool : t.coveredByPool}:{" "}
                    <span className="num font-medium text-ink">{$(Math.abs(e.movedToPoolCents))}</span>
                  </p>
                )}
                {e.notes && (
                  <p className="mt-3 text-sm text-ink-3">
                    <span className="text-ink-2">{t.howCalculated}: </span>
                    {e.notes}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
        <p className="mt-3 text-sm text-ink-2">
          {t.poolLine}: <span className="num font-medium text-ink">{$(v.eventsPoolCents)}</span> · {t.poolLineHelp}
        </p>
      </section>

      <Card>
        <SectionTitle>{t.expenses}</SectionTitle>
        {v.expenses.length === 0 ? (
          <p className="text-sm text-ink-3">{t.noExpenses}</p>
        ) : (
          <>
          {/* Phones: stacked rows so the amount is always visible */}
          <ul className="divide-y divide-line sm:hidden">
            {v.expenses.map((x) => (
              <li key={x.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="text-ink">{x.description || "—"}</div>
                  <div className="text-xs text-ink-3">
                    {formatDate(x.date, lang)} · {x.fundName}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="num text-ink">{$(x.amountCents)}</div>
                  {x.receiptFileId ? (
                    <a
                      href={`/api/receipt/${encodeURIComponent(x.receiptFileId)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent underline underline-offset-2"
                    >
                      {t.receipt}
                    </a>
                  ) : (
                    <span className="text-xs text-ink-3">{t.noReceipt}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-2">
                  <th className="px-4 py-2 font-medium sm:px-2">{t.date}</th>
                  <th className="px-2 py-2 font-medium">{t.description}</th>
                  <th className="px-2 py-2 font-medium">{t.fund}</th>
                  <th className="px-2 py-2 text-right font-medium">{t.amount}</th>
                  <th className="px-4 py-2 font-medium sm:px-2">{t.receipt}</th>
                </tr>
              </thead>
              <tbody>
                {v.expenses.map((x) => (
                  <tr key={x.id} className="border-b border-line last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 text-ink-2 sm:px-2">{formatDate(x.date, lang)}</td>
                    <td className="px-2 py-2 text-ink">{x.description || "—"}</td>
                    <td className="px-2 py-2 text-ink-2">{x.fundName}</td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-ink">{$(x.amountCents)}</td>
                    <td className="px-4 py-2 sm:px-2">
                      {x.receiptFileId ? (
                        <a
                          href={`/api/receipt/${encodeURIComponent(x.receiptFileId)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent underline underline-offset-2"
                        >
                          {t.viewReceipt}
                        </a>
                      ) : (
                        <span className="text-ink-3">{t.noReceipt}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-2">{label}</dt>
      <dd className="num font-medium text-ink">{value}</dd>
    </div>
  );
}
