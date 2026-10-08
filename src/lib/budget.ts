import type { Fund, Participant } from "./schema";

// Event budget (docs/DESIGN.md §5, "Event budget"). Only for events with venue_per_kid set.

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
  venueKidsCents: number;
  venueAdultsCents: number;
  venueFlatFeeCents: number;
  venueSubtotalCents: number;
  revenueKidsCents: number;
  revenueAdultsCents: number;
  revenueCents: number;
  /** Drinks/snacks budget: total_cost − venue subtotal (null if total_cost isn't set) */
  drinksCents: number | null;
  /** revenue − total_cost (null if total_cost isn't set) */
  surplusCents: number | null;
}

export interface EventBudget {
  totalCostCents: number | null;
  venuePerKidCents: number;
  venuePerAdultCents: number;
  revenuePerKidCents: number;
  revenuePerAdultCents: number;
  /** Families in Participants (the source of truth: no row means not attending) */
  confirmed: BudgetScenario;
  /** Participants rows whose attendees note is blank or unreadable; left out of the headcount */
  unreadableRows: number;
}

export function computeEventBudget(
  fund: Fund,
  participants: Participant[],
  defaults: { perKidCents: number | null; perAdultCents: number | null },
): EventBudget | null {
  if (fund.type !== "event" || fund.venuePerKidCents === null) return null;

  const counts: Headcount[] = [];
  let unreadableRows = 0;
  for (const p of participants.filter((x) => x.fundId === fund.id)) {
    const h = parseAttendees(p.attendees);
    if (h) counts.push(h);
    else unreadableRows++;
  }

  const revenuePerKidCents = fund.revenuePerKidCents ?? defaults.perKidCents ?? 0;
  const revenuePerAdultCents = fund.revenuePerAdultCents ?? defaults.perAdultCents ?? 0;
  const kids = counts.reduce((a, h) => a + h.kids, 0);
  const adults = counts.reduce((a, h) => a + h.adults, 0);

  const venueKidsCents = kids * fund.venuePerKidCents;
  const venueAdultsCents = adults * (fund.venuePerAdultCents ?? 0);
  const venueFlatFeeCents = fund.venueFlatFeeCents ?? 0;
  const venueSubtotalCents = venueKidsCents + venueAdultsCents + venueFlatFeeCents;
  const revenueKidsCents = kids * revenuePerKidCents;
  const revenueAdultsCents = adults * revenuePerAdultCents;
  const revenueCents = revenueKidsCents + revenueAdultsCents;

  return {
    totalCostCents: fund.totalCostCents,
    venuePerKidCents: fund.venuePerKidCents,
    venuePerAdultCents: fund.venuePerAdultCents ?? 0,
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
      drinksCents: fund.totalCostCents === null ? null : fund.totalCostCents - venueSubtotalCents,
      surplusCents: fund.totalCostCents === null ? null : revenueCents - fund.totalCostCents,
    },
    unreadableRows,
  };
}
