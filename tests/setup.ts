// Runs before any test file's imports are evaluated. Mirrors what
// prisma.config.ts already does for the Prisma CLI: without this, nothing
// loads .env into process.env for the vitest process, so the eagerly
// env-validated shared Prisma client (src/infrastructure/persistence/prisma/client.ts)
// would throw the moment any test statically imports it — as of Milestone
// 4.6, the DI container is the first thing that does.
import "dotenv/config";

// jest-dom matchers (toBeInTheDocument, etc.) for component tests that opt
// into the jsdom environment via a `// @vitest-environment jsdom` docblock.
// Safe to import unconditionally — it only extends `expect`, no DOM needed.
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest.config.ts doesn't enable `test.globals`, so React Testing
// Library's auto-cleanup (which relies on a global afterEach) doesn't
// register itself automatically — done explicitly here instead.
afterEach(() => {
  cleanup();
});
