# UK Job Agent

A personal AI Career Assistant for the UK job market: search Adzuna/Reed listings, save jobs and
track applications through a status pipeline, maintain a profile and resumes, and use OpenAI for
match scoring, cover letters, and CV suggestions.

## Architecture

Clean Architecture, dependency rule: outer layers depend inward, domain never depends outward.

- `src/domain/` — entities, value objects, business rules. Zero framework dependencies.
- `src/application/` — use cases + ports (interfaces) for anything external (job APIs, DB, LLM).
- `src/infrastructure/` — adapters implementing the ports: Adzuna/Reed job-provider clients, the
  OpenAI client, Prisma repositories.
- `src/app/` — Next.js App Router. Route handlers and thin page components only; no business
  logic — every route goes through the DI container (`src/lib/di/`) to reach a use case.
- `src/components/` — React components, organized by feature (`jobs/`, `saved-jobs/`,
  `applications/`, `profile/`, `resumes/`, `job-detail/`) plus `shared/` for cross-feature
  presentational pieces.
- `src/lib/di/` — composition root wiring ports to concrete adapters (`createContainer()`).
- `tests/unit/` — domain + application tests against fake ports, and component tests, no I/O.
- `tests/integration/` — infrastructure tests against a real test DB / mocked HTTP, plus
  route-handler and screen-level integration tests.

## Local Development

### 1. Setup

```bash
npm install                # also runs `prisma generate` via postinstall
cp .env.example .env       # DATABASE_URL defaults to a local SQLite file
npm run prisma:migrate     # applies migrations to ./dev.db
npm run dev                # http://localhost:3000
```

### 2. Environment variables

All variables live in `.env` (gitignored — see `.env.example` for the full list with
descriptions). Nothing here is required just to get the app running: every external integration
degrades gracefully or fails with a clear in-app message when unconfigured (see
[Using real APIs vs. mock fallback](#using-real-apis-vs-mock-fallback) below).

| Variable                           | Required?                      | Purpose                                                                                                                        |
| ---------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                     | Yes                            | SQLite file path for Prisma. Defaults to `file:./dev.db`.                                                                      |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | No                             | Adzuna Job Search API — https://developer.adzuna.com/                                                                          |
| `ADZUNA_COUNTRY`                   | No (defaults to `gb`)          | Adzuna country code.                                                                                                           |
| `REED_API_KEY`                     | No                             | Reed Jobseeker API — https://www.reed.co.uk/developers/jobseeker                                                               |
| `OPENAI_API_KEY`                   | Only for AI features           | OpenAI API — https://platform.openai.com/. Required for Match Score, Cover Letter, and CV Suggestions; not used by Job Search. |
| `OPENAI_MODEL`                     | No (defaults to `gpt-4o-mini`) | Any Chat Completions-compatible model. Passed straight through with no hardcoded model-specific parameters.                    |

### 3. Running Prisma

```bash
npm run prisma:migrate     # create/apply a dev migration against ./dev.db
npm run prisma:generate    # regenerate the client only (no schema changes) — also runs automatically on `npm install`
```

The generated client lives at `src/generated/prisma` (gitignored). Tests use a separate SQLite
file (`prisma/test.db`) so they never touch your local `dev.db`; migrations are applied to it
automatically by the Vitest global setup.

### 4. Running the dev server

```bash
npm run dev                # http://localhost:3000, Turbopack
```

### 5. Running tests

```bash
npm run test                                       # full Vitest suite once
npm run test:watch                                  # watch mode
npx vitest run tests/unit/path/to/file.test.ts       # a single file
```

Also run before considering any change complete: `npm run lint`, `npm run typecheck`, and
`npm run build`.

### Using real APIs vs. mock fallback

- **Job Search (Adzuna/Reed):** if `NODE_ENV=development` and neither Adzuna nor Reed has
  credentials configured, `GET /api/jobs` transparently returns a fixed set of sample UK listings
  (`isMock: true` in the response) so the Job Search and Saved Jobs screens are usable with zero
  setup. Outside development, missing job-provider credentials mean zero configured providers —
  search legitimately returns no results, and the UI shows a "No job search providers are
  configured" notice rather than silently faking data. If only one of Adzuna/Reed is configured,
  that provider is used alone (real results, never mixed with mock data). If a configured provider
  fails for a single request (e.g. rate-limited), results from the other provider are still
  returned, with a notice that the failed one may be missing from the results.
- **AI actions (Match Score, Cover Letter, CV Suggestions):** these always call the real OpenAI
  API — there is no mock fallback for AI features in any environment. Without `OPENAI_API_KEY`
  set, these three actions return a clear "AI features are not configured" error instead of the
  generic Job Search behavior above.

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
- SQLite is used for local development; production targets PostgreSQL (Prisma abstracts the
  switch — see the Architecture RFC for known SQLite-only caveats to avoid).
- No authentication yet — every API route that needs a user identity takes an explicit `userId`
  (see `src/lib/api/current-user.ts` for the client-side placeholder). Not in scope until a later
  milestone.
- Not yet covered: deployment configuration.
