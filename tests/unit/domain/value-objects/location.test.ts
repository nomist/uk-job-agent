import { describe, expect, it } from "vitest";
import { InvalidLocationError } from "@/domain/errors/domain-errors";
import { Location } from "@/domain/value-objects/location";

describe("Location", () => {
  it("creates a valid onsite location", () => {
    const location = Location.create({ city: "London", country: "UK", isRemote: false });
    expect(location.describe()).toBe("London, UK");
  });

  it("creates a valid remote location", () => {
    const location = Location.create({ country: "UK", isRemote: true });
    expect(location.describe()).toBe("Remote (UK)");
  });

  it("rejects an empty country", () => {
    expect(() => Location.create({ country: "  ", isRemote: false })).toThrow(InvalidLocationError);
  });

  it("treats blank optional fields as undefined", () => {
    const location = Location.create({ city: "  ", country: "UK", isRemote: false });
    expect(location.city).toBeUndefined();
  });

  it("equals compares all fields", () => {
    const a = Location.create({ city: "London", country: "UK", isRemote: false });
    const b = Location.create({ city: "London", country: "UK", isRemote: false });
    const c = Location.create({ city: "Manchester", country: "UK", isRemote: false });

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
