"use client";

import Link from "next/link";
import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import type { FundExpense } from "@/lib/views";
import { FundTable, type FundTableLine } from "./FundTable";
import { receiptLink } from "./LedgerTable";

export interface FundDetailLabels {
  families: string;
  expenses: string;
  noExpenses: string;
  date: string;
  what: string;
  paidBy: string;
  reimbursement: string;
  amount: string;
  total: string;
  receipt: string;
  treasurer: string;
  reimbursed: string;
  pending: string;
  inKind: string;
  viewInLedger: string;
  table: Parameters<typeof FundTable>[0]["labels"];
}

/** Fund card body: a toggle between the per-family table and the fund's expenses. */
export function FundDetail({
  fundId,
  lines,
  expenses,
  lang,
  labels,
}: {
  fundId: string;
  lines: FundTableLine[];
  expenses: FundExpense[];
  lang: Lang;
  labels: FundDetailLabels;
}) {
  const [tab, setTab] = useState<"families" | "expenses">("families");
  const btn = (on: boolean) =>
    `rounded-md px-3 py-1 text-sm ${on ? "bg-surface-0 font-medium text-ink shadow-sm" : "text-ink-2 hover:text-ink"}`;
  return (
    <div className="space-y-3">
      <div className="inline-flex gap-1 rounded-lg border border-line p-0.5" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "families"} className={btn(tab === "families")} onClick={() => setTab("families")}>
          {labels.families} ({lines.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "expenses"} className={btn(tab === "expenses")} onClick={() => setTab("expenses")}>
          {labels.expenses} ({expenses.length})
        </button>
      </div>
      {tab === "families" ? (
        <FundTable lines={lines} lang={lang} labels={labels.table} />
      ) : (
        <ExpenseTable fundId={fundId} expenses={expenses} lang={lang} labels={labels} />
      )}
    </div>
  );
}

function ExpenseTable({
  fundId,
  expenses,
  lang,
  labels,
}: {
  fundId: string;
  expenses: FundExpense[];
  lang: Lang;
  labels: FundDetailLabels;
}) {
  const $ = (c: number) => formatMoney(c, lang);
  const date = (iso: string) =>
    new Date(iso + "T12:00:00Z").toLocaleDateString(lang === "es" ? "es-US" : "en-US", { day: "numeric", month: "short", timeZone: "UTC" });
  const ledgerLink = (
    <Link href={`/directiva/movimientos?fund=${encodeURIComponent(fundId)}`} className="text-sm text-accent underline underline-offset-2">
      {labels.viewInLedger}
    </Link>
  );
  if (expenses.length === 0)
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink-3">{labels.noExpenses}</p>
        {ledgerLink}
      </div>
    );
  const total = expenses.reduce((a, e) => a + e.amountCents, 0);
  return (
    <div className="space-y-2">
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-2">
              <th className="px-4 py-2 font-medium sm:px-2">{labels.date}</th>
              <th className="px-2 py-2 font-medium">{labels.what}</th>
              <th className="px-2 py-2 font-medium">{labels.paidBy}</th>
              <th className="px-2 py-2 font-medium">{labels.reimbursement}</th>
              <th className="px-4 py-2 text-right font-medium sm:px-2">{labels.amount}</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-line align-top">
                <td className="whitespace-nowrap px-4 py-2 text-ink-2 sm:px-2">{date(e.date)}</td>
                <td className="px-2 py-2 text-ink">
                  {e.payee}
                  {e.publicDesc && <span className="text-ink-2"> · {e.publicDesc}</span>}
                  {e.receiptFileId && (
                    <>
                      {" · "}
                      <a href={receiptLink(e.receiptFileId)} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
                        {labels.receipt}
                      </a>
                    </>
                  )}
                  <div className="text-xs text-ink-3">{e.id}</div>
                </td>
                <td className="px-2 py-2 text-ink">{e.paidBy || labels.treasurer}</td>
                <td className="px-2 py-2 text-ink">
                  <Reimbursement e={e} $={$} labels={labels} />
                </td>
                <td className="num whitespace-nowrap px-4 py-2 text-right text-ink sm:px-2">{$(e.amountCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right font-medium text-ink sm:px-2">
                {labels.total}
              </td>
              <td className="num whitespace-nowrap px-4 py-2 text-right font-semibold text-ink sm:px-2">{$(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="text-right">{ledgerLink}</div>
    </div>
  );
}

/** —, or any of: ✓ reimbursed, en especie, ○ pending. One line each. */
function Reimbursement({ e, $, labels }: { e: FundExpense; $: (c: number) => string; labels: FundDetailLabels }) {
  if (!e.paidBy) return <span className="text-ink-3">—</span>;
  const full = e.pendingCents === 0;
  return (
    <div className="space-y-0.5 whitespace-nowrap">
      {e.reimbursedCents > 0 && (
        <div>
          <span aria-hidden className="text-good">✓</span> {labels.reimbursed}
          {!(full && e.inKindCents === 0) && ` ${$(e.reimbursedCents)}`}
        </div>
      )}
      {e.inKindCents > 0 && (
        <div>
          <span aria-hidden className="text-ink-3">⇄</span> {labels.inKind} {$(e.inKindCents)}
        </div>
      )}
      {e.pendingCents > 0 && (
        <div>
          <span aria-hidden className="text-bad">○</span> {labels.pending} {$(e.pendingCents)}
        </div>
      )}
    </div>
  );
}
