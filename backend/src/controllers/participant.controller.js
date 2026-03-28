import mongoose from "mongoose";
import Participant from "../models/participant.model.js";
import {
  syncParticipantScores,
  syncParticipantScoresIfNeeded,
} from "../services/participantScore.service.js";

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
  const dayIds = arr.map((item) => item.dayId);
  const set = new Set(dayIds);
  if (set.size !== arr.length) return false;
  return arr.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      Number.isInteger(item.dayId) &&
      item.dayId >= 1 &&
      item.dayId <= 25 &&
      (item.markedDate instanceof Date ||
        (typeof item.markedDate === "string" && !Number.isNaN(Date.parse(item.markedDate))))
  );
}

function normalizeReference(reference) {
  return String(reference || "").trim();
}

export const patchBiblicalStudy = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Somente o administrador pode alterar o estudo biblico." });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }
    const { selectedBiblicalLesson, biblicalLessonsCompleted } = req.body;

    if (selectedBiblicalLesson !== undefined && selectedBiblicalLesson !== null) {
      const n = Number(selectedBiblicalLesson);
      if (!Number.isInteger(n) || n < 1 || n > 15) {
        return res.status(400).json({ message: "A licao atual deve ser entre 1 e 15." });
      }
    }

    if (biblicalLessonsCompleted !== undefined && !validateLessonNumbers(biblicalLessonsCompleted)) {
      return res.status(400).json({
        message: "Lista de licoes concluidas invalida (1-15, sem repetir).",
      });
    }

    const update = {};
    if (selectedBiblicalLesson !== undefined) {
      update.selectedBiblicalLesson = selectedBiblicalLesson === null ? null : Number(selectedBiblicalLesson);
    }
    if (biblicalLessonsCompleted !== undefined) {
      update.biblicalLessonsCompleted = [...biblicalLessonsCompleted].sort((a, b) => a - b);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nenhum campo para atualizar." });
    }

    const filter = req.userRole === "admin" ? { _id: id } : { _id: id, registeredBy: req.userId };
    const participant = await Participant.findOneAndUpdate(filter, { $set: update }, { new: true, runValidators: true });

    if (!participant) {
      return res.status(404).json({ message: "Participante nao encontrado." });
    }

    await syncParticipantScores(participant);
    await participant.save();

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar estudo biblico." });
  }
};

export const patchFrequency = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Somente o administrador pode alterar a frequencia." });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }
    const { frequencyAttended } = req.body;

    if (frequencyAttended !== undefined && !validateFrequencyNumbers(frequencyAttended)) {
      return res.status(400).json({
        message: "Lista de dias de frequencia invalida (dayId 1-25, markedDate valida e sem repetir).",
      });
    }

    const update = {};
    if (frequencyAttended !== undefined) {
      update.frequencyAttended = [...frequencyAttended]
        .map((item) => ({
          dayId: item.dayId,
          markedDate: item.markedDate instanceof Date ? item.markedDate : new Date(item.markedDate),
        }))
        .sort((a, b) => a.dayId - b.dayId);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nenhum campo para atualizar." });
    }

    const filter = req.userRole === "admin" ? { _id: id } : { _id: id, registeredBy: req.userId };
    const participant = await Participant.findOneAndUpdate(filter, { $set: update }, { new: true, runValidators: true });

    if (!participant) {
      return res.status(404).json({ message: "Participante nao encontrado." });
    }

    await syncParticipantScores(participant);
    await participant.save();

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar frequencia." });
  }
};

export const create = async (req, res) => {
  try {
    const { name, address, houseNumber, reference, age, whatsapp } = req.body;
    const parsedAge = Number(age);

    if (!name || !address || !houseNumber || !whatsapp || !Number.isInteger(parsedAge) || parsedAge < 0) {
      return res.status(400).json({
        message: "Nome, rua, numero da casa, idade e WhatsApp sao obrigatorios.",
      });
    }

    const participant = await Participant.create({
      name: String(name).trim(),
      address: String(address).trim(),
      houseNumber: String(houseNumber).trim(),
      reference: normalizeReference(reference),
      age: parsedAge,
      whatsapp: String(whatsapp).trim(),
      registeredBy: req.userId,
    });

    await syncParticipantScores(participant);
    await participant.save();

    res.status(201).json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao cadastrar participante." });
  }
};

export const listMine = async (req, res) => {
  try {
    const query = ["admin", "user", "convidado"].includes(req.userRole)
      ? {}
      : { registeredBy: req.userId };

    const list = await Participant.find(query).sort({ createdAt: -1 });
    await syncParticipantScoresIfNeeded(list);
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
      return res.status(400).json({ message: "ID invalido." });
    }

    const { name, address, houseNumber, reference, age, whatsapp } = req.body;
    const parsedAge = Number(age);
    if (!name || !address || !houseNumber || !whatsapp || !Number.isInteger(parsedAge) || parsedAge < 0) {
      return res.status(400).json({
        message: "Nome, rua, numero da casa, idade e WhatsApp sao obrigatorios.",
      });
    }

    const filter = req.userRole === "admin" ? { _id: id } : { _id: id, registeredBy: req.userId };
    const participant = await Participant.findOneAndUpdate(
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

    if (!participant) {
      return res.status(404).json({ message: "Participante nao encontrado." });
    }

    await syncParticipantScores(participant);
    await participant.save();

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar participante." });
  }
};

export const patchExtraScore = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Somente o administrador pode alterar a pontuacao extra." });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const parsedPoints = Number(req.body?.points);
    const reason = String(req.body?.reason || "").trim();

    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      return res.status(400).json({ message: "Informe uma pontuacao extra maior que zero." });
    }

    if (!reason) {
      return res.status(400).json({ message: "Informe o motivo da pontuacao extra." });
    }

    const filter = req.userRole === "admin" ? { _id: id } : { _id: id, registeredBy: req.userId };
    const participant = await Participant.findOne(filter);

    if (!participant) {
      return res.status(404).json({ message: "Participante nao encontrado." });
    }

    participant.extraEntries = Array.isArray(participant.extraEntries) ? [...participant.extraEntries] : [];
    participant.extraEntries.push({
      points: parsedPoints,
      reason,
      createdAt: new Date(),
    });

    await syncParticipantScores(participant);
    await participant.save();

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar pontuacao extra." });
  }
};

export const deleteParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const filter = req.userRole === "admin" ? { _id: id } : { _id: id, registeredBy: req.userId };
    const participant = await Participant.findOneAndDelete(filter);
    if (!participant) {
      return res.status(404).json({ message: "Participante nao encontrado." });
    }

    res.json({ message: "Participante excluido com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir participante." });
  }
};
