import express from "express";
import {
    create,
    deleteParticipant,
    listMine,
    patchExtraScore,
    patchBiblicalStudy,
    patchFrequency,
    update,
} from "../controllers/participant.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", listMine);
router.post("/", create);
router.put("/:id", update);
router.patch("/:id/biblical-study", patchBiblicalStudy);
router.patch("/:id/frequency", patchFrequency);
router.patch("/:id/extra-score", patchExtraScore);
router.delete("/:id", deleteParticipant);

export default router;
