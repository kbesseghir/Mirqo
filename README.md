# Mirqo Web Foundation

Production-oriented foundation for the Mirqo responsive web app.

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
- Service Worker/offline shell if needed beyond the installable PWA manifest

## Node.js 18 compatibility
This package is pinned to Next.js 14.2.31 and React 18.3.1, so it runs on Node.js 18.20.8. Upgrade Node and Next.js together later.
