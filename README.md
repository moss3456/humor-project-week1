# Humor Database — Week 2

This Next.js app reads rows from a Supabase `jokes` table and renders them as a responsive card list.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. This creates the table, enables row-level security, adds a public read policy, and inserts sample rows.
3. In **Project Settings → API**, copy the Project URL and anon/public key.
4. Copy `.env.example` to `.env.local` and replace the example values:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

`.env.local` is ignored by Git and must never be committed.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the Vercel project under **Settings → Environment Variables**, then redeploy the commit. To make the assignment accessible in Incognito Mode, disable Vercel Deployment Protection for the deployment and test its commit-specific URL in a private window.
