import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import health from "./routes/health.routes.js";
import kundali from "./routes/kundali.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((x) => x.trim())
}));
app.use(compression());
app.use(express.json({ limit: "32kb" }));
app.use(requestId);
app.use(pinoHttp({ customProps: (_req, res) => ({ requestId: res.locals.requestId }) }));

app.get("/", (_req, res) => res.json({
  service: "Bhavishya Katha Kundali API",
  version: "1.3.5",
  endpoint: "POST /api/v1/kundali/generate"
}));

app.use("/health", health);
app.use("/api/v1/kundali", kundali);
app.use((_req, res) => res.status(404).json({
  error: { code: "NOT_FOUND", message: "Route not found." }
}));
app.use(errorHandler);
