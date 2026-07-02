import { describe, expect, it } from "vitest";
import { User } from "@/domain/entities/user";
import { InvalidUserError } from "@/domain/errors/domain-errors";

describe("User", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("creates a user and lowercases the email", () => {
    const user = User.create({
      id: "u1",
      email: "Taisiya@Example.com",
      createdAt: now,
      updatedAt: now,
    });
    expect(user.email).toBe("taisiya@example.com");
  });

  it("rejects an invalid email", () => {
    expect(() =>
      User.create({ id: "u1", email: "not-an-email", createdAt: now, updatedAt: now }),
    ).toThrow(InvalidUserError);
  });

  it("rejects updatedAt before createdAt", () => {
    const earlier = new Date("2025-01-01T00:00:00Z");
    expect(() =>
      User.create({ id: "u1", email: "a@b.com", createdAt: now, updatedAt: earlier }),
    ).toThrow(InvalidUserError);
  });
});
