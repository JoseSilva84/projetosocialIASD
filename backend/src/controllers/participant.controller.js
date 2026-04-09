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

async function persistScoreSnapshot(participant) {
  await Participant.updateOne(
    { _id: participant._id },
    {
      $set: {
        extraEntries: participant.extraEntries,
        extraScore: participant.extraScore,
        scoreSummary: participant.scoreSummary,
      },
    }
  );
}

export const patchBiblicalStudy = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "secretario") {
      return res.status(403).json({ message: "Somente o administrador ou secretário pode alterar o estudo biblico." });
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

    const isManager = req.userRole === "admin" || req.userRole === "secretario";
    const filter = isManager ? { _id: id, groupId: req.groupId } : { _id: id, registeredBy: req.userId, groupId: req.groupId };
    const participant = await Participant.findOneAndUpdate(filter, { $set: update }, { new: true, runValidators: true });

    if (!participant) {
      return res.status(404).json({ message: "Participante nao encontrado." });
    }

    await syncParticipantScores(participant);
    await persistScoreSnapshot(participant);

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar estudo biblico." });
  }
};

export const patchFrequency = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "secretario") {
      return res.status(403).json({ message: "Somente o administrador ou secretário pode alterar a frequencia." });
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

    const isManager = req.userRole === "admin" || req.userRole === "secretario";
    const filter = isManager ? { _id: id, groupId: req.groupId } : { _id: id, registeredBy: req.userId, groupId: req.groupId };
    const participant = await Participant.findOneAndUpdate(filter, { $set: update }, { new: true, runValidators: true });

    if (!participant) {
      return res.status(404).json({ message: "Participante nao encontrado." });
    }

    await syncParticipantScores(participant);
    await persistScoreSnapshot(participant);

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar frequencia." });
  }
};

export const create = async (req, res) => {
  try {
    if (!req.groupId) {
      return res.status(400).json({ message: "Grupo não selecionado." });
    }

    const { name, address, neighborhood, houseNumber, reference, age, whatsapp } = req.body;
    const parsedAge = Number(age);

    if (!name || !address || !neighborhood || !houseNumber || !whatsapp || !Number.isInteger(parsedAge) || parsedAge < 0) {
      return res.status(400).json({
        message: "Nome, rua, bairro, numero da casa, idade e WhatsApp sao obrigatorios.",
      });
    }

    const participant = await Participant.create({
      name: String(name).trim(),
      address: String(address).trim(),
      neighborhood: String(neighborhood).trim(),
      houseNumber: String(houseNumber).trim(),
      reference: normalizeReference(reference),
      age: parsedAge,
      whatsapp: String(whatsapp).trim(),
      registeredBy: req.userId,
      groupId: req.groupId,
    });

    await syncParticipantScores(participant);
    await persistScoreSnapshot(participant);

    res.status(201).json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao cadastrar participante." });
  }
};

export const listMine = async (req, res) => {
  try {
    if (!req.groupId) {
      return res.status(400).json({ message: "Grupo não selecionado." });
    }

    const query = { groupId: req.groupId };
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

    const { name, address, neighborhood, houseNumber, reference, age, whatsapp } = req.body;
    const parsedAge = Number(age);
    if (!name || !address || !neighborhood || !houseNumber || !whatsapp || !Number.isInteger(parsedAge) || parsedAge < 0) {
      return res.status(400).json({
        message: "Nome, rua, bairro, numero da casa, idade e WhatsApp sao obrigatorios.",
      });
    }

    const isManager = req.userRole === "admin" || req.userRole === "secretario";
    const filter = isManager ? { _id: id, groupId: req.groupId } : { _id: id, registeredBy: req.userId, groupId: req.groupId };
    const participant = await Participant.findOneAndUpdate(
      filter,
      {
        name: String(name).trim(),
        address: String(address).trim(),
        neighborhood: String(neighborhood).trim(),
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
    await persistScoreSnapshot(participant);

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar participante." });
  }
};

export const patchExtraScore = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "secretario") {
      return res.status(403).json({ message: "Somente o administrador ou secretário pode alterar a pontuacao extra." });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const parsedPoints = Number(req.body?.points);
    const reason = String(req.body?.reason || "").trim();

    if (!Number.isFinite(parsedPoints) || parsedPoints === 0) {
      return res.status(400).json({ message: "Informe uma pontuacao diferente de zero." });
    }

    if (!reason) {
      return res.status(400).json({ message: "Informe o motivo da pontuacao." });
    }

    const filter = req.userRole === "admin" ? { _id: id, groupId: req.groupId } : { _id: id, groupId: req.groupId };
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
    await persistScoreSnapshot(participant);

    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar pontuacao extra." });
  }
};

export const patchQuizCorrectAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const participant = await Participant.findById(id);

    if (!participant) {
      return res.status(404).json({ message: "Participante nao encontrado." });
    }

    if (req.groupId && String(participant.groupId) !== String(req.groupId)) {
      return res.status(403).json({ message: "Acesso negado ao participante." });
    }

    const currentCount = Number(participant.quizCorrectAnswers || 0);
    const newCount = currentCount + 1;
    
    await Participant.updateOne(
      { _id: id },
      { $set: { quizCorrectAnswers: newCount } }
    );

    const updated = await Participant.findById(id);
    res.json(updated);
  } catch (err) {
    console.error("Erro em patchQuizCorrectAnswer:", err.message, err.stack);
    res.status(500).json({ message: "Erro ao atualizar acertos do quiz: " + err.message });
  }
};

export const patchQuizQuestionComplete = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "secretario" && req.userRole !== "convidado") {
      return res.status(403).json({ message: "Acesso negado para esta operação." });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const { studyIndex, questionId, action } = req.body;
    if (!Number.isInteger(studyIndex) || studyIndex < 0 || !Number.isInteger(questionId) || questionId < 1 || !['add', 'remove'].includes(action)) {
      return res.status(400).json({ message: "studyIndex (>=0), questionId (>=1), action ('add'|'remove') inválidos." });
    }

    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ message: "Participante não encontrado." });
    }

    if (req.groupId && String(participant.groupId) !== String(req.groupId)) {
      return res.status(403).json({ message: "Acesso negado ao participante." });
    }

    const key = `${studyIndex}_${questionId}`;
    const existingIndex = participant.quizCompleted.findIndex(item => 
      item.studyIndex === studyIndex && item.questionId === questionId
    );

    if (action === 'add') {
      if (existingIndex !== -1) {
        return res.status(409).json({ message: "Pergunta já completada por este participante." });
      }
      participant.quizCompleted.push({
        studyIndex,
        questionId,
        completedAt: new Date()
      });
      participant.quizCorrectAnswers = (Number(participant.quizCorrectAnswers || 0)) + 1;
    } else { // remove
      if (existingIndex === -1) {
        return res.status(404).json({ message: "Pergunta não encontrada nos registros deste participante." });
      }
      participant.quizCompleted.splice(existingIndex, 1);
      participant.quizCorrectAnswers = Math.max(0, (Number(participant.quizCorrectAnswers || 0)) - 1);
    }

    await participant.save({ validateModifiedOnly: true });

    // Sync score after quiz change
    const { syncParticipantScores } = await import('../services/participantScore.service.js');
    await syncParticipantScores(participant);

    res.json({
      success: true,
      action,
      quizCorrectAnswers: participant.quizCorrectAnswers,
      quizCompletedCount: participant.quizCompleted.length
    });
  } catch (err) {
    console.error("Erro em patchQuizQuestionComplete:", err);
    res.status(500).json({ message: "Erro ao atualizar completude da pergunta do quiz." });
  }
};

export const getQuizChallengesStats = async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) {
      return res.status(400).json({ message: "groupId é obrigatório." });
    }

    const pipeline = [
      { $match: { groupId: new mongoose.Types.ObjectId(groupId) } },
      { $unwind: { path: '$quizCompleted', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            studyIndex: '$quizCompleted.studyIndex',
            questionId: '$quizCompleted.questionId'
          },
          participants: {
            $push: {
              _id: '$_id',
              name: '$name'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.studyIndex': 1, '_id.questionId': 1 } },
      {
        $project: {
          challengeId: { 
            $concat: [
              'S', { $toString: { $add: [{ $toInt: '$_id.studyIndex' }, 1] } },
              '_Q', { $toString: '$_id.questionId' }
            ] 
          },
          studyIndex: '$_id.studyIndex',
          questionId: '$_id.questionId',
          participants: 1,
          count: 1,
          _id: 0
        }
      }
    ];

    const stats = await Participant.aggregate(pipeline);
    res.json(stats);
  } catch (err) {
    console.error("Erro em getQuizChallengesStats:", err);
    res.status(500).json({ message: "Erro ao obter estatísticas dos desafios do quiz." });
  }
};

export const deleteParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const isManager = req.userRole === "admin" || req.userRole === "secretario";
    const filter = isManager ? { _id: id, groupId: req.groupId } : { _id: id, registeredBy: req.userId, groupId: req.groupId };
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

export const deleteExtraEntry = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "secretario") {
      return res.status(403).json({ message: "Somente admin ou secretario pode remover entradas extras." });
    }

    const { id, entryIndex } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de participante inválido." });
    }
    const index = parseInt(entryIndex);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ message: "Índice de entrada inválido." });
    }

    const filter = { _id: id, groupId: req.groupId };
    const participant = await Participant.findOne(filter);

    if (!participant) {
      return res.status(404).json({ message: "Participante não encontrado." });
    }

    if (!Array.isArray(participant.extraEntries) || index >= participant.extraEntries.length) {
      return res.status(404).json({ message: "Entrada extra não encontrada." });
    }

    // Remove entry
    participant.extraEntries.splice(index, 1);

    await syncParticipantScores(participant);
    await persistScoreSnapshot(participant);

    res.json({ 
      message: "Entrada extra removida com sucesso.",
      remaining: participant.extraEntries.length,
      participant 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover entrada extra." });
  }
};

export const deleteAllParticipants = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Somente o administrador pode excluir todos os participantes." });
    }

    const groupId = req.query.groupId || req.groupId;
    if (!groupId) {
      return res.status(400).json({ message: "groupId é obrigatório para a exclusão." });
    }

    await Participant.deleteMany({ groupId });
    res.json({ message: `Todos os participantes do grupo ${groupId} foram excluídos com sucesso.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao excluir todos os participantes." });
  }
};
