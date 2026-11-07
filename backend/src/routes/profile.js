import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getProfile, publicUser } from "../services/accounts.js";
import { notFound } from "../utils/errors.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);

/** User, job role and details in one response. Poll this to follow PDF summary status. */
profileRouter.get("/", async (req, res) => {
  const profile = await getProfile(req.user.id);
  if (!profile) throw notFound("No profile found for this account.");
  res.json({ user: publicUser(req.user), profile });
});
