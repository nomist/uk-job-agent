import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Deliberately separate from src/infrastructure/persistence/prisma/client.ts
// (which reads DATABASE_URL / the dev database) so integration tests never
// touch dev.db.
export const TEST_DATABASE_URL = "file:./prisma/test.db";

export function createTestPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: TEST_DATABASE_URL });
  return new PrismaClient({ adapter });
}
