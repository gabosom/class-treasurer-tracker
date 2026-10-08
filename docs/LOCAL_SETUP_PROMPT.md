# Setup prompt for local Claude Code

Paste everything below the line into Claude Code on your machine. It runs in two parts:
- **Part A** (now): Google Cloud project and the read-only service account the Vercel app uses.
- **Part B** (after the app is built): Google sign-in for the directiva page, and Vercel.

Setting up the Sheet's structure is **not** in here. Your OpenClaw agent does that with its skill
(`docs/AGENT_SETUP_PROMPT.md`).

---

You are helping me set up the infrastructure for my class treasurer tracker. The repo is
`github.com/gabosom/class-treasurer-tracker` (private). Read `docs/DESIGN.md` on `main`,
especially §2 and §3, before starting.
My Google account is gabosom@gmail.com (personal Gmail, no Workspace).

These already exist in my Drive, owned by me. **Don't create new ones.**
- Parent folder "Tesorería Clase 2026-27": `1_ZzQ8Cm2Tl3H8ek9fiF20weMa67uSIzH`
- `SHEET_ID` = `1KkmQm69pmdNL3-GcoDDpB8s_FIVYjPQziySqN3FrSLs`
- `RECEIPTS_FOLDER_ID` = `1gpNShYJEYMFFUltJQx4m1MIOW-geVyAp`

## Ground rules
- **Never print, log, commit or paste key contents.** Keys live only in `~/.config/class-treasurer/`
  with permissions `600`.
- The service account gets **no IAM roles** on the project. Its only access is a Viewer share.
- Ask me before anything that costs money or can't be undone. Nothing here needs billing.
- If a step fails, stop and tell me exactly what failed.

## Part A — do now

1. **Check prerequisites.** Confirm `gcloud`, `node` (≥20) and `git` are installed, and that
   `gcloud auth list` shows gabosom@gmail.com. If not, walk me through `gcloud auth login`.
2. **Create the Google Cloud project.** The ID is `class-treasurer-2627`, with a random suffix if
   that's taken. Enable `sheets.googleapis.com` and `drive.googleapis.com`.
3. **Create the service account** `treasurer-reader` ("Class Treasurer Reader"). Create a JSON
   key, save it to `~/.config/class-treasurer/reader-sa.json`, and show me the service account's email.
4. **Stop and have me share** the parent folder "Tesorería Clase 2026-27" with that email as
   **Viewer**, with "Notify people" unchecked. Wait for me to confirm.
5. **Verify with a throwaway script.** Don't commit it. Use the reader key and read-only scopes
   (`spreadsheets.readonly`, `drive.readonly`):
   - Read the Sheet's title and tab names.
   - List the `Recibos` folder.
   - Try writing one cell with the `spreadsheets` scope. It must fail with a permission error.
   Show me all three results.
6. **Summarize**: project ID, service account email, and the verification results. Leave the
   key where it is; Part B uses it.

## Part B — only when I say "do part B" (after the app exists)

1. **Google sign-in for the directiva page.** This uses only the `openid`, `email` and `profile`
   scopes, which need no Google review. Guide me through the console:
   - OAuth consent screen: type External, app name "Tesorería Clase", those three scopes only,
     then **Publish app → In production**. If the console says review is required, stop and tell me.
   - OAuth client of type **Web application**, with these redirect URIs:
     `http://localhost:3000/api/auth/callback/google` and `https://<vercel-domain>/api/auth/callback/google`.
2. **Vercel** (Hobby plan): install and log in to the `vercel` CLI, link the project to the repo,
   and set these env vars for Production and Preview with `vercel env add`:
   - `GOOGLE_READER_SA_JSON_B64`: base64 of `reader-sa.json`, piped in, never echoed
   - `SHEET_ID`, `RECEIPTS_FOLDER_ID`
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
   - `FAMILIES_CODE` (ask me what code to use)
3. **Deploy and smoke test.**
   - `/` asks for the class code.
   - `/directiva` lets gabosom@gmail.com in and rejects any other Google account.
   - A receipt link loads only after logging in.
   Report the results.
