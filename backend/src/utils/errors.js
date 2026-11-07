export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (message, fields) => new AppError(400, "bad_request", message, fields);
export const unauthorized = (message = "Authentication required.") => new AppError(401, "unauthorized", message);
export const conflict = (message, fields) => new AppError(409, "conflict", message, fields);
export const notFound = (message = "Not found.") => new AppError(404, "not_found", message);
