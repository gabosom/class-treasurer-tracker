# Class Treasurer Tracker — Design

Status: **draft for review**. Nothing gets built until this is agreed.
School year: 2026–27.

---

## 1. Goals and non-goals

**Goals**
1. One trustworthy ledger for all class money: what was collected, from whom, for what, and where it went.
2. Proof for every expense (a receipt), and a clear list of who is owed reimbursement.
3. Two dashboards:
   - **Families**: totals and expenses only, no per-family information.
   - **Directiva**: everything, including who has and hasn't paid, by child.
4. Low upkeep: the treasurer sends receipts and payments in chat, and Claude records them.

**Non-goals (v1)**
- Taking payments in the app (no Stripe). Money still moves by Venmo, Zelle or cash.
- Automatic reminders or notifications. Possible later: generate a ready-to-paste WhatsApp reminder.
- Multiple classes or school years in one Sheet. Each school year gets its own Sheet.
- Directiva editing from the app. Only the treasurer (and Claude) write to the Sheet.

---

## 2. Architecture

```
            Treasurer (by hand)          Claude (from chat)
                    \                        /
                     ▼                      ▼
        ┌─────────────────────────────────────────┐
        │  Google Sheet  (private; source of truth)│
        │  Google Drive  /Receipts (private)       │
        └─────────────────────────────────────────┘
                     │  read-only service account
                     ▼
        ┌─────────────────────────────────────────┐
        │  Next.js app on Vercel (server-side)    │
        │  - reads raw tabs, checks them,          │
        │    computes all totals                   │
        │  - families view gets totals only        │
        └─────────────────────────────────────────┘
               │                         │
        /  (class code)          /directiva (Google sign-in,
         Families                 allowed emails only)
```

**Rules**
- The Sheet and the receipts are **never** shared publicly or "published to web."
- All reading and math happen on the server. The families page never receives a name.
- The app is **read-only** against Google. It holds no write credentials.
- Money is stored and computed in **integer cents** to avoid rounding errors.

---

## 3. Data model (Google Sheet tabs)

The app reads only the tabs below. Headers are fixed, and dropdowns keep entries clean.
The treasurer can add any number of other tabs (formulas, scratch work); the app ignores them.

### `Students`
| column | example | notes |
|---|---|---|
| student_id | `S07` | stable; never reused |
| student_name | `Sofía M.` | shown only on the directiva view |
| family_id | `F04` | |
| active | `TRUE` | FALSE if the student leaves mid-year |

### `Families`
| column | example | notes |
|---|---|---|
| family_id | `F04` | |
| family_name | `Martínez` | |
| parents | `Ana, Luis` | |
| contact | phone/email | private |
| payment_aliases | `@ana-mtz; Luis Martinez` | Venmo/Zelle names, used to match incoming payments |

### `Funds`
| column | example | notes |
|---|---|---|
| fund_id | `CLASS-1`, `EV-ZOO` | |
| name | `Fondo de clase` | shown publicly |
| type | `class` \| `event` | |
| price_per_student | `40.00` | what each participant owes |
| est_cost | `380.00` | events: expected total cost |
| goal | `1000.00` | class fund: target to raise |
| buffer_pct | `10` | used to suggest a price; not enforced |
| date | `2026-11-14` | event date, or when collection opens |
| status | `planned` \| `collecting` \| `closed` | `closed` moves the surplus to the class fund |

### `Participants`
Which students owe what for each fund.
| column | example | notes |
|---|---|---|
| fund_id | `EV-ZOO` | |
| student_id | `S07` | |
| amount_due_override | `0` / blank | for waivers, discounts, joining late |
| extra_attendees | `1` | **open question Q1**: parents or siblings paying to attend |

For `class` funds, every active student is a participant automatically. Rows here are needed only for overrides.

### `Ledger`
One row for each movement of money. The treasurer and Claude are the only ones who add rows.

| column | example | notes |
|---|---|---|
| txn_id | `T0042` | stable ID; receipts and corrections point to it |
| date | `2026-10-02` | |
| fund_id | `CLASS-1` | |
| type | see below | |
| amount | `23.47` | always positive; `type` decides the direction |
| family_id | `F04` | contributions and refunds only |
| payee | `Costco` / `Ana Martínez` | expenses and reimbursements |
| paid_by | `treasurer` \| family_id | expenses only: who actually paid |
| method | `venmo` \| `zelle` \| `cash` \| `card` | |
| payment_ref | `VNM-8812` | groups split rows from one real payment |
| receipt | Drive file ID | expenses |
| public_desc | `Protector solar` | **the only free text the families view shows** |
| private_notes | `Ana paid, reimburse` | directiva only |
| reimburses_txn | `T0040` | reimbursements: which expense this pays back |

**Transaction types**

| type | effect on the fund | effect on the treasurer's cash |
|---|---|---|
| `contribution` | + | + |
| `income` (bake sale, donation not tied to a family) | + | + |
| `expense` | − | − if `paid_by=treasurer`, otherwise 0 (that parent is now owed) |
| `reimbursement` | 0 | − (settles what's owed) |
| `refund` | − | − |
| `transfer` (pair of rows: out of one fund, into another) | −/+ | 0 |

### `Config`
Key/value settings: `directiva_emails`, `school_year`, `default_buffer_pct`.
The allowed directiva emails live here so you can add a member without redeploying.

---

## 4. Calculations

All of these live in one TypeScript module with unit tests. These definitions *are* the spec.

- **Amount due (student, fund)** = `amount_due_override` if set, otherwise `price_per_student`.
- **Family paid (fund)** = sum of that family's `contribution` minus `refund` rows for the fund.
- **Student status**: a family's payments are applied to its students in `student_id` order.
  The result is `paid` / `partial` / `unpaid` / `waived` (due = 0).
  - Overpayment counts as a donation to that fund, not a credit (**Q4**).
- **Fund balance** = contributions + income + transfers in − expenses − refunds − transfers out.
- **Owed reimbursements** = expenses where `paid_by ≠ treasurer`, minus linked reimbursements.
- **Treasurer cash (class money)** = sum of all fund balances − owed reimbursements.
  This is the number that should match the money set aside in the bank (see §8).
- **Event view**:
  - expected = Σ due
  - collected
  - spent
  - surplus = collected − spent
  - projected surplus = expected − est_cost
- **Suggested event price** = `ceil(est_cost / participants × (1 + buffer) / 5) × 5`.
- **Closing an event**: Claude adds a `transfer` pair that moves the surplus to the class fund
  (or moves money from the class fund to cover a shortfall). It's visible, never done silently.

---

## 5. Views

### Families (`/`, shared class code)
- Cash on hand, and money committed to upcoming events.
- Class fund: raised vs. goal (progress bar), spent, remaining.
- Each event: cost vs. collected vs. spent, and the surplus or shortfall.
- Expense list: date, `public_desc`, fund, amount, a "view receipt" link.
- Never shown: names, per-family status, `private_notes`, `paid_by`, reimbursement details.
- **Q5**: show participation counts ("12 of 15 paid") or only dollar amounts?
  Counts on small events can point to specific families.

### Directiva (`/directiva`, Google sign-in + allowed emails)
- For each fund, a table by child: due / paid / status. Filters for unpaid and partial.
- Reimbursements owed: who is owed, how much, and which expense it's for.
- Data problems: rows that failed checks (with Sheet row numbers), expenses with no receipt,
  payments not matched to a family.
- Last refresh time and a "refresh now" button.

### Receipts
`/api/receipt/[fileId]` streams the file from Drive through the service account,
and only to someone signed in (with either level of access). No public Drive links.
**Q5b**: should families see receipt images, or only that a receipt exists?

---

## 6. Data checks and failure behavior

On every read, the app checks:
- the required tabs and headers are present
- IDs are unique and every reference points to something that exists
- types and amounts are valid
- transfer pairs balance
- reimbursements point to real expenses

- A **structural** error (renamed tab, missing column) fails the refresh.
  Vercel keeps serving the last good version, and the directiva view shows the error.
- A **row-level** error drops that row from the math and lists it under "data problems."
  The page still loads.
- The families view never shows errors, only the last good numbers with an "updated at" time.

Refresh: pages rebuild every 5 minutes, plus the manual refresh on the directiva page.

---

## 7. Operating workflows (treasurer ↔ Claude in chat)

| You send | Claude does |
|---|---|
| Receipt photo + "sunscreen, class fund, Ana paid" | Reads vendor, date and amount → uploads to `Drive/Receipts/<fund>/YYYY-MM-DD_vendor_amount.jpg` → adds an `expense` row → replies with the row it wrote |
| "Martínez paid $80 Zelle, class fund" | Adds a `contribution` row |
| Venmo/bank export pasted every couple of weeks | Matches payments to families using `payment_aliases`, adds rows, lists anything it couldn't match for you to resolve |
| "Zoo trip, ~$380, these kids opted in" | Creates the fund, suggests a price with the buffer, adds participants |
| "Close the zoo trip" | Moves the surplus to the class fund, sets status to closed |
| "I paid Ana back" | Adds a `reimbursement` row linked to the expense |
| Monthly: "set-aside balance is $X" | Checks it against the ledger and explains any difference |

Claude writes the row and tells you what it wrote. Corrections are new edits, and Sheet version history is the audit trail.

---

## 8. Money handling (treasurer's own account)

You've chosen to keep class money in your personal account. To keep that defensible:
- **Strongly recommended:** a free second account or sub-account nicknamed "Class Fund."
  Reconciliation is then simply "account balance = treasurer cash."
- **Minimum:** a fixed payment note format, `Clase – <child> – <fund>`. Also, never pay class
  expenses from cash without a receipt row the same week.
- If the money stays mixed in your main account, the monthly reconciliation becomes "the ledger is
  internally consistent and every inflow has a matching bank line." That's weaker, and it's the one
  number a skeptical parent can't independently check.

---

## 9. Tech choices

- Next.js (App Router) + TypeScript, Tailwind. Deployed on Vercel.
- `googleapis` (Sheets v4 + Drive v3) with a read-only service account.
- `zod` to check rows. `vitest` for the calculations module (most of the test effort goes here).
- Auth.js with the Google provider for directiva. A signed cookie and middleware for the families code.
- Environment variables: `GOOGLE_SERVICE_ACCOUNT_JSON`, `SHEET_ID`, `RECEIPTS_FOLDER_ID`,
  `FAMILIES_CODE`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.

---

## 10. Risks to verify before building

1. **Can Claude write to Sheets and upload images to Drive through the connected Google tools?**
   If image upload doesn't work, the fallback is that you drop receipts into the Drive folder and
   Claude only writes the ledger row and links it.
2. **Families sharing the class code.** It will be forwarded, and that's acceptable because the
   view only has totals. Change the code each year.
3. **Sheet edits breaking the structure.** Mitigated by protected header rows, dropdowns, and the
   failure behavior in §6.
4. **The weak bank reconciliation (§8).**

---

## 11. Build phases (after sign-off)

1. Sheet template: tabs, headers, dropdowns, protected ranges. Load the roster, the class fund, and the existing sunscreen and soccer ball expenses.
2. Calculations module + tests (no UI).
3. Next.js: Sheets reader + checks → directiva view → families view → receipt proxy → auth.
4. Vercel setup checklist (you): service account, environment variables, Google OAuth client.
5. Live use: the chat workflows in §7.

---

## 12. Open questions

| # | Question | Proposed default |
|---|---|---|
| Q1 | Do events charge per student only, or also for parents and siblings who attend? | Per student; `extra_attendees` column available if needed |
| Q2 | UI language? | Spanish, with English labels toggle later if wanted |
| Q3 | Does anyone besides you edit the Sheet? | No, only you and Claude |
| Q4 | A family overpays: donation or credit toward the next event? | Donation to that fund |
| Q5 | Families view: participation counts or only dollar amounts? | Dollar amounts only for events; counts for the class fund |
| Q5b | Can families see receipt images? | Yes, behind the class code; Claude flags any receipt showing a full card number or home address |
| Q6 | Create a new Sheet template, or build from your roster spreadsheet? | New template; paste the roster in |
| Q7 | Class fund goal: how is it set, and is it public? | Public goal; price × active students |
| Q8 | Are funds collected before the school year (carryover from last year)? | Opening balance as an `income` row |
