# Deploy to Vercel + Supabase + GitHub

End-to-end checklist. Follow the steps in order. ~20 minutes start to finish.

---

## 1. Supabase - create the database

1. Go to https://supabase.com and sign in with GitHub.
2. Click **New Project**:
   - Name: `grievance-redressal` (anything works)
   - Database Password: click **Generate** and save it somewhere
   - Region: pick one close to you
   - Plan: **Free**
3. Wait ~2 minutes for the project to provision.

### Load the schema

1. Left sidebar -> **SQL Editor** -> **New query**.
2. Open the file `server/schema.sql` from this repo, copy its entire contents, paste into the editor.
3. Click **Run**. You should see `Success. No rows returned.`
4. Verify: left sidebar -> **Table editor**. You should see `users`, `grievances`,
   `grievance_attachments`, `grievance_history`, `grievance_notes`, `invites`, `notifications`.
5. Verify the storage bucket: left sidebar -> **Storage**. You should see a public bucket called **attachments**.

### Copy the credentials

Left sidebar -> **Project Settings** -> **API**. Copy two values:

- **Project URL** (e.g. `https://abcd1234.supabase.co`)
- **service_role** secret under "Project API keys" (long JWT starting with `eyJhbGci...`)

Keep these safe - the service_role key bypasses all security rules, so never expose it to the browser.

---

## 2. GitHub - push the code

If you haven't already:

```bat
cd C:\Users\91600\Desktop\cluadesetup\grievance-system
rmdir /s /q .git
git init -b main
git add .
git commit -m "Initial commit (Supabase edition)"
```

Create an empty repo at https://github.com/new (don't init a README), then:

```bat
git remote add origin https://github.com/YOUR-USERNAME/grievance-redressal-system.git
git push -u origin main
```

If you prefer GitHub CLI:
```bat
gh repo create grievance-redressal-system --public --source=. --remote=origin --push
```

---

## 3. Vercel - deploy

### Option A: Vercel dashboard (easier)

1. https://vercel.com/new
2. **Import** your GitHub repo
3. **Framework preset:** Other
4. **Root directory:** leave as `./`
5. **Environment variables** - add these four (all for Production, Preview, Development):

   | Name                      | Value                                       |
   |---------------------------|---------------------------------------------|
   | `SUPABASE_URL`            | your Supabase Project URL                   |
   | `SUPABASE_SERVICE_ROLE`   | your service_role secret                    |
   | `JWT_SECRET`              | any long random string (64+ chars)          |
   | `NODE_ENV`                | `production`                                |

   Optional:
   | `ADMIN_EMAILS`            | comma-separated emails auto-upgraded to admin at signup |
   | `CLIENT_ORIGIN`           | your Vercel URL once you know it            |

6. **Deploy**.

After the first deploy finishes, copy your live URL (e.g. `https://grievance-redressal-system.vercel.app`) and set `CLIENT_ORIGIN` to that, then **Redeploy** so invite emails contain the right link.

### Option B: Vercel CLI

```bat
npm i -g vercel
cd C:\Users\91600\Desktop\cluadesetup\grievance-system
vercel login
vercel
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE production
vercel env add JWT_SECRET production
vercel env add NODE_ENV production
vercel --prod
```

---

## 4. Verify

Hit `https://YOUR-PROJECT.vercel.app/api/health`. You should see:

```json
{"status":"ok","service":"grievance-api","runtime":"vercel","time":"..."}
```

Then open the root URL and log in with the 3 hardcoded accounts:

| Role               | Email                  | Password     |
|--------------------|------------------------|--------------|
| Grievance Officer  | admin@college.edu      | admin123     |
| Grievance Resolver | officer@college.edu    | officer123   |
| Student            | student@college.edu    | student123   |

These are inserted automatically into Supabase by the server the first time anything hits the API.

---

## 5. Local dev

```bat
cd server
copy .env.example .env
notepad .env
```

Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `JWT_SECRET`. Then:

```bat
npm install
npm run dev
```

Server starts on http://localhost:5000. Open the page there (it serves `client/` directly). The same 3 demo accounts work.

Run `node seed.js` to insert a few demo grievances into your Supabase project.

---

## 6. Continuous deploys

Because Vercel is linked to GitHub, every `git push` to `main` auto-deploys. No more `vercel --prod` needed. Preview deploys are created for every branch/PR.

---

## Troubleshooting

**"SUPABASE_URL / SUPABASE_SERVICE_ROLE not set" warning on boot.** The env vars aren't set, or you set them for Development only and Vercel is running Production. Re-check the **Environments** boxes in the dashboard.

**`relation "public.users" does not exist`.** The schema SQL wasn't run. Open Supabase -> SQL Editor and re-run `server/schema.sql`.

**`duplicate key value violates unique constraint`.** Somebody already has that email or college ID. Change it or delete the duplicate row via Supabase Table editor.

**File upload returns "new row violates row-level security policy".** The service_role key is wrong or missing. The service_role key bypasses RLS - double-check you copied the `service_role` key, not the `anon` key.

**Login works locally but fails on Vercel with `ENOTFOUND`.** Wrong `SUPABASE_URL`. Must be `https://xxxxxxxx.supabase.co` - no trailing slash, no `/rest/v1` suffix.

**Invite email link points to localhost.** Set `CLIENT_ORIGIN` on Vercel to your live URL and redeploy.

---

## What's where

```
grievance-system/
|-- api/index.js              -> Vercel serverless entrypoint (imports server/server.js)
|-- vercel.json               -> routing: /api/* -> function, / -> client/
|-- client/                   -> static HTML/JS (served as-is by Vercel)
|-- server/
|   |-- server.js             -> Express app (works in both modes)
|   |-- supabase.js           -> shared Supabase client
|   |-- schema.sql            -> Postgres schema + storage bucket
|   |-- config/hardcodedUsers.js  -> always-on 3 demo accounts, upserted on boot
|   |-- repos/                -> usersRepo, grievancesRepo, invitesRepo, notificationsRepo
|   |-- controllers/          -> auth, grievance, admin, officer, invite
|   |-- middleware/           -> auth (JWT+RBAC), upload (Supabase Storage), error, validate
|   |-- routes/               -> public, auth, grievance, admin, officer
|   |-- utils/                -> jwt, validators, emailService (mock)
|   `-- test-e2e.js           -> end-to-end test script
|-- README.md
|-- TESTING.md
`-- DEPLOY-VERCEL.md          <- you are here
```
