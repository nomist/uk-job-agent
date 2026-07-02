import { InvalidCompanyError } from "@/domain/errors/domain-errors";

export interface CompanyProps {
  id: string;
  name: string;
  website?: string;
  industry?: string;
}

/** Deterministic normalization used as the cross-provider dedup key. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

export class Company {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly normalizedName: string,
    public readonly website?: string,
    public readonly industry?: string,
  ) {}

  static create(props: CompanyProps): Company {
    const id = props.id.trim();
    const name = props.name.trim();

    if (id.length === 0) {
      throw new InvalidCompanyError("Company id must not be empty");
    }
    if (name.length === 0) {
      throw new InvalidCompanyError("Company name must not be empty");
    }

    const normalizedName = normalizeCompanyName(name);
    if (normalizedName.length === 0) {
      throw new InvalidCompanyError(`Company name "${name}" normalizes to an empty string`);
    }

    return new Company(id, name, normalizedName, props.website?.trim(), props.industry?.trim());
  }
}
