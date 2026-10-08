"use client";

import { useState } from "react";
import type { StudentStatus } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import type { Lang } from "@/lib/i18n";

export interface FundTableLine {
  studentId: string;
  studentName: string;
  parents: { name: string; phone: string; email: string }[];
  attendees: string;
  dueCents: number | null;
  paidCents: number;
  status: StudentStatus;
}

const ICON: Record<StudentStatus, { icon: string; cls: string }> = {
  paid: { icon: "✓", cls: "text-good" },
  partial: { icon: "◐", cls: "text-warn" },
  unpaid: { icon: "○", cls: "text-bad" },
  waived: { icon: "–", cls: "text-ink-3" },
  unset: { icon: "?", cls: "text-warn" },
};

export function FundTable({
  lines,
  lang,
  labels,
}: {
  lines: FundTableLine[];
  lang: Lang;
  labels: {
    all: string;
    pending: string;
    student: string;
    parents: string;
    due: string;
    paid: string;
    status: string;
    statusLabel: Record<StudentStatus, string>;
  };
}) {
  const [onlyPending, setOnlyPending] = useState(false);
  const isPending = (l: FundTableLine) => l.status === "unpaid" || l.status === "partial" || l.status === "unset";
  const shown = onlyPending ? lines.filter(isPending) : lines;
  const pendingCount = lines.filter(isPending).length;
  const $ = (c: number) => formatMoney(c, lang);
  const btn = (on: boolean) =>
    `rounded-md border px-2.5 py-1 text-xs ${on ? "border-accent bg-accent text-white" : "border-line text-ink-2"}`;

  return (
    <div>
      <div className="mb-2 flex gap-2" role="group">
        <button type="button" aria-pressed={!onlyPending} className={btn(!onlyPending)} onClick={() => setOnlyPending(false)}>
          {labels.all} ({lines.length})
        </button>
        <button type="button" aria-pressed={onlyPending} className={btn(onlyPending)} onClick={() => setOnlyPending(true)}>
          {labels.pending} ({pendingCount})
        </button>
      </div>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-2">
              <th className="px-4 py-2 font-medium sm:px-2">{labels.student}</th>
              <th className="px-2 py-2 font-medium">{labels.parents}</th>
              <th className="px-2 py-2 text-right font-medium">{labels.due}</th>
              <th className="px-2 py-2 text-right font-medium">{labels.paid}</th>
              <th className="px-4 py-2 font-medium sm:px-2">{labels.status}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.studentId} className="border-b border-line align-top last:border-0">
                <td className="px-4 py-2 text-ink sm:px-2">
                  {l.studentName}
                  {l.attendees && <div className="text-xs text-ink-3">{l.attendees}</div>}
                </td>
                <td className="px-2 py-2 text-ink-2">
                  {l.parents.map((p, i) => (
                    <div key={i}>
                      {p.name}
                      {p.phone && (
                        <>
                          {" · "}
                          <a className="text-accent" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>
                            {p.phone}
                          </a>
                        </>
                      )}
                    </div>
                  ))}
                </td>
                <td className="num px-2 py-2 text-right text-ink">{l.dueCents === null ? "—" : $(l.dueCents)}</td>
                <td className="num px-2 py-2 text-right text-ink">{$(l.paidCents)}</td>
                <td className="px-4 py-2 sm:px-2">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink">
                    <span aria-hidden className={ICON[l.status].cls}>
                      {ICON[l.status].icon}
                    </span>
                    {labels.statusLabel[l.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
