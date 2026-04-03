import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Group from "../models/group.model.js";

const SALT_ROUNDS = 10;

export const createGroup = async (req, res) => {
  try {
    if (!["admin", "secretario"].includes(req.userRole)) {
      return res.status(403).json({ message: "Somente administrador ou secretário pode criar grupos." });
    }

    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ message: "Nome e senha são obrigatórios." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres." });
    }

    const trimmedName = String(name).trim();
    const existing = await Group.findOne({ name: trimmedName });
    if (existing) {
      return res.status(409).json({ message: "Este nome de grupo já está em uso." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const group = await Group.create({
      name: trimmedName,
      passwordHash,
      createdBy: req.userId,
    });

    res.status(201).json({
      id: group._id,
      name: group.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar grupo." });
  }
};

export const listGroups = async (req, res) => {
  try {
    const groups = await Group.find({}, "name createdBy").sort({ name: 1 });
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao listar grupos." });
  }
};

export const verifyGroupPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Grupo não encontrado." });
    }

    const isValid = await bcrypt.compare(password, group.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    res.json({
      id: group._id,
      name: group.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao verificar senha." });
  }
};

export const assignParticipantsToGroup = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Somente o administrador pode atribuir participantes ao grupo." });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Grupo não encontrado." });
    }

    const Participant = mongoose.model("Participant");
    const result = await Participant.updateMany(
      { $or: [{ groupId: null }, { groupId: { $exists: false } }] },
      { $set: { groupId: id } }
    );

    res.json({
      message: `Participantes sem grupo atribuídos ao grupo ${group.name}.`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atribuir participantes ao grupo." });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Somente o administrador pode excluir grupos." });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Grupo não encontrado." });
    }

    // Verificar se há participantes no grupo
    const Participant = mongoose.model("Participant");
    const count = await Participant.countDocuments({ groupId: id });
    if (count > 0) {
      return res.status(400).json({ message: "Não é possível excluir um grupo que possui participantes." });
    }

    await Group.findByIdAndDelete(id);
    res.json({ message: "Grupo excluído com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir grupo." });
  }
};