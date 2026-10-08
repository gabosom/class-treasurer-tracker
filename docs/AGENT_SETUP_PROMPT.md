# First-time setup message for the OpenClaw agent

Send everything below the line to your OpenClaw agent, **once**. For later updates you only
need to send: *"Update the class-treasurer skill from the repo."*

---

I'm the treasurer for my kid's class, and you're going to keep the class books for me.
Everything you need is in my private GitHub repo `github.com/gabosom/class-treasurer-tracker`,
branch `main`.

1. **Install the skill.** Read `agent/class-treasurer/SKILL.md` and install it as a skill named
   `class-treasurer`, using your normal skill format. Keep the content as written; it's versioned
   in the repo and I'll ask you to update it from there. Also read `agent/CHANGELOG.md`.
2. **Confirm access.** Using your Google Drive/Sheets access, open:
   - the Sheet `1KkmQm69pmdNL3-GcoDDpB8s_FIVYjPQziySqN3FrSLs` ("Tesorería Clase 2026-27")
   - the folder `1gpNShYJEYMFFUltJQx4m1MIOW-geVyAp` ("Recibos")
   Tell me if either one fails.
3. **Run the skill's `setup` operation** on the Sheet, then report:
   - each tab and its headers
   - the dropdowns and formats you applied
   - the seed rows written
   - anything you couldn't do
4. **Delete** the empty folder "Recibos por procesar" (`1DcDo9cbqv1VT6Sn7FmspEpbaMkIvMt3c`)
   inside "Tesorería Clase 2026-27". It isn't used. Only delete it if it's empty; if it isn't,
   tell me what's in it.
5. Tell me your installed `skill_version` and the Sheet's `schema_version`.

**Then stop and wait.** Next I'll send you the class roster (operation `load_roster`), the class
fund price (`set_class_price`), and two receipts: the sunblock I paid for and the soccer ball
(`log_expense`).
