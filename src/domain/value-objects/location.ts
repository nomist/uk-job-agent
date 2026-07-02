import { InvalidLocationError } from "@/domain/errors/domain-errors";

export interface LocationProps {
  city?: string;
  region?: string;
  country: string;
  isRemote: boolean;
}

export class Location {
  private constructor(
    public readonly country: string,
    public readonly isRemote: boolean,
    public readonly city?: string,
    public readonly region?: string,
  ) {}

  static create(props: LocationProps): Location {
    const country = props.country.trim();
    if (country.length === 0) {
      throw new InvalidLocationError("Location country must not be empty");
    }

    const city = props.city?.trim() || undefined;
    const region = props.region?.trim() || undefined;

    return new Location(country, props.isRemote, city, region);
  }

  /** Human-readable summary, e.g. "London, UK" or "Remote (UK)". */
  describe(): string {
    const place = [this.city, this.region, this.country].filter(Boolean).join(", ");
    return this.isRemote ? `Remote (${this.country})` : place;
  }

  equals(other: Location): boolean {
    return (
      this.country === other.country &&
      this.isRemote === other.isRemote &&
      this.city === other.city &&
      this.region === other.region
    );
  }
}
