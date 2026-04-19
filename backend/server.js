import { app } from "./src/app.js";
import "./src/config/env.js";
import { connectToDatabase } from "./src/config/database.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectToDatabase();

  app.listen(PORT, () => {
    console.log(`Servidor inicializado na porta ${PORT}`);
  });
}

startServer().catch(() => {
  console.error("Backend encerrado porque a conexao com o banco de dados nao foi estabelecida.");
  process.exit(1);
});
