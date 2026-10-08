# class-treasurer skill — changelog

Newest first. Each entry lists `skill_version` and `schema_version`. When `schema_version`
changes, the entry includes **Migration** steps that the agent's `migrate` operation runs in order.

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
