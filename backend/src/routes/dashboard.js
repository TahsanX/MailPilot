import { Router } from "express";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { parse } from "../middleware/validate.js";
import { rangeQuerySchema, summaryQuerySchema } from "../schemas/dashboard.js";
import { clearSampleData, getActivity, getCandidates, getCareStats, getSummary, markHandled } from "../services/dashboard.js";
import { loadSampleData } from "../services/sampleData.js";
import { AppError } from "../utils/errors.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (req, res) => {
  const summary = await getSummary(req.user.id, parse(summaryQuerySchema, req.query));
  res.json({ ...summary, sampleDataAllowed: config.ALLOW_SAMPLE_DATA });
});

dashboardRouter.get("/activity", async (req, res) => res.json(await getActivity(req.user.id)));

dashboardRouter.get("/candidates", async (req, res) => res.json(await getCandidates(req.user.id, parse(rangeQuerySchema, req.query))));

dashboardRouter.get("/care", async (req, res) => res.json(await getCareStats(req.user.id, parse(rangeQuerySchema, req.query))));

/** Records that the user dealt with an email in Gmail. MailPilot never sends the reply itself. */
dashboardRouter.post("/emails/:emailId/handled", async (req, res) => res.json(await markHandled(req.user.id, req.params.emailId)));

function requireSampleAllowed(_req, _res, next) {
  if (!config.ALLOW_SAMPLE_DATA) throw new AppError(403, "sample_data_disabled", "Sample data is turned off on this server.");
  next();
}

dashboardRouter.post("/sample-data", requireSampleAllowed, async (req, res) => res.status(201).json(await loadSampleData(req.user.id)));

// Removing sample data is always allowed, even where loading it is turned off.
dashboardRouter.delete("/sample-data", async (req, res) => {
  await clearSampleData(req.user.id);
  res.json({ ok: true });
});
