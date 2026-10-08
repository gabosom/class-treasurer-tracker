import { formatMoney } from "@/lib/money";
import { type Dict, type Lang, formatDate } from "@/lib/i18n";
import type { FamiliesView } from "@/lib/views";
import { Card, Meter, SectionTitle, Stat } from "./ui";

/** The two headline boxes, shared by the families and directiva views. */
export function PotTiles({ v, t, lang }: { v: FamiliesView; t: Dict; lang: Lang }) {
  const $ = (c: number) => formatMoney(c, lang);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Stat label={t.classPot} value={$(v.pots.class)} help={t.classPotHelp} />
      <Stat label={t.eventsPot} value={$(v.pots.events)} help={t.eventsPotHelp} />
    </div>
  );
}

export function FamiliesDashboard({ v, t, lang }: { v: FamiliesView; t: Dict; lang: Lang }) {
  const $ = (c: number) => formatMoney(c, lang);

  return (
    <div className="space-y-6">
      <PotTiles v={v} t={t} lang={lang} />

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
            <Row label={t.spent} value={$(f.spentCents)} />
            <Row label={t.balance} value={$(f.balanceCents)} />
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
                {e.payingCount > 0 && (
                  <p className="mt-2 text-sm text-ink-2">{t.familiesPaid(e.paidCount, e.payingCount)}</p>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <Row label={t.totalCost} value={e.totalCostCents === null ? "—" : $(e.totalCostCents)} />
                  <Row label={t.collected} value={$(e.collectedCents)} />
                  <Row label={t.spent} value={$(e.spentCents)} />
                  <Row
                    label={e.status === "closed" ? (e.balanceCents < 0 ? t.shortfall : t.leftover) : t.balance}
                    value={$(e.balanceCents)}
                  />
                </dl>
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
        {v.events.some((e) => e.status === "closed") && (
          <p className="mt-3 text-sm text-ink-2">
            {t.poolLine}: <span className="num font-medium text-ink">{$(v.closedEventsSurplusCents)}</span> ·{" "}
            {t.poolLineHelp}
          </p>
        )}
      </section>

      <Card>
        <SectionTitle>{t.expenses}</SectionTitle>
        {v.expenses.length === 0 ? (
          <p className="text-sm text-ink-3">{t.noExpenses}</p>
        ) : (
          <ul className="divide-y divide-line">
            {v.expenses.map((x) => (
              <li key={x.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="text-ink">{x.description || "—"}</div>
                  <div className="text-xs text-ink-3">
                    {formatDate(x.date, lang)} · {x.fundName}
                  </div>
                </div>
                <div className="num shrink-0 text-ink">{$(x.amountCents)}</div>
              </li>
            ))}
          </ul>
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
