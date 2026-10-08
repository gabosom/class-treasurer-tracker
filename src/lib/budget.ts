import type { Fund, Participant, Student } from "./schema";

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
  /** Max drinks/snacks budget assuming zero surplus: revenue − venue subtotal */
  drinksMaxCents: number;
  /** revenue − total_cost (null if total_cost isn't set) */
  surplusCents: number | null;
}

export interface EventBudget {
  totalCostCents: number | null;
  venuePerKidCents: number;
  venuePerAdultCents: number;
  revenuePerKidCents: number;
  revenuePerAdultCents: number;
  confirmed: BudgetScenario;
  max: BudgetScenario;
  /** Families with no usable attendees (not in Participants, or unreadable note) */
  unresolvedFamilies: number;
  /** Headcount assumed for each unresolved family in the max scenario */
  assumedPerFamily: Headcount;
}

export function computeEventBudget(
  fund: Fund,
  participants: Participant[],
  students: Student[],
  defaults: { perKidCents: number | null; perAdultCents: number | null },
): EventBudget | null {
  if (fund.type !== "event" || fund.venuePerKidCents === null) return null;

  const rows = participants.filter((p) => p.fundId === fund.id);
  const confirmedCounts: Headcount[] = [];
  let unreadable = 0;
  for (const p of rows) {
    const h = parseAttendees(p.attendees);
    if (h) confirmedCounts.push(h);
    else unreadable++;
  }
  const listed = new Set(rows.map((p) => p.studentId));
  const notListed = students.filter((s) => s.active && !listed.has(s.id)).length;
  const unresolvedFamilies = notListed + unreadable;
  const assumedPerFamily = mostCommon(confirmedCounts) ?? { kids: 1, adults: 1 };

  const revenuePerKidCents = fund.revenuePerKidCents ?? defaults.perKidCents ?? 0;
  const revenuePerAdultCents = fund.revenuePerAdultCents ?? defaults.perAdultCents ?? 0;

  const scenario = (families: number, kids: number, adults: number): BudgetScenario => {
    const venueKidsCents = kids * fund.venuePerKidCents!;
    const venueAdultsCents = adults * (fund.venuePerAdultCents ?? 0);
    const venueFlatFeeCents = fund.venueFlatFeeCents ?? 0;
    const venueSubtotalCents = venueKidsCents + venueAdultsCents + venueFlatFeeCents;
    const revenueKidsCents = kids * revenuePerKidCents;
    const revenueAdultsCents = adults * revenuePerAdultCents;
    const revenueCents = revenueKidsCents + revenueAdultsCents;
    return {
      families,
      kids,
      adults,
      venueKidsCents,
      venueAdultsCents,
      venueFlatFeeCents,
      venueSubtotalCents,
      revenueKidsCents,
      revenueAdultsCents,
      revenueCents,
      drinksMaxCents: revenueCents - venueSubtotalCents,
      surplusCents: fund.totalCostCents === null ? null : revenueCents - fund.totalCostCents,
    };
  };

  const kids = confirmedCounts.reduce((a, h) => a + h.kids, 0);
  const adults = confirmedCounts.reduce((a, h) => a + h.adults, 0);
  const confirmed = scenario(confirmedCounts.length, kids, adults);
  const max = scenario(
    confirmedCounts.length + unresolvedFamilies,
    kids + unresolvedFamilies * assumedPerFamily.kids,
    adults + unresolvedFamilies * assumedPerFamily.adults,
  );

  return {
    totalCostCents: fund.totalCostCents,
    venuePerKidCents: fund.venuePerKidCents,
    venuePerAdultCents: fund.venuePerAdultCents ?? 0,
    revenuePerKidCents,
    revenuePerAdultCents,
    confirmed,
    max,
    unresolvedFamilies,
    assumedPerFamily,
  };
}

/** Most frequent headcount; ties go to the larger group (safer for the max scenario). */
function mostCommon(list: Headcount[]): Headcount | null {
  if (list.length === 0) return null;
  const counts = new Map<string, { h: Headcount; n: number }>();
  for (const h of list) {
    const k = `${h.kids}|${h.adults}`;
    counts.set(k, { h, n: (counts.get(k)?.n ?? 0) + 1 });
  }
  return [...counts.values()].sort(
    (a, b) => b.n - a.n || b.h.kids + b.h.adults - (a.h.kids + a.h.adults),
  )[0].h;
}
