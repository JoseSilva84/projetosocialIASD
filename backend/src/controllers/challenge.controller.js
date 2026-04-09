import mongoose from "mongoose";
import Challenge from "../models/challenge.model.js";
import Participant from "../models/participant.model.js";
import {
    syncParticipantScores,
} from "../services/participantScore.service.js";

export const list = async (req, res) => {
  try {
    const filter = { groupId: req.groupId };
    const challenges = await Challenge.find(filter)
      .populate('participantIds', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(challenges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao listar desafios." });
  }
};

export const create = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "secretario") {
      return res.status(403).json({ message: "Acesso negado." });
    }

    const { title, points, participantIds } = req.body;

    if (!title || !Number.isFinite(points) || points <= 0 || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ message: "Título, pontos válidos e lista de participantes são obrigatórios." });
    }

    // Validate participantIds exist and belong to group
    const validParticipants = await Participant.find({
      _id: { $in: participantIds },
      groupId: req.groupId
    });
    
    if (validParticipants.length !== participantIds.length) {
      return res.status(400).json({ message: "Alguns participantes não encontrados ou não pertencem ao grupo." });
    }

    const challenge = await Challenge.create({
      title: title.trim(),
      points: Number(points),
      participantIds,
      groupId: req.groupId
    });

    // Add extra score to each participant
    for (const participantId of participantIds) {
      await Participant.findByIdAndUpdate(participantId, {
        $push: {
          extraEntries: {
            points: Number(points),
            reason: title.trim(),
            createdAt: new Date()
          }
        }
      });
      
      const participant = await Participant.findById(participantId);
      await syncParticipantScores(participant);
    }

    const populated = await Challenge.findById(challenge._id)
      .populate('participantIds', 'name');

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao criar desafio." });
  }
};

export const update = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "secretario") {
      return res.status(403).json({ message: "Acesso negado." });
    }

    const { id } = req.params;
    const { title, points, participantIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    if (!title || !Number.isFinite(points) || points <= 0 || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ message: "Título, pontos válidos e lista de participantes são obrigatórios." });
    }

    const challenge = await Challenge.findOne({ _id: id, groupId: req.groupId });
    if (!challenge) {
      return res.status(404).json({ message: "Desafio não encontrado." });
    }

    // Remove old extra entries from old participants
    for (const oldPid of challenge.participantIds) {
      const participant = await Participant.findById(oldPid);
      if (participant) {
        // Find and remove entries matching this challenge
        for (let i = participant.extraEntries.length - 1; i >= 0; i--) {
          const entry = participant.extraEntries[i];
          if (entry.reason === challenge.title && entry.points === challenge.points) {
            participant.extraEntries.splice(i, 1);
          }
        }
        participant.extraScore = participant.extraEntries.reduce((sum, e) => sum + e.points, 0);
        await participant.save();
        await syncParticipantScores(participant);
      }
    }

    // Validate new participants
    const validParticipants = await Participant.find({
      _id: { $in: participantIds },
      groupId: req.groupId
    });
    
    if (validParticipants.length !== participantIds.length) {
      return res.status(400).json({ message: "Alguns participantes não encontrados ou não pertencem ao grupo." });
    }

    // Update challenge
    challenge.title = title.trim();
    challenge.points = Number(points);
    challenge.participantIds = participantIds;
    await challenge.save();

    // Add new extra entries
    for (const newPid of participantIds) {
      const participant = await Participant.findById(newPid);
      if (participant) {
        participant.extraEntries.push({
          points: Number(points),
          reason: title.trim(),
          createdAt: new Date()
        });
        participant.extraScore = participant.extraEntries.reduce((sum, e) => sum + e.points, 0);
        await participant.save();
        await syncParticipantScores(participant);
      }
    }

    const populated = await Challenge.findById(id)
      .populate('participantIds', 'name');

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar desafio." });
  }
};

export const remove = async (req, res) => {
  try {
    if (req.userRole !== "admin" && req.userRole !== "secretario") {
      return res.status(403).json({ message: "Acesso negado." });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const challenge = await Challenge.findOne({ _id: id, groupId: req.groupId });
    if (!challenge) {
      return res.status(404).json({ message: "Desafio não encontrado." });
    }

    // Remove extra entries from participants
    for (const pid of challenge.participantIds) {
      const participant = await Participant.findById(pid);
      if (participant) {
        // Remove matching entries
        for (let i = participant.extraEntries.length - 1; i >= 0; i--) {
          const entry = participant.extraEntries[i];
          if (entry.reason === challenge.title && entry.points === challenge.points) {
            participant.extraEntries.splice(i, 1);
          }
        }
        participant.extraScore = participant.extraEntries.reduce((sum, e) => sum + e.points, 0);
        await participant.save();
        await syncParticipantScores(participant);
      }
    }

    await Challenge.findByIdAndDelete(id);

    res.json({ message: "Desafio removido com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao remover desafio." });
  }
};

