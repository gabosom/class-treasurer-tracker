# class-treasurer skill — changelog

Newest first. Each entry lists `skill_version` and `schema_version`. When `schema_version`
changes, the entry includes **Migration** steps that the agent's `migrate` operation runs in order.

## 1.4.0 — 2026-10-08 — schema 5
- schema_version → 5
- Funds tab: new optional column `drinks_snacks` (additional drinks/snacks budget for an event).
  The dashboard's planned total is now venue subtotal + `drinks_snacks`, and it flags a
  difference from `total_cost`. Before, drinks/snacks was whatever was left of `total_cost`.
- Removed the `Config` keys `price_per_kid` / `price_per_adult`. No more default prices: a blank
  `revenue_per_*` or venue column just hides that line on the dashboard.
- The folder "Recibos por procesar" was deleted; the skill no longer mentions it.
- **Migration 4 → 5** (run `migrate` after updating):
  1. Write the header `drinks_snacks` in `Funds!N1` (after `revenue_per_adult`). Apply USD currency
     format to `Funds!N2:N2000`.
  2. For each event with `total_cost` and at least one venue column set, fill `drinks_snacks` =
     `total_cost` − venue subtotal (kids × venue_per_kid + adults × venue_per_adult +
     venue_flat_fee, counting kids/adults from that event's `Participants.attendees`). That's the
     amount the dashboard showed before. For `EV-2026-10-FLIP-ZONE`: 660 − 551 = **109.00**.
     Show the treasurer the values before writing.
  3. If an event has a blank `revenue_per_kid` / `revenue_per_adult` and `Config` has
     `price_per_kid` / `price_per_adult`, copy that value into the event's column. Then delete the
     `price_per_kid` and `price_per_adult` rows from `Config`.
  4. Set `Config.schema_version` = `5`.

## 1.3.2 — 2026-10-08 — schema 4
- Wording only: the dashboard budget has no surplus line and no "max" scenario; it shows revenue,
  venue costs, drinks/snacks and the planned total cost for the families in `Participants`.
- **Migration:** none.

## 1.3.1 — 2026-10-08 — schema 4
- New rule 12: no blanks in event `Participants` rows. Only confirmed families get a row, always
  with both `amount_due` and `attendees`. Unconfirmed families or blank survey answers get no row.
- The dashboard budget now counts only the families in `Participants` (no "max" scenario), and
  flags any event row with a blank or unreadable `attendees` note under "data problems".
- **Migration:** none.

## 1.3.0 — 2026-10-08 — schema 4
- schema_version → 4
- Funds tab: 5 new optional columns for event cost breakdown (`venue_per_kid`, `venue_per_adult`,
  `venue_flat_fee`, `revenue_per_kid`, `revenue_per_adult`)
- `create_event` populates these when a cost breakdown is given
- Documented the optional `Config` keys `price_per_kid` / `price_per_adult` (default prices charged
  to families; the fund's `revenue_per_*` columns override them)
- The dashboard shows an event budget when `venue_per_kid` is set; it reads kid/adult counts from
  `Participants.attendees`, so keep that note readable (`2 adults, 1 kid` or `2 adultos + 1 niño`).
- **Migration 3 → 4** (run `migrate` after updating):
  1. Append these 5 headers to row 1 of the `Funds` tab, after `notes` (I1:M1): `venue_per_kid`,
     `venue_per_adult`, `venue_flat_fee`, `revenue_per_kid`, `revenue_per_adult`. No data rows to migrate.
  2. Apply USD currency format to `Funds!I2:M2000`.
  3. Set `Config.schema_version` = `4`.

## 1.2.0 — 2026-10-08 — schema 3
- **No more `EVENTS-POOL` and no more transfers.** Event leftovers stay as each event's balance;
  the dashboard sums all event balances live. `close_event` just sets status and reports.
- Removed `Funds.type` `events_pool` and `Ledger.type` `transfer_out` / `transfer_in`.
- Rule 11 rewritten: class and event money never mix; nothing is moved between funds.
- **Migration 2 → 3** (run `migrate` after updating):
  1. Check that no `Ledger` row has `fund_id` = `EVENTS-POOL` or type `transfer_out`/`transfer_in`.
     If any exist, **stop and show them to the treasurer**. Don't delete ledger rows.
  2. Delete the `EVENTS-POOL` row from `Funds` (Funds rows may be deleted for this migration only).
  3. Update dropdowns: `Funds.type` → `class, event`; `Ledger.type` → `contribution, income,
     expense, reimburse_parent, refund_family`.
  4. Set `Config.schema_version` = `3`.

## 1.1.0 — 2026-10-08 — schema 2
- Event costs vary per family (siblings and adults attend), so each attending family gets its own
  `amount_due` in `Participants`. There's no per-student price for events anymore.
- `Participants` columns: `amount_due_override` → **`amount_due`**, plus a new **`attendees`** column.
- `create_event` / `update_participants` rewritten; §5 "Due" definition updated.
- **Migration 1 → 2** (run `migrate` after updating):
  1. `Participants!C1`: change the header from `amount_due_override` to `amount_due`. Existing values stay as they are.
  2. `Participants!D1`: write the header `attendees`, plain-text format for D2:D2000.
  3. Make sure `Participants!C2:C2000` uses USD currency format.
  4. For every event in `Funds` (type `event`): clear `price_per_student` if it's set, and tell the
     treasurer which events need a participant list with amounts (currently `EV-2026-10-FLIP-ZONE`).
  5. Set `Config.schema_version` = `2`.

## 1.0.2 — 2026-10-08 — schema 1
- New rule 9: no bank account, card, routing or ID numbers in any cell (confirmation numbers go
  in `payment_ref`).
- New rule 10: dates must be real dates displayed as `yyyy-mm-dd` (Funds.date for Flip Zone was
  written as the serial number 46313).
- **One-time fixes** (no schema change):
  1. Re-apply `yyyy-mm-dd` date format to `Funds!F2:F2000` and `Ledger!B2:B2000`, and confirm that
     `EV-2026-10-FLIP-ZONE`'s date shows as `2026-10-18`.
  2. In T0003's `private_notes`, remove the bank account number (keep "Banco Pichincha" and the
     comprobante number, which is already in `payment_ref`). Use `correct_row`; the treasurer
     authorized this fix when sending the update.
- **Migration:** none.

## 1.0.1 — 2026-10-08 — schema 1
- Fix §5: class money in the treasurer's account = Σ fund balances **+** pending reimbursements
  (was "−"). Only affects `status` answers.
- **Migration:** none.

## 1.0.0 — 2026-10-08 — schema 1
- First version.
- Tabs: Roster, Funds, Participants, Ledger, Config (see SKILL.md §3).
- Operations: setup, load_roster, set_class_price, log_expense, log_contribution, create_event,
  update_participants, close_event, reimburse_parent, refund_family, log_income, add_student /
  update_roster, correct_row, status, migrate, update_skill.
- **Migration:** none. Run `setup` on the empty Sheet.
