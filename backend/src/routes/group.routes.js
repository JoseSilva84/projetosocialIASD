import express from "express";
import {
    assignParticipantsToGroup,
    createGroup,
    deleteGroup,
    listGroups,
} from "../controllers/group.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", listGroups);
router.post("/", createGroup);
router.post("/:id/assign-old-participants", assignParticipantsToGroup);
router.delete("/:id", deleteGroup);

export default router;