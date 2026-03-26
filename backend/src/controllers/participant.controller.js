import mongoose from "mongoose";
import Participant from "../models/participant.model.js";

function validateLessonNumbers(arr) {
  if (!Array.isArray(arr)) return false;
  if (arr.length > 15) return false;
  const set = new Set(arr);
  if (set.size !== arr.length) return false;
  return arr.every((n) => Number.isInteger(n) && n >= 1 && n <= 15);
}

function validateFrequencyNumbers(arr) {
  if (!Array.isArray(arr)) return false;
  if (arr.length > 25) return false;
  const dayIds = arr.map(item => item.dayId);
  const set = new Set(dayIds);
  if (set.size !== arr.length) return false;
  return arr.every((item) => 
    typeof item === 'object' && 
    item !== null &&
    Number.isInteger(item.dayId) && 
    item.dayId >= 1 && 
    item.dayId <= 25 &&
    (item.markedDate instanceof Date || (typeof item.markedDate === 'string' && !isNaN(Date.parse(item.markedDate))))
  );
}

function normalizeReference(reference) {
  return String(reference || "").trim();
}

function buildExtraEntries(participant) {
  if (Array.isArray(participant?.extraEntries) && participant.extraEntries.length > 0) {
    return participant.extraEntries;
  }

  if (typeof participant?.extraScore === "number" && participant.extraScore > 0) {
    return [
      {
        points: participant.extraScore,
        reason: "Pontuação extra anterior",
        createdAt: participant.updatedAt || participant.createdAt || new Date(),
      },
    ];
  }

  return [];
}

export const patchBiblicalStudy = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }
    const { selectedBiblicalLesson, biblicalLessonsCompleted } = req.body;

    if (selectedBiblicalLesson !== undefined && selectedBiblicalLesson !== null) {
      const n = Number(selectedBiblicalLesson);
      if (!Number.isInteger(n) || n < 1 || n > 15) {
        return res.status(400).json({ message: "A lição atual deve ser entre 1 e 15." });
      }
    }

    if (biblicalLessonsCompleted !== undefined) {
      if (!validateLessonNumbers(biblicalLessonsCompleted)) {
        return res.status(400).json({
          message: "Lista de lições concluídas inválida (1–15, sem repetir).",
        });
      }
    }

    const update = {};
    if (selectedBiblicalLesson !== undefined) {
      update.selectedBiblicalLesson =
        selectedBiblicalLesson === null ? null : Number(selectedBiblicalLesson);
    }
    if (biblicalLessonsCompleted !== undefined) {
      update.biblicalLessonsCompleted = [...biblicalLessonsCompleted].sort((a, b) => a - b);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nenhum campo para atualizar." });
    }

    const filter = req.userRole === 'admin' ? { _id: id } : { _id: id, registeredBy: req.userId };
    const p = await Participant.findOneAndUpdate(
      filter,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!p) {
      return res.status(404).json({ message: "Participante não encontrado." });
    }

    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar estudo bíblico." });
  }
};

export const patchFrequency = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }
    const { frequencyAttended } = req.body;

    if (frequencyAttended !== undefined) {
      if (!validateFrequencyNumbers(frequencyAttended)) {
        return res.status(400).json({
          message: "Lista de dias de frequência inválida (objetos com dayId 1–25 e markedDate válida, sem dayId repetido).",
        });
      }
    }

    const update = {};
    if (frequencyAttended !== undefined) {
      // Garantir que markedDate seja Date e ordenar por dayId
      update.frequencyAttended = [...frequencyAttended]
        .map(item => ({
          dayId: item.dayId,
          markedDate: item.markedDate instanceof Date ? item.markedDate : new Date(item.markedDate)
        }))
        .sort((a, b) => a.dayId - b.dayId);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nenhum campo para atualizar." });
    }

    const filter = req.userRole === 'admin' ? { _id: id } : { _id: id, registeredBy: req.userId };
    const p = await Participant.findOneAndUpdate(
      filter,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!p) {
      return res.status(404).json({ message: "Participante não encontrado." });
    }

    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar frequência." });
  }
};

export const create = async (req, res) => {
  try {
    const { name, address, houseNumber, reference, age, whatsapp } = req.body;
    const parsedAge = Number(age);
    if (!name || !address || !houseNumber || !whatsapp || !Number.isInteger(parsedAge) || parsedAge < 0) {
      return res
        .status(400)
        .json({ message: "Nome, rua, número da casa, idade e WhatsApp são obrigatórios." });
    }
    const p = await Participant.create({
      name: String(name).trim(),
      address: String(address).trim(),
      houseNumber: String(houseNumber).trim(),
      reference: normalizeReference(reference),
      age: parsedAge,
      whatsapp: String(whatsapp).trim(),
      registeredBy: req.userId,
    });
    res.status(201).json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao cadastrar participante." });
  }
};

export const listMine = async (req, res) => {
  try {
    // Admin e usuários convidados devem ver todos os participantes cadastrados.
    // Usuários com perfis restritos ainda podem ver somente os seus próprios itens.
    const query = ['admin', 'user', 'convidado'].includes(req.userRole)
      ? {}
      : { registeredBy: req.userId };
    const list = await Participant.find(query).sort({
      createdAt: -1,
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao listar participantes." });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }
    const { name, address, houseNumber, reference, age, whatsapp } = req.body;
    const parsedAge = Number(age);
    if (!name || !address || !houseNumber || !whatsapp || !Number.isInteger(parsedAge) || parsedAge < 0) {
      return res.status(400).json({ message: "Nome, rua, número da casa, idade e WhatsApp são obrigatórios." });
    }

    const filter = req.userRole === 'admin' ? { _id: id } : { _id: id, registeredBy: req.userId };
    const p = await Participant.findOneAndUpdate(
      filter,
      {
        name: String(name).trim(),
        address: String(address).trim(),
        houseNumber: String(houseNumber).trim(),
        reference: normalizeReference(reference),
        age: parsedAge,
        whatsapp: String(whatsapp).trim(),
      },
      { new: true, runValidators: true }
    );

    if (!p) {
      return res.status(404).json({ message: "Participante não encontrado." });
    }

    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar participante." });
  }
};

export const patchExtraScore = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const parsedPoints = Number(req.body?.points);
    const reason = String(req.body?.reason || "").trim();

    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      return res.status(400).json({ message: "Informe uma pontuação extra maior que zero." });
    }

    if (!reason) {
      return res.status(400).json({ message: "Informe o motivo da pontuação extra." });
    }

    const filter = req.userRole === "admin" ? { _id: id } : { _id: id, registeredBy: req.userId };
    const participant = await Participant.findOne(filter);

    if (!participant) {
      return res.status(404).json({ message: "Participante não encontrado." });
    }

    const extraEntries = buildExtraEntries(participant);
    extraEntries.push({
      points: parsedPoints,
      reason,
      createdAt: new Date(),
    });

    participant.extraEntries = extraEntries;
    participant.extraScore = extraEntries.reduce((sum, entry) => sum + Number(entry.points || 0), 0);

    await participant.save();

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar pontuação extra." });
  }
};

export const deleteParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const filter = req.userRole === 'admin' ? { _id: id } : { _id: id, registeredBy: req.userId };
    const p = await Participant.findOneAndDelete(filter);
    if (!p) {
      return res.status(404).json({ message: "Participante não encontrado." });
    }

    res.json({ message: "Participante excluído com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir participante." });
  }
};
