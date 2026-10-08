# Class Treasurer Tracker — Design

Status: **draft v2 for review**. Nothing gets built until this is agreed.
School year: 2026–27.

---

## 1. Goals and non-goals

**Goals**
1. One trustworthy ledger for all class money: what was collected, from which student, for what, and where it went.
2. Proof for every expense (a receipt), and a clear list of who is owed reimbursement.
3. Two dashboards, both in Spanish and English (a language dropdown in the header):
   - **Families**: totals and expenses only, no per-family information.
   - **Directiva**: everything, including who has and hasn't paid, by child.
4. Low upkeep: the treasurer sends receipts and payments in chat, and Claude records them.

**Non-goals (v1)**
- Taking payments in the app. Money still moves by Venmo, Zelle or cash into the treasurer's account.
- Bank reconciliation. Class money sits in the treasurer's personal account, so the ledger is the
  only record. Decided; not revisited.
- Reminders and notifications.
- Directiva editing from the app. Only the treasurer (and Claude) write to the Sheet.
- Multiple school years in one Sheet. Each year gets a new Sheet.

---

## 2. Architecture

```
        Treasurer (by hand)               Claude (cloud session, from chat)
                │                          │ "writer" token: acts as the treasurer,
                │                          │ scope drive.file (only files this app created)
                ▼                          ▼
   ┌───────────────────────────────────────────────────┐
   │ Google Sheet (owned by the treasurer; private)    │
   │ Drive folder /Recibos (owned by the treasurer)    │
   └───────────────────────────────────────────────────┘
                │  service account, Viewer share + READ-ONLY scope
                ▼
   ┌───────────────────────────────────────────────────┐
   │ Next.js on Vercel (Hobby plan)                    │
   │ reads raw tabs → checks them → computes totals    │
   │ on the server                                     │
   └───────────────────────────────────────────────────┘
          │                               │
    /  Families (class code)      /directiva (Google sign-in, allowed emails)
```

**Rules**
- The Sheet and the receipts are never shared publicly or "published to web."
- All math happens on the server. The families page never receives a name.
- The deployed app asks Google only for **read-only** access. Writing happens only from Claude's
  session and from the treasurer.
- Money is stored and computed in integer cents.

**Refresh (Vercel Hobby).** No cron job is needed. A page that's more than 5 minutes old rebuilds
the next time someone opens it; on Hobby this runs on visits, not on a schedule, so the once-a-day
cron limit doesn't matter. Both views also have a **Refresh now** button that rebuilds immediately.
Sheets API usage at this scale is far below Google's free limits.

**Two Google credentials, one per job.**
- **Writer (Claude's cloud session and setup scripts):** an OAuth refresh token for the treasurer's
  own account, limited to the `drive.file` scope. That scope only reaches files *this app created*:
  the Sheet and the Recibos folder (the setup script creates both). It can't see anything else in
  the treasurer's Drive. Files it uploads are owned by the treasurer, so they use the treasurer's
  storage.
- **Reader (the Vercel app):** a service account shared as **Viewer** on the Sheet and folder,
  requesting read-only scopes. If the deployed app were ever compromised, it couldn't change anything.

Why the writer isn't a service account: a service account has **zero Drive storage**, so uploading a
receipt fails with `storageQuotaExceeded`, even into a folder you shared with it. Each uploaded file
would be owned by the service account and count against its storage, not yours. Google's fixes
(shared drives, domain-wide delegation) need Google Workspace, and this is a personal Gmail account.
A service account *can* edit a Sheet you share with it, but receipts need the user token anyway, so
one writer is simpler. The setup script tests this before relying on it (setup prompt, step A7).

The OAuth app must be set to **In production**, not Testing. In Testing, refresh tokens expire
after 7 days. `drive.file` and basic sign-in scopes don't require Google's app review.

---

## 3. Data model (Google Sheet tabs)

Fixed headers, dropdowns where possible, protected header row. The app reads only these tabs.
The treasurer can add any number of other tabs (formulas, reports); the app ignores them.

### `Roster` — one row per student (students and parents in one tab, so no lookups needed)
| column | example | notes |
|---|---|---|
| student_id | `S07` | stable; never reused |
| student_name | `Sofía Martínez` | directiva view only |
| mom_name / mom_phone / mom_email | | |
| dad_name / dad_phone / dad_email | | |
| payment_aliases | `@ana-mtz; Luis Martinez` | names Venmo/Zelle payments show up under; used for matching |
| active | `TRUE` | FALSE if the student leaves mid-year |

Siblings in the same class are two rows with the same parent details. Because there's no family
table, **every contribution is recorded per student** (see `Ledger`). A Venmo covering two kids
becomes two ledger rows that share a `payment_ref`. Claude does this split.

### `Funds`
| column | example | notes |
|---|---|---|
| fund_id | `CLASS-1`, `EV-2026-11-ZOO`, `EVENTS-POOL` | |
| name | `Fondo de clase 2026–27` | shown on both views |
| type | `class` \| `event` \| `events_pool` | |
| price_per_student | `40.00` | what each participant owes (see below) |
| total_cost | `380.00` | events only: the total you give (buffer already included) |
| date | `2026-11-14` | event date |
| status | `collecting` \| `closed` | |

- **Class fund**: you set `price_per_student`. Every active student owes it.
  Goal = price × active students (computed, not typed).
- **Event**: you give Claude `total_cost` and the list of students who opted in. Claude sets
  `price_per_student = ceil(total_cost ÷ participants)` to the whole dollar and writes it down.
  **The price is fixed once written, and doesn't change automatically** if someone joins or drops.
  Otherwise families who already paid would suddenly owe a different amount. If participation
  changes a lot, you decide whether to re-price, and Claude updates it.
- **`EVENTS-POOL`**: a single fund that holds event leftovers (see §4).

### `Participants` — events only
| column | example | notes |
|---|---|---|
| fund_id | `EV-2026-11-ZOO` | |
| student_id | `S07` | |
| amount_due_override | blank / `0` / `20` | waiver or a different price for this student |

The class fund needs no rows here; every active student is included. Add a row only to override one student's amount.

### `Ledger`
| column | example | notes |
|---|---|---|
| txn_id | `T0042` | stable |
| date | `2026-10-02` | |
| fund_id | `CLASS-1` | |
| type | see below | |
| amount | `23.47` | always positive; `type` decides the direction |
| student_id | `S07` | contributions and refunds |
| payee | `Costco` | expenses, reimbursements |
| paid_by | `treasurer` or a name | expenses: who actually paid |
| method | `venmo` \| `zelle` \| `cash` \| `card` | |
| payment_ref | `VNM-8812` | links the rows split from one real payment |
| receipt_file_id | Drive file ID | expenses |
| public_desc | `Protector solar` | the **only** free text the families view shows |
| private_notes | `Ana pagó, reembolsar` | directiva only |
| reimburses_txn | `T0040` | reimbursements only |

| type | fund | treasurer's cash |
|---|---|---|
| `contribution` | + | + |
| `income` (donation, carryover, bake sale) | + | + |
| `expense` | − | − if `paid_by=treasurer`; otherwise 0 and that person is owed |
| `reimbursement` | 0 | − (settles what's owed) |
| `refund` | − | − |
| `transfer_out` / `transfer_in` (rows always come in pairs) | −/+ | 0 |

### `Config`
`directiva_emails` (one per row), `school_year`, `families_code_hint`.
The allowed directiva emails live here so you can add a member without redeploying.

---

## 4. Leftovers: two separate pots of money

| Pot | Fed by | Can pay for |
|---|---|---|
| **Class** (`CLASS-*`) | class fund contributions | class things only. Leftovers stay in the class fund. |
| **Events** (`EV-*` + `EVENTS-POOL`) | event contributions | events only. |

- **Closing an event**: its leftover moves into `EVENTS-POOL` (a transfer pair). If it came up
  short, the gap is covered from `EVENTS-POOL`, if the pool has enough.
- `EVENTS-POOL` can help pay for a future event (a transfer into that event).
- **Money can never move between the class and events pots.** The app rejects any transfer that
  crosses that line and lists it as a data error. If the pool can't cover a shortfall, the event
  shows a deficit and you decide (charge more, or make a one-off decision).

Buffer: none tracked. You include it in `total_cost` when you give it to Claude.

---

## 5. Calculations (unit-tested; these definitions are the spec)

- **Due (student, fund)**: the override if set, otherwise `price_per_student`.
  Applies to active students for the class fund, and to rows in `Participants` for events.
- **Paid (student, fund)**: contributions − refunds for that student and fund.
- **Status**: `paid` (paid ≥ due), `partial`, `unpaid`, `waived` (due = 0).
- **Fund balance**: contributions + income + transfer_in − expenses − refunds − transfer_out.
- **Owed reimbursements**: expenses with `paid_by ≠ treasurer`, minus linked reimbursements.
- **Treasurer cash**: Σ fund balances − owed reimbursements.
  This is the money that should be sitting in your account for the class.
- **Event summary**:
  - total cost
  - expected (Σ due)
  - collected
  - spent
  - leftover (collected − spent)
- **Pot totals**: Class = Σ class funds. Events = Σ open event balances + `EVENTS-POOL`.

---

## 6. Views

A header dropdown switches **ES / EN** (default ES). The choice is saved in a cookie.
Interface labels are translated; text from the Sheet (fund names, descriptions) is shown as typed.

### Families (`/`, shared class code)
- Two pot cards: Class and Events. Each shows its balance.
- Class fund: raised vs. goal progress bar, "20 of 24 students," spent, remaining.
- Each event: total cost, collected, spent, leftover. **Dollar amounts only, no headcounts**,
  because counts on small events point to specific families.
- Expense list: date, `public_desc`, fund, amount, receipt link.
- Never shown: names, per-student status, `private_notes`, `paid_by`, reimbursement details.

### Directiva (`/directiva`, Google sign-in, emails from `Config`)
- For each fund, a table by child: due / paid / status, plus parent contact. Filters: unpaid, partial.
- Reimbursements owed: who, how much, and which expense it's for.
- Data problems: failed checks with Sheet row numbers, expenses with no receipt.
- Last refresh time and the **Refresh now** button.

### Receipts
`/api/receipt/[fileId]` streams the file from Drive through the service account, only to someone
who is signed in (families or directiva). There are no public Drive links. The Receipts folder is
shared with the service account as **Viewer**.

---

## 7. Data checks and failure behavior

Checks run on every read:
- required tabs and headers are present
- IDs are unique, and every reference points to something that exists
- valid types, and amounts greater than zero
- transfers come in pairs and never cross between the class and events pots
- reimbursements point to real expenses

- A **structural** error (renamed tab, missing column) fails the rebuild. The last good page keeps
  being served, and the directiva view shows the error.
- A **row-level** error leaves that row out of the math and lists it under "data problems."
- The families view never shows errors. It shows the last good numbers with an "updated at" time.

---

## 8. Operating workflows (treasurer ↔ Claude)

| You send | Claude does |
|---|---|
| Receipt photo + "sunscreen, class fund, Ana paid" | Reads vendor, date and amount → uploads to `Receipts/<fund_id>/YYYY-MM-DD_vendor_amount.jpg` → adds an `expense` row → replies with the row it wrote |
| "Martínez paid $80 Zelle, class fund" | Adds one `contribution` row per child, linked by `payment_ref` |
| Venmo/Zelle history pasted every couple of weeks | Matches payers using `payment_aliases`, adds rows, lists anything it couldn't match |
| "Zoo, $380 total, these kids are in" | Creates the fund, sets a fixed price, adds participants |
| "Close the zoo trip" | Moves the leftover (or covers the gap) to/from `EVENTS-POOL`, sets status to closed |
| "I paid Ana back" | Adds a `reimbursement` row linked to the expense |

Claude writes with the writer token, which is stored as a secret in the cloud environment and never
pasted into chat. It doesn't depend on the chat's Google Drive connector, which disconnects
from time to time. Sheet version history is the audit trail.

---

## 9. Tech

- Next.js (App Router) + TypeScript + Tailwind on Vercel Hobby.
- `googleapis`: Sheets v4 + Drive v3.
  The app uses read-only scopes (`spreadsheets.readonly`, `drive.readonly`).
- `zod` to check rows; `vitest` for the calculations module.
- Auth.js with Google for directiva. A signed cookie and middleware for the families code.
- Language: a small `es`/`en` dictionary, no i18n framework.
- Vercel environment variables (reader): `GOOGLE_SERVICE_ACCOUNT_JSON_B64`, `SHEET_ID`,
  `RECEIPTS_FOLDER_ID`, `FAMILIES_CODE`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
- Claude cloud environment variables (writer): `GOOGLE_WRITER_CLIENT_ID`,
  `GOOGLE_WRITER_CLIENT_SECRET`, `GOOGLE_WRITER_REFRESH_TOKEN`, `SHEET_ID`, `RECEIPTS_FOLDER_ID`.
  Never set on Vercel.

---

## 10. Risks

1. **Event price changes.** The price stays fixed once set (§3), so any re-pricing is your
   explicit decision.
2. **The class code gets forwarded.** Acceptable, since the families view only has totals.
   Change it every year.
3. **Someone breaks the Sheet's structure.** Mitigated by protected header rows, dropdowns, and
   the failure behavior in §7.
4. **No bank reconciliation.** Accepted (§1). The ledger's own consistency checks are what we have.
5. **Writer token revoked or expired** (password change, revoking access, the app left in
   Testing). Claude's writes fail loudly. Fix: re-run the one-time consent step locally and update
   the secret. A receipt doesn't count as filed until its Drive ID is in the Ledger.
6. **Writer token leaks.** Damage is limited to the Sheet and the Recibos folder, because of
   `drive.file`. Revoke it at myaccount.google.com → Security → Third-party access.

---

## 11. Build phases

0. **Setup (your local Claude Code, `docs/LOCAL_SETUP_PROMPT.md`)**: GCP project, OAuth app,
   writer token, service account, Sheet + Recibos folder, template tabs, secrets.
1. You paste the roster. Claude loads the class fund and the existing sunscreen and soccer ball expenses.
2. Calculations module + tests.
3. Next.js: reader + checks → directiva → families → receipt proxy → auth → ES/EN.
4. Deploy: Vercel project, OAuth client, environment variables (part B of the setup prompt).
5. Live use (§8).

---

## 12. Decisions log

| # | Question | Decision |
|---|---|---|
| Q1 | Class fund per student or per family? | Per student (no siblings share a class this year) |
| Q2 | Can `EVENTS-POOL` money go back to families? | No; it's spent on events |
| Q3 | Carryover from last year? | None |
| Q4 | Families view: headcounts? | Class fund: yes. Events: dollar amounts only |
