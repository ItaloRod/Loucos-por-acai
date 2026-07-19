# Contexto do Projeto - Loucos por Açaí 🍧

Este arquivo fornece um contexto abrangente do projeto para agentes de IA (como Gemini) e desenvolvedores. Ele resume a arquitetura, estrutura de dados, fluxos de trabalho e diretrizes do sistema.

---

## 1. Visão Geral do Sistema

O **Loucos por Açaí** é um sistema web desenvolvido em Django para gerenciar uma loja/estabelecimento de açaí. O sistema lida com:

- Cadastro e gerenciamento de usuários com diferentes níveis de permissão (Clientes, Funcionários e Gerente).
- Controle de estoque (produtos, quantidades, preços, sistema de pontos de fidelidade).
- Atendimento e vendas (carrinho de compras, finalização de pedidos).
- Sistema de fidelidade (acúmulo de pontos em compras e troca de pontos por produtos).

---

## 2. Tecnologias Utilizadas

- **Linguagem:** Python 3.x
- **Framework Web:** Django (v6.0.7)
- **Banco de Dados:** SQLite (`db.sqlite3` / `loucosporacai.db`)
- **Bibliotecas Adicionais:** `django-global-permissions`, `sqlparse`, `asgiref`

---

## 3. Estrutura de Diretórios Principal

- loucosAcai/: Diretório de configurações do Django.
  - settings.py: Configurações do banco de dados, aplicativos instalados, middlewares e fuso horário (`America/Fortaleza`).
  - urls.py: Roteamento principal do projeto (redireciona para `modelo.urls`).
- modelo/: Aplicativo Django principal que contém as regras de negócios, views, modelos e templates.
  - models.py: Definição de tabelas do banco de dados (Estoque, Cliente, Funcionário, etc.).
  - views.py: Lógica de controle para renderização de páginas e processamento de formulários/ações.
  - urls.py: Mapeamento de rotas internas do aplicativo para os perfis correspondentes.
  - forms.py: Formulários Django para validação de cadastros e cadastros/edições de estoque, clientes, funcionários.
  - templates/view/: Arquivos HTML para as páginas públicas, de clientes, funcionários e gerentes.
- requirements.txt: Dependências Python do projeto.
- venv/: Ambiente virtual de desenvolvimento.

---

## 4. Níveis de Acesso e Permissões

O sistema é estruturado em três níveis de usuários (com base nos grupos do Django Auth):

1. **Cliente:**
   - Visualiza cardápio, página de informações ("Sobre") e formulário de contato.
   - Acessa e edita seu perfil.
   - Acompanha seus pontos acumulados no cartão fidelidade.
2. **Funcionário:**
   - Possui acesso às funções do cliente.
   - Realiza vendas (atendimento, adição de produtos ao carrinho e finalização de compras).
   - Cadastra, consulta, edita e exclui clientes.
3. **Gerente:**
   - Possui acesso total ao sistema.
   - Gerencia funcionários (cadastra, consulta, edita e remove).
   - Gerencia o estoque/cardápio de produtos (CRUD de estoque).
   - Acessa o histórico completo de vendas e realiza novas vendas.

---

## 5. Modelagem de Dados Principais

Consulte modelo/models.py para detalhes completos:

- **Usuario:** Extensão do modelo `User` do Django, contendo `cpf`, `endereco` e `telefone`. Métodos auxiliares: `isCliente()`, `isFuncionario()`, `isGerente()`.
- **Cliente:** Armazena referências para o `Usuario`, `Cartao` de pontos e `max_pontos`.
- **Cartao:** Controla a quantidade de pontos (`quant_pontos`) acumulados pelo cliente.
- **Estoque:** Representa os produtos e ingredientes. Contém `nome`, `marca`, `preco`, `quant_produtos` (quantidade física atual), `minimo` (limite mínimo de estoque) e `pontos` (pontos necessários para troca/fidelidade).
- **Atendimento:** Representa o registro de uma compra/venda, vinculando uma data de compra, o funcionário responsável, o cliente e o respectivo carrinho.
- **Carrinho:** Armazena a relação `ManyToManyField` com `Estoque` e o `valor_Total` acumulado.
- **Trocapontos:** Registra as operações de troca de pontos por produtos por parte dos clientes.

---

## 6. Comandos Úteis para Desenvolvimento

Para executar o projeto localmente:

1. **Ativar o Ambiente Virtual:**
   ```bash
   source venv/bin/activate
   ```
2. **Instalar Dependências:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Executar Servidor de Desenvolvimento:**
   ```bash
   python manage.py runserver
   ```
4. **Atualizar Banco de Dados (Migrations):**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
