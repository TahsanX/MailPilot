import { query } from "../db.js";
import { verifyToken } from "../services/token.js";
import { unauthorized } from "../utils/errors.js";

/** Requires `Authorization: Bearer <jwt>`. Sets req.user. A token issued before a password reset is rejected. */
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw unauthorized();

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw unauthorized("Your session has expired. Log in again.");
  }

  const { rows } = await query("select id, name, email, token_version, gmail_connected, created_at from users where id = $1", [payload.sub]);
  const user = rows[0];
  if (!user || user.token_version !== payload.tv) throw unauthorized("Your session has expired. Log in again.");

  req.user = user;
  next();
}
