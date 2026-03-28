import Participant from "../models/participant.model.js";
import RankingConfig from "../models/rankingConfig.model.js";

function normalizeExtraEntries(participant) {
  if (Array.isArray(participant?.extraEntries) && participant.extraEntries.length > 0) {
    return participant.extraEntries.map((entry) => ({
      points: Number(entry?.points || 0),
      reason: String(entry?.reason || "").trim(),
      createdAt: entry?.createdAt ? new Date(entry.createdAt) : new Date(),
    }));
  }

  if (typeof participant?.extraScore === "number" && participant.extraScore > 0) {
    return [
      {
        points: Number(participant.extraScore),
        reason: "Pontuação extra anterior",
        createdAt: participant.updatedAt || participant.createdAt || new Date(),
      },
    ];
  }

  return [];
}

export function buildParticipantScoreSnapshot(participant, rankingConfig) {
  const presenceWeight = Number(rankingConfig?.presenceWeight || 0);
  const biblicalWeight = Number(rankingConfig?.biblicalWeight || 0);
  const extraWeight = Number(rankingConfig?.extraWeight || 0);

  const frequencyCount = Array.isArray(participant?.frequencyAttended)
    ? participant.frequencyAttended.length
    : 0;
  const biblicalCount = Array.isArray(participant?.biblicalLessonsCompleted)
    ? participant.biblicalLessonsCompleted.length
    : 0;
  const extraEntries = normalizeExtraEntries(participant);
  const extraCount = extraEntries.reduce((sum, entry) => sum + Number(entry.points || 0), 0);

  const frequencyScore = Number((frequencyCount * presenceWeight).toFixed(1));
  const biblicalScore = Number((biblicalCount * biblicalWeight).toFixed(1));
  const extraScore = Number((extraCount * extraWeight).toFixed(1));
  const totalScore = Number((frequencyScore + biblicalScore + extraScore).toFixed(1));

  return {
    frequencyCount,
    frequencyScore,
    biblicalCount,
    biblicalScore,
    extraEntries,
    extraCount,
    extraScore,
    totalScore,
  };
}

export async function getRankingConfigSnapshot() {
  let rankingConfig = await RankingConfig.findOne();
  if (!rankingConfig) {
    rankingConfig = await RankingConfig.create({});
  }
  return rankingConfig;
}

export async function syncParticipantScores(participant, rankingConfigInput = null) {
  if (!participant) return participant;

  const rankingConfig = rankingConfigInput || (await getRankingConfigSnapshot());
  const snapshot = buildParticipantScoreSnapshot(participant, rankingConfig);

  participant.extraEntries = snapshot.extraEntries;
  participant.extraScore = snapshot.extraCount;
  participant.scoreSummary = {
    frequencyCount: snapshot.frequencyCount,
    frequencyScore: snapshot.frequencyScore,
    biblicalCount: snapshot.biblicalCount,
    biblicalScore: snapshot.biblicalScore,
    extraCount: snapshot.extraCount,
    extraScore: snapshot.extraScore,
    totalScore: snapshot.totalScore,
    rankingConfigId: rankingConfig._id,
    rankingUpdatedAt: new Date(),
  };

  return participant;
}

export async function syncParticipantScoresIfNeeded(participants, rankingConfigInput = null) {
  if (!Array.isArray(participants) || participants.length === 0) {
    return participants;
  }

  const rankingConfig = rankingConfigInput || (await getRankingConfigSnapshot());
  const bulkOperations = [];

  participants.forEach((participant) => {
    const snapshot = buildParticipantScoreSnapshot(participant, rankingConfig);
    const current = participant.scoreSummary || {};

    const needsUpdate =
      participant.extraScore !== snapshot.extraCount ||
      current.frequencyCount !== snapshot.frequencyCount ||
      current.frequencyScore !== snapshot.frequencyScore ||
      current.biblicalCount !== snapshot.biblicalCount ||
      current.biblicalScore !== snapshot.biblicalScore ||
      current.extraCount !== snapshot.extraCount ||
      current.extraScore !== snapshot.extraScore ||
      current.totalScore !== snapshot.totalScore ||
      String(current.rankingConfigId || "") !== String(rankingConfig._id || "");

    participant.extraEntries = snapshot.extraEntries;
    participant.extraScore = snapshot.extraCount;
    participant.scoreSummary = {
      frequencyCount: snapshot.frequencyCount,
      frequencyScore: snapshot.frequencyScore,
      biblicalCount: snapshot.biblicalCount,
      biblicalScore: snapshot.biblicalScore,
      extraCount: snapshot.extraCount,
      extraScore: snapshot.extraScore,
      totalScore: snapshot.totalScore,
      rankingConfigId: rankingConfig._id,
      rankingUpdatedAt: new Date(),
    };

    if (needsUpdate) {
      bulkOperations.push({
        updateOne: {
          filter: { _id: participant._id },
          update: {
            $set: {
              extraEntries: snapshot.extraEntries,
              extraScore: snapshot.extraCount,
              scoreSummary: participant.scoreSummary,
            },
          },
        },
      });
    }
  });

  if (bulkOperations.length > 0) {
    await Participant.bulkWrite(bulkOperations, { ordered: false });
  }

  return participants;
}

export async function syncAllParticipantScores(rankingConfigInput = null) {
  const rankingConfig = rankingConfigInput || (await getRankingConfigSnapshot());
  const participants = await Participant.find({});
  await syncParticipantScoresIfNeeded(participants, rankingConfig);
  return participants;
}
