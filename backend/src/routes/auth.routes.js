import express from "express";
import { register, login, getUsers, deleteUser } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.use(requireAuth);
router.get("/", getUsers);
router.delete("/:id", deleteUser);

export default router;
