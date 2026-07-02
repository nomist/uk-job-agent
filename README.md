# UK Job Agent

A personal AI Career Assistant for the UK job market: search Adzuna/Reed, normalize and dedupe
results, track applications, and use Claude for match scoring, CV suggestions, cover letters, and
a daily digest.

This repo currently contains the **Milestone 1 project scaffold** — tooling and folder structure
only. No business logic, job-provider clients, or Claude integration yet.

## Architecture

Clean Architecture, dependency rule: outer layers depend inward, domain never depends outward.

- `src/domain/` — entities, value objects, business rules. Zero framework dependencies.
- `src/application/` — use cases + ports (interfaces) for anything external (job APIs, DB, LLM).
- `src/infrastructure/` — adapters implementing the ports (job-provider clients, Prisma
  repositories, the Anthropic client).
- `src/app/` — Next.js App Router. Thin route handlers/server actions/components only; no
  business logic.
- `src/components/ui/` — presentational React components.
- `src/lib/di/` — composition root wiring ports to concrete adapters.
- `tests/unit/` — domain + application tests against fake ports, no I/O.
- `tests/integration/` — infrastructure tests against a real test DB / mocked HTTP.

## Setup

```bash
npm install                # also runs `prisma generate` via postinstall
cp .env.example .env       # DATABASE_URL defaults to a local SQLite file
npm run prisma:migrate     # applies migrations to ./dev.db
npm run dev                # http://localhost:3000
```

## Scripts

| Script                    | Purpose                      |
| ------------------------- | ---------------------------- |
| `npm run dev`             | Start the Next.js dev server |
| `npm run build`           | Production build             |
| `npm run start`           | Start the production server  |
| `npm run lint`            | ESLint                       |
| `npm run format`          | Prettier — write             |
| `npm run format:check`    | Prettier — check only        |
| `npm run typecheck`       | `tsc --noEmit`               |
| `npm run test`            | Run the Vitest suite once    |
| `npm run test:watch`      | Vitest in watch mode         |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate`  | Create/apply a dev migration |

## Notes

- Prisma client generator output is `src/generated/prisma` (gitignored); it's regenerated on
  every `npm install` via `postinstall`.
- `prisma/schema.prisma` has a placeholder `User` model only — the full domain schema (Job,
  Application, MatchScore, etc.) lands in a later milestone.
- SQLite is used for local development; production targets PostgreSQL (Prisma abstracts the
  switch — see the Architecture RFC for known SQLite-only caveats to avoid).
