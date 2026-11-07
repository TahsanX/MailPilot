import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { cronRouter } from "./routes/cron.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { integrationsRouter } from "./routes/integrations.js";
import { profileRouter } from "./routes/profile.js";
import { webhookRouter } from "./routes/webhooks.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", config.TRUST_PROXY);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // No Origin header means a server to server call (Make.com, curl); browsers always send one.
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/integrations", integrationsRouter);
  app.use("/api/webhooks", webhookRouter);
  app.use("/api/cron", cronRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Vercel's "Express" framework preset auto-detects this file as the entrypoint and requires a
// default export that is a function (an Express app qualifies, since it's callable) - it does not
// use api/index.js's export in that mode. createApp() stays a named export too, since tests need
// a fresh instance per run rather than this one shared module-load-time instance.
export default createApp();
