# Setup prompt for local Claude Code

Paste everything below the line into Claude Code on your machine. It runs in two parts:
- **Part A** (now): Google Cloud, the service account, the Sheet and its template.
- **Part B** (after the app is built): sign-in client and Vercel.

You'll be asked to do two short things in the browser: create the Sheet and folder, and share
them. Those must be owned by you, not by the service account.

---

You are helping me set up the infrastructure for my class treasurer tracker. The repo is
`github.com/gabosom/class-treasurer-tracker` (private). The design is in `docs/DESIGN.md` on branch
`design/initial-design`. Read §2 and §3 of it before starting; it's the source of truth.
My Google account is gabosom@gmail.com (personal Gmail, no Workspace).

## Ground rules
- **Never print, log, commit or paste the service account key's contents.** Save it only to
  `~/.config/class-treasurer/sa.json` with permissions `600`. Put `*.json` key paths and `.env*`
  in `.gitignore` before any commit.
- The service account gets **no IAM roles** on the project. Its only access comes from me sharing
  the Sheet (Editor) and the Receipts folder (Viewer) with it.
- Ask me before anything that costs money or can't be undone. Nothing here needs billing.
- If a step fails, stop and tell me exactly what failed. Don't work around it silently.

## Part A — do now

1. **Check prerequisites.** Confirm `gcloud`, `node` (≥20) and `git` are installed, and that
   `gcloud auth list` shows gabosom@gmail.com. If not, walk me through `gcloud auth login`.
2. **Clone the repo** (if not already present) and check out `design/initial-design`.
   Create a branch `setup/sheet-template` from it.
3. **Create the Google Cloud project.** The ID is `class-treasurer-2627`, with a random suffix if
   that's taken. Enable `sheets.googleapis.com` and `drive.googleapis.com`.
4. **Create the service account** `treasurer-bot` (display name "Class Treasurer Bot"), create a
   JSON key, and save it as described in the ground rules. Tell me its email address.
5. **Stop and have me do this in the browser** (wait for me to confirm):
   - Create a Google Sheet named **"Tesorería Clase 2026-27"** in my Drive.
   - Create a Drive folder named **"Recibos 2026-27"**.
   - Share the Sheet with the service account as **Editor**, and the folder as **Viewer**.
     Uncheck "Notify people."
   - Paste both URLs to you. Extract `SHEET_ID` and `RECEIPTS_FOLDER_ID` from them.
6. **Write `scripts/setup-sheet.ts`** in the repo, using `googleapis` with the service account key
   and the `spreadsheets` scope. It must be **safe to run more than once**: it creates what's
   missing and fixes headers, but never deletes or duplicates data rows. It should:
   - Create these tabs with these headers in row 1, in this exact order:
     - `Roster`: student_id, student_name, mom_name, mom_phone, mom_email, dad_name, dad_phone, dad_email, payment_aliases, active
     - `Funds`: fund_id, name, type, price_per_student, total_cost, date, status
     - `Participants`: fund_id, student_id, amount_due_override
     - `Ledger`: txn_id, date, fund_id, type, amount, student_id, payee, paid_by, method, payment_ref, receipt_file_id, public_desc, private_notes, reimburses_txn
     - `Config`: key, value
   - Delete the default empty `Sheet1`, but only if it's empty.
   - Freeze row 1 on every tab. Make headers bold. Protect row 1 with a **warning-only** protection.
   - Add dropdowns, with invalid values **rejected**:
     - `Funds.type`: class, event, events_pool
     - `Funds.status`: collecting, closed
     - `Ledger.type`: contribution, income, expense, reimbursement, refund, transfer_out, transfer_in
     - `Ledger.method`: venmo, zelle, cash, card, other
     - `Ledger.fund_id` and `Participants.fund_id`: values from `Funds!A2:A`
     - `Ledger.student_id` and `Participants.student_id`: values from `Roster!A2:A`
     - `Roster.active`: checkbox
   - Formats:
     - currency (USD) for `price_per_student`, `total_cost`, `amount`, `amount_due_override`
     - `yyyy-mm-dd` for date columns
     - plain text for every `*_id` and `*_phone` column, so Sheets doesn't mangle IDs or phone numbers
   - Seed data, only if missing:
     - `Funds` row: `EVENTS-POOL`, "Fondo de eventos", events_pool, (blank), (blank), (blank), collecting
     - `Config` row: `school_year`, `2026-27`
     - `Config` row: `directiva_email`, `gabosom@gmail.com` (one row per email; more get added later)
   Add a `package.json` with only what the script needs (`googleapis`, `tsx`, `typescript`), and an
   npm script `setup:sheet` that reads `SHEET_ID` and the key path from environment variables.
7. **Run it twice.** The second run must change nothing. Then read every tab's header row back
   through the API and show me the result.
8. **Commit and push** to `setup/sheet-template`: the script, `package.json`, the lockfile and
   `.gitignore`. Don't open a pull request.
9. **Hand off the secrets to my cloud Claude environment.** Don't show me the key in chat.
   - Create a base64 version of the key. On macOS, copy it straight to my clipboard with
     `base64 -i ~/.config/class-treasurer/sa.json | tr -d '\n' | pbcopy`.
   - Then tell me to open the claude.ai/code cloud environment for this repo (environment menu in
     the session title bar → Edit) and add these environment variables:
     - `GOOGLE_SERVICE_ACCOUNT_JSON_B64` = (paste from clipboard)
     - `SHEET_ID` = …
     - `RECEIPTS_FOLDER_ID` = …
   - Also tell me that if the environment's network access is restricted, it must allow
     `sheets.googleapis.com`, `www.googleapis.com` and `oauth2.googleapis.com`.
   - Clear the clipboard afterward (`pbcopy < /dev/null`) once I confirm.
10. **Summarize**: project ID, service account email, SHEET_ID, RECEIPTS_FOLDER_ID, the branch
    pushed, and anything left undone.

## Part B — only when I say "do part B" (after the app exists)

1. **Google sign-in for the directiva page.** This can't be fully scripted, so guide me through
   the Cloud Console step by step:
   - OAuth consent screen: type **External**, app name "Tesorería Clase", scopes `openid`,
     `email` and `profile` only. Set the publishing status to **In production**. These basic scopes
     need no Google verification.
   - OAuth client of type **Web application**, with these redirect URIs:
     `http://localhost:3000/api/auth/callback/google` and
     `https://<vercel-domain>/api/auth/callback/google`.
   - I paste you the client ID and secret. You store them only in Vercel, never in the repo.
2. **Vercel** (Hobby plan): install and log in to the `vercel` CLI, link the project to the repo,
   and set these env vars for Production and Preview with `vercel env add`:
   - `GOOGLE_SERVICE_ACCOUNT_JSON_B64`, `SHEET_ID`, `RECEIPTS_FOLDER_ID`
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
   - `FAMILIES_CODE` (ask me what code to use)
3. **Deploy and smoke test.**
   - `/` asks for the class code.
   - `/directiva` lets gabosom@gmail.com in and rejects any other Google account.
   - A receipt link loads only after logging in.
   Report the results.
