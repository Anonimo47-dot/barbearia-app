# barbearia-app
Aplicativo de agendamento para barbearia com gerenciamento de clientes e serviços

---

## Backend (API)

O backend está em `backend/` e é uma API REST construída com Node.js, Express e MongoDB (Mongoose).

Principais rotas:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/services
- POST /api/services (admin)
- POST /api/appointments
- GET /api/appointments
- GET /api/staff
- POST /api/staff/profile

### Como rodar o backend localmente

1. Entrar no diretório do backend:

   cd backend

2. Instalar dependências:

   npm install

3. Criar um arquivo `.env` (veja `backend/.env.example`) com as variáveis necessárias:

- MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.example.mongodb.net/barbearia?retryWrites=true&w=majority
- JWT_SECRET=uma_chave_secreta
- PORT=3000

Opcionalmente (para o script de seed):
- ADMIN_EMAIL=admin@barbearia.local
- ADMIN_PASSWORD=admin123
- ADMIN_NAME="Admin Barbearia"

4. Rodar em modo desenvolvimento:

   npm run dev

5. Criar um usuário administrador (seed)

Para facilitar testes, há um script que cria (ou atualiza) um usuário com role `admin`.
Preencha `ADMIN_EMAIL` e `ADMIN_PASSWORD` no arquivo `.env` antes de rodar, ou use os valores padrão.

   npm run seed

Isso cria um usuário admin com o e‑mail e senha definidos nas variáveis de ambiente.

### Observações
- Não use as senhas padrão em produção. Troque `ADMIN_PASSWORD` imediatamente.
- O projeto inclui validações básicas, autenticação JWT e verificação de disponibilidade de barbeiros.
- Próximos passos recomendados: criar testes automatizados, collection Postman e frontend (React/React Native).
