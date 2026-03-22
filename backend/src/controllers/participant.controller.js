import mongoose from "mongoose";
import Participant from "../models/participant.model.js";

function validateLessonNumbers(arr) {
  if (!Array.isArray(arr)) return false;
  if (arr.length > 15) return false;
  const set = new Set(arr);
  if (set.size !== arr.length) return false;
  return arr.every((n) => Number.isInteger(n) && n >= 1 && n <= 15);
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

    const p = await Participant.findOneAndUpdate(
      { _id: id, registeredBy: req.userId },
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

export const create = async (req, res) => {
  try {
    const { name, address, whatsapp } = req.body;
    if (!name || !address || !whatsapp) {
      return res
        .status(400)
        .json({ message: "Nome, endereço e WhatsApp são obrigatórios." });
    }
    const p = await Participant.create({
      name: String(name).trim(),
      address: String(address).trim(),
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
    const list = await Participant.find({ registeredBy: req.userId }).sort({
      createdAt: -1,
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao listar participantes." });
  }
};
