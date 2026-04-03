import bcrypt from "bcrypt";
import "./src/config/database.js";
import Group from "./src/models/group.model.js";

const SALT_ROUNDS = 10;

async function init() {
  try {
    const existing = await Group.findOne({ name: "Boipeba" });
    if (existing) {
      console.log("Grupo Boipeba já existe.");
      return;
    }

    const passwordHash = await bcrypt.hash("boi123", SALT_ROUNDS);
    const group = await Group.create({
      name: "Boipeba",
      passwordHash,
      createdBy: "admin" // ou algum id
    });

    console.log("Grupo Boipeba criado com sucesso:", group._id);
  } catch (err) {
    console.error("Erro ao inicializar:", err);
  } finally {
    process.exit(0);
  }
}

init();