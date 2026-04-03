import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import router from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.frontendUrls.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true
    })
  );
  app.use(express.json());
  app.use("/api", router);
  app.use("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);

  return app;
}
