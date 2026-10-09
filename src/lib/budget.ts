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
  /** Funds.drinks_snacks: additional drinks/snacks budget */
  drinksCents: number | null;
  /** Planned total = venue subtotal + drinks/snacks; null when there are no cost lines */
  totalCostCents: number | null;
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
      revenueCents: sum(revenueKidsCents, revenueAdultsCents),
      drinksCents: drinksSnacksCents,
      totalCostCents: sum(venueSubtotalCents, drinksSnacksCents),
    },
    unreadableRows,
  };
}
