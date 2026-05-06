# Migração para PostgreSQL Local

## Status: ✅ PRONTO PARA MIGRAÇÃO

Todo o frontend foi atualizado para usar a API REST do backend Express + Prisma.
**Nenhuma dependência do Supabase** resta nos hooks e contextos da aplicação.

---

## Passos para Migrar

### 1. Configure o Backend

```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais do PostgreSQL:
# DATABASE_URL="postgresql://user:password@localhost:5432/town_db"
# JWT_SECRET="sua-chave-secreta-aqui"
# JWT_EXPIRES_IN="7d"

npm install
npx prisma migrate dev --name init
npm run dev
```

### 2. Configure o Frontend

No `.env` do projeto principal (raiz), adicione:

```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Inicie o Frontend

```bash
npm install
npm run dev
```

---

## Arquitetura

```
Frontend (React + Vite)
  src/lib/api.ts          -> Cliente REST com JWT
  src/hooks/useAuth.ts     -> Autenticação JWT
  src/hooks/useTasks.ts    -> CRUD tarefas via API
  src/hooks/useClients.ts  -> CRUD clientes via API
  src/hooks/useLeads.ts    -> CRUD leads via API
  src/hooks/useInbox.ts    -> Inbox via API (routes pending)
  src/contexts/AuthContext  -> Contexto sem Supabase

Backend (Express + Prisma)
  /api/auth      -> Login, Register, Me, Password
  /api/workspaces -> CRUD workspaces
  /api/spaces     -> CRUD spaces
  /api/lists      -> CRUD lists + statuses
  /api/tasks      -> CRUD tasks + subtasks + comments
  /api/users      -> Employees, Profiles
  /api/clients    -> CRUD clients + leads
```

---

## API Endpoints

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/register | Criar conta |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Usuário atual |
| POST | /api/auth/forgot-password | Recuperar senha |
| PUT | /api/auth/update-password | Atualizar senha |
| POST | /api/auth/refresh | Renovar token |

### Tasks
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/tasks?listId=X | Listar tarefas |
| POST | /api/tasks | Criar tarefa (com assigneeId para atribuir) |
| PUT | /api/tasks/:id | Atualizar (statusId, assigneeId, priority, etc.) |
| DELETE | /api/tasks/:id | Soft delete |
| GET | /api/tasks/:id/subtasks | Listar subtarefas |
| POST | /api/tasks/:id/subtasks | Criar subtarefa |
| PUT | /api/tasks/:taskId/subtasks/:subtaskId | Atualizar subtarefa |
| DELETE | /api/tasks/:taskId/subtasks/:subtaskId | Deletar subtarefa |
| GET | /api/tasks/:id/comments | Listar comentários |
| POST | /api/tasks/:id/comments | Criar comentário |

### Workspaces / Spaces / Lists
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/workspaces | Listar |
| POST | /api/workspaces | Criar |
| DELETE | /api/workspaces/:id | Deletar |
| GET | /api/spaces?workspaceId=X | Listar |
| POST | /api/spaces | Criar |
| DELETE | /api/spaces/:id | Deletar |
| GET | /api/lists?spaceId=X | Listar |
| POST | /api/lists | Criar (com statuses padrão) |
| DELETE | /api/lists/:id | Deletar |
| GET | /api/lists/:id/statuses | Listar statuses |

### Clients e Leads
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/clients | Listar clientes |
| POST | /api/clients | Criar |
| PUT | /api/clients/:id | Atualizar |
| DELETE | /api/clients/:id | Deletar |
| GET | /api/clients/:id/leads | Listar leads |
| POST | /api/clients/leads | Criar lead |
| POST | /api/clients/leads/batch | Criar leads em lote |

### Users
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/users/employees | Listar funcionários |
| GET | /api/users/profiles | Listar perfis |

---

## Funcionalidades de Tarefas

### Atribuir tarefa a um usuário
- Na criação: envie `assigneeId` e `assigneeName` no POST /api/tasks
- Na edição: envie `assigneeId` e `assigneeName` no PUT /api/tasks/:id
- O endpoint GET /api/users/employees lista funcionários disponíveis

### Mudar status da tarefa
- Envie `statusId` no PUT /api/tasks/:id
- Os statuses disponíveis vêm de GET /api/lists/:id/statuses
- Arrastar no Kanban também chama PUT /api/tasks/:id com novo statusId

---

## O que falta implementar no backend

1. **Rotas de Inbox** (conversations, messages, contacts, quick_replies)
2. **Email de recuperação de senha** (forgot-password com envio real de email)
3. **WebSocket** para substituir Supabase Realtime

---

## Notas

- O frontend mapeia automaticamente camelCase (API) para snake_case (frontend)
- O token JWT é armazenado no localStorage
- O `src/lib/api.ts` configura a URL base via `VITE_API_URL`
- Os arquivos Supabase (`src/integrations/supabase/`) podem ser removidos após exportar
- O preview no Lovable não funcionará com dados pois o backend Express roda localmente
