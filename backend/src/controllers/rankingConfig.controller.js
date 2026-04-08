import RankingConfig from "../models/rankingConfig.model.js";
import { syncAllParticipantScores } from "../services/participantScore.service.js";

export const getRankingConfig = async (req, res) => {
  try {
    let config = await RankingConfig.findOne();
    if (!config) {
      config = await RankingConfig.create({});
    }
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao obter configuracao de ranking." });
  }
};

export const updateRankingConfig = async (req, res) => {
  try {
    const { presenceWeight, biblicalWeight, extraLabel, extraWeight, quizEnabled, quizQuestionPoints } = req.body;
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Acesso negado." });
    }

    let config = await RankingConfig.findOne();
    if (!config) {
      config = new RankingConfig();
    }

    if (presenceWeight !== undefined) config.presenceWeight = Number(presenceWeight);
    if (biblicalWeight !== undefined) config.biblicalWeight = Number(biblicalWeight);
    if (extraLabel !== undefined) config.extraLabel = String(extraLabel || "Extra");
    if (extraWeight !== undefined) config.extraWeight = Number(extraWeight);
    if (quizEnabled !== undefined) config.quizEnabled = Boolean(quizEnabled);
    if (quizQuestionPoints !== undefined) config.quizQuestionPoints = Number(quizQuestionPoints);

    await config.save();
    await syncAllParticipantScores(config);

    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar configuracao de ranking." });
  }
};
