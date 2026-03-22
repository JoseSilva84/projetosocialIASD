# Projeto Eu Quero Ser Feliz — Frontend

Interface web da secretaria do projeto social: cadastro e login de usuários da equipe e inscrição de participantes (nome, endereço, WhatsApp).

## Stack

| Tecnologia | Uso |
|------------|-----|
| [React](https://react.dev/) 19 | UI |
| [Vite](https://vite.dev/) 8 | Build e dev server |
| [Tailwind CSS](https://tailwindcss.com/) 4 | Estilos (`@tailwindcss/vite`) |
| [React Router](https://reactrouter.com/) 7 | Rotas (`/login`, `/cadastro`, `/participantes`) |
| [React Toastify](https://fkhadra.github.io/react-toastify/) | Notificações (validação, erros de API, sucesso) |

## Estrutura principal

```
projetosocial/
├── src/
│   ├── App.jsx              # Rotas + ToastContainer + rodapé global
│   ├── main.jsx
│   ├── index.css            # Tailwind
│   ├── lib/
│   │   └── api.js           # Chamadas à API (/api), token no localStorage
│   ├── components/
│   │   ├── ScreenShell.jsx  # Fundo e container das telas
│   │   └── AppFooter.jsx    # Rodapé: © ano @ Projeto Eu Quero Ser Feliz
│   └── pages/
│       ├── Login.jsx        # Nome + senha
│       ├── Register.jsx     # Cadastro da secretaria
│       └── Participantes.jsx # Formulário + dashboard (article) com lista
├── vite.config.js           # Proxy /api → backend (porta 3000)
└── package.json
```

## Como rodar

1. **Backend** precisa estar ativo (MongoDB + API). Na pasta `../backend`: `npm install` e `npm run dev` (ou `npm start`).

2. Nesta pasta:

```bash
npm install
npm run dev
```

3. Abra o endereço exibido pelo Vite (geralmente `http://localhost:5173`).

Em desenvolvimento, as requisições para `/api/*` são encaminhadas para `http://localhost:3000` (veja `vite.config.js`).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | ESLint |

## Rotas e fluxo

- **`/`** — redireciona para `/login` ou `/participantes` conforme existir token salvo.
- **`/login`** — acesso à secretaria (nome de usuário + senha).
- **`/cadastro`** — cadastro de novo usuário (nome + senha mín. 6 caracteres).
- **`/participantes`** — área autenticada: novo cadastro de participante e painel com todos os participantes cadastrados pelo usuário.

O token JWT é guardado no `localStorage` e enviado no header `Authorization: Bearer ...` nas rotas protegidas.

## Build de produção

Configure o proxy ou a URL base da API conforme o ambiente (servidor que serve o `dist/` deve repassar `/api` para o backend ou use variável de ambiente + cliente HTTP, se no futuro for necessário).

## Documentação relacionada

- API do servidor: ver `../backend/README.md`.
