# Demo Mode Overview (MVP)

This repository includes a public demo mode that showcases the app without requiring sign-in. It is intentionally lightweight and serves as a proof-of-concept MVP. Code was authored with AI assistance and may deviate from best practices; expect rough edges.

## What’s in the demo
- Guest-only read access backed by Supabase demo data (`DEMO_USER_ID`).
- Study modes: cards (flashcards), articles trainer, verbs viewer, and time-training mini quiz.
- UI is read-only in guest mode; mutations (create/edit/delete/learned) are disabled.

## Running the demo locally
1) Configure environment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DEMO_USER_ID` (Supabase user whose data will be exposed to guests)
2) Ensure the demo user has seed data (cards, tags, verbs, time_questions).
3) Start the app:
   ```bash
   npm install
   npm run dev
   ```
4) Open `/demo` locally, or visit the hosted demo: https://cards-indol-eight.vercel.app/demo.

## Notes and limitations
- MVP quality: focus is on showcasing features, not on production hardening.
- AI-generated code: patterns may be inconsistent; security/performance hardening and tests are minimal.
- Guest endpoints are read-only; auth flows remain unchanged for regular users.
