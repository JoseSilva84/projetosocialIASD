import mongoose from "mongoose";

// mongodb+srv://Userspessoal:<db_password>@users.51d8oqo.mongodb.net/

mongoose.connect(process.env.DB_URI)
    .then(() => console.log('Banco conectado'))
    .catch(err => console.error(err));