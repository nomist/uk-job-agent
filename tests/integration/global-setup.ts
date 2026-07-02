import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { TEST_DATABASE_URL } from "./support/test-prisma-client";

const TEST_DB_FILE = path.resolve(process.cwd(), "prisma/test.db");
const SUFFIXES = ["", "-journal", "-wal", "-shm"];

function removeTestDbFiles(): void {
  for (const suffix of SUFFIXES) {
    const file = TEST_DB_FILE + suffix;
    if (existsSync(file)) rmSync(file);
  }
}

// Applies real migrations (not `db push`) to a dedicated SQLite file so
// integration tests exercise the same schema/migration history as
// production, then tears the file down after the run.
export default function setup() {
  removeTestDbFiles();

  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });

  return () => {
    removeTestDbFiles();
  };
}
