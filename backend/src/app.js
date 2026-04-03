import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import groupRoutes from "./routes/group.routes.js";
import participantRoutes from "./routes/participant.routes.js";
import rankingConfigRoutes from "./routes/rankingConfig.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/ranking-config", rankingConfigRoutes);
app.use("/api/groups", groupRoutes);

export { app };

