import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import groupRoutes from "./routes/group.routes.js";
import participantRoutes from "./routes/participant.routes.js";
import rankingConfigRoutes from "./routes/rankingConfig.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas requisições. Tente novamente mais tarde." }
});

app.use(limiter);

app.use("/api/auth", authRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/ranking-config", rankingConfigRoutes);
app.use("/api/groups", groupRoutes);

export { app };

