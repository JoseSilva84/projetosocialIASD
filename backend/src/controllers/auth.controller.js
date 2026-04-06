import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";

const SALT_ROUNDS = 10;

function isStrongPassword(password) {
  if (!password || typeof password !== 'string') return false;
  const trimmed = password.trim();
  const weakPasswords = ['12345678', 'password', 'admin', 'boi123', '123456789', 'qwerty'];
  return trimmed.length >= 8 && !weakPasswords.includes(trimmed.toLowerCase());
}

export const register = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: "Nome e senha são obrigatórios." });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: "A senha deve ter pelo menos 8 caracteres e não ser uma senha fraca." });
    }
    const trimmed = String(name).trim();
    const existing = await User.findOne({ name: trimmed });
    if (existing) {
      return res.status(409).json({ message: "Este nome de usuário já está em uso." });
    }
    const role = 'user';
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
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: "A senha deve ter pelo menos 8 caracteres e não ser uma senha fraca." });
    }
    const trimmed = String(name).trim();
    const existing = await User.findOne({ name: trimmed });
    if (existing) {
      return res.status(409).json({ message: "Este nome de usuário já está em uso." });
    }
    const allowedRoles = ['secretario', 'user', 'convidado'];
    const userRole = role && allowedRoles.includes(role) ? role : 'user';
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

export const selectGroup = async (req, res) => {
  try {
    const { groupId, password } = req.body;
    if (!groupId || !password) {
      return res.status(400).json({ message: "ID do grupo e senha são obrigatórios." });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Grupo não encontrado." });
    }

    const isValid = await bcrypt.compare(password, group.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    // Gerar novo token com groupId
    const token = jwt.sign(
      { sub: req.userId, role: req.userRole, groupId: groupId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      group: { id: group._id, name: group.name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao selecionar grupo." });
  }
};
