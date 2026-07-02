import { Container, createContainer } from "./container";

/**
 * Thin indirection so route handlers never call createContainer() directly.
 * Route handlers import getContainer() instead — this lets tests replace
 * it wholesale via `vi.mock("@/lib/di/get-container", ...)` to inject a
 * container built from fakes, without needing real Adzuna/Reed/OpenAI
 * credentials or a database connection. createContainer() itself stays
 * unmocked and is exercised directly by its own tests (Milestone 4.6).
 */
export function getContainer(): Container {
  return createContainer();
}
