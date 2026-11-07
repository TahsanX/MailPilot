import bcrypt from "bcryptjs";
import { config } from "../config.js";

export const hashPassword = (plain) => bcrypt.hash(plain, config.BCRYPT_ROUNDS);

// A real hash of a random value, so a login for an unknown name costs the same time as a wrong password.
const DUMMY_HASH = bcrypt.hashSync(`dummy-${Math.random()}`, config.BCRYPT_ROUNDS);

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash ?? DUMMY_HASH).then((ok) => Boolean(hash) && ok);
}
