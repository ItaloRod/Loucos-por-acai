# Loucos por Açaí 🍧

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

O **Loucos por Açaí** é um sistema completo de gestão para estabelecimentos de açaí — vendas, estoque, fidelidade e atendimento em um só lugar. A **versão 2.0** representa uma reescrita completa da plataforma, migrando de Django para uma arquitetura moderna em monorepo com **FastAPI** no backend e **React + TypeScript** no frontend.

> **Legado Django:** O código-fonte original (v1.x em Django) ainda está presente na raiz (`manage.py`, `loucosAcai/`, `modelo/`). Ele não é mais mantido ativamente, mas serve de referência durante a migração.

---

## ✨ Funcionalidades do Sistema

### 👤 Área do Cliente
- Cardápio online com filtro por categoria e visualização de produtos.
- Fluxo de montagem personalizada do açaí (base, adicionais, caldas).
- Carrinho de compras e checkout com rastreamento do pedido.
- **Cartão Fidelidade digital:** a cada R$ 20 em compras = 1 selo; 10 selos = R$ 20 de desconto.
- Histórico de pedidos e edição de perfil pessoal.

### 💼 Área do Funcionário
- **PDV (Ponto de Venda):** interface otimizada para atendimento em balcão.
- Busca de cliente por CPF com histórico de selos.
- Gerenciamento de pedidos online (Kanban: Pendente → Preparando → Pronto → Entregue).
- Cadastro e consulta de clientes.

### 👑 Área do Gerente
- **Dashboard analítico:** receita diária, ticket médio, pedidos por período.
- Relatórios exportáveis (PDF/CSV) de vendas e estoque.
- CRUD completo de produtos, categorias e gerenciamento de estoque com alertas de nível mínimo.
- Gestão de funcionários (admissão, edição, desativação).
- Configuração de horários de funcionamento e fechamento emergencial.
- Acesso completo ao PDV e a todos os painéis.

---

## 🏗️ Stack Tecnológico (v2.0)

| Camada | Tecnologias |
|---|---|
| **Backend** | FastAPI · SQLAlchemy 2.0 · Alembic · Poetry · SQLite (dev) · Pydantic v2 |
| **Frontend** | React 18.3 · TypeScript · Vite · Tailwind CSS v3 · shadcn/ui · Redux Toolkit · RTK Query |
| **Segurança** | JWT (access + refresh token via cookies HttpOnly) · RBAC (CLIENTE / FUNCIONARIO / GERENTE) · Rate limiting (`slowapi`) |
| **Testes** | pytest · Vitest · @testing-library/react |
| **Qualidade** | ESLint · Prettier · TypeScript strict mode |

---

## 📁 Estrutura do Monorepo

```text
Loucos-por-acai/
├── backend/                      ← API FastAPI
│   ├── app/
│   │   ├── main.py               ← Aplicação FastAPI, CORS, routers
│   │   ├── config.py             ← Configurações via Pydantic Settings
│   │   ├── database.py           ← Engine SQLAlchemy e sessão async
│   │   ├── core/                 ← Segurança: JWT, hashing, dependências RBAC
│   │   ├── models/               ← Modelos SQLAlchemy (15 entidades)
│   │   ├── routers/              ← Routers: /auth, /users, /catalog, ...
│   │   └── schemas/              ← Schemas Pydantic de Request/Response
│   ├── alembic/                  ← Migrações de banco de dados
│   ├── tests/                    ← Testes pytest (14 testes passando)
│   ├── pyproject.toml            ← Dependências Poetry
│   └── loucosporacai.db          ← Banco SQLite (desenvolvimento)
│
├── frontend/                     ← SPA React
│   └── src/
│       ├── App.tsx               ← Roteador principal + inicialização de sessão
│       ├── store/                ← Redux Store, authSlice, apiSlice
│       ├── features/auth/        ← RTK Query endpoints de autenticação
│       ├── hooks/                ← Hooks tipados do Redux
│       ├── components/           ← Layout.tsx, ProtectedRoute.tsx
│       └── pages/                ← Login, Register, Home, Menu, Dashboard, ...
│
├── docs/                         ← Documentação técnica
│   ├── IMPLEMENTATION_PLAN.md    ← Roadmap de 11 fases (Fase 0–10)
│   ├── DATA_MODEL.md             ← Fonte autoritativa dos 15 modelos de dados
│   ├── ARCHITECTURE.md           ← Decisões de arquitetura e ADRs
│   ├── API_SPEC.md               ← Especificação dos endpoints REST
│   └── DESIGN.md                 ← Guia de design (paleta, tipografia, componentes)
│
├── CLAUDE.md                     ← Contexto técnico completo para IAs e devs
└── README.md                     ← Este arquivo
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- **Python** 3.11+
- **Node.js** 20+
- **Poetry** (`pip install poetry`)

### Backend (FastAPI)

```bash
cd backend

# Instalar dependências
poetry install

# Ativar o ambiente virtual
poetry shell

# Aplicar migrações no banco de dados
alembic upgrade head

# Iniciar o servidor de desenvolvimento
uvicorn app.main:app --reload --port 8000
```

Acesse a **documentação interativa** da API em: `http://localhost:8000/docs`

### Frontend (React + Vite)

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse a aplicação em: `http://localhost:5173`

> **CORS em desenvolvimento:** O frontend (`localhost:5173`) se comunica com a API (`localhost:8000`) usando `credentials: 'include'` para transmissão segura dos cookies HttpOnly de autenticação.

---

## 🔐 Perfis de Acesso (RBAC)

| Role | Acesso |
|---|---|
| `CLIENTE` | Home, Cardápio, Fidelidade, Histórico de Pedidos, Perfil |
| `FUNCIONARIO` | PDV, Painel de Pedidos Ativos, Clientes, Cardápio |
| `GERENTE` | Tudo acima + Dashboard, Estoque/Produtos, Funcionários, Relatórios |

Os tokens JWT (`access_token`, `refresh_token`) trafegam via **cookies HttpOnly** em modo `SameSite=Lax`, sem exposição ao JavaScript.

---

## 🧪 Testes

### Backend
```bash
cd backend
poetry run pytest -v
```
**14 testes passando** — cobrindo modelos SQLAlchemy e fluxos completos de autenticação JWT.

### Frontend
```bash
cd frontend
npm run test
```
**3 testes passando** — cobrindo o Redux Store e os reducers de autenticação.

---

## 🗺️ Roadmap (v2.0)

| Fase | Descrição | Status |
|---|---|---|
| **Fase 0** | Setup do monorepo (backend + frontend) | ✅ Concluída |
| **Fase 1** | Core Backend: modelos, autenticação JWT, RBAC, rate limiting | ✅ Concluída |
| **Fase 2** | Core Frontend: layout RBAC, páginas de auth, rotas protegidas | ✅ Concluída |
| **Fase 3** | Cardápio & Produtos: refinamento de API, upload de imagens, CRUD admin | 🔜 Próxima |
| **Fase 4** | Gestão de Clientes e Funcionários | ⏳ Planejada |
| **Fase 5** | Sistema de Pedidos: "Monte seu Açaí", carrinho, checkout | ⏳ Planejada |
| **Fase 6** | PDV (Ponto de Venda) para funcionários | ⏳ Planejada |
| **Fase 7** | Sistema de Selos de Fidelidade | ⏳ Planejada |
| **Fase 8** | Dashboard analítico e relatórios exportáveis | ⏳ Planejada |
| **Fase 9** | Horários de funcionamento e notificações | ⏳ Planejada |
| **Fase 10** | Polimento, testes E2E e documentação final | ⏳ Planejada |

Consulte [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) para o detalhamento completo de cada fase.

---

## 📖 Documentação Técnica para Desenvolvedores e IAs

Para contexto arquitetural completo, convenções de código, decisões de design e regras de negócio, consulte:

👉 **[CLAUDE.md](./CLAUDE.md)** — Guia técnico completo do projeto (leitura obrigatória antes de modificar o código).