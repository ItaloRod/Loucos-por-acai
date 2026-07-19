# API Specification: Loucos por Açaí

Este documento detalha a especificação completa da API REST para o sistema de gestão do Loucos por Açaí.

## 1. Base Configuration

- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Autenticação:** JWT Bearer token (armazenado e transmitido via cookies `httpOnly`)
- **Paginação:** Offset baseada usando parâmetros `page` (default 1) e `page_size` (default 20, max 100) em endpoints de listagem.
- **Formato de Erro Padrão:**
```json
{
  "detail": "Descrição do erro",
  "code": "ERROR_CODE"
}
```

### Roles / RBAC
- **CLIENTE:** Usuário final, pode fazer pedidos, ver seus pontos, editar seu perfil.
- **FUNCIONARIO:** Pode gerenciar pedidos, clientes, visualizar estoque, criar vendas (PDV).
- **GERENTE:** Acesso total, incluindo relatórios, dashboard, edição de produtos, categorias, estoque e configurações.

---

## 2. Auth Endpoints (`/api/v1/auth/`)

### 2.1 Login
- **Method:** `POST /api/v1/auth/login`
- **Description:** Autentica um usuário e retorna tokens via cookie.
- **Roles:** Public
- **Request Body:**
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | email | string (email) | Yes | Email do usuário |
  | password | string | Yes | Senha |
- **Response (200 OK):**
  ```json
  {
    "message": "Login successful",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "GERENTE",
      "name": "João Silva"
    }
  }
  ```
- **Cookies Definidos:** `access_token` (httpOnly), `refresh_token` (httpOnly)
- **Error Codes:** `AUTH_INVALID_CREDENTIALS` (401), `USER_INACTIVE` (403)

### 2.2 Register
- **Method:** `POST /api/v1/auth/register`
- **Description:** Auto-registro para novos clientes.
- **Roles:** Public
- **Request Body:**
  | Field | Type | Required | Description |
  |-------|------|----------|--------------|
  | name | string | Yes | Nome completo |
  | email | string (email) | Yes | Email |
  | password | string (min: 8) | Yes | Senha |
  | cpf | string (14) | **Yes** | CPF do cliente. Formato: `000.000.000-00`. |
  | phone | string | No | Telefone de contato |
- **Response (201 Created):** Retorna o mesmo payload do Login. Define cookies.
- **Error Codes:** `AUTH_EMAIL_EXISTS` (400), `AUTH_CPF_EXISTS` (400)

### 2.3 Refresh Token
- **Method:** `POST /api/v1/auth/refresh`
- **Description:** Atualiza o access token expirado usando o refresh token do cookie.
- **Roles:** Public (requer cookie de refresh)
- **Response (200 OK):**
  ```json
  { "message": "Tokens refreshed" }
  ```
- **Error Codes:** `AUTH_INVALID_REFRESH_TOKEN` (401)

### 2.4 Logout
- **Method:** `POST /api/v1/auth/logout`
- **Description:** Invalida a sessão atual e limpa os cookies.
- **Roles:** Authenticated (Any)
- **Response (200 OK):**
  ```json
  { "message": "Logout successful" }
  ```

### 2.5 Get Profile
- **Method:** `GET /api/v1/auth/me`
- **Description:** Obtém os dados do usuário autenticado.
- **Roles:** Authenticated (Any)
- **Response (200 OK):**
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "João",
    "phone": "11999999999",
    "role": "CLIENTE",
    "stamps": 5
  }
  ```

### 2.6 Update Profile
- **Method:** `PUT /api/v1/auth/me`
- **Description:** Atualiza os dados básicos do perfil.
- **Roles:** Authenticated (Any)
- **Request Body:** (Todos os campos opcionais)
  | Field | Type | Description |
  |-------|------|-------------|
  | name | string | Novo nome |
  | phone | string | Novo telefone |
- **Response (200 OK):** Perfil atualizado.

### 2.7 Change Password
- **Method:** `PUT /api/v1/auth/me/password`
- **Description:** Altera a senha do usuário atual.
- **Roles:** Authenticated (Any)
- **Request Body:**
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | current_password | string | Yes | Senha atual |
  | new_password | string | Yes | Nova senha |
- **Response (200 OK):** `{ "message": "Password updated successfully" }`
- **Error Codes:** `AUTH_WRONG_PASSWORD` (400)

---

## 3. Products/Menu (`/api/v1/products/`)

### 3.1 List Products
- **Method:** `GET /api/v1/products/`
- **Description:** Lista produtos do cardápio (ativos).
- **Roles:** Public
- **Query Params:**
  - `page`, `page_size`
  - `category_id` (uuid)
  - `search` (string)
  - `tags` (string, comma-separated)
- **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "name": "Açaí Tradicional",
        "description": "Copo de 500ml",
        "price": 25.00,
        "image_url": "url",
        "category_id": "uuid",
        "tags": ["vegano", "sem-lactose"]
      }
    ],
    "total": 50,
    "page": 1,
    "pages": 3
  }
  ```

### 3.2 Get Product Detail
- **Method:** `GET /api/v1/products/{id}`
- **Description:** Detalhes de um produto, incluindo opções de personalização (adicionais, caldas).
- **Roles:** Public
- **Response (200 OK):**
  ```json
  {
    "id": "uuid",
    "name": "Açaí Tradicional",
    "price": 25.00,
    "options": [
      {
        "name": "Adicionais",
        "type": "multiple",
        "max_choices": 3,
        "items": [
          {"id": "uuid1", "name": "Leite Condensado", "price_extra": 2.00},
          {"id": "uuid2", "name": "Morango", "price_extra": 3.00}
        ]
      }
    ]
  }
  ```

### 3.3 Create Product
- **Method:** `POST /api/v1/products/`
- **Description:** Cria um novo produto.
- **Roles:** GERENTE
- **Request Body:**
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | name | string | Yes | Nome do produto |
  | description | string | No | Descrição |
  | price | float | Yes | Preço base |
  | category_id | uuid | Yes | Categoria |
  | is_active | boolean | No | Padrão: true |
- **Response (201 Created):** Objeto de produto.

### 3.4 Update Product
- **Method:** `PUT /api/v1/products/{id}`
- **Description:** Atualiza um produto.
- **Roles:** GERENTE
- **Request Body:** Campos parciais de produto.
- **Response (200 OK):** Produto atualizado.

### 3.5 Delete Product
- **Method:** `DELETE /api/v1/products/{id}`
- **Description:** Soft-delete (desativa) um produto.
- **Roles:** GERENTE
- **Response (204 No Content)**

---

## 4. Categories (`/api/v1/categories/`)

### 4.1 List Categories
- **Method:** `GET /api/v1/categories/`
- **Description:** Lista categorias em formato de árvore.
- **Roles:** Public
- **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "name": "Açaí na Tigela",
      "parent_id": null,
      "children": []
    }
  ]
  ```

### 4.2 Create Category (POST), Update (PUT), Delete (DELETE)
- **Roles:** GERENTE
- Campos: `name` (string, req), `parent_id` (uuid, opc), `is_active` (bool).
- Deletar faz soft-delete.

---

## 5. Inventory/Stock (`/api/v1/inventory/`)

### 5.1 List Stock
- **Method:** `GET /api/v1/inventory/`
- **Description:** Lista itens de estoque.
- **Roles:** FUNCIONARIO, GERENTE
- **Query Params:** `page`, `page_size`, `search`
- **Response:**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "product_name": "Copo 500ml",
        "quantity": 150,
        "unit": "unidade",
        "min_quantity": 50
      }
    ],
    "total": 10
  }
  ```

### 5.2 Update Stock
- **Method:** `PUT /api/v1/inventory/{product_id}`
- **Description:** Ajusta o nível de estoque de um item.
- **Roles:** GERENTE
- **Request Body:**
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | quantity | float | Yes | Nova quantidade exata ou ajuste |
  | adjustment_type | string | Yes | "set", "add", "subtract" |
- **Response (200 OK):** Item de estoque atualizado.

### 5.3 Low Stock Alerts
- **Method:** `GET /api/v1/inventory/alerts`
- **Description:** Retorna itens cuja quantidade é menor ou igual à `min_quantity`.
- **Roles:** FUNCIONARIO, GERENTE

---

## 6. Customers (`/api/v1/customers/`)

### 6.1 List Customers
- **Method:** `GET /api/v1/customers/`
- **Roles:** FUNCIONARIO, GERENTE
- **Query Params:** `page`, `page_size`, `search` (nome/email/telefone)

### 6.2 Get Customer Details & Stamps
- **Method:** `GET /api/v1/customers/{id}`
- **Roles:** FUNCIONARIO, GERENTE

### 6.3 Update Customer
- **Method:** `PUT /api/v1/customers/{id}`
- **Roles:** GERENTE

---

## 7. Employees (`/api/v1/employees/`)

### 7.1 List/Create/Update/Delete Employees
- **Method:** CRUD padrão
- **Roles:** GERENTE
- **Create Request Body:**
  `name`, `email`, `password`, `role` (FUNCIONARIO ou GERENTE), `is_active`.

---

## 8. Orders (`/api/v1/orders/`)

### 8.1 Create Order
- **Method:** `POST /api/v1/orders/`
- **Description:** Cria um pedido (online, retirada ou PDV). O `order_type` determina o fluxo — pedidos `POS` iniciam diretamente com status `PREPARING`.
- **Roles:** CLIENTE (tipos DELIVERY/PICKUP), FUNCIONARIO/GERENTE (todos os tipos)
- **Request Body:**
  ```json
  {
    "order_type": "DELIVERY",
    "items": [
      {
        "product_id": "uuid",
        "quantity": 1,
        "options_selected": ["uuid_leite_cond", "uuid_morango"],
        "notes": "Sem banana"
      }
    ],
    "delivery_address_id": "uuid",
    "payment_method": "PIX",
    "apply_stamps_discount": false,
    "customer_id": "uuid"
  }
  ```
  - `delivery_address_id`: Obrigatório se `order_type = DELIVERY`.
  - `customer_id`: Opcional para DELIVERY/PICKUP (usa o usuário autenticado); obrigatório para `POS` quando o cliente é identificado por CPF.
- **Validações do Backend (OrderService):**
  - **Estoque:** `SELECT ... FOR UPDATE` em `Inventory` para cada item antes de deduzir — garante atomicidade.
  - **max_choices:** Para cada item com `options_selected`, o serviço valida que `len(options_selected_por_grupo) <= ProductOption.max_choices`. Retorna `400 INVALID_OPTIONS` se excedido.
  - **Horário:** Valida `BusinessHours` antes de aceitar pedidos online (não se aplica a `POS`).
- **Response (201 Created):**
  Retorna o `order_id`, total calculado e status inicial (`PENDING` para online, `PREPARING` para POS).

### 8.2 List Orders
- **Method:** `GET /api/v1/orders/`
- **Description:** Clientes veem os próprios; Funcionários veem todos.
- **Query Params:** `status` (PENDING, PREPARING, READY, DELIVERING, COMPLETED, CANCELLED).

### 8.3 Get Order Detail
- **Method:** `GET /api/v1/orders/{id}`

### 8.4 Update Order Status
- **Method:** `PUT /api/v1/orders/{id}/status`
- **Roles:** FUNCIONARIO, GERENTE
- **Request Body:**
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | status | string | Yes | Novo status |
- **Response (200 OK)**

### 8.5 Cancel Order
- **Method:** `POST /api/v1/orders/{id}/cancel`
- **Roles:** CLIENTE (se PENDING), FUNCIONARIO, GERENTE
- **Request Body:** `reason` (string).

---

## 9. Cart (`/api/v1/cart/`)

### 9.1 Get Cart
- **Method:** `GET /api/v1/cart/`
- **Roles:** CLIENTE

### 9.2 Add Item
- **Method:** `POST /api/v1/cart/items`
- **Request Body:** `product_id`, `quantity`, `options_selected`.

### 9.3 Update/Remove/Clear
- **Method:** PUT/DELETE. Funcionalidade padrão de carrinho vinculada à sessão do usuário.

---

## 10. Stamps/Loyalty (`/api/v1/stamps/`)

Regra de negócio: R$20 = 1 selo. 10 selos = R$20 de desconto.

### 10.1 Get Current Stamps
- **Method:** `GET /api/v1/stamps/`
- **Roles:** CLIENTE
- **Response:** `{ "total_stamps": 8, "available_discounts": 0 }`

### 10.2 History
- **Method:** `GET /api/v1/stamps/history`
- **Roles:** CLIENTE

### 10.3 Redeem Discount
- **Method:** `POST /api/v1/stamps/redeem`
- **Description:** Gera um cupom/crédito na conta trocando 10 pontos.
- **Roles:** CLIENTE

---

## 11. Sales/POS (`/api/v1/sales/`)

### 11.1 Create POS Sale

> ⚠️ **Decisão Arquitetural:** O endpoint de venda PDV **NÃO é um endpoint separado**. Utilize `POST /api/v1/orders/` com `order_type: "POS"`. O `OrderService` detecta o tipo e aplica o fluxo correto (status inicial `PREPARING`, dedução imediata de estoque e selos).

**Campos adicionais aceitos no body ao usar `order_type: "POS"`:**

| Field | Type | Required | Description |
|-------|------|----------|--------------|
| `cash_tendered` | float | No | Valor em dinheiro entregue pelo cliente (para cálculo de troco). |
| `change_due` | float | No | Troco calculado pelo frontend (validado pelo backend). |

### 11.2 Daily Summary
- **Method:** `GET /api/v1/sales/daily-summary`
- **Roles:** FUNCIONARIO, GERENTE
- **Response:** Total arrecadado no dia atual, separado por método de pagamento e tipo de pedido (POS vs Online).

---

## 12. Business Hours (`/api/v1/business-hours/`)

### 12.1 Get Business Hours
- **Method:** `GET /api/v1/business-hours/`
- **Roles:** Public
- **Response:** Horários de funcionamento (Seg a Dom).

### 12.2 Check Open Status
- **Method:** `GET /api/v1/business-hours/status`
- **Roles:** Public
- **Response:** `{ "is_open": true, "closes_at": "22:00" }`

### 12.3 Update Hours / Holidays / Closures
- **Method:** PUT / POST
- **Roles:** GERENTE

---

## 13. Dashboard (`/api/v1/dashboard/`)

Todos endpoints são restritos a **GERENTE**.
- `GET /api/v1/dashboard/sales-summary`: Vendas hoje/semana/mês.
- `GET /api/v1/dashboard/top-products`: Produtos mais vendidos.
- `GET /api/v1/dashboard/low-stock`: Atalho para estoque baixo.
- `GET /api/v1/dashboard/revenue-chart`: Dados para gráfico em série temporal (agrupado por dia/mês).

---

## 14. Reports (`/api/v1/reports/`)

- **Roles:** GERENTE
- Todos endpoints aceitam `?from=YYYY-MM-DD&to=YYYY-MM-DD` e `?format=pdf|excel`.

### 14.1 Sales Report
- **Method:** `GET /api/v1/reports/sales`
- Retorna um link de download temporário ou o buffer do arquivo (dependendo do content-type da requisição).

### 14.2 Inventory Report
- **Method:** `GET /api/v1/reports/inventory`

### 14.3 Customers Report
- **Method:** `GET /api/v1/reports/customers`
