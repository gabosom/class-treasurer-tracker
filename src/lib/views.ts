import type { Ledger, PendingParent, StudentStatus } from "./ledger";
import type { Issue, Pot, Txn, Workbook } from "./schema";

// The families view is built from an explicit allow-list of fields so that names,
// private notes and who-paid-what can never reach that page by accident.

export interface FamiliesView {
  pots: Record<Pot, number>;
  pendingReimbursementsCents: number;
  classFunds: {
    id: string;
    name: string;
    notes: string;
    goalCents: number;
    collectedCents: number;
    spentCents: number;
    balanceCents: number;
    paidCount: number;
    payingCount: number;
  }[];
  events: {
    id: string;
    name: string;
    notes: string;
    date: string | null;
    status: string;
    totalCostCents: number | null;
    collectedCents: number;
    spentCents: number;
    balanceCents: number;
    /** > 0: leftover moved to EVENTS-POOL; < 0: shortfall covered from it */
    movedToPoolCents: number;
  }[];
  eventsPoolCents: number;
  expenses: {
    id: string;
    date: string;
    fundName: string;
    description: string;
    amountCents: number;
    receiptFileId: string;
  }[];
}

export function buildFamiliesView(wb: Workbook, l: Ledger): FamiliesView {
  const fundName = new Map(wb.funds.map((f) => [f.id, f.name]));
  return {
    pots: l.pots,
    pendingReimbursementsCents: l.pendingTotalCents,
    classFunds: l.funds
      .filter((f) => f.fund.type === "class")
      .map((f) => ({
        id: f.fund.id,
        name: f.fund.name,
        notes: f.fund.notes,
        goalCents: f.expectedCents,
        collectedCents: f.collectedCents + f.incomeCents,
        spentCents: f.expensesCents,
        balanceCents: f.balanceCents,
        paidCount: f.paidCount,
        payingCount: f.payingCount,
      })),
    events: l.funds
      .filter((f) => f.fund.type === "event")
      .sort((a, b) => (b.fund.date ?? "").localeCompare(a.fund.date ?? ""))
      .map((f) => ({
        id: f.fund.id,
        name: f.fund.name,
        notes: f.fund.notes,
        date: f.fund.date,
        status: f.fund.status,
        totalCostCents: f.fund.totalCostCents,
        collectedCents: f.collectedCents + f.incomeCents,
        spentCents: f.expensesCents,
        balanceCents: f.balanceCents,
        movedToPoolCents: f.transfersOutCents - f.transfersInCents,
      })),
    eventsPoolCents: l.funds
      .filter((f) => f.fund.type === "events_pool")
      .reduce((a, f) => a + f.balanceCents, 0),
    expenses: wb.txns
      .filter((t) => t.type === "expense")
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .map((t) => ({
        id: t.id,
        date: t.date,
        fundName: fundName.get(t.fundId) ?? t.fundId,
        description: t.publicDesc,
        amountCents: t.amountCents,
        receiptFileId: t.receiptFileId,
      })),
  };
}

export interface DirectivaView {
  families: FamiliesView;
  treasurerCashCents: number;
  pending: PendingParent[];
  funds: {
    id: string;
    name: string;
    type: string;
    status: string;
    notes: string;
    priceCents: number | null;
    totalCostCents: number | null;
    expectedCents: number;
    collectedCents: number;
    balanceCents: number;
    lines: {
      studentId: string;
      studentName: string;
      parents: { name: string; phone: string; email: string }[];
      attendees: string;
      dueCents: number | null;
      paidCents: number;
      status: StudentStatus;
    }[];
  }[];
  txns: (Txn & { fundName: string })[];
  issues: Issue[];
}

export function buildDirectivaView(wb: Workbook, l: Ledger): DirectivaView {
  const fundName = new Map(wb.funds.map((f) => [f.id, f.name]));
  return {
    families: buildFamiliesView(wb, l),
    treasurerCashCents: l.treasurerCashCents,
    pending: l.pending,
    funds: l.funds.map((f) => ({
      id: f.fund.id,
      name: f.fund.name,
      type: f.fund.type,
      status: f.fund.status,
      notes: f.fund.notes,
      priceCents: f.fund.priceCents,
      totalCostCents: f.fund.totalCostCents,
      expectedCents: f.expectedCents,
      collectedCents: f.collectedCents,
      balanceCents: f.balanceCents,
      lines: f.lines.map((x) => ({
        studentId: x.student.id,
        studentName: x.student.name,
        parents: [
          { name: x.student.momName, phone: x.student.momPhone, email: x.student.momEmail },
          { name: x.student.dadName, phone: x.student.dadPhone, email: x.student.dadEmail },
        ].filter((p) => p.name || p.phone || p.email),
        attendees: x.attendees,
        dueCents: x.dueCents,
        paidCents: x.paidCents,
        status: x.status,
      })),
    })),
    txns: [...wb.txns]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .map((t) => ({ ...t, fundName: fundName.get(t.fundId) ?? t.fundId })),
    issues: l.issues,
  };
}
