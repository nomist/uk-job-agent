// Runs before any test file's imports are evaluated. Mirrors what
// prisma.config.ts already does for the Prisma CLI: without this, nothing
// loads .env into process.env for the vitest process, so the eagerly
// env-validated shared Prisma client (src/infrastructure/persistence/prisma/client.ts)
// would throw the moment any test statically imports it — as of Milestone
// 4.6, the DI container is the first thing that does.
import "dotenv/config";
