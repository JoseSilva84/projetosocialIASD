import express from "express";
import {
  create,
  listMine,
  patchBiblicalStudy,
} from "../controllers/participant.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", listMine);
router.post("/", create);
router.patch("/:id/biblical-study", patchBiblicalStudy);

export default router;
