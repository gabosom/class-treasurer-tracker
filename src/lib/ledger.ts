import { daysBetween } from "./money";
import { isTreasurer } from "./parse";
import { type Fund, type Issue, type Pot, type Student, type Txn, type Workbook, potOf } from "./schema";

// Definitions in docs/DESIGN.md §5. All amounts are integer cents.

export type StudentStatus = "paid" | "partial" | "unpaid" | "waived" | "unset";

export interface StudentLine {
  student: Student;
  /** null = amount not set yet (event row with blank amount_due) */
  dueCents: number | null;
  attendees: string;
  paidCents: number;
  status: StudentStatus;
}

export interface FundSummary {
  fund: Fund;
  pot: Pot;
  contributionsCents: number;
  incomeCents: number;
  expensesCents: number;
  refundsCents: number;
  transfersInCents: number;
  transfersOutCents: number;
  /** contributions − refunds */
  collectedCents: number;
  balanceCents: number;
  /** Σ due over participants (class goal, or what an event expects to collect) */
  expectedCents: number;
  lines: StudentLine[];
  /** students who owe something (status ≠ waived) */
  payingCount: number;
  paidCount: number;
}

export interface PendingExpense {
  txn: Txn;
  fundName: string;
  remainingCents: number;
  daysWaiting: number;
}

export interface PendingParent {
  name: string;
  totalCents: number;
  expenses: PendingExpense[];
}

export interface Ledger {
  funds: FundSummary[];
  pots: Record<Pot, number>;
  pending: PendingParent[];
  pendingTotalCents: number;
  /** Σ fund balances + pending reimbursements: class money that should be in the treasurer's account */
  treasurerCashCents: number;
  issues: Issue[];
}

export function computeLedger(wb: Workbook, today: Date = new Date()): Ledger {
  const issues: Issue[] = [...wb.issues];
  const studentById = new Map(wb.students.map((s) => [s.id, s]));
  const fundById = new Map(wb.funds.map((f) => [f.id, f]));

  const funds: FundSummary[] = wb.funds.map((fund) => {
    const txns = wb.txns.filter((t) => t.fundId === fund.id);
    const sum = (type: Txn["type"]) =>
      txns.filter((t) => t.type === type).reduce((a, t) => a + t.amountCents, 0);
    const contributionsCents = sum("contribution");
    const refundsCents = sum("refund_family");
    const incomeCents = sum("income");
    const expensesCents = sum("expense");
    const transfersInCents = sum("transfer_in");
    const transfersOutCents = sum("transfer_out");

    // Who owes: class fund → every active student (Participants rows only override);
    // event → students listed in Participants.
    const rows = new Map(wb.participants.filter((p) => p.fundId === fund.id).map((p) => [p.studentId, p]));
    let owing: Student[] = [];
    if (fund.type === "class") owing = wb.students.filter((s) => s.active);
    else if (fund.type === "event")
      owing = [...rows.keys()].map((id) => studentById.get(id)!).filter(Boolean);

    const paidBy = new Map<string, number>();
    for (const t of txns) {
      if (t.type === "contribution") paidBy.set(t.studentId, (paidBy.get(t.studentId) ?? 0) + t.amountCents);
      if (t.type === "refund_family") paidBy.set(t.studentId, (paidBy.get(t.studentId) ?? 0) - t.amountCents);
    }

    const lines: StudentLine[] = owing.map((student) => {
      const p = rows.get(student.id);
      // Events: the family's own amount_due. Class fund: exception row, else the class price.
      const dueCents = fund.type === "event" ? (p?.amountDueCents ?? null) : (p?.amountDueCents ?? fund.priceCents ?? 0);
      const paidCents = paidBy.get(student.id) ?? 0;
      return { student, dueCents, attendees: p?.attendees ?? "", paidCents, status: statusOf(dueCents, paidCents) };
    });
    lines.sort((a, b) => a.student.name.localeCompare(b.student.name, "es"));

    // Money from students who aren't (or are no longer) expected to pay into this fund.
    for (const [sid, paid] of paidBy) {
      if (paid < 0)
        issues.push(issue(`${fund.id}: ${sid} was refunded more than they paid.`));
      else if (paid > 0 && !owing.some((s) => s.id === sid))
        issues.push(issue(`${fund.id}: ${sid} has paid ${paid / 100} but isn't a participant (inactive or removed).`, "warning"));
    }
    for (const l of lines)
      if (l.dueCents !== null && l.dueCents > 0 && l.paidCents > l.dueCents)
        issues.push(issue(`${fund.id}: ${l.student.id} paid more than they owe.`, "warning"));

    const balanceCents =
      contributionsCents + incomeCents + transfersInCents - expensesCents - refundsCents - transfersOutCents;
    if (fund.status === "closed" && fund.type === "event" && balanceCents !== 0)
      issues.push(issue(`${fund.id} is closed but its balance isn't zero; leftovers should move to EVENTS-POOL.`, "warning"));

    const paying = lines.filter((l) => l.status !== "waived");
    return {
      fund,
      pot: potOf(fund.type),
      contributionsCents,
      incomeCents,
      expensesCents,
      refundsCents,
      transfersInCents,
      transfersOutCents,
      collectedCents: contributionsCents - refundsCents,
      balanceCents,
      expectedCents: lines.reduce((a, l) => a + (l.dueCents ?? 0), 0),
      lines,
      payingCount: paying.length,
      paidCount: paying.filter((l) => l.status === "paid").length,
    };
  });

  const pots: Record<Pot, number> = { class: 0, events: 0 };
  for (const f of funds) pots[f.pot] += f.balanceCents;

  // Pending reimbursements: expenses another parent paid, minus what was paid back.
  const reimbursed = new Map<string, number>();
  for (const t of wb.txns)
    if (t.type === "reimburse_parent")
      reimbursed.set(t.reimbursesTxn, (reimbursed.get(t.reimbursesTxn) ?? 0) + t.amountCents);

  const byParent = new Map<string, PendingParent>();
  for (const t of wb.txns) {
    if (t.type !== "expense" || isTreasurer(t.paidBy)) continue;
    const remainingCents = t.amountCents - (reimbursed.get(t.id) ?? 0);
    if (remainingCents <= 0) continue;
    const key = t.paidBy.trim().toLowerCase();
    const parent = byParent.get(key) ?? { name: t.paidBy.trim(), totalCents: 0, expenses: [] };
    parent.totalCents += remainingCents;
    parent.expenses.push({
      txn: t,
      fundName: fundById.get(t.fundId)?.name ?? t.fundId,
      remainingCents,
      daysWaiting: daysBetween(t.date, today),
    });
    byParent.set(key, parent);
  }
  const pending = [...byParent.values()].sort((a, b) => b.totalCents - a.totalCents);
  const pendingTotalCents = pending.reduce((a, p) => a + p.totalCents, 0);

  return {
    funds,
    pots,
    pending,
    pendingTotalCents,
    treasurerCashCents: pots.class + pots.events + pendingTotalCents,
    issues,
  };
}

function statusOf(due: number | null, paid: number): StudentStatus {
  if (due === null) return "unset";
  if (due === 0) return "waived";
  if (paid >= due) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

function issue(message: string, severity: Issue["severity"] = "error"): Issue {
  return { tab: "General", row: null, severity, message };
}
