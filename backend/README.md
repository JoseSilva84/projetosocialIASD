# Projeto Eu Quero Ser Feliz — Backend

API REST em **Node.js** para autenticação da secretaria (usuários do projeto) e cadastro de **participantes** no MongoDB.

## Stack

| Pacote | Uso |
|--------|-----|
| [Express](https://expressjs.com/) 5 | Servidor HTTP |
| [Mongoose](https://mongoosejs.com/) 9 | Modelos e conexão MongoDB |
| [bcrypt](https://www.npmjs.com/package/bcrypt) | Hash de senhas |
| [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) | JWT para rotas protegidas |
| [cors](https://www.npmjs.com/package/cors) | CORS |
| [dotenv](https://www.npmjs.com/package/dotenv) | Variáveis de ambiente |

Módulos ES (`"type": "module"`).

## Estrutura de pastas

```
backend/
├── server.js                 # Ponto de entrada (listen + importa DB e app)
├── .env                      # Não versionar (DATABASE_URL, JWT_SECRET, PORT)
└── src/
    ├── app.js                # Express: middlewares e rotas /api
    ├── config/
    │   └── database.js       # dotenv + mongoose.connect
    ├── models/
    │   ├── user.model.js     # Usuário: name (único), passwordHash
    │   └── participant.model.js # Participante: name, address, whatsapp, registeredBy
    ├── controllers/
    │   ├── auth.controller.js
    │   └── participant.controller.js
    ├── middleware/
    │   └── auth.middleware.js # Valida Bearer JWT
    └── routes/
        ├── auth.routes.js
        └── participant.routes.js
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do `backend`:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URI de conexão MongoDB (ex.: Atlas) |
| `JWT_SECRET` | Segredo para assinar e verificar JWT |
| `PORT` | Porta do servidor (padrão: `3000`) |

O `dotenv` é carregado em `src/config/database.js` antes do `mongoose.connect`, para que `DATABASE_URL` esteja definida ao subir em ES modules.

## Como rodar

```bash
npm install
npm run dev
```

- **`npm run dev`** — `nodemon` (reinicia ao alterar arquivos).
- **`npm start`** — `node server.js` (produção).

Com mensagem de sucesso no console: `Banco conectado` e `Servidor inicializado na porta …`.

## API (prefixo `/api`)

### Autenticação

| Método | Rota | Corpo (JSON) | Resposta |
|--------|------|----------------|----------|
| `POST` | `/api/auth/register` | `{ "name", "password" }` | `201` — `{ token, user: { id, name } }` |
| `POST` | `/api/auth/login` | `{ "name", "password" }` | `200` — `{ token, user: { id, name } }` |

Regras: nome obrigatório; senha mínima 6 caracteres no cadastro; nome de usuário único.

### Participantes (protegido)

Header: `Authorization: Bearer <token>`

| Método | Rota | Corpo (JSON) | Descrição |
|--------|------|----------------|-----------|
| `GET` | `/api/participants` | — | Lista participantes do usuário logado |
| `POST` | `/api/participants` | `{ "name", "address", "whatsapp" }` | Cria participante vinculado ao usuário |
| `PATCH` | `/api/participants/:id/biblical-study` | `{ "selectedBiblicalLesson", "biblicalLessonsCompleted" }` | Atualiza lição em estudo (1–15) e lista de lições concluídas |

No `PATCH`, envie um ou ambos os campos. `selectedBiblicalLesson` deve ser inteiro entre 1 e 15 (ou `null` para limpar). `biblicalLessonsCompleted` é um array de inteiros únicos entre 1 e 15.

## Modelos (resumo)

- **User:** `name` (string, único), `passwordHash`.
- **Participant:** `name`, `address`, `whatsapp`, `registeredBy` (ObjectId → User), `selectedBiblicalLesson` (1–15, opcional), `biblicalLessonsCompleted` (array de números 1–15), timestamps.

## Frontend

O app React em `../projetosocial` usa proxy em desenvolvimento (`/api` → esta API na porta configurada). Em produção, configure o mesmo domínio ou CORS conforme o deploy.
