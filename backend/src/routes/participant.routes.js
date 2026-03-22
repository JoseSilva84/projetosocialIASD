import express from "express";
import { create, listMine } from "../controllers/participant.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", listMine);
router.post("/", create);

export default router;
