import express from "express";
import { getRankingConfig, updateRankingConfig } from "../controllers/rankingConfig.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", getRankingConfig);
router.put("/", updateRankingConfig);

export default router;
