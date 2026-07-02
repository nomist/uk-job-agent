import { describe, expect, it } from "vitest";
import { EMPLOYMENT_TYPES, isEmploymentType } from "@/domain/value-objects/employment-type";
import { isVisaStatus, VISA_STATUSES } from "@/domain/value-objects/visa-status";
import { isWorkMode, WORK_MODES } from "@/domain/value-objects/work-mode";

describe("WorkMode", () => {
  it.each(WORK_MODES)("accepts %s as a valid work mode", (mode) => {
    expect(isWorkMode(mode)).toBe(true);
  });

  it("rejects an unknown value", () => {
    expect(isWorkMode("FLEXIBLE")).toBe(false);
  });
});

describe("EmploymentType", () => {
  it.each(EMPLOYMENT_TYPES)("accepts %s as a valid employment type", (type) => {
    expect(isEmploymentType(type)).toBe(true);
  });

  it("rejects an unknown value", () => {
    expect(isEmploymentType("FREELANCE")).toBe(false);
  });
});

describe("VisaStatus", () => {
  it.each(VISA_STATUSES)("accepts %s as a valid visa status", (status) => {
    expect(isVisaStatus(status)).toBe(true);
  });

  it("rejects an unknown value", () => {
    expect(isVisaStatus("EXPIRED")).toBe(false);
  });
});
