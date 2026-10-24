# Deployment guide

FORM runs on two free services: **Supabase** (database and sign-in) and **Vercel** (the website). Nothing else is needed.

## Current deployment (24 October 2026)

| | |
| --- | --- |
| Live site | https://form-calisthenics.vercel.app |
| Vercel | Project `form-calisthenics` in the FitBattle team (Hobby, free). Framework preset Next.js. Env vars: Supabase URL and publishable key (Production and Preview), `NEXT_PUBLIC_SITE_URL` (Production) |
| Supabase | Project `form-calisthenics` (ref `kigzaawtrdrucnrlailp`), Sydney `ap-southeast-2`, Free plan. All three migrations applied |
| Auth | Site URL and redirect URLs set to the live address, plus `http://localhost:3000/**`. Email confirmation off, sign-ups on |
| Auto-deploy | Not connected yet. Vercel needs the GitHub account linked first (Vercel, Account Settings, Authentication). Until then, deploy with `npx vercel@latest deploy --prod` from a clone |

The database password wasn't stored. Reset it under Project Settings, Database if you need direct database access.

## What you need

- A Supabase account with room for one more free project (Supabase Free allows two active projects per organisation).
- A Vercel account. Use a Hobby (free) team.
- The GitHub repository `eileenbell/beginner-calisthenics`.

The app only ever needs the **public** Supabase values: the project URL and the publishable key (or the legacy anon key). Never add the service role key to Vercel or to the code.

## 1. Create the Supabase project

1. In the Supabase dashboard, create a new project. Sydney (`ap-southeast-2`) suits Australian users. Save the database password in a password manager.
2. Wait until the project shows as healthy.

From the command line instead:

```bash
npx supabase@latest login            # or set SUPABASE_ACCESS_TOKEN
npx supabase@latest orgs list
npx supabase@latest projects create form-calisthenics --org-id <org> --region ap-southeast-2 --db-password <strong password>
```

Personal access tokens must have **organisation** access to create projects. A token scoped only to existing projects gets "Forbidden".

## 2. Create the database

Apply the three files in `supabase/migrations`, in filename order. Either:

```bash
npx supabase@latest link --project-ref <ref>
npx supabase@latest db push
```

or paste each file into the dashboard's SQL editor and run it, oldest first.

Do **not** run `supabase/local/bootstrap.sql`. It recreates parts of Supabase for local testing only.

To check: the Table editor should show 18 tables, and `exercises` should have 68 rows.

## 3. Get the public keys

Project Settings, API keys:

- **Project URL**, for example `https://abcdefgh.supabase.co`
- **Publishable key** (`sb_publishable_…`), or the legacy **anon** key

## 4. Deploy to Vercel

1. In Vercel, Add New, Project, import `eileenbell/beginner-calisthenics`. The framework is detected as Next.js; keep the default build settings.
2. Add environment variables for **Production** and **Preview**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy. Note the production address, for example `form-calisthenics.vercel.app`.
4. Add `NEXT_PUBLIC_SITE_URL=https://<production address>` for Production and redeploy. It's used in email links. `NEXT_PUBLIC_` values are fixed at build time, so changing one always needs a redeploy.

From the command line instead:

```bash
npx vercel@latest login
npx vercel@latest link --project form-calisthenics
npx vercel@latest env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel@latest env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
npx vercel@latest deploy --prod
```

If the project was created from the command line, connect the GitHub repository in Project Settings, Git, so each push to `main` deploys automatically.

## 5. Point Supabase Auth at the site

Authentication, URL Configuration:

- **Site URL:** `https://<production address>`
- **Redirect URLs:** `https://<production address>/**` (and `http://localhost:3000/**` for local development)

Email links come back to `/auth/callback`. If a link goes to localhost or shows "link invalid", the Site URL or redirect list is wrong.

Authentication, Sign In / Providers, Email:

- For a small demo, turn **Confirm email** off. Supabase's built-in email sender only allows a few emails an hour, so confirmation emails stall quickly.
- Before a public launch, set up custom SMTP (Authentication, Emails, SMTP settings), then turn **Confirm email** back on. The app already handles both modes.

## 6. Check it works

1. Open the site signed out. The landing page loads, and `/today` redirects to sign in.
2. Sign up and finish onboarding. You land on Today with this week's sessions.
3. Start a workout, log a set, refresh the page. The set is still logged and you're on the same exercise.
4. Finish the workout. The summary says what changes next time.
5. Profile, Download my data. A JSON file arrives with your rows only.
6. Sign out, then use Forgot password. The email arrives and the link opens Reset password.

## Updating

- **Code:** push to `main`. With GitHub connected, Vercel deploys automatically. Otherwise run `npx vercel@latest deploy --prod`.
- **Database:** add a new migration file (never edit an applied one) and run `npx supabase@latest db push`.
- **Exercise content:** edit `src/domain/content`, run `npm run db:reference` to regenerate the reference data, and add it as a new migration.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| "Connect the database to continue" page | `NEXT_PUBLIC_SUPABASE_URL` or the key is missing in Vercel, or it was added without redeploying |
| Sign-up says it's sending an email that never arrives | Built-in email rate limit; turn off Confirm email or add SMTP |
| Email link opens localhost or an error page | Site URL or redirect URLs not set to the live address |
| "Something went wrong" after onboarding | Migrations not applied, or applied out of order |
| Project paused | Supabase Free pauses after 7 days without activity; restore it from the dashboard |
