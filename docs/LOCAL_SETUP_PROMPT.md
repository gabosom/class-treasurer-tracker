# Setup prompt for local Claude Code

Paste everything below the line into Claude Code on your machine. It runs in two parts:
- **Part A** (now): Google Cloud, the OAuth app + writer token, the service account, the Sheet and its template.
- **Part B** (after the app is built): sign-in client and Vercel.

You'll do a few clicks in the Google Cloud Console (the OAuth consent screen can't be fully
scripted) and approve one Google sign-in. The script creates the Sheet and folder for you.

---

You are helping me set up the infrastructure for my class treasurer tracker. The repo is
`github.com/gabosom/class-treasurer-tracker` (private). The design is in `docs/DESIGN.md` on branch
`design/initial-design`. Read §2 (especially "Two Google credentials") and §3 before starting; it's the source of truth.
My Google account is gabosom@gmail.com (personal Gmail, no Workspace).

## Ground rules
- **Never print, log, commit or paste secret values** (the service account key, OAuth client
  secret, refresh token). Store them only under `~/.config/class-treasurer/` with permissions `600`.
  Add `.env*` and any credential paths to `.gitignore` before the first commit.
- The service account gets **no IAM roles** on the project. Its only access is a Viewer share on the
  Sheet and the folder.
- Ask me before anything that costs money or can't be undone. Nothing here needs billing.
- If a step fails, stop and tell me exactly what failed. Don't work around it silently.

## Part A — do now

1. **Check prerequisites.** Confirm `gcloud`, `node` (≥20) and `git` are installed, and that
   `gcloud auth list` shows gabosom@gmail.com. If not, walk me through `gcloud auth login`.
2. **Clone the repo** (if not already present) and check out `design/initial-design`.
   Create a branch `setup/sheet-template` from it.
3. **Create the Google Cloud project.** The ID is `class-treasurer-2627`, with a random suffix if
   taken. Enable `sheets.googleapis.com` and `drive.googleapis.com`.
4. **Create the reader service account** `treasurer-reader` (display name "Class Treasurer
   Reader"). Create a JSON key and save it to `~/.config/class-treasurer/reader-sa.json`.
   Tell me its email.
5. **OAuth app.** This is console work: give me direct links and exact clicks, and wait for me to
   confirm each step.
   - OAuth consent screen (Google Auth Platform):
     - user type **External**, app name "Tesorería Clase", support email gabosom@gmail.com
     - scopes `openid`, `email`, `profile`, `https://www.googleapis.com/auth/drive.file`
     - then **Publish app → In production**. This step is required: in Testing, refresh tokens
       expire after 7 days. These scopes don't need Google's review.
   - Create an OAuth client of type **Desktop app** named "Treasurer writer". I download its JSON
     to `~/.config/class-treasurer/writer-client.json`.
6. **Write `scripts/authorize-writer.ts`** and run it. It does a one-time local OAuth flow
   (loopback redirect) for scope `drive.file` only, with `access_type=offline` and `prompt=consent`.
   It saves the refresh token to `~/.config/class-treasurer/writer-token.json`.
   I'll see an "unverified app" warning. That's expected because it's my own app: Advanced →
   continue.
7. **Prove the service account can't upload.** I want this confirmed with evidence, not assumed.
   Using `reader-sa.json` with the full `drive` scope, try to upload a 10-byte text file to the
   service account's own Drive. Expected result: `403 storageQuotaExceeded`. Show me the error
   message.
   - If the upload unexpectedly **succeeds**, stop. Tell me, then delete the test file.
   - Either way, the design keeps writes on the user token: §2 explains why a write-limited token is preferable.
8. **Write `scripts/setup-sheet.ts`** using the writer token (`drive.file` scope). It must be safe
   to run more than once: it creates what's missing and never deletes or duplicates data rows.
   It should:
   - **Create the files** if `~/.config/class-treasurer/ids.json` doesn't exist yet:
     - a spreadsheet named **"Tesorería Clase 2026-27"** and a Drive folder **"Recibos 2026-27"**
     - share both with the reader service account as **reader**, with no notification email
     - save `SHEET_ID` and `RECEIPTS_FOLDER_ID` to `ids.json`
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
     - `Funds`: `EVENTS-POOL`, "Fondo de eventos", events_pool, (blank), (blank), (blank), collecting
     - `Config`: `school_year` = `2026-27`
     - `Config`: `directiva_email` = `gabosom@gmail.com` (one row per email)

   Add a `package.json` with only what these scripts need (`googleapis`, `tsx`, `typescript`) and npm
   scripts `authorize:writer` and `setup:sheet`. Credential paths come from environment variables,
   defaulting to `~/.config/class-treasurer/`.
9. **Run `setup:sheet` twice.** The second run must change nothing. Then:
   - Read every tab's header row back and show me.
   - Using the **reader** service account (read-only scopes), read `Config!A1:B3` and list the
     folder's contents. This proves the Vercel credential works.
   - Give me the Sheet URL. It should show up in my own Drive, owned by me.
10. **Commit and push** to `setup/sheet-template`: the scripts, `package.json`, the lockfile and
    `.gitignore`. No credentials. Don't open a pull request.
11. **Hand off the writer secrets to my cloud Claude environment**, one value at a time:
    - Copy each value to my clipboard with `pbcopy`, wait for me to say "next," then go to the next one.
    - Tell me to add each as an environment variable in the claude.ai/code cloud environment for
      this repo (environment menu in the session title bar → Edit):
      `GOOGLE_WRITER_CLIENT_ID`, `GOOGLE_WRITER_CLIENT_SECRET`, `GOOGLE_WRITER_REFRESH_TOKEN`,
      `SHEET_ID`, `RECEIPTS_FOLDER_ID`.
    - Tell me that if its network access is restricted, it must allow `oauth2.googleapis.com`,
      `sheets.googleapis.com` and `www.googleapis.com`.
    - Clear the clipboard at the end (`pbcopy < /dev/null`).
12. **Summarize** for me:
    - project ID, reader service account email, SHEET_ID, RECEIPTS_FOLDER_ID
    - the step 7 result
    - the branch pushed, and anything left undone

## Part B — only when I say "do part B" (after the app exists)

1. **Google sign-in for the directiva page.** Reuse the consent screen from step A5. Guide me
   through creating a second OAuth client, type **Web application**, with these redirect URIs:
   `http://localhost:3000/api/auth/callback/google` and `https://<vercel-domain>/api/auth/callback/google`.
2. **Vercel** (Hobby plan): install and log in to the `vercel` CLI, link the project to the repo,
   and set these env vars for Production and Preview with `vercel env add`:
   - `GOOGLE_SERVICE_ACCOUNT_JSON_B64`: base64 of `reader-sa.json`, piped straight in, never echoed
   - `SHEET_ID`, `RECEIPTS_FOLDER_ID`
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (from the Web client)
   - `FAMILIES_CODE` (ask me what code to use)

   **Never** put the writer token on Vercel.
3. **Deploy and smoke test.**
   - `/` asks for the class code.
   - `/directiva` lets gabosom@gmail.com in and rejects any other Google account.
   - A receipt link loads only after logging in.
   Report the results.
