# Franmarine Vessel SMS

Branded web app for Franmarine Underwater Services vessel Safety Management Systems.
Stage 1: login → region-aware vessel dashboard (NSW / WA).
Stage 2: per-user **vessel induction** and **daily sign-on** gate before the SMS opens; the SMS
document packs (Integrity III, Rohani, Seagull) live in the private Supabase Storage bucket `sms-docs`
(path `<vessel-slug>/<section>/<file>.pdf`) and open via 5-minute signed URLs — RLS restricts them to
approved users in the vessel's region. `src/data/smsManifest.json` is the index (titles, codes, sizes).
To add or replace a pack: upload the PDFs to the bucket under the vessel's slug and regenerate the manifest.

Stack: Vite + React, React Router, Supabase (Auth + Postgres with row-level security).

## 1. Run it locally (demo mode, no Supabase needed)

```bash
npm install
npm run dev
```

Open the URL Vite prints. With no `.env.local`, the app runs in **demo mode**:

| Region | Email | Password |
|---|---|---|
| NSW | `nsw@franmarine.com.au` | `demo` |
| WA | `wa@franmarine.com.au` | `demo` |

## 2. Set up Supabase

1. Create a project at supabase.com (region: **Sydney**).
2. SQL Editor → paste `supabase/schema.sql` → Run. This creates `profiles`, `vessels`, the
   region-based RLS policies, and seeds placeholder vessels.
3. Authentication → Providers → Email: leave **Enable email provider** on. Turn **Confirm email** off
   if you want to invite users without them clicking a link (optional).
4. Authentication → Providers → Email: turn **Enable sign ups** ON (crew self-register from the login
   page). Keep **Confirm email** on so addresses are verified.
   - Accounts with an `@franmarine.com.au` email are approved automatically.
   - Any other email (casuals on Gmail etc.) is created as **pending**: they can log in but see an
     "Awaiting approval" screen until a manager approves them on the in-app **Crew** page.
   - Everyone starts as `crew`. Managers set `master` / `manager` on the Crew page. `admin` (sees all
     regions) is set directly in the `profiles` table — give yourself admin once:
     `update profiles set role='admin', status='approved' where email='kirby@franmarine.com.au';`
5. Project Settings → API: copy **Project URL** and **anon public** key.

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Restart `npm run dev` — the demo-mode note on the login page disappears and sign-in is live.

### Accounts

| Who | How they get in |
|---|---|
| Franmarine staff (`@franmarine.com.au`) | Login page → *Create crew account* → confirm email → active immediately |
| Casuals / subcontractor divers (any email) | Same, but sits in **Awaiting approval** until a manager taps Approve on the Crew page (red badge in the top bar shows how many are waiting) |
| Anyone a manager invites (Crew page → *Invite someone*) | Pre-approved with the chosen role. They get an email (if the `invite-crew` function is deployed) and/or the manager texts them the sign-up link via *Share link*. Registering with that email activates them immediately, any domain |
| Visitors / client reps | No account — vessel QR or master-led special-personnel sign-on |

**Invite emails** need the edge function deployed once:

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set APP_URL=https://<your-deployed-app>
supabase functions deploy invite-crew
```

Without it, *Invite someone* still pre-approves the person and *Share link* still works — only the
automatic email is missing (the app tells the manager so).

Pending/suspended accounts can log in but RLS blocks every induction and sign-on insert, so there is no
way round the approval. Managers can approve, suspend and set roles for their own region only; nobody
can change their own role or status (DB trigger).

### How the induction / sign-on gate works

Tapping a vessel runs `getVesselStatus()` (src/lib/compliance.js):

| Condition | What the user sees |
|---|---|
| No induction on file for this vessel | Induction wizard (11 topics from FUS-SMS-xx-04A §2.2, vessel-specific, each acknowledged, then a typed-name declaration) |
| SMS revision changed since their induction | Re-induction |
| Induction older than 12 months | Re-induction |
| No sign-on to that vessel for > 6 months | Re-induction (04A §2.1 absence rule) |
| Inducted, but not signed on today | Daily sign-on (role, master's name, 8 fitness-for-work declarations, typed signature) |
| Inducted and signed on today | SMS document tree |

Records land in `inductions` and `sign_ons` (one sign-on per user/vessel/day). Crew can only insert
and read their own; managers read their region; nothing is deleted (5-year retention, MO504 Sch 1 cl 9(7)).

Induction wording lives in `src/data/vessels.js` keyed by vessel `slug` — edit there when an SMS is
revised, and bump `sms_revision` in the `vessels` table to force re-induction for everyone.

### Today's crew, special personnel and the vessel QR

- **Today's crew** panel on the SMS page lists everyone signed on to that vessel today (crew + guests),
  with a count against the vessel's max persons. The master checks it against the verbal roll call.
- **Add special personnel** (master-led): the master hands their phone to the visitor, who completes the
  condensed special-personnel induction (FUS-SMS-xx-04 §2) and declaration. Stored in `guest_sign_ons`
  with `added_by` = the master.
- **Vessel QR** (manager/admin only, bottom of the SMS page): download or print. It encodes `/v/<slug>`.
  Signed-in crew scanning it go straight to their induction/sign-on; visitors get the public
  special-personnel form with no account. Anonymous inserts are limited by RLS to today's date on
  `guest_sign_ons` — nothing else is readable or writable with the anon key.
- Print the QR after deployment (the URL is taken from the running app, so a localhost QR is useless on
  the boat).

### Pre-departure checks (05A)

When the person who signed on as **Master** opens the SMS page they get a *Pre-departure checks not done
today* prompt. The checklist is the vessel's 05A §3–4 items (`src/data/predeparture.js`), each OK / Fail /
N/A with a note on fails. Items marked *critical* implement §5: any critical fail → **DO NOT DEPART** and
the record is saved as not fit to depart (an alert goes to managers). Non-critical fails are recorded with
the defect text. Saved to `pre_departures`; RLS only lets today's signed-on master insert for that vessel.

### Emergency drills (04B)

The SMS page has an *Emergency drills* panel: status per drill type (fire and MOB monthly; medical,
abandon vessel, flooding quarterly; diving monthly during campaigns) and the drill log. Today's master, or a
manager, taps *Record a drill*: type, date, location, scenario, participants (pre-ticked from today's crew
list, plus free-text names), outcome/deficiencies, corrective actions, notes, signed. Saved to `drills`.
Compliance has a *Drills* tab with the vessel × type status matrix and the full log, both exportable.

### Alerts

`src/lib/alerts.js` computes, per region:

| Alert | Overdue | Upcoming |
|---|---|---|
| Vessel SMS annual review (`sms_review_due`) | past due | within 60 days |
| Crew induction (12-month validity) | expired | within 30 days |
| Crew induction — SMS revised since inducted | immediately | — |
| Crew absence rule (6 months without sign-on) | past 183 days | from 150 days |
| Emergency drills per vessel per type (04 §4.1) | past interval, or never recorded | within 7 days (monthly) / 14 days (quarterly) |
| Pre-departure checks | crew signed on today, no 05A record | — |
| Not fit to depart | critical defect recorded today | — |
| Account awaiting approval | — | always listed |

Where they show: red **Alerts** badge in the top bar (overdue count, managers), *Alerts* panel at the top of
the dashboard (managers: region; crew: only their own inductions), and in full on **Compliance** with the
induction register, sign-on log and pre-departure log, each exportable to CSV.

**Daily email digest** (optional): deploy `supabase/functions/alerts-digest` and schedule it. It emails
every manager in the region (admins get all regions) each morning if anything is overdue or upcoming.
Uses Resend for delivery (free tier is fine).

```bash
supabase secrets set RESEND_API_KEY=re_xxx ALERT_FROM="Vessel SMS <sms@franmarine.com.au>" APP_URL=https://<app>
supabase functions deploy alerts-digest
```

Then schedule it in the SQL editor (06:30 Sydney = 19:30 UTC previous day; adjust for daylight saving):

```sql
create extension if not exists pg_cron; create extension if not exists pg_net;
select cron.schedule('alerts-digest', '30 19 * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/alerts-digest',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb) $$);
```

Test without sending: open `https://<project-ref>.supabase.co/functions/v1/alerts-digest?dry=1` with the
service role bearer.

### How the region split works

- Each user has one `profiles.region` (`NSW` or `WA`).
- The dashboard queries `vessels` filtered by that region.
- Postgres RLS (`vessels: read own region`) enforces the same rule server-side, so a NSW user
  cannot read WA rows even by calling the API directly. `admin` role bypasses the split.
- Managers can insert/update vessels in their own region (ready for the "add vessel" stage).

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Stage 1: login, region dashboard, vessel SMS landing"
gh repo create franmarine-vessel-sms --private --source=. --push
```

(or create the repo in the GitHub UI and `git remote add origin … && git push -u origin main`).

`.env.local` is git-ignored — never commit keys.

## 4. Deploy (optional, for phone trials)

Vercel or Netlify both work with zero config:

- Import the GitHub repo.
- Framework: Vite. Build `npm run build`, output `dist`.
- Add the two `VITE_SUPABASE_*` environment variables.
- Add a SPA rewrite so deep links work (Vercel: `vercel.json` already included).

Then in Supabase → Authentication → URL Configuration, add the deployed URL to **Site URL** /
**Redirect URLs**.

## Project layout

```
src/
  lib/supabase.js    client + DEMO_MODE switch
  lib/auth.jsx       AuthProvider / useAuth (Supabase or demo)
  lib/vessels.js     vessel queries
  lib/demoData.js    demo users + vessels
  pages/Login.jsx
  pages/Dashboard.jsx
  pages/VesselSms.jsx   SMS landing (document list placeholder)
  components/AppShell.jsx, StatusBadge.jsx
  styles.css         Franmarine palette (navy #244061)
supabase/schema.sql  tables, trigger, RLS, seed
```

## Next stages

1. Add / edit vessels + upload SMS packs from the app; WA fleet.
2. Certificate/equipment expiry register (COO, EPIRB battery, flares, extinguisher service) feeding alerts.
3. Incident / hazard reports; offline mode.
