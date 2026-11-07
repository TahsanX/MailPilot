import { AppError } from "../utils/errors.js";

/** Parses data with a Zod schema. Throws a 400 AppError with a { "path.to.field": "message" } map. */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  throw new AppError(400, "validation_error", "Some fields need attention.", fields);
}
