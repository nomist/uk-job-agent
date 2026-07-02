import { InvalidSalaryRangeError } from "@/domain/errors/domain-errors";

export interface SalaryRangeProps {
  min: number;
  max: number;
  currency: string;
}

export class SalaryRange {
  private constructor(
    public readonly min: number,
    public readonly max: number,
    public readonly currency: string,
  ) {}

  static create(props: SalaryRangeProps): SalaryRange {
    const { min, max, currency } = props;

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new InvalidSalaryRangeError("Salary min/max must be finite numbers");
    }
    if (min < 0) {
      throw new InvalidSalaryRangeError("Salary min cannot be negative");
    }
    if (min > max) {
      throw new InvalidSalaryRangeError(`Salary min (${min}) cannot exceed max (${max})`);
    }
    if (currency.trim().length === 0) {
      throw new InvalidSalaryRangeError("Salary currency must not be empty");
    }

    return new SalaryRange(min, max, currency.trim().toUpperCase());
  }

  midpoint(): number {
    return (this.min + this.max) / 2;
  }

  /** True if this range shares any overlap with `other`, in the same currency. */
  overlaps(other: SalaryRange): boolean {
    if (this.currency !== other.currency) return false;
    return this.min <= other.max && other.min <= this.max;
  }

  equals(other: SalaryRange): boolean {
    return this.min === other.min && this.max === other.max && this.currency === other.currency;
  }
}
