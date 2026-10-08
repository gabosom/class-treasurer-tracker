import { formatMoney } from "@/lib/money";
import { type Dict, type Lang, formatDate } from "@/lib/i18n";
import type { DirectivaView } from "@/lib/views";
import { FundTable } from "./FundTable";
import { Card, Meter, Notice, SectionTitle, Stat } from "./ui";

export function DirectivaDashboard({ v, t, lang }: { v: DirectivaView; t: Dict; lang: Lang }) {
  const $ = (c: number) => formatMoney(c, lang);
  const errors = v.issues.filter((i) => i.severity === "error");
  const receiptLink = (id: string) => `/api/receipt/${encodeURIComponent(id)}`;

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <Notice kind="error">
          {t.problems}: {errors.length}. <a href="#problems" className="underline">↓</a>
        </Notice>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="sm:col-span-1">
          <div className="text-sm text-ink-2">{t.cashInAccount}</div>
          <div className="mt-1 text-3xl font-semibold text-ink">{$(v.treasurerCashCents)}</div>
          <div className="mt-1 text-xs text-ink-3">{t.cashHelp}</div>
          {v.treasurerCashCents < 0 && (
            <div className="mt-2 text-sm font-medium text-ink">⚠ {t.treasurerFronted($(-v.treasurerCashCents))}</div>
          )}
        </Card>
        <Stat label={t.classPot} value={$(v.families.pots.class)} />
        <Stat label={t.eventsPot} value={$(v.families.pots.events)} />
      </div>

      {/* Pending reimbursements: what the class owes to parents who paid for things */}
      <Card>
        <SectionTitle>
          {t.pendingTitle} · {$(v.families.pendingReimbursementsCents)}
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
        <div className="space-y-3">
          {v.funds
            .filter((f) => f.type !== "events_pool")
            .map((f) => (
              <details key={f.id} className="group rounded-xl border border-line bg-surface-1" open={f.type === "class"}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4 sm:p-5">
                  <span className="font-semibold text-ink">
                    <span aria-hidden className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>
                    {f.name}
                    <span className="ml-2 text-xs font-normal text-ink-3">{f.id}</span>
                  </span>
                  <span className="text-sm text-ink-2">
                    {$(f.collectedCents)} / {$(f.expectedCents)} · {t.balance} {$(f.balanceCents)}
                    {f.status === "closed" && ` · ${t.closed}`}
                  </span>
                </summary>
                <div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
                  {f.expectedCents > 0 && (
                    <Meter value={f.collectedCents} max={f.expectedCents} label={`${$(f.collectedCents)} / ${$(f.expectedCents)}`} />
                  )}
                  <p className="text-sm text-ink-2">
                    {t.price}: {f.priceCents === null ? "—" : $(f.priceCents)}
                    {f.totalCostCents !== null && ` · ${t.totalCost}: ${$(f.totalCostCents)}`}
                  </p>
                  {f.notes && <p className="text-sm text-ink-3">{f.notes}</p>}
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
        <SectionTitle>{t.ledger}</SectionTitle>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-2">
                <th className="px-4 py-2 font-medium sm:px-2">ID</th>
                <th className="px-2 py-2 font-medium">{t.date}</th>
                <th className="px-2 py-2 font-medium">{t.type}</th>
                <th className="px-2 py-2 font-medium">{t.fund}</th>
                <th className="px-2 py-2 font-medium">{t.who}</th>
                <th className="px-2 py-2 text-right font-medium">{t.amount}</th>
                <th className="px-4 py-2 font-medium sm:px-2">{t.notes}</th>
              </tr>
            </thead>
            <tbody>
              {v.txns.map((x) => {
                const student = x.studentId
                  ? v.funds.flatMap((f) => f.lines).find((l) => l.studentId === x.studentId)?.studentName ?? x.studentId
                  : "";
                const who =
                  x.type === "expense"
                    ? `${x.payee} (${t.paidBy}: ${x.paidBy.toLowerCase() === "treasurer" ? t.treasurer : x.paidBy})`
                    : student || x.payee;
                return (
                  <tr key={x.id} className="border-b border-line align-top last:border-0">
                    <td className="px-4 py-2 text-ink-3 sm:px-2">{x.id}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-ink-2">{formatDate(x.date, lang)}</td>
                    <td className="px-2 py-2 text-ink">{t.txnType[x.type] ?? x.type}</td>
                    <td className="px-2 py-2 text-ink-2">{x.fundName}</td>
                    <td className="px-2 py-2 text-ink">
                      {who}
                      {x.receiptFileId && (
                        <>
                          {" · "}
                          <a href={receiptLink(x.receiptFileId)} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                            {t.receipt}
                          </a>
                        </>
                      )}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-ink">{$(x.amountCents)}</td>
                    <td className="px-4 py-2 text-ink-3 sm:px-2">{[x.publicDesc, x.privateNotes].filter(Boolean).join(" · ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
