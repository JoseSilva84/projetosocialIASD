# Secretaria — Projeto Eu Quero Ser Feliz

Sistema monorepo para a **secretaria de um projeto social**: a equipe cria conta e faz login; em seguida **inscreve participantes** com nome, endereço e WhatsApp. Os dados são persistidos em **MongoDB** através de uma API **Node.js**.

## Estrutura do repositório

| Pasta | Função |
|--------|--------|
| [**`backend/`**](backend/README.md) | API REST (Express, Mongoose, JWT, bcrypt). Autenticação e cadastro de participantes. |
| [**`projetosocial/`**](projetosocial/README.md) | Interface web (React, Vite, Tailwind). Telas de login, cadastro e área de participantes com dashboard. |

## Como rodar em desenvolvimento

1. **MongoDB** acessível (ex.: cluster no Atlas) e variáveis no arquivo `.env` do backend — ver [backend/README.md](backend/README.md).
2. **Backend:** na pasta `backend`, `npm install` e `npm run dev` (porta padrão `3000`).
3. **Frontend:** na pasta `projetosocial`, `npm install` e `npm run dev` (Vite; em dev o proxy encaminha `/api` para o backend).

O projeto **não versiona** `.env` nem `node_modules`; configure cada ambiente localmente.

## Documentação detalhada

- [Backend — API](backend/README.md)  
- [Frontend — React](projetosocial/README.md)
