import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url))
});

function parseAllowedOrigins() {
  const configured = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL;

  if (configured) {
    return configured
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return ["http://127.0.0.1:5173", "http://localhost:5173"];
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://attendance:attendance@localhost:5432/attendance",
  jwtSecret: process.env.JWT_SECRET ?? "change-me",
  setupTokenExpiresHours: Number(process.env.SETUP_TOKEN_EXPIRES_HOURS ?? 24),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  frontendUrls: parseAllowedOrigins(),
  smtpHost: process.env.SMTP_HOST ?? "localhost",
  smtpPort: Number(process.env.SMTP_PORT ?? 1025),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "no-reply@example.com"
};
