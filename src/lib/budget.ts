import type { Fund, Participant } from "./schema";

// Event budget (docs/DESIGN.md §5, "Event budget"). Only for events with at least one breakdown column set.

export interface Headcount {
  kids: number;
  adults: number;
}

const KID = /^(kids?|child(ren)?|niñ[oa]s?|nin[oa]s?|hij[oa]s?|herman[oa]s?|estudiantes?|alumn[oa]s?)$/i;
const ADULT = /^(adults?|adult[oa]s?|padres?|papás?|mamás?|papas?|mamas?)$/i;

/**
 * Parses an attendees note like "2 adults, 1 kid" or "1 niño + 1 hermano + 2 adultos".
 * Siblings count as kids. Returns null if nothing recognizable is found.
 */
export function parseAttendees(text: string): Headcount | null {
  let kids = 0;
  let adults = 0;
  let found = false;
  for (const m of text.matchAll(/(\d+)\s*([^\d,+;&]+)/g)) {
    const n = parseInt(m[1], 10);
    const word = m[2].trim().split(/\s+/)[0];
    if (KID.test(word)) kids += n;
    else if (ADULT.test(word)) adults += n;
    else continue;
    found = true;
  }
  return found ? { kids, adults } : null;
}

export interface BudgetScenario {
  families: number;
  kids: number;
  adults: number;
  /** Each line is null when its Funds column is blank; the card hides it. */
  venueKidsCents: number | null;
  venueAdultsCents: number | null;
  venueFlatFeeCents: number | null;
  /** null when every venue column is blank */
  venueSubtotalCents: number | null;
  revenueKidsCents: number | null;
  revenueAdultsCents: number | null;
  /** null when both revenue columns are blank */
  revenueCents: number | null;
  /** Funds.drinks_snacks; or, when it's blank, what's left of the budget after the venue */
  drinksCents: number | null;
  drinksIsRemainder: boolean;
  /** budget − (venue + drinks) when positive ("sin asignar") */
  unallocatedCents: number | null;
  /** how much the cost lines exceed the budget (0 if they don't) */
  overCents: number;
  /** Planned total: the budget, or venue subtotal + drinks/snacks when there's no budget. null when nothing is set */
  totalCostCents: number | null;
  /**
   * Where the budget comes from (D18):
   * - fixed: Funds.total_cost
   * - revenue: total_cost and drinks_snacks blank → what families pay
   * - lines: total_cost blank, drinks_snacks set → venue + drinks, no separate budget
   */
  budgetSource: "fixed" | "revenue" | "lines";
}

export interface EventBudget {
  /** Funds.total_cost, the event's goal; may differ from the budget's planned total */
  fundTotalCostCents: number | null;
  venuePerKidCents: number | null;
  venuePerAdultCents: number | null;
  revenuePerKidCents: number | null;
  revenuePerAdultCents: number | null;
  /** Families in Participants (the source of truth: no row means not attending) */
  confirmed: BudgetScenario;
  /** Participants rows whose attendees note is blank or unreadable; left out of the headcount */
  unreadableRows: number;
}

const times = (n: number, cents: number | null) => (cents === null ? null : n * cents);
/** Sum of the non-null values, or null if all are null. */
const sum = (...xs: (number | null)[]) =>
  xs.every((x) => x === null) ? null : xs.reduce<number>((a, x) => a + (x ?? 0), 0);

export function computeEventBudget(fund: Fund, participants: Participant[]): EventBudget | null {
  const { venuePerKidCents, venuePerAdultCents, venueFlatFeeCents, revenuePerKidCents, revenuePerAdultCents, drinksSnacksCents } = fund;
  if (fund.type !== "event") return null;
  if ([venuePerKidCents, venuePerAdultCents, venueFlatFeeCents, revenuePerKidCents, revenuePerAdultCents, drinksSnacksCents].every((v) => v === null))
    return null;

  const counts: Headcount[] = [];
  let unreadableRows = 0;
  for (const p of participants.filter((x) => x.fundId === fund.id)) {
    const h = parseAttendees(p.attendees);
    if (h) counts.push(h);
    else unreadableRows++;
  }
  const kids = counts.reduce((a, h) => a + h.kids, 0);
  const adults = counts.reduce((a, h) => a + h.adults, 0);

  const venueKidsCents = times(kids, venuePerKidCents);
  const venueAdultsCents = times(adults, venuePerAdultCents);
  const venueSubtotalCents = sum(venueKidsCents, venueAdultsCents, venueFlatFeeCents);
  const revenueKidsCents = times(kids, revenuePerKidCents);
  const revenueAdultsCents = times(adults, revenuePerAdultCents);

  const revenueCents = sum(revenueKidsCents, revenueAdultsCents);

  // D18: drinks/snacks get what's left of the budget. The budget is total_cost if set (fixed);
  // with total_cost and drinks_snacks both blank, it's what families pay.
  const budgetSource: BudgetScenario["budgetSource"] =
    fund.totalCostCents !== null ? "fixed" : drinksSnacksCents === null && revenueCents !== null ? "revenue" : "lines";
  const budget = budgetSource === "fixed" ? fund.totalCostCents : budgetSource === "revenue" ? revenueCents : null;
  let drinksCents = drinksSnacksCents;
  let drinksIsRemainder = false;
  if (budget !== null && drinksCents === null && venueSubtotalCents !== null && venueSubtotalCents <= budget) {
    drinksCents = budget - venueSubtotalCents;
    drinksIsRemainder = true;
  }
  const lines = sum(venueSubtotalCents, drinksCents);
  const unallocatedCents = budget !== null && lines !== null && lines < budget ? budget - lines : null;
  const overCents = budget !== null && lines !== null && lines > budget ? lines - budget : 0;

  return {
    fundTotalCostCents: fund.totalCostCents,
    venuePerKidCents,
    venuePerAdultCents,
    revenuePerKidCents,
    revenuePerAdultCents,
    confirmed: {
      families: counts.length,
      kids,
      adults,
      venueKidsCents,
      venueAdultsCents,
      venueFlatFeeCents,
      venueSubtotalCents,
      revenueKidsCents,
      revenueAdultsCents,
      revenueCents,
      drinksCents,
      drinksIsRemainder,
      unallocatedCents,
      overCents,
      totalCostCents: budget ?? lines,
      budgetSource,
    },
    unreadableRows,
  };
}
