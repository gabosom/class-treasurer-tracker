import { formatMoney } from "@/lib/money";
import { type Dict, type Lang, formatDate } from "@/lib/i18n";
import type { DirectivaView } from "@/lib/views";
import Link from "next/link";
import { BudgetCard } from "./BudgetCard";
import { PotTiles } from "./FamiliesDashboard";
import { FundTable } from "./FundTable";
import { LedgerTable, receiptLink, studentNameMap } from "./LedgerTable";
import { Card, Meter, Notice, SectionTitle } from "./ui";

const LATEST = 20;

export function DirectivaDashboard({ v, t, lang }: { v: DirectivaView; t: Dict; lang: Lang }) {
  const $ = (c: number) => formatMoney(c, lang);
  const errors = v.issues.filter((i) => i.severity === "error");

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <Notice kind="error">
          {t.problems}: {errors.length}. <a href="#problems" className="underline">↓</a>
        </Notice>
      )}

      <PotTiles v={v.families} t={t} lang={lang} />
      {v.treasurerCashCents < 0 && (
        <Notice kind="warning">⚠ {t.treasurerFronted($(-v.treasurerCashCents))}</Notice>
      )}

      {/* Pending reimbursements: what the class owes to parents who paid for things */}
      <Card>
        <SectionTitle>
          {t.pendingTitle} · {$(v.pendingTotalCents)}
        </SectionTitle>
        {v.pending.length === 0 ? (
          <p className="text-sm text-ink-3">{t.noPending}</p>
        ) : (
          <ul className="space-y-4">
            {v.pending.map((p) => (
              <li key={p.name}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-ink">
                    {t.owedTo} {p.name}
                  </span>
                  <span className="num font-semibold text-ink">{$(p.totalCents)}</span>
                </div>
                <ul className="mt-1 space-y-1 text-sm">
                  {p.expenses.map((e) => (
                    <li key={e.txn.id} className="flex flex-wrap justify-between gap-2 text-ink-2">
                      <span>
                        {formatDate(e.txn.date, lang)} · {e.txn.publicDesc || e.txn.payee} · {e.fundName} ·{" "}
                        <span className={e.daysWaiting > 14 ? "font-medium text-ink" : ""}>
                          {t.days(e.daysWaiting)} {t.waiting}
                        </span>
                        {e.txn.receiptFileId && (
                          <>
                            {" · "}
                            <a href={receiptLink(e.txn.receiptFileId)} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                              {t.receipt}
                            </a>
                          </>
                        )}
                      </span>
                      <span className="num">{$(e.remainingCents)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section>
        <SectionTitle>{t.funds}</SectionTitle>
        {/* All collapsed by default; same alphabetical order in every table. */}
        <div className="space-y-3">
          {v.funds
            .map((f) => (
              <details key={f.id} className="group rounded-xl border border-line bg-surface-1">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4 sm:p-5">
                  <span className="font-semibold text-ink">
                    <span aria-hidden className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>
                    {f.name}
                    <span className="ml-2 text-xs font-normal text-ink-3">{f.id}</span>
                  </span>
                  <span className="text-sm text-ink-2">
                    {$(f.collectedCents)} / {f.costSet ? $(f.expectedCents) : t.tbd} · {t.balance} {$(f.balanceCents)}
                    {f.status === "closed" && ` · ${t.closed}`}
                  </span>
                </summary>
                <div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
                  {f.expectedCents > 0 && (
                    <Meter value={f.collectedCents} max={f.expectedCents} label={`${$(f.collectedCents)} / ${$(f.expectedCents)}`} />
                  )}
                  <p className="text-sm text-ink-2">
                    {f.type === "class"
                      ? `${t.price}: ${f.priceCents === null ? t.tbd : $(f.priceCents)}`
                      : `${t.totalCost}: ${f.totalCostCents === null ? t.tbd : $(f.totalCostCents)}`}
                  </p>
                  {f.notes && <p className="text-sm text-ink-3">{f.notes}</p>}
                  {f.budget && <BudgetCard b={f.budget} t={t} lang={lang} />}
                  <FundTable
                    lines={f.lines}
                    lang={lang}
                    labels={{
                      all: t.filterAll,
                      pending: t.filterPending,
                      student: t.student,
                      parents: t.parents,
                      due: t.due,
                      paid: t.paid,
                      status: t.status,
                      statusLabel: t.statusLabel,
                    }}
                  />
                </div>
              </details>
            ))}
        </div>
      </section>

      <Card>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">
            {t.ledger} <span className="text-sm font-normal text-ink-3">· {t.latestTxns(Math.min(LATEST, v.txns.length))}</span>
          </h2>
          <Link href="/directiva/movimientos" className="text-sm text-accent underline underline-offset-2">
            {t.viewAllTxns} ({v.txns.length})
          </Link>
        </div>
        <LedgerTable txns={v.txns.slice(0, LATEST)} studentNames={studentNameMap(v)} t={t} lang={lang} />
      </Card>

      <Card>
        <div id="problems" />
        <SectionTitle>{t.problems}</SectionTitle>
        {v.issues.length === 0 ? (
          <p className="text-sm text-ink-3">{t.noProblems}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {v.issues.map((i, n) => (
              <li key={n} className="text-ink">
                <span aria-hidden className={i.severity === "error" ? "text-bad" : "text-warn"}>
                  {i.severity === "error" ? "✕" : "!"}
                </span>{" "}
                <span className="font-medium">{i.severity === "error" ? t.error : t.warning}</span>
                {i.row !== null && (
                  <span className="text-ink-3">
                    {" "}
                    ({i.tab}, {t.row} {i.row})
                  </span>
                )}
                : {i.message}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
