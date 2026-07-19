# Loucos por Açaí - Backend v2.0

Backend desenvolvido com FastAPI, SQLAlchemy, Alembic e Poetry.

## Requisitos
- Python 3.13+
- Poetry

## Instalação e Execução
1. Instale as dependências:
   ```bash
   poetry install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   poetry run uvicorn app.main:app --reload
   ```

## Testes
```bash
poetry run pytest
```
