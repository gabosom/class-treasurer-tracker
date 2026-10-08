// Sheet schema. Must match agent/class-treasurer/SKILL.md §3 for the same schema_version.

export const SCHEMA_VERSION = 2;

export const TABS = {
  Roster: [
    "student_id",
    "student_name",
    "mom_name",
    "mom_phone",
    "mom_email",
    "dad_name",
    "dad_phone",
    "dad_email",
    "payment_aliases",
    "active",
  ],
  Funds: ["fund_id", "name", "type", "price_per_student", "total_cost", "date", "status", "notes"],
  Participants: ["fund_id", "student_id", "amount_due", "attendees"],
  Ledger: [
    "txn_id",
    "date",
    "fund_id",
    "type",
    "amount",
    "student_id",
    "payee",
    "paid_by",
    "method",
    "payment_ref",
    "receipt_file_id",
    "public_desc",
    "private_notes",
    "reimburses_txn",
  ],
  Config: ["key", "value"],
} as const;

export type TabName = keyof typeof TABS;
export const TAB_NAMES = Object.keys(TABS) as TabName[];

export type Cell = string | number | boolean | null | undefined;
export type RawWorkbook = Partial<Record<TabName, Cell[][]>>;

export const FUND_TYPES = ["class", "event", "events_pool"] as const;
export const FUND_STATUSES = ["collecting", "closed"] as const;
export const TXN_TYPES = [
  "contribution",
  "income",
  "expense",
  "reimburse_parent",
  "refund_family",
  "transfer_out",
  "transfer_in",
] as const;
export const METHODS = ["venmo", "zelle", "cash", "card", "other"] as const;

export type FundType = (typeof FUND_TYPES)[number];
export type FundStatus = (typeof FUND_STATUSES)[number];
export type TxnType = (typeof TXN_TYPES)[number];
export type Pot = "class" | "events";

export const TREASURER = "treasurer";

export interface Student {
  id: string;
  name: string;
  momName: string;
  momPhone: string;
  momEmail: string;
  dadName: string;
  dadPhone: string;
  dadEmail: string;
  active: boolean;
  row: number;
}

export interface Fund {
  id: string;
  name: string;
  type: FundType;
  priceCents: number | null;
  totalCostCents: number | null;
  date: string | null;
  status: FundStatus;
  notes: string;
  row: number;
}

export interface Participant {
  fundId: string;
  studentId: string;
  /** events: what this family owes (required); class fund: exception to price_per_student */
  amountDueCents: number | null;
  attendees: string;
  row: number;
}

export interface Txn {
  id: string;
  date: string;
  fundId: string;
  type: TxnType;
  amountCents: number;
  studentId: string;
  payee: string;
  paidBy: string;
  method: string;
  paymentRef: string;
  receiptFileId: string;
  publicDesc: string;
  privateNotes: string;
  reimbursesTxn: string;
  row: number;
}

export interface Issue {
  tab: TabName | "General";
  row: number | null;
  /** error = row left out of the math; warning = row counted but needs attention */
  severity: "error" | "warning";
  message: string;
}

export interface Workbook {
  students: Student[];
  funds: Fund[];
  participants: Participant[];
  txns: Txn[];
  directivaEmails: string[];
  issues: Issue[];
}

export function potOf(type: FundType): Pot {
  return type === "class" ? "class" : "events";
}

export class StructuralError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StructuralError";
  }
}
