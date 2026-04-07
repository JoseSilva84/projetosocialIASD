import express from "express";
import {
    create,
    deleteAllParticipants,
    deleteParticipant,
    listMine,
    patchBiblicalStudy,
    patchExtraScore,
    patchFrequency,
    patchQuizCorrectAnswer,
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
router.patch("/:id/quiz-correct-answer", patchQuizCorrectAnswer);
router.delete("/all", deleteAllParticipants);
router.delete("/:id", deleteParticipant);

export default router;
