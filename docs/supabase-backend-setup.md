# Supabase Backend Setup

## Scope

Backend keeps only:

- published community levels
- anonymous-authenticated analytics
- per-attempt success metrics

Local machine keeps:

- editor drafts
- temporary draft-test levels
- user progress
- UI preferences

## Dashboard setup

1. Create a Supabase project.
2. In **Authentication > Providers**, enable **Anonymous**.
3. In **SQL Editor**, run [supabase/schema.sql](/c:/Users/aguerra/Documents/thesis/supabase/schema.sql).
4. Copy `Project URL` and `anon/publishable key`.
5. Create `app/.env` from [app/.env.example](/c:/Users/aguerra/Documents/thesis/app/.env.example):

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Dev and prod projects

Recommended:

- local development -> **dev Supabase project**
- GitHub Pages -> **prod Supabase project**

### Local dev

Put your **dev** values in `app/.env`.

### GitHub Pages production

Add these **repository secrets** in GitHub:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The Pages workflow already injects them during build from:

- [.github/workflows/deploy-pages.yml](/c:/Users/aguerra/Documents/thesis/.github/workflows/deploy-pages.yml)

Legacy fallback:

- `VITE_SUPABASE_ANON_KEY` still works in code for older projects

Do **not** use a service-role or secret key in the frontend or in GitHub Pages build secrets.

## What goes remote

- `levels`
  - public published levels only
- `level_attempts`
  - attempt outcome, steps, elapsed time, operation summary
- `interaction_logs`
  - compact UI/runtime interaction events

## Current behavior

- community catalog reads: bundled local levels + local imported levels + remote published levels
- publishing from editor writes to Supabase
- play sessions send anonymous attempt analytics to Supabase
- if env vars are missing, app falls back to local-only mode

## Notes

- free tier database quota is limited, so event payloads are intentionally compact
- current schema assumes published level `id` values are globally unique
- remote levels are treated as `community` source in the app

## About `schema.sql`

- `schema.sql` is a **bootstrap file** for a fresh project
- it does **not** drop tables
- it only recreates policies safely with `drop policy if exists`
- keep it as reference for fresh environments

## About migrations

You do **not** need a migration table immediately to keep working.

What is already in repo:

- bootstrap file: [supabase/schema.sql](/c:/Users/aguerra/Documents/thesis/supabase/schema.sql)
- initial migration snapshot: [supabase/migrations/20260609_initial_backend.sql](/c:/Users/aguerra/Documents/thesis/supabase/migrations/20260609_initial_backend.sql)

Recommended rule from now on:

1. do **not** edit past migration files after they are applied
2. keep `schema.sql` only as fresh-project bootstrap/reference
3. for every database change, add a **new** file under `supabase/migrations/`

If later you adopt Supabase CLI, it will manage migration history in the database. For now, timestamped SQL files are enough.
