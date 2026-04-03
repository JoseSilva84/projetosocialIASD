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
    const role = trimmed === 'admin' ? 'admin' : 'user';
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name: trimmed, passwordHash, role });
    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, role: user.role },
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
    let user = await User.findOne({ name: trimmed });

    // Suporte rápido para admin padrão
    if (!user && trimmed.toLowerCase() === 'admin' && password === 'user') {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      user = await User.create({ name: 'admin', passwordHash, role: 'admin' });
    }

    if (!user) {
      return res.status(401).json({ message: "Nome ou senha inválidos." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Nome ou senha inválidos." });
    }

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao entrar." });
  }
};

export const getUsers = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Somente o administrador pode carregar a lista de usuarios." });
    }
    const users = await User.find({}, "-passwordHash").sort({ name: 1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar usuarios." });
  }
};

export const createUser = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Somente o administrador pode criar usuarios." });
    }

    const { name, password, role } = req.body;
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
    const userRole = role && ['admin', 'secretario', 'user', 'convidado'].includes(role) ? role : 'user';
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name: trimmed, passwordHash, role: userRole });
    res.status(201).json({
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar usuario." });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Somente o administrador pode excluir usuarios." });
    }

    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "Usuario nao encontrado." });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Nao e possivel excluir um administrador." });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "Usuario excluido com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir usuario." });
  }
};
