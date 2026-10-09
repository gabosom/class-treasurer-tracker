import { describe, expect, it } from "vitest";
import { sampleWorkbook } from "@/fixtures/sample";
import { computeLedger } from "./ledger";
import { parseWorkbook } from "./parse";
import { buildDirectivaView, buildFamiliesView } from "./views";

describe("families view privacy", () => {
  const wb = parseWorkbook(sampleWorkbook);
  const fam = JSON.stringify(buildFamiliesView(wb, computeLedger(wb)));

  it("contains no student or parent names, phones or emails", () => {
    const secrets = wb.students.flatMap((s) =>
      [s.name, s.momName, s.dadName, s.momPhone, s.dadPhone, s.momEmail, s.dadEmail].filter(Boolean),
    );
    // Parent names also appear as paid_by / payee on expenses and reimbursements.
    secrets.push(...wb.txns.flatMap((t) => [t.paidBy, t.payee]).filter((n) => n && n !== "treasurer"));
    const vendors = new Set(["Costco", "Target", "Michaels", "Granja Feliz"]);
    for (const s of secrets) if (!vendors.has(s)) expect(fam).not.toContain(s);
  });

  it("contains no student IDs or private notes", () => {
    expect(fam).not.toMatch(/"S\d\d"/);
    expect(fam).not.toContain("Se dio de baja");
  });

  it("still has the totals families need", () => {
    const v = JSON.parse(fam);
    expect(v.pendingReimbursementsCents).toBeUndefined(); // directiva only
    expect(v.closedEventsSurplusCents).toBe(900);
    expect(v.events.find((e: { id: string }) => e.id === "EV-2026-11-ZOO")).toMatchObject({ paidCount: 1, payingCount: 3 });
    expect(fam).not.toContain("file-"); // no receipt IDs for families
    expect(v.classFunds[0]).toMatchObject({ goalCents: 12000, paidCount: 2, payingCount: 3 });
    expect(v.expenses).toHaveLength(4);
  });
});

describe("directiva view", () => {
  it("has names, contacts and pending reimbursements", () => {
    const wb = parseWorkbook(sampleWorkbook);
    const d = buildDirectivaView(wb, computeLedger(wb));
    const c = d.funds.find((f) => f.id === "CLASS-1")!;
    expect(c.lines.find((l) => l.studentId === "S02")!.parents[0]).toEqual({
      name: "Ana Gómez",
      phone: "+1 415 555 0102",
      email: "ana@example.com",
    });
    expect(d.pending[0].name).toBe("Ana Gómez");
  });
});

describe("demo workbook", () => {
  it("parses with no errors and keeps names out of the families view", async () => {
    const { demoWorkbook } = await import("@/fixtures/demo");
    const wb = parseWorkbook(demoWorkbook);
    const l = computeLedger(wb, new Date("2026-10-08T12:00:00Z"));
    expect(l.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(wb.students).toHaveLength(20);
    const fam = JSON.stringify(buildFamiliesView(wb, l));
    for (const s of wb.students) for (const n of [s.name, s.momName, s.dadName]) expect(fam).not.toContain(n);
    expect(fam).not.toContain("Silvana");
    expect(l.funds.find((f) => f.fund.id === "EV-2026-09-HUERTO")!.balanceCents).toBe(1200);
    expect(fam).not.toContain("demo-"); // no receipt IDs for families
    expect(l.pending.map((p) => p.name).sort()).toEqual(["Paula Torres", "Silvana Mendoza"]);
    const flip = buildDirectivaView(wb, l).funds.find((f) => f.id === "EV-2026-10-FLIP-ZONE")!;
    expect(flip.budget).toMatchObject({ venuePerKidCents: 1200, revenuePerKidCents: 2000, unreadableRows: 0 });
    expect(flip.budget!.confirmed.revenueCents).toBe(54500); // equals Σ amount_due: per-person prices match
    expect(flip.budget!.confirmed.totalCostCents).toBe(flip.budget!.fundTotalCostCents); // venue + drinks = total_cost
    expect(buildDirectivaView(wb, l).funds.find((f) => f.id === "CLASS-1")!.budget).toBeNull();
  });
});
