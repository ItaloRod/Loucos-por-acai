# Loucos por Açaí 🍧

[![Django Version](https://img.shields.io/badge/django-6.0.7-blue.svg)](https://www.djangoproject.com/)
[![Python Version](https://img.shields.io/badge/python-3.x-green.svg)](https://www.python.org/)

O **Loucos por Açaí** é um sistema completo de gestão de vendas, controle de estoque e programa de fidelidade para estabelecimentos que comercializam açaí e acompanhamentos. Desenvolvido utilizando o framework Django (Python) e banco de dados SQLite, o sistema oferece interfaces dedicadas para diferentes perfis de usuários (Clientes, Funcionários e Gerente).

---

## 🚀 Funcionalidades Principais

### 👤 Painel do Cliente
- **Cardápio Online:** Visualização completa dos produtos disponíveis.
- **Perfil do Usuário:** Consulta e edição das informações cadastrais (endereço, telefone, etc.).
- **Programa de Fidelidade:** Acompanhamento em tempo real dos pontos acumulados para futuras trocas.
- **Contato e Informações:** Canais de atendimento e página institucional "Sobre".

### 💼 Painel do Funcionário
- **Registro de Vendas:** Abertura de atendimento, carrinho de compras interativo e finalização de vendas.
- **Gestão de Clientes:** CRUD completo de clientes (cadastro, edição, consulta e exclusão).
- **Painel Geral:** Acesso ao cardápio e informações da empresa.

### 👑 Painel do Gerente (Administrador)
- **Gestão de Funcionários:** Controle absoluto de contratação e dados dos funcionários.
- **Controle de Estoque:** Cadastro, edição de preços, quantidades físicas de produtos e pontos associados para fidelidade.
- **Histórico de Vendas:** Relatórios consolidados de vendas do estabelecimento.
- **Vendas Rápidas:** Acesso ao fluxo de vendas direto do painel de gerente.

---

## 📁 Estrutura do Projeto

```text
├── README.md             <- Este arquivo de documentação geral
├── GEMINI.md             <- Contexto arquitetural detalhado para desenvolvedores e IAs
├── requirements.txt      <- Arquivo de dependências do Python/Django
├── .gitignore            <- Arquivo de exclusão do Git
├── manage.py             <- Script de gerenciamento do Django
├── db.sqlite3            <- Banco de dados do sistema (desenvolvimento)
├── loucosAcai/           <- Configurações do projeto Django
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── modelo/               <- App Django com toda a lógica de negócio
    ├── models.py
    ├── views.py
    ├── urls.py
    ├── forms.py
    └── templates/view/   <- Telas e páginas HTML da aplicação
```

---

## 🛠️ Como Iniciar o Projeto

Siga os passos abaixo para configurar e rodar o projeto localmente em sua máquina.

### Pré-requisitos
- Python instalado (versão 3.x recomendada).
- Gerenciador de pacotes `pip`.

### Passo 1: Clonar o Repositório e Navegar
```bash
git clone https://github.com/ItaloRod/Loucos-por-acai.git
cd Loucos-por-acai
```

### Passo 2: Criar e Ativar o Ambiente Virtual (Virtualenv)
Caso você já tenha a pasta `venv` no projeto, basta ativá-la:

No **Linux/macOS**:
```bash
source venv/bin/activate
```

No **Windows (cmd)**:
```cmd
venv\Scripts\activate
```

No **Windows (PowerShell)**:
```powershell
venv\Scripts\Activate.ps1
```

*(Se precisar criar do zero)*:
```bash
python -m venv venv
# Ative o ambiente de acordo com seu SO
```

### Passo 3: Instalar as Dependências
Com o ambiente virtual ativo, execute:
```bash
pip install -r requirements.txt
```

### Passo 4: Executar as Migrações do Banco de Dados
Para certificar-se de que a estrutura das tabelas está atualizada com o SQLite:
```bash
python manage.py migrate
```

### Passo 5: Iniciar o Servidor de Desenvolvimento
Rode o servidor local:
```bash
python manage.py runserver
```

Acesse a aplicação no navegador em: **`http://127.0.0.1:8000`**

---

## 📖 Informações Adicionais para IA e Editores
Para um entendimento profundo da arquitetura do banco de dados, mapeamento de models do Django, controle de permissões por nível de acesso e regras de negócio complexas, consulte o documento:
👉 **[GEMINI.md](file:///Users/paulorodrigues/Workspace/Loucos-por-acai/GEMINI.md)**