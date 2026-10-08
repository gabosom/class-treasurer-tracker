import { describe, expect, it } from "vitest";
import { sampleWorkbook } from "@/fixtures/sample";
import { computeLedger } from "./ledger";
import { parseWorkbook } from "./parse";
import { type Cell, type RawWorkbook, StructuralError, TABS } from "./schema";

const TODAY = new Date("2026-10-15T12:00:00Z");

function clone(wb: RawWorkbook): RawWorkbook {
  return JSON.parse(JSON.stringify(wb));
}

function withLedgerRows(...rows: Cell[][]): RawWorkbook {
  const wb = clone(sampleWorkbook);
  wb.Ledger!.push(...rows);
  return wb;
}

function ledgerOf(wb: RawWorkbook) {
  return computeLedger(parseWorkbook(wb), TODAY);
}

const fund = (l: ReturnType<typeof ledgerOf>, id: string) => l.funds.find((f) => f.fund.id === id)!;
const zooRow = (wb: RawWorkbook) => wb.Funds!.find((r) => r[0] === "EV-2026-11-ZOO")!;

describe("sample workbook", () => {
  const l = ledgerOf(sampleWorkbook);

  it("class fund: dues, waiver, inactive student, statuses", () => {
    const c = fund(l, "CLASS-1");
    expect(c.expectedCents).toBe(12000); // S01–S03 owe 40; S04 waived; S05 inactive
    expect(c.lines.map((x) => [x.student.id, x.status])).toEqual([
      ["S04", "waived"],
      ["S02", "paid"],
      ["S03", "partial"],
      ["S01", "paid"],
    ]);
    expect(c.payingCount).toBe(3);
    expect(c.paidCount).toBe(2);
  });

  it("class fund balance counts every expense, whoever paid", () => {
    const c = fund(l, "CLASS-1");
    expect(c.contributionsCents).toBe(10000);
    expect(c.expensesCents).toBe(2347 + 1899 + 3000);
    expect(c.balanceCents).toBe(10000 - 7246);
  });

  it("reimbursements don't change fund balance; unpaid ones are pending", () => {
    expect(l.pending).toHaveLength(1);
    expect(l.pending[0].name).toBe("Ana Gómez");
    expect(l.pending[0].totalCents).toBe(1899);
    expect(l.pending[0].expenses[0].daysWaiting).toBe(10);
    expect(l.pendingTotalCents).toBe(1899);
  });

  it("closed event keeps its leftover as its balance, counted in the events pot", () => {
    expect(fund(l, "EV-2026-10-PUMPKIN").balanceCents).toBe(900);
    expect(l.pots.events).toBe(900 + 6000);
  });

  it("events: each family owes its own amount; refund undoes a contribution", () => {
    const z = fund(l, "EV-2026-11-ZOO");
    expect(z.collectedCents).toBe(6000); // 30 + 30 + 25 − 25 refunded
    expect(z.balanceCents).toBe(6000);
    expect(z.expectedCents).toBe(9000); // 30 + 45 + 15
    const status = (id: string) => z.lines.find((x) => x.student.id === id)!;
    expect(status("S01").status).toBe("paid");
    expect(status("S02")).toMatchObject({ dueCents: 4500, paidCents: 3000, status: "partial", attendees: "1 niño + 1 hermano + 1 adulto" });
    expect(status("S04").status).toBe("unpaid");
    expect(z.paidCount).toBe(1);
  });

  it("events ignore price_per_student; a blank amount_due is 'unset', not waived", () => {
    const wb = clone(sampleWorkbook);
    zooRow(wb)[3] = 99; // stray price on an event is ignored
    wb.Participants!.push(["EV-2026-11-ZOO", "S03", "", "1 niño"]);
    const lz = ledgerOf(wb);
    const z = fund(lz, "EV-2026-11-ZOO");
    expect(z.lines.find((x) => x.student.id === "S03")).toMatchObject({ dueCents: null, status: "unset" });
    expect(z.expectedCents).toBe(9000);
    expect(lz.issues.some((i) => i.severity === "warning" && i.message.includes("no amount_due"))).toBe(true);
  });

  it("pots and treasurer cash reconcile with cash in/out", () => {
    expect(l.pots).toEqual({ class: 2754, events: 6900 });
    // in: 230.00 contributions; out: 25 refund + 59.47 treasurer-paid expenses + 30 reimbursed
    expect(l.treasurerCashCents).toBe(23000 - 2500 - 5947 - 3000);
    expect(l.treasurerCashCents).toBe(l.pots.class + l.pots.events + l.pendingTotalCents);
  });

  it("flags the expense without a receipt as a warning, not an error", () => {
    const w = l.issues.filter((i) => i.message.includes("T0006"));
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe("warning");
    expect(l.issues.filter((i) => i.severity === "error")).toEqual([]);
  });
});

describe("structural errors", () => {
  it("missing tab", () => {
    const wb = clone(sampleWorkbook);
    delete wb.Participants;
    expect(() => parseWorkbook(wb)).toThrow(StructuralError);
  });

  it("wrong header order", () => {
    const wb = clone(sampleWorkbook);
    wb.Funds![0] = [...TABS.Funds].reverse();
    expect(() => parseWorkbook(wb)).toThrow(/headers don't match/);
  });

  it("extra columns after the schema are fine", () => {
    const wb = clone(sampleWorkbook);
    wb.Ledger![0] = [...TABS.Ledger, "mi_columna"];
    expect(() => parseWorkbook(wb)).not.toThrow();
  });

  it("schema_version mismatch", () => {
    const wb = clone(sampleWorkbook);
    wb.Config![1] = ["schema_version", "1"];
    expect(() => parseWorkbook(wb)).toThrow(/schema_version/);
  });
});

describe("row-level checks", () => {
  it("duplicate payment_ref is counted once", () => {
    const l = ledgerOf(
      withLedgerRows(["T0100", "2026-10-03", "CLASS-1", "contribution", 20, "S03", "", "", "venmo", "VNM-1", "", "", "", ""]),
    );
    expect(fund(l, "CLASS-1").contributionsCents).toBe(10000);
    expect(l.issues.some((i) => i.severity === "error" && i.message.includes("VNM-1"))).toBe(true);
  });

  it("transfer types from schema 2 are rejected", () => {
    const l = ledgerOf(
      withLedgerRows(["T0100", "2026-10-30", "EV-2026-11-ZOO", "transfer_out", 10, "", "", "", "other", "", "", "", "", ""]),
    );
    expect(fund(l, "EV-2026-11-ZOO").balanceCents).toBe(6000);
    expect(l.issues.some((i) => i.severity === "error" && i.message.includes('invalid type "transfer_out"'))).toBe(true);
  });

  it("can't reimburse an expense the treasurer paid", () => {
    const l = ledgerOf(
      withLedgerRows(["T0100", "2026-10-30", "CLASS-1", "reimburse_parent", 23.47, "", "Yo", "", "zelle", "", "", "", "", "T0004"]),
    );
    expect(l.issues.some((i) => i.message.includes("paid by the treasurer"))).toBe(true);
    expect(l.treasurerCashCents).toBe(11553);
  });

  it("can't reimburse more than the expense", () => {
    const l = ledgerOf(
      withLedgerRows(["T0100", "2026-10-30", "CLASS-1", "reimburse_parent", 20, "", "Ana Gómez", "", "zelle", "", "", "", "", "T0005"]),
    );
    expect(l.pendingTotalCents).toBe(1899);
    expect(l.issues.some((i) => i.message.includes("more than T0005"))).toBe(true);
  });

  it("partial reimbursement leaves the rest pending", () => {
    const l = ledgerOf(
      withLedgerRows(["T0100", "2026-10-30", "CLASS-1", "reimburse_parent", 10, "", "Ana Gómez", "", "zelle", "", "", "", "", "T0005"]),
    );
    expect(l.pendingTotalCents).toBe(899);
    expect(fund(l, "CLASS-1").balanceCents).toBe(2754);
  });

  it("bad rows are skipped, not fatal", () => {
    const l = ledgerOf(
      withLedgerRows(
        ["T0100", "not a date", "CLASS-1", "expense", 5, "", "X", "treasurer", "card", "", "", "", "", ""],
        ["T0101", "2026-10-30", "NOPE", "expense", 5, "", "X", "treasurer", "card", "", "", "", "", ""],
        ["T0102", "2026-10-30", "CLASS-1", "contribution", -5, "S01", "", "", "cash", "", "", "", "", ""],
        ["T0001", "2026-10-30", "CLASS-1", "contribution", 5, "S01", "", "", "cash", "", "", "", "", ""],
      ),
    );
    expect(fund(l, "CLASS-1").balanceCents).toBe(2754);
    expect(l.issues.filter((i) => i.severity === "error")).toHaveLength(4);
  });

  it("amounts formatted as text with $ and commas parse", () => {
    const l = ledgerOf(
      withLedgerRows(["T0100", "10/30/2026", "CLASS-1", "income", "$1,000.50", "", "Venta", "", "cash", "", "", "Venta de pasteles", "", ""]),
    );
    expect(fund(l, "CLASS-1").incomeCents).toBe(100050);
  });

  it("treasurer fronting money shows as negative cash", () => {
    const wb = clone(sampleWorkbook);
    wb.Ledger!.push(["T0100", "2026-10-30", "CLASS-1", "expense", 500, "", "Tienda", "treasurer", "card", "", "f", "Algo", "", ""]);
    expect(ledgerOf(wb).treasurerCashCents).toBe(11553 - 50000);
  });
});

describe("real-Sheet quirks", () => {
  it("empty rows with an unchecked checkbox (FALSE) are ignored", () => {
    const wb = clone(sampleWorkbook);
    for (let i = 0; i < 50; i++) wb.Roster!.push(["", "", "", "", "", "", "", "", "", false]);
    const parsed = parseWorkbook(wb);
    expect(parsed.students).toHaveLength(5);
    expect(parsed.issues.filter((x) => x.tab === "Roster")).toEqual([]);
  });

  it("a date stored as a Sheets serial number is read as a date", () => {
    const wb = clone(sampleWorkbook);
    zooRow(wb)[5] = 46313;
    expect(parseWorkbook(wb).funds.find((f) => f.id === "EV-2026-11-ZOO")!.date).toBe("2026-10-18");
  });
});
