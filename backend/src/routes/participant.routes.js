import express from "express";
import {
    create,
    listMine,
    patchBiblicalStudy,
    patchFrequency,
} from "../controllers/participant.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", listMine);
router.post("/", create);
router.patch("/:id/biblical-study", patchBiblicalStudy);
router.patch("/:id/frequency", patchFrequency);

export default router;
