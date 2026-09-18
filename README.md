# Cards — German Vocabulary Trainer

A mobile-first web app for learning German with flashcards: study mode, articles trainer, verbs
viewer, and a tenses mini-quiz. Includes a public read-only demo at `/demo` — no sign-in required.

**Live demo:** https://cards-indol-eight.vercel.app/demo

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **MUI 7** — sole UI library; theme in `ThemeProvider.tsx`, no Tailwind or separate CSS files
- **Supabase** — PostgreSQL + authentication with row-level security
- **Upstash Redis** — shared sliding-window rate limiting for guest API endpoints and `/auth`;
  degrades to per-instance in-memory limiter if Redis is unavailable

## Running locally

1. Copy environment variables and fill in the values:
   ```bash
   cp .env.example .env.local
   ```
   See `.env.example` — each variable is annotated with where to find it (Supabase dashboard,
   Upstash dashboard). Upstash variables are optional; without them the in-memory fallback is used.

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000/demo](http://localhost:3000/demo) for guest mode, or sign up at
   `/auth/signup` for a full authenticated account.

## Commands

```bash
npm run dev           # Next.js dev server (Turbopack)
npm run check         # lint:strict + prettier check + tsc --noEmit  ← pre-commit gate
npm run fix           # auto-fix lint and formatting
npm run build         # production build — same as what Vercel deploys
npm run test          # Vitest unit tests
npm run test:coverage # coverage report
```

## CI

GitHub Actions runs three jobs on every push and PR against `main`:

| Job | What it does |
|-----|-------------|
| Check | `npm run check` — ESLint (zero warnings), Prettier, TypeScript |
| Test | `npm run test` — Vitest unit tests |
| Build | `npm run build` — production build without server-side secrets (see `ADR-003` in `CLAUDE.md`) |

**Unit test coverage (Vitest):** `src/utils/`, `src/strategies/` (all 9 files), and
`src/services/` (card, tag, noun, verb, time services via mocks). No end-to-end tests yet.

## Further reading

- [CLAUDE.md](./CLAUDE.md) — full architectural rules, layer conventions, and development workflow
- [docs/README.md](./docs/README.md) — database schema, RLS policies, and Supabase migration notes
- [project-management/DECISIONS.md](./project-management/DECISIONS.md) — key architectural decisions (ADRs)
