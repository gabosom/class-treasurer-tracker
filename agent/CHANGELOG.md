# class-treasurer skill — changelog

Newest first. Each entry lists `skill_version` and `schema_version`. When `schema_version`
changes, the entry includes **Migration** steps that the agent's `migrate` operation runs in order.

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
