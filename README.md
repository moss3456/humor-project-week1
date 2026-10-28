# Humor Department — Week 5

The original Supabase joke archive, Google login, profile editor, avatar upload,
and protected members route now share the stage with an iterated AI caption lab.

## Week 5 feedback iteration

- Newest and crowd-picks running orders make the gallery useful on return visits
- Live activity totals show images, competing lines, and ballots cast
- A unique positive leader is marked as the crowd favorite for each image
- Voting controls use visible labels, optimistic totals, and saved/removed status
- Image generation now communicates upload, visual-description, and writing stages
- Mobile navigation keeps the Caption Lab discoverable
- Expected database failures render useful recovery states
- Route-level loading and error UI avoid blank or generic failure screens

## Week 7 observability

The caption pipeline now records a top-level `generation_request` plus one
`llm_response` for each of its two model stages. Records include the selected
prompt chain, model and step identifiers, safe input summaries, output, latency,
final status, and recoverable error details. Telemetry is best-effort and never
blocks a successful user-facing generation.

Run `supabase/week7.sql` after the Week 6 admin migration. The migration also
adds the prompt-chain, term, model/provider, generation-example, allowed-domain,
and whitelisted-email registries used by the separate Admin Panel. Signup rules
are enforced only when at least one enabled domain or e-mail rule exists; an
empty allowlist preserves the current open Google sign-in behavior.

## Week 4 features

- Public image-and-caption gallery at `/images`
- Authenticated image uploads with type, size, ownership, and hourly limits
- A real two-step prompt chain:
  1. a vision-capable model turns the image into a factual visual brief
  2. a second model call receives only that brief and creates four captions
- Structured model output for deadpan, absurd, observational, and wildcard lines
- Persistent upvotes and downvotes with one vote per user and caption
- Optimistic vote UI with database-backed totals
- RLS on every public application table
- Owner-scoped Profile, upload, and vote policies
- Owner-folder Storage upload policies for avatars and caption images
- Server-side API keys only; no secret is exposed to the browser

## Architecture

The app uses Next.js App Router Server Components for database reads and small
Client Components for uploads and voting. Every mutation Route Handler verifies
the Supabase user again. The handlers use the user's session-scoped Supabase
client, so Row Level Security remains the final authorization boundary.

Image generation is stored as a small state machine:

```text
upload -> processing -> visual brief -> four captions -> ready
                    \-> failed
```

Only `ready` images and their captions are visible in the public gallery.

## Supabase setup

Run these SQL files in order if the earlier weeks have not already been applied:

1. `supabase/schema.sql`
2. `supabase/week3.sql`
3. `supabase/week4.sql`

`week4.sql` creates the new tables, vote-count trigger, `caption-images` bucket,
and all required RLS and Storage policies. Review it before running it against a
shared project.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values without committing
the file:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
OPENAI_API_KEY=your-server-only-openai-api-key
OPENAI_CAPTION_MODEL=gpt-6-luna
```

`OPENAI_API_KEY` must never use the `NEXT_PUBLIC_` prefix. The model variable is
optional; the app defaults to `gpt-6-luna`.

## Authentication URLs

Supabase Authentication must allow each origin that can complete Google OAuth:

```text
http://localhost:3000/auth/callback
https://<branch-preview-domain>/auth/callback
https://<commit-specific-domain>/auth/callback
```

Use exact deployment URLs instead of a broad wildcard.

## Run and verify

```bash
npm install
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm audit --omit=dev
```

Before submission, verify Google sign-in, Profile edits, avatar upload,
`/members` protection, image upload, both model stages, caption persistence,
vote persistence, cross-user RLS isolation, and Incognito access to the final
commit-specific Vercel deployment.
