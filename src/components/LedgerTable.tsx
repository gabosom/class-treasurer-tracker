import { formatMoney } from "@/lib/money";
import { type Dict, type Lang, formatDate } from "@/lib/i18n";
import type { DirectivaView } from "@/lib/views";

export const receiptLink = (id: string) => `/api/receipt/${encodeURIComponent(id)}`;

export function LedgerTable({
  txns,
  studentNames,
  t,
  lang,
}: {
  txns: DirectivaView["txns"];
  studentNames: Map<string, string>;
  t: Dict;
  lang: Lang;
}) {
  const $ = (c: number) => formatMoney(c, lang);
  if (txns.length === 0) return <p className="text-sm text-ink-3">{t.noTxns}</p>;
  return (
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
          {txns.map((x) => {
            const who =
              x.type === "expense"
                ? `${x.payee} (${t.paidBy}: ${x.paidBy.toLowerCase() === "treasurer" ? t.treasurer : x.paidBy})`
                : (x.studentId ? studentNames.get(x.studentId) ?? x.studentId : "") || x.payee;
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
                      <a
                        href={receiptLink(x.receiptFileId)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline underline-offset-2"
                      >
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
  );
}

export function studentNameMap(v: DirectivaView): Map<string, string> {
  return new Map(v.funds.flatMap((f) => f.lines).map((l) => [l.studentId, l.studentName]));
}
