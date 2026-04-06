import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!databaseUrl) {
  console.error("DATABASE_URL não definido. Defina backend/.env ou variável de ambiente MONGODB_URI.");
  process.exit(1);
}

mongoose
  .connect(databaseUrl)
  .then(() => console.log(`Banco conectado (${databaseUrl.startsWith("mongodb+srv://") ? "Atlas" : "local"})`))
  .catch((err) => {
    console.error("Falha ao conectar no MongoDB:", err.message || err);
    process.exit(1);
  });
