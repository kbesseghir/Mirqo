# MYRQO — Public beta

Next.js 14 App Router + TypeScript application for subscriptions, recurring commitments, bills, debts, payments, and monthly spending snapshots. Supabase provides authentication and row-level data storage.

## Included
- Next.js 16 App Router + TypeScript
- Tailwind CSS 4
- Supabase SSR cookie authentication
- Login, signup, confirmation callback and protected routes
- Responsive desktop sidebar + mobile bottom navigation
- PWA manifest and installable home-screen icons
- Dashboard backed by the existing `subscriptions` table
- Add, list, details and delete subscription flows
- Calm Blue design tokens

## Setup
1. Copy `.env.example` to `.env.local`.
2. Add your Supabase Project URL and anon public key.
3. Run `npm install`.
4. Run `npm run dev`.
5. In Supabase Auth URL Configuration add `http://localhost:3000/auth/callback` and your future production callback URL.

## Existing database
This project expects the existing tables: `subscriptions`, `profiles`, `invite_codes`, plus the existing RLS policies.

## Next sprint
- Edit subscription
- Smart email/screenshot detection
- Google Calendar OAuth and event synchronization
- Profile + Free/Pro invite activation
- Installable PWA with public-shell-only service worker caching
- Central `BETA_ALL_PRO` access flag
- First-party beta events and RLS-protected beta feedback

## Environment variables

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL`. Set `BETA_ALL_PRO=true` during the free beta. Keep service-role, Stripe, OAuth, and encryption keys server-only; never use them in `NEXT_PUBLIC_*` variables.

## Database and security

Apply every file in `supabase/migrations` in filename order, including `202609270008_beta_feedback.sql`. Keep RLS enabled. Authenticated actions always write the current session user ID and users can only read/write their own rows. `analytics_events` is insert-only for users; `beta_feedback` is per-user.

## PWA

The manifest, maskable icons, and `/sw.js` service worker support Android installation and iPhone Safari Share → Add to Home Screen. The worker caches only public shell assets and icons; it does not cache dashboard HTML, API, Supabase, or financial data.

## Build and free deployment

```bash
npm install
npm run dev
npm run build
npm start
```

Vercel is the simplest free host for this Next.js project. Netlify also works with its Next.js runtime using `npm run build`. Add all `.env.example` values in the host dashboard. No Stripe, custom domain, App Store, or Google Play account is required for beta.

## GitHub

```bash
git init
git add .
git commit -m "Prepare MYRQO for public beta"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/myrqo.git
git push -u origin main
```

## Node.js 18 compatibility
This package is pinned to Next.js 14.2.31 and React 18.3.1, so it runs on Node.js 18.20.8. Upgrade Node and Next.js together later.
