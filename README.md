# Humor Database — Week 3

The Week 2 Supabase joke archive now includes Google authentication, cookie-based
SSR sessions, automatic user profiles, avatar uploads, and a protected members
route.

## What changed

- Google OAuth login with a PKCE callback at `/auth/callback`
- `profiles` table linked one-to-one with `auth.users`
- `auth.users` trigger that creates a profile for every new user
- First-login profile completion prompt
- Editable first name, last name, and avatar
- Server-verified `/members` route
- Supabase Storage avatars (the database stores URLs, never image binaries)
- Next.js 16 `proxy.ts` session refresh using `@supabase/ssr`

## Supabase setup

1. Open the existing Supabase project.
2. In **SQL Editor**, run [`supabase/week3.sql`](supabase/week3.sql).
   This migration creates the profile table, trigger, existing-user backfill,
   and public `avatars` bucket. It intentionally does not change any RLS policy.
3. In **Authentication → URL Configuration**, set the production Site URL and
   add these redirect URLs:

   ```text
   http://localhost:3000/auth/callback
   https://<your-production-domain>/auth/callback
   https://<your-commit-specific-domain>/auth/callback
   ```

4. In **Authentication → Providers → Google**, enable Google and add the OAuth
   client credentials created in Google Cloud.

Google's authorized redirect URI is the Supabase callback shown on the provider
page (normally `https://<project-ref>.supabase.co/auth/v1/callback`). The app's
post-authentication redirect remains exactly `/auth/callback`.

## Environment variables

Copy `.env.example` to `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
SUPABASE_SECRET_KEY=your-server-only-secret-key
```

`SUPABASE_SECRET_KEY` is used only by the authenticated avatar upload Route
Handler. Never prefix it with `NEXT_PUBLIC_` or commit it to Git.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify

```bash
npm run lint
npm run build
```

Test Google sign-in, automatic profile creation, the first-login name prompt,
profile edits, avatar upload, sign-out, and the `/members` route in an Incognito
window before submitting the Vercel commit-specific URL.
