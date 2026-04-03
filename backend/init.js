import bcrypt from "bcrypt";
import "./src/config/database.js";
import Group from "./src/models/group.model.js";
import User from "./src/models/user.model.js";

const SALT_ROUNDS = 10;

function validatePassword(password) {
  if (!password || typeof password !== "string") return false;
  const sanitized = password.trim();
  const weakPasswords = ["12345678", "password", "admin", "boi123", "123456789", "qwerty"];
  return sanitized.length >= 8 && !weakPasswords.includes(sanitized.toLowerCase());
}

async function init() {
  try {
    const defaultGroupName = process.env.DEFAULT_GROUP_NAME;
    const defaultGroupPassword = process.env.DEFAULT_GROUP_PASSWORD;
    if (!defaultGroupName || !defaultGroupPassword) {
      console.log("Ignorando criação automática de grupo. Defina DEFAULT_GROUP_NAME e DEFAULT_GROUP_PASSWORD no ambiente se quiser usar o seed.");
    } else {
      if (!validatePassword(defaultGroupPassword)) {
        throw new Error("DEFAULT_GROUP_PASSWORD deve ter ao menos 8 caracteres e não ser uma senha fraca.");
      }

      const groupName = String(defaultGroupName).trim();
      const existing = await Group.findOne({ name: groupName });
      if (!existing) {
        const passwordHash = await bcrypt.hash(defaultGroupPassword, SALT_ROUNDS);
        const group = await Group.create({
          name: groupName,
          passwordHash,
          createdBy: process.env.DEFAULT_GROUP_CREATED_BY || "system"
        });
        console.log("Grupo inicial criado com sucesso:", group._id);
      } else {
        console.log(`Grupo ${groupName} já existe.`);
      }
    }

    const defaultAdminName = process.env.DEFAULT_ADMIN_NAME;
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (defaultAdminName && defaultAdminPassword) {
      if (!validatePassword(defaultAdminPassword)) {
        throw new Error("DEFAULT_ADMIN_PASSWORD deve ter ao menos 8 caracteres e não ser uma senha fraca.");
      }
      const userName = String(defaultAdminName).trim();
      const existingAdmin = await User.findOne({ name: userName });
      if (!existingAdmin) {
        const passwordHash = await bcrypt.hash(defaultAdminPassword, SALT_ROUNDS);
        const user = await User.create({ name: userName, passwordHash, role: "admin" });
        console.log("Admin inicial criado com sucesso:", user._id);
      } else {
        console.log(`Admin ${userName} já existe.`);
      }
    }
  } catch (err) {
    console.error("Erro ao inicializar:", err);
  } finally {
    process.exit(0);
  }
}

init();