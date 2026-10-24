# FORM: beginner calisthenics

A mobile-first web app that takes complete beginners through a 12-week bodyweight programme. It starts from what the person can do today, adapts to their equipment and schedule, and only moves them to a harder variation when their logged sets show they're ready.

Built with Next.js (App Router), React, TypeScript and Tailwind, with Supabase for Postgres, Auth and row level security. Hosted on Vercel.

**Live:** https://form-calisthenics.vercel.app

More detail lives in `docs/`.

## What's in the MVP

- Sign-up, sign-in, password reset and sign-out (Supabase Auth)
- Resumable onboarding: goals, experience, an optional starting-point check, schedule and equipment
- A deterministic 12-week programme engine (`src/domain/engine`), with no AI or randomness
- Today dashboard built from real data
- Workout player that saves every set as it's logged and survives a refresh, with a rest timer, pause, easier swaps, skips and per-exercise feedback
- Exercise library (68 movements) with setup, cues, mistakes, safety notes and easier or harder options. Media is a labelled placeholder until licensed footage is added
- Six skill pathways. Gated pathways stay locked until their prerequisites are met, and recent pain re-locks them
- Progress, workout history, profile settings, JSON data export and account deletion

## Running it locally

Requirements: Node 22+, and either a Supabase project or the bundled local stand-in.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

The local stand-in (`scripts/local-supabase`) runs Postgres 16, PostgREST and a small mock of Supabase Auth so the whole app and its tests run without a cloud project. See `docs/TEST_REPORT.md`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types plus `tsc --noEmit` |
| `npm test` | Unit tests (engine, progression, formatting, validation) |
| `npm run test:db` | Database tests against local Postgres (RLS, RPCs) |
| `npm run test:e2e` | Playwright end-to-end tests against the local stack |
| `npm run stack:local` | Starts the local Supabase stand-in |
| `npm run db:reference` | Regenerates the reference-data migration from `src/domain` |

## Environment variables

| Name | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel and `.env.local` | Project URL, e.g. `https://abcd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel and `.env.local` | Publishable (or legacy anon) key. Safe in the browser because RLS protects the data |
| `NEXT_PUBLIC_SITE_URL` | Vercel (production) | The live address, used for links in auth emails. Optional: the request host is used when it's missing |

The service role key is never used by this app. Don't add it to Vercel.

## Deploying (Supabase free tier and Vercel Hobby)

1. **Supabase project.** Create a project (Sydney region suits Australian users). Then apply the three migrations in `supabase/migrations` in order, either with `supabase link --project-ref <ref>` and `supabase db push`, or by pasting each file into the SQL editor. Don't run `supabase/local/bootstrap.sql`; it only exists for the local stand-in.
2. **Auth URLs.** In Authentication, URL Configuration, set the Site URL to the live address and add `https://<live-domain>/**` to the redirect URLs. Email links come back to `/auth/callback`.
3. **Email.** Supabase's built-in email sender is heavily rate limited and meant for testing. For a public launch, add custom SMTP. For a small demo, you can turn off "Confirm email" so new accounts don't wait on an email.
4. **Vercel project.** Import the GitHub repo (framework preset: Next.js), add the three environment variables above, and deploy.
5. **Check it.** Sign up, finish onboarding, log a workout, refresh mid-workout and confirm it resumes, then export your data from Profile.

Full detail is in `docs/DEPLOYMENT_GUIDE.md`.

## Safety and honesty

The app doesn't score form, diagnose injuries or prescribe rehabilitation. Reporting pain always leads to an easier option or a pause, and the exercise guidance is marked as not yet professionally reviewed. See `docs/KNOWN_LIMITATIONS.md`.
