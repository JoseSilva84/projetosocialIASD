
import { app } from '../backend/src/app.js'; // Importando o app configurado

import dotenv from 'dotenv'; // Importação do dotenv
dotenv.config(); // Carregando variáveis de ambiente

const PORT = process.env.PORT || 3000; // Define a porta a partir do .env ou 3000

app.listen(PORT, () => {
    console.log(`Servidor inicializado na porta ${PORT}`);
});