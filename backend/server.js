import "./src/config/database.js";
import { app } from "./src/app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor inicializado na porta ${PORT}`);
});
