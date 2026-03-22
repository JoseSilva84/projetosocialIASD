import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import participantRoutes from "./routes/participant.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/participants", participantRoutes);

export { app };
