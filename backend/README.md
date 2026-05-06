# DigiTown Backend API

Backend Express + Prisma para o sistema de gestão de tarefas DigiTown.

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

## Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env com suas configurações
# DATABASE_URL="postgresql://usuario:senha@localhost:5432/digitown"
# JWT_SECRET="sua_chave_secreta"

# Gerar cliente Prisma
npm run db:generate

# Rodar migrações
npm run db:migrate

# (Opcional) Abrir Prisma Studio
npm run db:studio
```

## Executando

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Produção
npm run build
npm start
```

## Rotas da API

### Autenticação
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual
- `POST /api/auth/refresh` - Renovar token

### Workspaces
- `GET /api/workspaces` - Listar workspaces
- `GET /api/workspaces/:id` - Buscar workspace
- `POST /api/workspaces` - Criar workspace
- `PUT /api/workspaces/:id` - Atualizar workspace
- `DELETE /api/workspaces/:id` - Excluir workspace
- `GET /api/workspaces/:id/members` - Listar membros
- `POST /api/workspaces/:id/members` - Adicionar membro
- `DELETE /api/workspaces/:id/members/:userId` - Remover membro

### Spaces
- `GET /api/spaces?workspaceId=` - Listar espaços
- `GET /api/spaces/:id` - Buscar espaço
- `POST /api/spaces` - Criar espaço
- `PUT /api/spaces/:id` - Atualizar espaço
- `DELETE /api/spaces/:id` - Excluir espaço

### Lists
- `GET /api/lists?spaceId=` - Listar listas
- `GET /api/lists/:id` - Buscar lista
- `POST /api/lists` - Criar lista
- `PUT /api/lists/:id` - Atualizar lista
- `DELETE /api/lists/:id` - Excluir lista
- `GET /api/lists/:id/statuses` - Listar status
- `POST /api/lists/:id/statuses` - Criar status
- `PUT /api/lists/:listId/statuses/:statusId` - Atualizar status
- `DELETE /api/lists/:listId/statuses/:statusId` - Excluir status

### Tasks
- `GET /api/tasks?listId=` - Listar tarefas
- `GET /api/tasks/:id` - Buscar tarefa
- `POST /api/tasks` - Criar tarefa
- `PUT /api/tasks/:id` - Atualizar tarefa
- `DELETE /api/tasks/:id` - Excluir tarefa (soft delete)

#### Subtasks
- `GET /api/tasks/:id/subtasks` - Listar subtarefas
- `POST /api/tasks/:id/subtasks` - Criar subtarefa
- `PUT /api/tasks/:taskId/subtasks/:subtaskId` - Atualizar subtarefa
- `DELETE /api/tasks/:taskId/subtasks/:subtaskId` - Excluir subtarefa

#### Comments
- `GET /api/tasks/:id/comments` - Listar comentários
- `POST /api/tasks/:id/comments` - Criar comentário
- `PUT /api/tasks/:taskId/comments/:commentId` - Atualizar comentário
- `DELETE /api/tasks/:taskId/comments/:commentId` - Excluir comentário

### Users
- `GET /api/users/employees` - Listar funcionários
- `GET /api/users/profiles` - Listar perfis
- `GET /api/users/profile/:id` - Buscar perfil
- `PUT /api/users/profile` - Atualizar perfil

### Clients
- `GET /api/clients` - Listar clientes
- `GET /api/clients/:id` - Buscar cliente
- `POST /api/clients` - Criar cliente
- `PUT /api/clients/:id` - Atualizar cliente
- `DELETE /api/clients/:id` - Excluir cliente
- `GET /api/clients/:clientId/leads` - Listar leads
- `POST /api/clients/:clientId/leads` - Criar lead
- `POST /api/clients/:clientId/leads/batch` - Criar leads em lote
- `DELETE /api/clients/:clientId/leads/:leadId` - Excluir lead

## Autenticação

Todas as rotas (exceto `/api/auth/*`) requerem token JWT no header:

```
Authorization: Bearer <token>
```

## Estrutura

```
backend/
├── prisma/
│   └── schema.prisma    # Schema do banco de dados
├── src/
│   ├── index.ts         # Entry point
│   ├── lib/
│   │   └── prisma.ts    # Cliente Prisma
│   ├── middleware/
│   │   └── auth.ts      # Middleware de autenticação
│   └── routes/
│       ├── auth.ts      # Rotas de autenticação
│       ├── workspaces.ts
│       ├── spaces.ts
│       ├── lists.ts
│       ├── tasks.ts
│       ├── users.ts
│       └── clients.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "start"]
```

### Railway / Render

1. Conecte o repositório
2. Configure as variáveis de ambiente
3. Build command: `npm install && npm run db:generate && npm run build`
4. Start command: `npm start`
