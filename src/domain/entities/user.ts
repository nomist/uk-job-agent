import { InvalidUserError } from "@/domain/errors/domain-errors";

export interface UserProps {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: UserProps): User {
    const id = props.id.trim();
    const email = props.email.trim().toLowerCase();

    if (id.length === 0) {
      throw new InvalidUserError("User id must not be empty");
    }
    if (!EMAIL_PATTERN.test(email)) {
      throw new InvalidUserError(`"${props.email}" is not a valid email address`);
    }
    if (props.updatedAt.getTime() < props.createdAt.getTime()) {
      throw new InvalidUserError("User updatedAt cannot be before createdAt");
    }

    return new User(id, email, props.createdAt, props.updatedAt);
  }
}
