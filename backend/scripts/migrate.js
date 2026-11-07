// Applies every file in /sql in order. Each file is idempotent, so running twice is safe.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "../src/db.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sql");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

try {
  for (const file of files) {
    await pool.query(readFileSync(path.join(dir, file), "utf8"));
    console.log(`Applied ${file}`);
  }
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
