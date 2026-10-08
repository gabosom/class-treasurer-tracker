# class-treasurer-tracker

Ledger and dashboards for a school class treasury (2026-27).

- `docs/DESIGN.md`: design, data model, decisions
- `agent/class-treasurer/SKILL.md`: the skill the treasurer's OpenClaw agent follows to write data
  (versioned; see `agent/CHANGELOG.md`)
- `docs/AGENT_SETUP_PROMPT.md`: first-time message for the agent
- `docs/LOCAL_SETUP_PROMPT.md`: Google Cloud reader account + Vercel setup, for local Claude Code

**When the Sheet schema or agent procedures change:** update `SKILL.md`, bump `skill_version`
(and `schema_version` if tabs or columns change, with migration steps), add a CHANGELOG entry,
update `docs/DESIGN.md`, then tell the treasurer to send the agent: *"Update the class-treasurer
skill from the repo."*
