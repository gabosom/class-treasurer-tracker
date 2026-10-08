# Setup prompt for local Claude Code

Paste everything below the line into Claude Code on your machine. It runs in two parts:
- **Part A** (now): Google Cloud project, two service accounts, sharing, the Sheet template, and
  a test of whether a service account can move files.
- **Part B** (after the app is built): Google sign-in for the directiva page, and Vercel.

Part A involves no OAuth app and no Google review. Your only manual step is sharing one folder.

---

You are helping me set up the infrastructure for my class treasurer tracker. The repo is
`github.com/gabosom/class-treasurer-tracker` (private). The design is in `docs/DESIGN.md` on branch
`design/initial-design`. Read §2 and §3 before starting; it's the source of truth.
My Google account is gabosom@gmail.com (personal Gmail, no Workspace).

These already exist in my Drive, owned by me. **Don't create new ones.**
- Parent folder "Tesorería Clase 2026-27": `1_ZzQ8Cm2Tl3H8ek9fiF20weMa67uSIzH`
- `SHEET_ID` = `1KkmQm69pmdNL3-GcoDDpB8s_FIVYjPQziySqN3FrSLs` (empty Sheet)
- `INBOX_FOLDER_ID` = `1DcDo9cbqv1VT6Sn7FmspEpbaMkIvMt3c` ("Recibos por procesar")
- `RECEIPTS_FOLDER_ID` = `1gpNShYJEYMFFUltJQx4m1MIOW-geVyAp` ("Recibos")
- `CLASS-1` receipts subfolder: `1F05YnkQRstbGnmN9fE-eDs3VYJva9pLi`

## Ground rules
- **Never print, log, commit or paste key contents.** Keys live only in `~/.config/class-treasurer/`
  with permissions `600`. Add `.env*` and credential paths to `.gitignore` before the first commit.
- Neither service account gets IAM roles on the project. Their only access is the folder share.
- Ask me before anything that costs money or can't be undone. Nothing here needs billing.
- If a step fails, stop and tell me exactly what failed. Don't work around it silently.

## Part A — do now

1. **Check prerequisites.** Confirm `gcloud`, `node` (≥20) and `git` are installed, and that
   `gcloud auth list` shows gabosom@gmail.com. If not, walk me through `gcloud auth login`.
2. **Clone the repo** (if not already present), check out `design/initial-design`, and create a
   branch `setup/sheet-template` from it.
3. **Create the Google Cloud project.** The ID is `class-treasurer-2627`, with a random suffix if
   that's taken. Enable `sheets.googleapis.com` and `drive.googleapis.com`.
4. **Create two service accounts, each with a JSON key:**
   - `treasurer-writer` → `~/.config/class-treasurer/writer-sa.json`
   - `treasurer-reader` → `~/.config/class-treasurer/reader-sa.json`
   Show me both emails.
5. **Stop and have me share the parent folder** "Tesorería Clase 2026-27" in the Drive web UI.
   Wait until I confirm:
   - `treasurer-writer` → **Editor**
   - `treasurer-reader` → **Viewer**
   - uncheck "Notify people"
   Then confirm from the API that each account can see the Sheet and the three folders.
6. **File-handling test.** Use the writer account with the `drive` scope.
   a. Ask me to upload any photo into "Recibos por procesar" from my phone or the browser.
   b. **Rename** it to `TEST_rename.jpg`. Expected to work.
   c. **Move** it into the `CLASS-1` subfolder: `files.update` with `addParents`/`removeParents`.
      Report exactly whether it worked, with the full error if it didn't.
   d. Try to **upload** a 10-byte text file. Expected: `403 storageQuotaExceeded`. Show the error.
   e. Put the photo back in the inbox under its original name, if possible, and tell me if I need
      to delete anything.
   This decides how receipts get filed (DESIGN.md §2). Write the result into DESIGN.md §2,
   replacing the "Unverified" bullet.
7. **Write `scripts/setup-sheet.ts`** using the writer account and the `spreadsheets` scope. It
   must be safe to run more than once: it creates what's missing and never deletes or duplicates
   data rows. It should:
   - **Tabs and headers**: create these tabs with these headers in row 1, in this exact order:
     - `Roster`: student_id, student_name, mom_name, mom_phone, mom_email, dad_name, dad_phone, dad_email, payment_aliases, active
     - `Funds`: fund_id, name, type, price_per_student, total_cost, date, status
     - `Participants`: fund_id, student_id, amount_due_override
     - `Ledger`: txn_id, date, fund_id, type, amount, student_id, payee, paid_by, method, payment_ref, receipt_file_id, public_desc, private_notes, reimburses_txn
     - `Config`: key, value
   - Delete the default `Sheet1`, but only if it's empty.
   - Freeze row 1 everywhere, make headers bold, and protect row 1 with a **warning-only** protection.
   - **Dropdowns** (invalid values **rejected**):
     - `Funds.type`: class, event, events_pool
     - `Funds.status`: collecting, closed
     - `Ledger.type`: contribution, income, expense, reimbursement, refund, transfer_out, transfer_in
     - `Ledger.method`: venmo, zelle, cash, card, other
     - `Ledger.fund_id` and `Participants.fund_id`: values from `Funds!A2:A`
     - `Ledger.student_id` and `Participants.student_id`: values from `Roster!A2:A`
     - `Roster.active`: checkbox
   - **Formats**:
     - USD currency for `price_per_student`, `total_cost`, `amount`, `amount_due_override`
     - `yyyy-mm-dd` for dates
     - plain text for every `*_id` and `*_phone` column
   - **Seed rows**, only if missing:
     - `Funds`: `CLASS-1`, "Fondo de clase 2026-27", class, (blank, price to be set), (blank), (blank), collecting
     - `Funds`: `EVENTS-POOL`, "Fondo de eventos", events_pool, (blank), (blank), (blank), collecting
     - `Config`: `school_year` = `2026-27`
     - `Config`: `directiva_email` = `gabosom@gmail.com` (one row per email)

   Add a `package.json` with only what the script needs (`googleapis`, `tsx`, `typescript`), and an
   npm script `setup:sheet`. Key paths come from environment variables, defaulting to
   `~/.config/class-treasurer/`.
8. **Run it twice.** The second run must change nothing. Then:
   - Read every tab's header row back and show me.
   - Using the **reader** account with read-only scopes, read `Config!A1:B3` and list the
     `Recibos` folder.
   - Using the reader, try writing one cell. It must fail.
9. **Commit and push** to `setup/sheet-template`: the script, `package.json`, the lockfile,
   `.gitignore`, and the DESIGN.md update from step 6. No credentials. Don't open a pull request.
10. **Hand off the writer to my cloud Claude environment:**
    - Copy the base64 key to my clipboard with
      `base64 -i ~/.config/class-treasurer/writer-sa.json | tr -d '\n' | pbcopy`.
    - Tell me to add these environment variables in the claude.ai/code cloud environment for this
      repo (environment menu in the session title bar → Edit):
      - `GOOGLE_WRITER_SA_JSON_B64` = (clipboard)
      - `SHEET_ID`, `INBOX_FOLDER_ID`, `RECEIPTS_FOLDER_ID` (values above)
    - If its network access is restricted, it must allow `oauth2.googleapis.com`,
      `sheets.googleapis.com` and `www.googleapis.com`.
    - Clear the clipboard afterward (`pbcopy < /dev/null`).
11. **Summarize** for me:
    - project ID, both service account emails
    - the step 6 results (rename / move / upload)
    - the branch pushed, and anything left undone

## Part B — only when I say "do part B" (after the app exists)

1. **Google sign-in for the directiva page.** This uses only the basic `openid`, `email` and
   `profile` scopes, which **need no Google review**. Guide me through the console:
   - OAuth consent screen: type External, app name "Tesorería Clase", those three scopes only.
     Then **Publish app → In production**. With basic scopes only, this is a single click with
     no review. If the console says review is required, stop and tell me.
   - OAuth client of type **Web application**, with these redirect URIs:
     `http://localhost:3000/api/auth/callback/google` and `https://<vercel-domain>/api/auth/callback/google`.
2. **Vercel** (Hobby plan): install and log in to the `vercel` CLI, link the project to the repo,
   and set these env vars for Production and Preview with `vercel env add`:
   - `GOOGLE_READER_SA_JSON_B64`: base64 of `reader-sa.json`, piped in, never echoed
   - `SHEET_ID`, `RECEIPTS_FOLDER_ID`, `INBOX_FOLDER_ID`
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
   - `FAMILIES_CODE` (ask me what code to use)

   **Never** put the writer key on Vercel.
3. **Deploy and smoke test.**
   - `/` asks for the class code.
   - `/directiva` lets gabosom@gmail.com in and rejects any other Google account.
   - A receipt link loads only after logging in.
   Report the results.
