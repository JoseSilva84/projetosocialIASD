import Participant from "../models/participant.model.js";

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
