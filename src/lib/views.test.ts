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
    expect(v.pendingReimbursementsCents).toBe(1899);
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
