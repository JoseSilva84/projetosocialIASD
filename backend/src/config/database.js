import mongoose from "mongoose";
import "./env.js";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL nao definido. Defina backend/.env ou a variavel de ambiente MONGODB_URI.");
  }

  return databaseUrl;
}

function getConnectionHint(error, databaseUrl) {
  const message = String(error?.message || error || "");

  if (message.includes("querySrv")) {
    return [
      "A URL usa mongodb+srv:// e a consulta DNS SRV do Atlas falhou.",
      "Verifique a internet/DNS da maquina, libere seu IP no Atlas ou use uma connection string padrao mongodb://."
    ].join(" ");
  }

  if (message.includes("Authentication failed")) {
    return "As credenciais do MongoDB foram recusadas. Revise usuario, senha e o banco definido na DATABASE_URL.";
  }

  if (message.includes("ECONNREFUSED") || message.includes("Server selection timed out")) {
    return databaseUrl.startsWith("mongodb+srv://")
      ? "O cluster Atlas nao respondeu a tempo. Confirme se o cluster esta ativo, se o IP esta liberado e se o DNS da rede permite consultas SRV."
      : "O servidor MongoDB recusou a conexao. Confirme host, porta e disponibilidade do banco.";
  }

  return "";
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectToDatabase() {
  const databaseUrl = getDatabaseUrl();

  if (isDatabaseConnected()) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(databaseUrl, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`Banco conectado (${databaseUrl.startsWith("mongodb+srv://") ? "Atlas" : "local"})`);
    return mongoose.connection;
  } catch (error) {
    console.error("Falha ao conectar no MongoDB:", error?.message || error);
    const hint = getConnectionHint(error, databaseUrl);
    if (hint) {
      console.error("Dica:", hint);
    }
    throw error;
  }
}
