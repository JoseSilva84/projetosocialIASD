import express from "express";
import { createUser, deleteUser, getUsers, login, register, selectGroup } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/select-group", requireAuth, selectGroup);

router.use(requireAuth);
router.post("/create", createUser);
router.get("/", getUsers);
router.delete("/:id", deleteUser);

export default router;
