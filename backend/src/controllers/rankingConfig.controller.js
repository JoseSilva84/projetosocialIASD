import RankingConfig from "../models/rankingConfig.model.js";

export const getRankingConfig = async (req, res) => {
  try {
    let config = await RankingConfig.findOne();
    if (!config) {
      config = await RankingConfig.create({});
    }
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao obter configuração de ranking." });
  }
};

export const updateRankingConfig = async (req, res) => {
  try {
    const { presenceWeight, biblicalWeight, extraLabel, extraWeight } = req.body;
    if (req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    let config = await RankingConfig.findOne();
    if (!config) {
      config = new RankingConfig();
    }
    if (presenceWeight !== undefined) config.presenceWeight = Number(presenceWeight);
    if (biblicalWeight !== undefined) config.biblicalWeight = Number(biblicalWeight);
    if (extraLabel !== undefined) config.extraLabel = String(extraLabel);
    if (extraWeight !== undefined) config.extraWeight = Number(extraWeight);

    await config.save();
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao atualizar configuração de ranking." });
  }
};
