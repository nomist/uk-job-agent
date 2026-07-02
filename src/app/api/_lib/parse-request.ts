import { z } from "zod";
import { ApiValidationError } from "./errors";

export async function parseJsonBody<Schema extends z.ZodTypeAny>(
  request: Request,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiValidationError("Request body must be valid JSON");
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiValidationError("Request body failed validation", result.error.issues);
  }
  return result.data;
}

export function parseQuery<Schema extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: Schema,
): z.infer<Schema> {
  const raw = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiValidationError("Query parameters failed validation", result.error.issues);
  }
  return result.data;
}
