import { parseAttendees } from "./budget";
import { toCents, toIsoDate } from "./money";
import {
  type Cell,
  type Fund,
  type Issue,
  type Participant,
  type RawWorkbook,
  type Student,
  type TabName,
  type Txn,
  type Workbook,
  FUND_STATUSES,
  FUND_TYPES,
  METHODS,
  SCHEMA_VERSION,
  StructuralError,
  TABS,
  TAB_NAMES,
  TREASURER,
  TXN_TYPES,
} from "./schema";

const str = (c: Cell) => (c === null || c === undefined ? "" : String(c).trim());
// Unchecked checkboxes read as FALSE, so a row that is empty except for FALSE is blank.
const isBlankRow = (r: Cell[]) => r.every((c) => c === false || str(c) === "");

/** Sheet row number (1-based, header is row 1) for data index i. */
const rowNum = (i: number) => i + 2;

function bool(c: Cell): boolean | null {
  if (typeof c === "boolean") return c;
  const s = str(c).toLowerCase();
  if (s === "") return true; // blank counts as active
  if (s === "true" || s === "verdadero") return true;
  if (s === "false" || s === "falso") return false;
  return null;
}

function oneOf<T extends string>(values: readonly T[], c: Cell): T | null {
  const s = str(c).toLowerCase();
  return (values as readonly string[]).includes(s) ? (s as T) : null;
}

export function isTreasurer(paidBy: string): boolean {
  return paidBy.trim().toLowerCase() === TREASURER;
}

/**
 * Turns raw tab values into typed, cross-checked data.
 * Throws StructuralError for problems that make the whole Sheet untrustworthy
 * (missing tab, wrong headers, schema_version mismatch). Row problems become issues.
 */
export function parseWorkbook(raw: RawWorkbook): Workbook {
  const issues: Issue[] = [];
  const rowsOf = {} as Record<TabName, Cell[][]>;

  // Check schema_version first: an old Sheet should say "run migrate", not "headers don't match".
  const configVersion = (raw.Config ?? []).slice(1).find((r) => str(r[0]) === "schema_version")?.[1];
  if (raw.Config && str(configVersion) !== String(SCHEMA_VERSION)) {
    throw new StructuralError(
      `Config schema_version is "${str(configVersion) || "(missing)"}", the app expects "${SCHEMA_VERSION}". ` +
        `Ask the agent to update the class-treasurer skill and run its migrate operation.`,
    );
  }

  for (const tab of TAB_NAMES) {
    const values = raw[tab];
    if (!values) throw new StructuralError(`Missing tab "${tab}".`);
    const header = (values[0] ?? []).map(str);
    const expected = TABS[tab] as readonly string[];
    const actual = header.slice(0, expected.length);
    if (expected.some((h, i) => actual[i] !== h)) {
      throw new StructuralError(
        `Tab "${tab}" headers don't match. Expected: ${expected.join(", ")}. Found: ${header.join(", ")}.`,
      );
    }
    rowsOf[tab] = values.slice(1);
  }

  // Config
  const config = new Map<string, string[]>();
  rowsOf.Config.forEach((r) => {
    const k = str(r[0]);
    if (!k) return;
    config.set(k, [...(config.get(k) ?? []), str(r[1])]);
  });
  const version = config.get("schema_version")?.[0];
  if (version !== String(SCHEMA_VERSION)) {
    throw new StructuralError(
      `Config schema_version is "${version ?? "(missing)"}", the app expects "${SCHEMA_VERSION}". ` +
        `Ask the agent to run the class-treasurer skill's migrate operation.`,
    );
  }
  const directivaEmails = (config.get("directiva_email") ?? [])
    .map((e) => e.toLowerCase())
    .filter(Boolean);

  const err = (tab: TabName, row: number, message: string) =>
    issues.push({ tab, row, severity: "error", message });
  const warn = (tab: TabName, row: number | null, message: string) =>
    issues.push({ tab, row, severity: "warning", message });

  // Roster
  const students: Student[] = [];
  const studentIds = new Set<string>();
  rowsOf.Roster.forEach((r, i) => {
    if (isBlankRow(r)) return;
    const row = rowNum(i);
    const id = str(r[0]);
    const active = bool(r[9]);
    if (!id) return err("Roster", row, "Missing student_id.");
    if (studentIds.has(id)) return err("Roster", row, `Duplicate student_id ${id}.`);
    if (!str(r[1])) return err("Roster", row, `Student ${id} has no name.`);
    if (active === null) return err("Roster", row, `Student ${id}: "active" must be TRUE or FALSE.`);
    studentIds.add(id);
    students.push({
      id,
      name: str(r[1]),
      momName: str(r[2]),
      momPhone: str(r[3]),
      momEmail: str(r[4]),
      dadName: str(r[5]),
      dadPhone: str(r[6]),
      dadEmail: str(r[7]),
      active,
      row,
    });
  });

  // Funds
  const funds: Fund[] = [];
  const fundById = new Map<string, Fund>();
  rowsOf.Funds.forEach((r, i) => {
    if (isBlankRow(r)) return;
    const row = rowNum(i);
    const id = str(r[0]);
    const type = oneOf(FUND_TYPES, r[2]);
    const status = oneOf(FUND_STATUSES, r[6]);
    const price = toCents(r[3]);
    const total = toCents(r[4]);
    if (!id) return err("Funds", row, "Missing fund_id.");
    if (fundById.has(id)) return err("Funds", row, `Duplicate fund_id ${id}.`);
    if (!type) return err("Funds", row, `Fund ${id}: invalid type "${str(r[2])}".`);
    if (!status) return err("Funds", row, `Fund ${id}: invalid status "${str(r[6])}".`);
    if (Number.isNaN(price) || (price !== null && price < 0))
      return err("Funds", row, `Fund ${id}: invalid price_per_student.`);
    if (Number.isNaN(total) || (total !== null && total < 0))
      return err("Funds", row, `Fund ${id}: invalid total_cost.`);
    const date = toIsoDate(r[5]);
    if (str(r[5]) && !date) warn("Funds", row, `Fund ${id}: date "${str(r[5])}" isn't YYYY-MM-DD; ignored.`);
    if (type === "class" && price === null)
      warn("Funds", row, `Fund ${id} has no price_per_student yet; goal shows as "to be determined" until it's set.`);
    if (type === "event" && total === null)
      warn("Funds", row, `Event ${id} has no total_cost yet; goal shows as "to be determined" until it's set.`);
    // Optional cost breakdown: an unreadable value is ignored with a warning, never fatal.
    const optMoney = (i: number, col: string) => {
      const v = toCents(r[i]);
      if (v === null) return null;
      if (Number.isNaN(v) || v < 0) {
        warn("Funds", row, `Fund ${id}: invalid ${col} "${str(r[i])}"; ignored.`);
        return null;
      }
      return v;
    };
    const fund: Fund = {
      id,
      name: str(r[1]) || id,
      type,
      priceCents: price,
      totalCostCents: total,
      date,
      status,
      notes: str(r[7]),
      venuePerKidCents: optMoney(8, "venue_per_kid"),
      venuePerAdultCents: optMoney(9, "venue_per_adult"),
      venueFlatFeeCents: optMoney(10, "venue_flat_fee"),
      revenuePerKidCents: optMoney(11, "revenue_per_kid"),
      revenuePerAdultCents: optMoney(12, "revenue_per_adult"),
      drinksSnacksCents: optMoney(13, "drinks_snacks"),
      row,
    };
    funds.push(fund);
    fundById.set(id, fund);
  });

  // Participants
  const participants: Participant[] = [];
  const seenParticipant = new Set<string>();
  rowsOf.Participants.forEach((r, i) => {
    if (isBlankRow(r)) return;
    const row = rowNum(i);
    const fundId = str(r[0]);
    const studentId = str(r[1]);
    const amountDue = toCents(r[2]);
    if (!fundById.has(fundId)) return err("Participants", row, `Unknown fund_id "${fundId}".`);
    if (!studentIds.has(studentId)) return err("Participants", row, `Unknown student_id "${studentId}".`);
    if (Number.isNaN(amountDue) || (amountDue !== null && amountDue < 0))
      return err("Participants", row, `Invalid amount_due.`);
    if (amountDue === null && fundById.get(fundId)!.type === "event")
      warn("Participants", row, `${studentId} in ${fundId} has no amount_due. Event rows shouldn't have blanks.`);
    if (fundById.get(fundId)!.type === "event" && !parseAttendees(str(r[3])))
      warn("Participants", row, `${studentId} in ${fundId}: attendees "${str(r[3])}" is blank or unreadable (use e.g. "2 adults, 1 kid"); left out of the budget headcount.`);
    const key = `${fundId}|${studentId}`;
    if (seenParticipant.has(key)) return err("Participants", row, `${studentId} is listed twice for ${fundId}.`);
    seenParticipant.add(key);
    participants.push({ fundId, studentId, amountDueCents: amountDue, attendees: str(r[3]), row });
  });

  // Ledger: per-row checks first
  let txns: Txn[] = [];
  const txnIds = new Set<string>();
  rowsOf.Ledger.forEach((r, i) => {
    if (isBlankRow(r)) return;
    const row = rowNum(i);
    const id = str(r[0]);
    const type = oneOf(TXN_TYPES, r[3]);
    const amount = toCents(r[4]);
    const date = toIsoDate(r[1]);
    const fundId = str(r[2]);
    if (!id) return err("Ledger", row, "Missing txn_id.");
    if (txnIds.has(id)) return err("Ledger", row, `Duplicate txn_id ${id}.`);
    txnIds.add(id);
    if (!date) return err("Ledger", row, `${id}: missing or invalid date.`);
    if (!type) return err("Ledger", row, `${id}: invalid type "${str(r[3])}".`);
    if (!fundById.has(fundId)) return err("Ledger", row, `${id}: unknown fund_id "${fundId}".`);
    if (amount === null || Number.isNaN(amount) || amount <= 0)
      return err("Ledger", row, `${id}: amount must be a positive number.`);
    const method = str(r[8]).toLowerCase();
    if (method && !(METHODS as readonly string[]).includes(method))
      warn("Ledger", row, `${id}: unknown method "${method}".`);
    const t: Txn = {
      id,
      date,
      fundId,
      type,
      amountCents: amount,
      studentId: str(r[5]),
      payee: str(r[6]),
      paidBy: str(r[7]),
      method,
      paymentRef: str(r[9]),
      receiptFileId: str(r[10]),
      publicDesc: str(r[11]),
      privateNotes: str(r[12]),
      reimbursesTxn: str(r[13]),
      row,
    };
    if ((type === "contribution" || type === "refund_family") && !studentIds.has(t.studentId))
      return err("Ledger", row, `${id}: ${type} needs a valid student_id (got "${t.studentId}").`);
    if (type === "expense") {
      if (!t.paidBy) return err("Ledger", row, `${id}: expense needs paid_by ("treasurer" or a name).`);
      if (!t.receiptFileId) warn("Ledger", row, `${id}: expense has no receipt.`);
      if (!t.publicDesc) warn("Ledger", row, `${id}: expense has no public_desc.`);
    }
    if (type === "reimburse_parent" && !t.reimbursesTxn)
      return err("Ledger", row, `${id}: reimburse_parent needs reimburses_txn.`);
    txns.push(t);
  });

  // Ledger: duplicate payment references (keep the first)
  const refs = new Map<string, string>();
  txns = txns.filter((t) => {
    if (!t.paymentRef || (t.type !== "contribution" && t.type !== "income")) return true;
    const prev = refs.get(t.paymentRef);
    if (prev) {
      err("Ledger", t.row, `${t.id}: payment_ref "${t.paymentRef}" was already logged in ${prev}; not counted.`);
      return false;
    }
    refs.set(t.paymentRef, t.id);
    return true;
  });

  // Ledger: reimbursements must point at an expense another parent paid, without overpaying it
  const byId = new Map(txns.map((t) => [t.id, t]));
  const reimbursedSoFar = new Map<string, number>();
  txns = txns.filter((t) => {
    if (t.type !== "reimburse_parent") return true;
    const exp = byId.get(t.reimbursesTxn);
    const bad = (m: string) => (err("Ledger", t.row, `${t.id}: ${m}`), false);
    if (!exp || exp.type !== "expense") return bad(`reimburses_txn "${t.reimbursesTxn}" isn't an expense.`);
    if (isTreasurer(exp.paidBy)) return bad(`${exp.id} was paid by the treasurer; nothing to reimburse.`);
    if (exp.fundId !== t.fundId) return bad(`fund ${t.fundId} doesn't match ${exp.id}'s fund ${exp.fundId}.`);
    const total = (reimbursedSoFar.get(exp.id) ?? 0) + t.amountCents;
    if (total > exp.amountCents) return bad(`pays back more than ${exp.id}'s amount.`);
    reimbursedSoFar.set(exp.id, total);
    return true;
  });

  return { students, funds, participants, txns, directivaEmails, issues };
}
