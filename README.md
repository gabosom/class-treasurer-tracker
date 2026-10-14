# Tesorería de LaCross 1A 2026

Ledger and dashboards for the LaCross 1A class treasury (school year 2026-27).

- `docs/DESIGN.md`: design, data model, decisions
- `agent/class-treasurer/SKILL.md`: the skill the treasurer's OpenClaw agent follows to write data
  (versioned; see `agent/CHANGELOG.md`)
- `docs/AGENT_SETUP_PROMPT.md`: first-time message for the agent
- `docs/LOCAL_SETUP_PROMPT.md`: Google Cloud reader account + Google sign-in setup, for local Claude Code

## Pages and who can see them

| Page | Who | How they get in |
|---|---|---|
| `/directiva` **Directiva** (default tab; `/` redirects here): per-family status with receipt links, reimbursements, budgets, transactions | directiva | shared **directiva code** (`DIRECTIVA_CODE`), remembered 30 days, and/or **Google sign-in** for emails in the Sheet's `Config` tab |
| `/reportes` **Reportes** (simple view to screenshot for the class group chat: totals, events, expenses) | directiva | same login |
| `/directiva/movimientos` Full transaction history | directiva | same login |
| `/api/receipt/<id>` Receipt images | directiva | same login; only files referenced in the Ledger |

**For now there is no families/public view** (decision D16): both tabs are for the directiva, and
anyone not signed in is sent to the directiva sign-in. The families-code mechanism is still in the
code, but nothing uses it, so `FAMILIES_CODE` can be left unset. Changing the directiva code logs
everyone out.

**Demo mode:** if `SHEET_ID` isn't set, the app shows a fictional class (`src/fixtures/demo.ts`)
with a "Modo demo" banner and **no sign-in at all**. Real data only loads when `SHEET_ID` is set,
and then the codes and sign-in above are always enforced.

## Deploying: environment variables

Set these in Vercel → Project → Settings → Environment Variables (Production, and Preview if you
use preview deploys). Redeploy after changing them.

### Required for real data

| Variable | Example | What it is |
|---|---|---|
| `SHEET_ID` | `1KkmQm69pmdNL3-GcoDDpB8s_FIVYjPQziySqN3FrSLs` | The Google Sheet with the books. **Leave unset for demo mode.** |
| `GOOGLE_READER_SA_JSON_B64` | *(long base64 string)* | The `treasurer-reader` service account key, base64-encoded: `base64 -i reader-sa.json \| tr -d '\n'`. Read-only access to the Sheet and receipts. Created in Part A of `docs/LOCAL_SETUP_PROMPT.md`. |
| `AUTH_SECRET` | *(random)* | Signs the login cookies. Generate with `openssl rand -base64 32`. Changing it logs everyone out. |
| `DIRECTIVA_CODE` | *(hard to guess)* | Code you share with directiva members; opens both tabs. Not case-sensitive. Remove it once everyone uses Google sign-in. |
| `FAMILIES_CODE` | *(leave unset)* | Not used for now (no families view, D16). If set, it must differ from `DIRECTIVA_CODE`. |

### Optional: Google sign-in for directiva (later)

Set these to show an "Entrar con Google" button on `/directiva`. Only emails listed as
`directiva_email` rows in the Sheet's `Config` tab (plus `OWNER_EMAIL`) get in. Setup steps are in
Part B of `docs/LOCAL_SETUP_PROMPT.md`.

| Variable | Example | What it is |
|---|---|---|
| `AUTH_GOOGLE_ID` | `1234-abc.apps.googleusercontent.com` | OAuth "Web application" client ID |
| `AUTH_GOOGLE_SECRET` | *(secret)* | That client's secret |
| `NEXTAUTH_URL` | `https://lacross-1a2026-tesoreria.vercel.app` | Production URL. Must match the OAuth redirect URI `<url>/api/auth/callback/google`. Production only. |
| `OWNER_EMAIL` | `gabosom@gmail.com` | Always allowed in with Google, even if the Sheet can't be read |

### Going live checklist

1. Part A of `docs/LOCAL_SETUP_PROMPT.md`: reader service account, folder shared as Viewer.
2. Vercel: set `SHEET_ID`, `GOOGLE_READER_SA_JSON_B64`, `AUTH_SECRET`, `DIRECTIVA_CODE`.
3. Redeploy. The demo banner disappears and both tabs ask for the directiva code.
4. Check that the Sheet's `Config` `schema_version` matches the app (currently **5**). If it doesn't,
   the directiva view shows the error; ask the agent to update its skill and run `migrate`.
5. Later: Google sign-in (Part B), then remove `DIRECTIVA_CODE`.

## Development

Next.js (App Router) on Vercel. Money math lives in `src/lib/ledger.ts` (spec: `docs/DESIGN.md`
§5); Sheet parsing and checks in `src/lib/parse.ts`; access rules in `src/lib/auth.ts`.

```bash
npm install
npm run dev                  # no SHEET_ID → demo mode: fictional data, no sign-in
npm test                     # calculations, checks, privacy of the families view
npm run lint && npm run typecheck
```

To try the codes locally, copy `.env.example` to `.env.local` and set `SHEET_ID` (any value
turns demo mode off; without real Google credentials the pages show a "can't load the Sheet" error,
which is enough to test sign-in).

**When the Sheet schema or agent procedures change:** update `SKILL.md`, bump `skill_version`
(and `schema_version` if tabs or columns change, with migration steps), add a CHANGELOG entry,
update `docs/DESIGN.md`, then tell the treasurer to send the agent: *"Update the class-treasurer
skill from the repo."*
