import { formatMoney } from "@/lib/money";
import { type Dict, type Lang, formatDate } from "@/lib/i18n";
import type { DirectivaView } from "@/lib/views";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { BudgetCard } from "./BudgetCard";
import { PotTiles } from "./FamiliesDashboard";
import { FundDetail } from "./FundDetail";
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
      {/* Pending reimbursements, split by pot (D19): parents who paid for things, plus the treasurer
          when a pot spent more than it has (class fund separate; events pooled). */}
      <PendingCard v={v} t={t} lang={lang} />

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
                    <div className="space-y-1">
                      <p className="text-xs text-ink-2">{t.collectedOf($(f.collectedCents), $(f.expectedCents))}</p>
                      <Meter value={f.collectedCents} max={f.expectedCents} label={t.collectedOf($(f.collectedCents), $(f.expectedCents))} />
                    </div>
                  )}
                  {f.expensesCents > 0 && <SpendMeter f={f} t={t} $={$} />}
                  <p className="text-sm text-ink-2">
                    {f.type === "class"
                      ? `${t.price}: ${f.priceCents === null ? t.tbd : $(f.priceCents)}`
                      : `${t.totalCost}: ${f.totalCostCents === null ? t.tbd : $(f.totalCostCents)}${f.totalCostComputed ? ` (${t.computed})` : ""}`}
                  </p>
                  {f.notes && <p className="text-sm text-ink-3">{f.notes}</p>}
                  {f.budget && <BudgetCard b={f.budget} t={t} lang={lang} />}
                  <FundDetail
                    fundId={f.id}
                    lines={f.lines}
                    expenses={f.expenses}
                    lang={lang}
                    labels={{
                      families: t.budget.families,
                      expenses: t.expenses,
                      noExpenses: t.noExpenses,
                      date: t.date,
                      what: t.what,
                      paidBy: t.paidByCol,
                      reimbursement: t.reimbursementCol,
                      amount: t.amount,
                      total: t.total,
                      receipt: t.receipt,
                      treasurer: t.treasurerName,
                      reimbursed: t.reimbursed,
                      pending: t.pendingLabel,
                      inKind: t.inKind,
                      viewInLedger: t.viewInLedger,
                      table: {
                        all: t.filterAll,
                        pending: t.filterPending,
                        student: t.student,
                        parents: t.parents,
                        due: t.due,
                        paid: t.paid,
                        status: t.status,
                        statusLabel: t.statusLabel,
                      },
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

/** Money in (collected + income) vs. spent; the gap is what's left (the fund balance). */
function SpendMeter({ f, t, $ }: { f: DirectivaView["funds"][number]; t: Dict; $: (c: number) => string }) {
  const inCents = f.collectedCents + f.incomeCents;
  const over = f.expensesCents > inCents;
  const label = over
    ? t.overspent($(f.expensesCents), $(f.expensesCents - inCents))
    : t.spentOf($(f.expensesCents), $(inCents), $(f.balanceCents));
  return (
    <div className="space-y-1">
      <p className={`text-xs ${over ? "text-bad" : "text-ink-2"}`}>
        {over && <span aria-hidden>⚠ </span>}
        {label}
      </p>
      <Meter value={f.expensesCents} max={over ? f.expensesCents : inCents} label={label} tone="neutral" />
    </div>
  );
}

function PendingCard({ v, t, lang }: { v: DirectivaView; t: Dict; lang: Lang }) {
  const $ = (c: number) => formatMoney(c, lang);
  const potOfFund = new Map(v.funds.map((f) => [f.id, f.type === "class" ? "class" : "events"]));
  const sections = (["class", "events"] as const).map((pot) => {
    const parents = v.pending
      .map((p) => {
        const expenses = p.expenses.filter((e) => potOfFund.get(e.txn.fundId) === pot);
        return { name: p.name, expenses, totalCents: expenses.reduce((a, e) => a + e.remainingCents, 0) };
      })
      .filter((p) => p.expenses.length > 0);
    const treasurerCents = v.owedToTreasurer.find((x) => x.pot === pot)?.cents ?? 0;
    const totalCents = treasurerCents + parents.reduce((a, p) => a + p.totalCents, 0);
    return { pot, parents, treasurerCents, totalCents };
  });
  const total = sections.reduce((a, s) => a + s.totalCents, 0);
  const row = (label: string, cents: number, detail: ReactNode) => (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-ink">{label}</span>
        <span className="num font-semibold text-ink">{$(cents)}</span>
      </div>
      {detail}
    </li>
  );
  return (
    <Card>
      <div id="pending" />
      <SectionTitle>
        {t.pendingTitle} · {$(total)}
      </SectionTitle>
      {total === 0 ? (
        <p className="text-sm text-ink-3">{t.noPending}</p>
      ) : (
        <div className="space-y-5">
          {sections
            .filter((s) => s.totalCents > 0)
            .map((s) => (
              <div key={s.pot}>
                <h3 className="mb-2 flex justify-between border-b border-line pb-1 text-xs font-semibold uppercase tracking-wide text-ink-3">
                  <span>{s.pot === "class" ? t.classPot : t.eventsPot}</span>
                  <span className="num">{$(s.totalCents)}</span>
                </h3>
                <ul className="space-y-4">
                  {s.treasurerCents > 0 &&
                    row(t.owedToTreasurerRow, s.treasurerCents, <p className="mt-1 text-sm text-ink-2">{t.treasurerFrontedHelp}</p>)}
                  {s.parents.map((p) => (
                    <Fragment key={p.name}>
                      {row(
                        `${t.owedTo} ${p.name}`,
                        p.totalCents,
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
                        </ul>,
                      )}
                    </Fragment>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}
