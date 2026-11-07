import multer from "multer";
import { AppError } from "../utils/errors.js";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 5;

/** In memory PDF upload. Files are summarised and discarded, never written to disk. */
export const uploadDocuments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES, fields: 20, fieldSize: 200 * 1024 },
  fileFilter(_req, file, cb) {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdf) return cb(new AppError(400, "invalid_file", `${file.originalname} is not a PDF.`));
    cb(null, true);
  },
}).array("documents", MAX_FILES);

/** The first bytes of every PDF are "%PDF-". Checked because the mimetype comes from the client. */
export const looksLikePdf = (buffer) => buffer.length > 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
