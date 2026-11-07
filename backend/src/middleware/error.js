import multer from "multer";
import { AppError } from "../utils/errors.js";
import { MAX_FILES } from "./upload.js";

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: { code: "not_found", message: "Route not found." } });
}

// Express requires the four argument signature to treat this as an error handler.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } });
  }

  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: [413, "Each PDF must be 10 MB or smaller."],
      LIMIT_FILE_COUNT: [400, `You can upload up to ${MAX_FILES} files.`],
      LIMIT_UNEXPECTED_FILE: [400, `Upload files in the "documents" field, up to ${MAX_FILES}.`],
    };
    const [status, message] = map[err.code] ?? [400, "The upload could not be read."];
    return res.status(status).json({ error: { code: "upload_error", message } });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "bad_json", message: "The request body is not valid JSON." } });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: { code: "too_large", message: "The request body is too large." } });
  }

  console.error(`${req.method} ${req.path} failed:`, err);
  res.status(500).json({ error: { code: "internal_error", message: "Something went wrong. Try again." } });
}
