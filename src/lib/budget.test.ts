import { describe, expect, it } from "vitest";
import { computeEventBudget, parseAttendees } from "./budget";
import type { Fund, Participant } from "./schema";

describe("parseAttendees", () => {
  it.each([
    ["2 adults, 1 kid", { kids: 1, adults: 2 }],
    ["3 adults, 2 kids", { kids: 2, adults: 3 }],
    ["1 niño + 2 adultos", { kids: 1, adults: 2 }],
    ["1 niño + 1 hermano + 1 adulto", { kids: 2, adults: 1 }],
    ["1 niña + 1 hermana + 2 Adultos", { kids: 2, adults: 2 }],
    ["2 kids", { kids: 2, adults: 0 }],
  ])("%s", (text, expected) => expect(parseAttendees(text)).toEqual(expected));

  it("returns null when nothing is recognizable", () => {
    expect(parseAttendees("")).toBeNull();
    expect(parseAttendees("por confirmar")).toBeNull();
  });
});

// The real Flip Zone participants as of 2026-10-08, with example venue prices.
const real: [string, string][] = [
  ["S04", "2 adults, 1 kid"], ["S05", "2 adults, 1 kid"], ["S06", "2 adults, 1 kid"],
  ["S08", "2 adults, 2 kids"], ["S09", "2 adults, 2 kids"], ["S10", "2 adults, 2 kids"],
  ["S11", "3 adults, 1 kid"], ["S12", "2 adults, 2 kids"], ["S14", "2 adults, 2 kids"],
  ["S15", "2 adults, 2 kids"], ["S16", "2 adults, 2 kids"], ["S17", "2 adults, 2 kids"],
  ["S18", "2 adults, 2 kids"], ["S19", "2 adults, 1 kid"], ["S20", "2 adults, 2 kids"],
  ["S21", "2 adults, 1 kid"], ["S24", "2 adults, 1 kid"], ["S25", "3 adults, 1 kid"],
  ["S26", "2 adults, 2 kids"], ["S27", "2 adults, 1 kid"], ["S28", "2 adults, 3 kids"],
  ["S13", "2 adults, 2 kids"],
];
const participants: Participant[] = real.map(([studentId, attendees], i) => ({
  fundId: "EV-FLIP", studentId, amountDueCents: null, attendees, row: i + 2,
}));
const fund: Fund = {
  id: "EV-FLIP", name: "Flip Zone", type: "event", priceCents: null, totalCostCents: 66000,
  date: "2026-10-18", status: "collecting", notes: "",
  venuePerKidCents: 900, venuePerAdultCents: 300, venueFlatFeeCents: 5000,
  revenuePerKidCents: null, revenuePerAdultCents: null, row: 2,
};
const defaults = { perKidCents: 1100, perAdultCents: 650 }; // Config.price_per_kid / price_per_adult

describe("computeEventBudget", () => {
  const b = computeEventBudget(fund, participants, defaults)!;

  it("counts only families in Participants: 22 families, 36 kids, 46 adults", () => {
    expect(b.confirmed).toMatchObject({ families: 22, kids: 36, adults: 46 });
    expect(b.confirmed.revenueCents).toBe(36 * 1100 + 46 * 650); // $695, matches Σ amount_due in the Sheet
    expect(b.confirmed.venueSubtotalCents).toBe(36 * 900 + 46 * 300 + 5000); // $512
    expect(b.confirmed.drinksCents).toBe(66000 - 51200); // total_cost − venue subtotal = $148
    expect(b.unreadableRows).toBe(0);
  });

  it("fund revenue_per_* overrides Config defaults", () => {
    const b2 = computeEventBudget({ ...fund, revenuePerKidCents: 1500 }, participants, defaults)!;
    expect(b2.revenuePerKidCents).toBe(1500);
    expect(b2.revenuePerAdultCents).toBe(650);
  });

  it("a blank or unreadable attendees note is left out and reported", () => {
    const p2 = [...participants, { fundId: "EV-FLIP", studentId: "S01", amountDueCents: null, attendees: "", row: 99 }];
    const b2 = computeEventBudget(fund, p2, defaults)!;
    expect(b2.confirmed.families).toBe(22);
    expect(b2.unreadableRows).toBe(1);
  });

  it("only applies to events with venue_per_kid", () => {
    expect(computeEventBudget({ ...fund, venuePerKidCents: null }, participants, defaults)).toBeNull();
  });

  it("drinks is null when total_cost isn't set", () => {
    const c = computeEventBudget({ ...fund, totalCostCents: null }, participants, defaults)!.confirmed;
    expect(c.drinksCents).toBeNull();
  });
});
