import uuid
import os
import shutil
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.database import get_db
from app.core.auth import get_current_user, RequireRole
from app.models.user import User, UserRole
from app.models.product import Category, Product, Inventory
from app.schemas.catalog import (
    CategoryCreate, CategoryUpdate, CategoryOut,
    ProductCreate, ProductUpdate, ProductOut,
    InventoryUpdate, InventoryOut, PaginatedProductOut
)

router = APIRouter(prefix="/catalog", tags=["Catalog"])

# ==========================================
# CATEGORIES ENDPOINTS
# ==========================================

@router.get("/categories", response_model=list[CategoryOut])
def list_categories(
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    Lista todas as categorias de produtos.
    Público. Por padrão, oculta categorias inativas.
    """
    query = db.query(Category)
    if not include_inactive:
        query = query.filter(Category.is_active == True)
    
    return query.order_by(Category.display_order).all()


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Cria uma nova categoria.
    Acesso restrito a GERENTE.
    """
    # Validar slug único
    if db.query(Category).filter(Category.slug == payload.slug).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug de categoria já está em uso.")

    # Validar parent_id se fornecido
    if payload.parent_id:
        parent = db.query(Category).filter(Category.id == payload.parent_id).first()
        if not parent:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria pai informada não existe.")

    new_category = Category(**payload.model_dump())
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category


@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Atualiza uma categoria existente.
    Acesso restrito a GERENTE.
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")

    # Validar slug único se alterado
    if payload.slug and payload.slug != category.slug:
        if db.query(Category).filter(Category.slug == payload.slug).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug de categoria já está em uso.")

    # Validar parent_id
    if payload.parent_id:
        if payload.parent_id == category.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uma categoria não pode ser pai de si mesma.")
        parent = db.query(Category).filter(Category.id == payload.parent_id).first()
        if not parent:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria pai informada não existe.")

    # Atualizar campos
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_200_OK)
def delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Remove uma categoria. Bloqueia a remoção caso existam produtos vinculados a ela para evitar deleção em cascata acidental.
    Acesso restrito a GERENTE.
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada.")

    # Verificar se existem produtos associados
    has_products = db.query(Product).filter(Product.category_id == category_id, Product.deleted_at == None).first()
    if has_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir uma categoria que contém produtos ativos associados. Remova ou mova os produtos primeiro."
        )

    db.delete(category)
    db.commit()
    return {"detail": "Categoria excluída com sucesso."}


# ==========================================
# PRODUCTS ENDPOINTS
# ==========================================

@router.get("/products", response_model=PaginatedProductOut)
def list_products(
    category_id: uuid.UUID | None = None,
    include_unavailable: bool = False,
    is_topping: bool | None = None,
    is_base: bool | None = None,
    search: str | None = None,
    tags: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """
    Lista todos os produtos ativos (não excluídos logicamente).
    Público. Suporta filtros por categoria, acompanhamentos, bases, busca textual, tags e paginação.
    """
    query = db.query(Product).filter(Product.deleted_at == None)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if not include_unavailable:
        query = query.filter(Product.is_available == True)
    if is_topping is not None:
        query = query.filter(Product.is_topping == is_topping)
    if is_base is not None:
        query = query.filter(Product.is_base == is_base)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_filter),
                Product.description.ilike(search_filter)
            )
        )
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        for tag in tag_list:
            query = query.filter(Product.tags.like(f'%"{tag}"%'))

    total = query.count()
    pages = (total + page_size - 1) // page_size if total > 0 else 0
    offset = (page - 1) * page_size
    items = query.order_by(Product.display_order).offset(offset).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": pages
    }


@router.get("/products/{product_id}", response_model=ProductOut)
def read_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """
    Retorna os detalhes de um produto específico.
    """
    product = db.query(Product).filter(Product.id == product_id, Product.deleted_at == None).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado ou foi removido.")
    return product


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Cria um novo produto e inicializa automaticamente a tabela de inventário vinculada com quantidade zero.
    Acesso restrito a GERENTE.
    """
    # Validar slug único
    if db.query(Product).filter(Product.slug == payload.slug).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug de produto já está em uso.")

    # Validar categoria
    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria informada não existe.")

    # Criar produto
    new_product = Product(**payload.model_dump())
    db.add(new_product)
    db.flush()

    # Inicializar o estoque/inventário do produto
    new_inventory = Inventory(
        product_id=new_product.id,
        quantity=0,
        minimum_threshold=5,
        unit="unidade"  # Padrão genérico
    )
    db.add(new_inventory)
    
    db.commit()
    db.refresh(new_product)
    return new_product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Atualiza os dados de um produto existente.
    Acesso restrito a GERENTE.
    """
    product = db.query(Product).filter(Product.id == product_id, Product.deleted_at == None).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")

    # Validar slug se fornecido e modificado
    if payload.slug and payload.slug != product.slug:
        if db.query(Product).filter(Product.slug == payload.slug).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug de produto já está em uso.")

    # Validar categoria
    if payload.category_id:
        category = db.query(Category).filter(Category.id == payload.category_id).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria informada não existe.")

    # Atualizar campos
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_200_OK)
def soft_delete_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Exclusão lógica do produto (Soft Delete) atualizando o campo deleted_at.
    Preserva a integridade de vendas históricas em que o produto foi comprado.
    Acesso restrito a GERENTE.
    """
    product = db.query(Product).filter(Product.id == product_id, Product.deleted_at == None).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado ou já foi excluído.")

    product.deleted_at = datetime.now(timezone.utc)
    product.is_available = False
    db.commit()
    return {"detail": "Produto removido logicamente com sucesso."}


# ==========================================
# INVENTORY ENDPOINTS
# ==========================================

@router.get("/inventory/{product_id}", response_model=InventoryOut)
def read_product_inventory(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(RequireRole(UserRole.GERENTE, UserRole.FUNCIONARIO))
):
    """
    Retorna o inventário/estoque de um produto específico.
    Acesso restrito a GERENTE e FUNCIONARIO.
    """
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estoque do produto informado não existe.")
    return inventory


@router.put("/inventory/{product_id}", response_model=InventoryOut)
def update_product_inventory(
    product_id: uuid.UUID,
    payload: InventoryUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(RequireRole(UserRole.GERENTE, UserRole.FUNCIONARIO))
):
    """
    Atualiza as quantidades e regras de estoque de um produto. Se restocarem itens, atualiza o timestamp last_restocked_at.
    Acesso restrito a GERENTE e FUNCIONARIO.
    """
    inventory = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inventory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estoque do produto informado não existe.")

    # Se a quantidade está aumentando, consideramos um abastecimento (restock)
    if payload.quantity is not None and payload.quantity > inventory.quantity:
        inventory.last_restocked_at = datetime.now(timezone.utc)

    # Atualizar campos
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(inventory, key, value)

    db.commit()
    db.refresh(inventory)
    return inventory


@router.post("/upload-image", response_model=dict)
def upload_image(
    file: UploadFile = File(...),
    gerente_user: User = Depends(RequireRole(UserRole.GERENTE))
):
    """
    Realiza o upload de uma imagem para o servidor.
    Retorna a URL da imagem.
    Acesso restrito a GERENTE.
    """
    # Validar extensão do arquivo
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de arquivo não permitido. Extensões permitidas: {', '.join(allowed_extensions)}"
        )
    
    # Criar um nome de arquivo único para evitar colisões
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join("static/uploads", filename)
    
    # Salvar o arquivo
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar a imagem: {str(e)}"
        )
        
    # Retornar a URL relativa
    image_url = f"/static/uploads/{filename}"
    return {"image_url": image_url}

