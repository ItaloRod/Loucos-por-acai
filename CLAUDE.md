# Contexto do Projeto — Loucos por Açaí 🍧 (v2.0)

Este arquivo é a **fonte de verdade técnica** do projeto para agentes de IA e desenvolvedores. Leia-o integralmente antes de modificar qualquer arquivo do repositório. Ele descreve a arquitetura atual da versão 2.0 (FastAPI + React), as convenções adotadas, os modelos de dados, os fluxos de autenticação e as regras de negócio críticas.

> **Legado:** O código Django (v1.x) ainda existe na raiz (`manage.py`, `loucosAcai/`, `modelo/`). **Não o modifique.** Ele serve apenas como referência de domínio durante a migração.

---

## 1. Visão Geral da Arquitetura (v2.0)

O sistema é um **monorepo** com separação total entre backend e frontend:

```
Loucos-por-acai/
├── backend/     ← API REST em FastAPI (Python 3.11+, Poetry)
├── frontend/    ← SPA em React 18 + TypeScript (Vite)
└── docs/        ← Documentação técnica (DATA_MODEL, API_SPEC, DESIGN, etc.)
```

### Princípios Arquiteturais
- **Stateless API:** O backend não mantém sessão. Todo estado de autenticação é codificado no JWT.
- **Cookies HttpOnly:** Os tokens JWT (`access_token`, `refresh_token`) trafegam exclusivamente via cookies HttpOnly para prevenir ataques XSS. O JavaScript do frontend **nunca** acessa esses tokens diretamente.
- **RBAC no servidor:** As verificações de papel (`CLIENTE`, `FUNCIONARIO`, `GERENTE`) são sempre feitas no backend via dependência `RequireRole`. O frontend aplica RBAC apenas para UX (esconder links), nunca como controle de segurança.
- **Schema-first com Pydantic v2:** Toda entrada e saída da API é validada por schemas Pydantic. Os modelos SQLAlchemy nunca são serializados diretamente.

---

## 2. Stack Tecnológico Completo

### Backend
| Componente | Tecnologia | Versão |
|---|---|---|
| Framework API | FastAPI | 0.115+ |
| ORM | SQLAlchemy | 2.0 (async-ready, declarative) |
| Migrações | Alembic | latest |
| Gerenciador de Deps | Poetry | latest |
| Servidor ASGI | Uvicorn | latest |
| Validação | Pydantic v2 | 2.x |
| Banco de Dados | SQLite (dev) | — |
| Autenticação | JWT via `python-jose` + `passlib[bcrypt]` | — |
| Rate Limiting | `slowapi` | — |
| Testes | pytest + httpx (TestClient) | — |

### Frontend
| Componente | Tecnologia | Versão |
|---|---|---|
| Framework UI | React | 18.3 |
| Linguagem | TypeScript | 5.x (strict mode) |
| Build Tool | Vite | 5.x |
| Estilização | Tailwind CSS | 3.x |
| Componentes | shadcn/ui (Radix UI) | — |
| Estado Global | Redux Toolkit + RTK Query | latest |
| Roteamento | React Router v6 | 6.x |
| Ícones | lucide-react | latest |
| Testes | Vitest + @testing-library/react | — |

---

## 3. Estrutura Detalhada do Backend (`backend/`)

```
backend/
├── app/
│   ├── main.py          ← Instância FastAPI, CORS, inclusão de routers, lifespan
│   ├── config.py        ← Settings com Pydantic BaseSettings (lê .env)
│   ├── database.py      ← Engine, SessionLocal, Base declarativa do SQLAlchemy
│   ├── core/
│   │   ├── security.py  ← Funções: create_access_token, verify_token, hash_password
│   │   └── deps.py      ← Dependências FastAPI: get_db, get_current_user, RequireRole
│   ├── models/          ← Modelos SQLAlchemy (um arquivo por domínio)
│   ├── routers/
│   │   ├── auth.py      ← POST /auth/login, /auth/register, /auth/logout, /auth/refresh
│   │   ├── users.py     ← GET/PUT /users/me, CRUD admin de usuários
│   │   └── catalog.py   ← CRUD de Products e Categories (com soft-delete)
│   └── schemas/         ← Schemas Pydantic de Request/Response por domínio
├── alembic/             ← Migrações de schema do banco de dados
├── tests/
│   ├── test_models.py   ← Testes unitários dos 15 modelos (SQLite in-memory)
│   └── test_auth.py     ← Testes dos fluxos de login, logout, refresh, RBAC
├── pyproject.toml
└── loucosporacai.db     ← Banco SQLite de desenvolvimento (não commitar dados sensíveis)
```

### Routers Ativos
| Router | Prefixo | Autenticação | Rate Limit |
|---|---|---|---|
| `auth` | `/api/v1/auth` | Público | ✅ 10 req/min por IP |
| `users` | `/api/v1/users` | `get_current_user` | — |
| `catalog` | `/api/v1/catalog` | Misto (leitura pública, escrita = GERENTE) | — |

### Modelos de Dados (15 entidades)
Consulte [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) como **fonte autoritativa** completa. O resumo de alto nível:

| Domínio | Modelos |
|---|---|
| **Usuários** | `User`, `Address` |
| **Catálogo** | `Category`, `Product`, `Stock` |
| **Pedidos** | `Order`, `OrderItem`, `Cart`, `CartItem` |
| **Fidelidade** | `StampCard`, `StampTransaction` |
| **PDV** | `Sale`, `SaleItem` |
| **Operação** | `BusinessHours` |

Todos os IDs são **UUID** (`uuid.UUID` no Python). Nunca use IDs inteiros em novas entidades.

---

## 4. Estrutura Detalhada do Frontend (`frontend/src/`)

```
frontend/src/
├── App.tsx                   ← Router principal + AppInitializer (session restore)
├── main.tsx                  ← Ponto de entrada React + Redux Provider
├── store/
│   ├── index.ts              ← Configuração do Redux Store
│   ├── apiSlice.ts           ← fetchBaseQuery com credentials: 'include'
│   └── authSlice.ts          ← Estado de autenticação (user, isAuthenticated, loading)
├── features/
│   └── auth/
│       ├── authApi.ts        ← RTK Query: login, register, logout, getMe, refreshToken
│       └── types.ts          ← LoginPayload, RegisterPayload, TokenResponse
├── hooks/
│   └── redux.ts              ← useAppDispatch, useAppSelector (tipados)
├── components/
│   ├── Layout.tsx            ← Shell global: Header + Sidebar RBAC + Outlet
│   └── ProtectedRoute.tsx    ← Guarda de rota por autenticação e role
└── pages/
    ├── auth/
    │   ├── Login.tsx         ← Formulário de login com auto-redirect por role
    │   └── Register.tsx      ← Autocadastro de clientes com auto-login pós-registro
    ├── Home.tsx              ← Landing page do cliente
    ├── Menu.tsx              ← Cardápio com filtro por categoria
    ├── About.tsx             ← Página institucional
    ├── Contact.tsx           ← Formulário de contato
    ├── Loyalty.tsx           ← Cartão fidelidade digital (10 selos)
    ├── Profile.tsx           ← Edição de dados pessoais (PUT /users/me)
    └── Dashboard.tsx         ← Painel de controle (GERENTE)
```

### Convenções de Frontend
- **Componentes:** PascalCase, um componente por arquivo.
- **Hooks customizados:** prefixo `use`, exportados de `hooks/`.
- **Estado de servidor:** sempre via **RTK Query** (nunca `useState` + `fetch` para dados da API, exceto em casos pontuais justificados como o `Profile.tsx`).
- **Estado local de UI:** `useState` do React.
- **Formulários:** controlados com `useState`, sem bibliotecas externas de form por ora.
- **Estilização:** Tailwind CSS utilitário diretamente no JSX. Paleta de cores roxa (açaí) definida no tema do Tailwind/shadcn.

---

## 5. Autenticação e Segurança

### Fluxo de Login
1. `POST /api/v1/auth/login` com `{ email, password }` em JSON.
2. O backend valida as credenciais, gera dois JWTs e os define como cookies HttpOnly:
   - `access_token`: vida curta (ex: 30 min).
   - `refresh_token`: vida longa (ex: 7 dias).
3. O frontend (via `authApi.ts`) chama `GET /api/v1/users/me` para hidratar o Redux store com os dados do usuário.
4. O Redux `authSlice` armazena `{ user, isAuthenticated: true, loading: false }`.

### Inicialização de Sessão (Auto-Login)
O componente `AppInitializer` em `App.tsx` executa `GET /users/me` silenciosamente **no primeiro carregamento da aplicação**. Se cookies válidos existirem, a sessão é restaurada automaticamente. Caso contrário, o usuário permanece deslogado sem redirecionamentos desnecessários.

### Proteção de Rotas
- `ProtectedRoute` verifica `isAuthenticated` e, opcionalmente, `allowedRoles`.
- Usuários não autenticados → redirect `/login`.
- Usuários autenticados sem a role adequada → redirect por role (`CLIENTE` → `/`, outros → `/dashboard`).

### Rate Limiting (`slowapi`)
- Aplicado nos endpoints de auth: `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`.
- Limite: **10 requisições por minuto por IP**.
- Resposta em caso de violação: **HTTP 429 Too Many Requests**.

---

## 6. Convenções de Código

### Backend (Python)
- **Nomes de campos:** `snake_case` em todos os modelos e schemas.
- **UUIDs:** Sempre use `uuid.UUID` ao comparar com IDs vindos do JWT (converter `str → uuid.UUID` explicitamente antes de queries SQLAlchemy para evitar erro de atributo `.hex`).
- **Deleção de produtos:** Soft-delete via campo `is_active=False`. Nunca delete fisicamente registros de produtos do catálogo.
- **Integridade de estoque:** Sempre verificar e decrementar estoque dentro de uma transação explícita (`async with session.begin()`).
- **Testes:** Rodam com banco **SQLite in-memory** — sem dependência de banco externo. Use `del client.cookies["access_token"]` para limpar cookies no TestClient (não `= None`).

### Frontend (TypeScript)
- **Strict mode habilitado:** Sem `any` implícito. Use tipos explícitos.
- **Imports:** Caminhos relativos a partir de `src/` (sem aliases configurados ainda).
- **Credenciais cross-origin:** O `apiSlice.ts` configura `credentials: 'include'` no `fetchBaseQuery`. Este comportamento é **obrigatório** para o funcionamento dos cookies HttpOnly em desenvolvimento local.
- **Interface `User`:** `id` é `string` (UUID), nunca `number`.

---

## 7. Comandos de Desenvolvimento

### Backend
```bash
cd backend

# Instalar dependências (primeira vez)
poetry install

# Ativar ambiente virtual
poetry shell

# Aplicar migrações
alembic upgrade head

# Criar nova migração após alterar models/
alembic revision --autogenerate -m "descricao_da_mudanca"

# Iniciar servidor com hot-reload
uvicorn app.main:app --reload --port 8000

# Rodar testes
pytest -v

# Rodar testes com cobertura
pytest --cov=app --cov-report=term-missing
```

### Frontend
```bash
cd frontend

# Instalar dependências
npm install

# Servidor de desenvolvimento
npm run dev

# Verificação de tipos TypeScript
npx tsc --noEmit

# Rodar testes
npm run test

# Build de produção
npm run build
```

---

## 8. Documentação de Referência

| Documento | Conteúdo |
|---|---|
| [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) | Roadmap completo das 11 fases (Fase 0–10), critérios de aceite, riscos |
| [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) | **Fonte autoritativa** dos 15 modelos de dados com campos, tipos e relacionamentos |
| [`docs/API_SPEC.md`](./docs/API_SPEC.md) | Especificação completa dos endpoints REST (request/response/erros) |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Decisões arquiteturais e ADRs (Architecture Decision Records) |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | Guia de design: paleta de cores, tipografia, componentes e UX guidelines |

---

## 9. Status das Fases

| Fase | Escopo | Status |
|---|---|---|
| **Fase 0** | Setup do monorepo | ✅ Concluída |
| **Fase 1** | Core Backend (modelos, auth JWT, RBAC, rate limit, CRUD base) | ✅ Concluída |
| **Fase 2** | Core Frontend (rotas, layout RBAC, páginas auth, Redux, auto-login) | ✅ Concluída |
| **Fase 3** | Product & Menu System (API refinada, imagens, CRUD admin de produtos) | 🔜 Próxima |
| **Fase 4** | Customer & Employee Management | ⏳ Planejada |
| **Fase 5** | Order System ("Monte seu Açaí", carrinho, checkout) | ⏳ Planejada |
| **Fase 6** | POS System (PDV para funcionários) | ⏳ Planejada |
| **Fase 7** | Loyalty System (selos, resgate) | ⏳ Planejada |
| **Fase 8** | Dashboard & Reports (analíticos, exportação PDF/CSV) | ⏳ Planejada |
| **Fase 9** | Business Hours & Notifications | ⏳ Planejada |
| **Fase 10** | Polish & Testing (E2E, performance, acessibilidade) | ⏳ Planejada |
