import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const SALT_ROUNDS = 10;

export const register = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: "Nome e senha são obrigatórios." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres." });
    }
    const trimmed = String(name).trim();
    const existing = await User.findOne({ name: trimmed });
    if (existing) {
      return res.status(409).json({ message: "Este nome de usuário já está em uso." });
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name: trimmed, passwordHash });
    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao registrar." });
  }
};

export const login = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: "Nome e senha são obrigatórios." });
    }
    const trimmed = String(name).trim();
    const user = await User.findOne({ name: trimmed });
    if (!user) {
      return res.status(401).json({ message: "Nome ou senha inválidos." });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Nome ou senha inválidos." });
    }
    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      token,
      user: { id: user._id, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao entrar." });
  }
};
