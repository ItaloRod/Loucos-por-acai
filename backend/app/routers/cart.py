import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.auth import get_current_user, RequireRole
from app.models.user import User, UserRole
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.schemas.cart import CartOut, CartItemCreate, CartItemUpdate, CartItemOut

router = APIRouter(prefix="/cart", tags=["Cart"])

@router.get("/", response_model=CartOut)
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(UserRole.CLIENTE))
):
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    now = datetime.now(timezone.utc)
    
    if not cart:
        expires_at = now + timedelta(days=1)
        cart = Cart(user_id=current_user.id, expires_at=expires_at)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    else:
        # Check expiration
        is_expired = False
        if cart.expires_at.tzinfo is None:
            is_expired = cart.expires_at < datetime.utcnow()
        else:
            is_expired = cart.expires_at < now
            
        if is_expired:
            # Clear items
            db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
            # Update expires_at
            cart.expires_at = now + timedelta(days=1)
            db.commit()
            db.refresh(cart)
            
    return cart

@router.post("/items", response_model=CartItemOut, status_code=status.HTTP_201_CREATED)
def add_cart_item(
    payload: CartItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(UserRole.CLIENTE))
):
    # Fetch base product
    product = db.query(Product).filter(Product.id == payload.product_id, Product.deleted_at == None).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado.")
    
    # Get or create cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    now = datetime.now(timezone.utc)
    if not cart:
        expires_at = now + timedelta(days=1)
        cart = Cart(user_id=current_user.id, expires_at=expires_at)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    else:
        # Check expiration
        is_expired = False
        if cart.expires_at.tzinfo is None:
            is_expired = cart.expires_at < datetime.utcnow()
        else:
            is_expired = cart.expires_at < now
            
        if is_expired:
            db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
            cart.expires_at = now + timedelta(days=1)
            db.commit()
            db.refresh(cart)

    # Validate options_selected (toppings)
    options_uuids = payload.options_selected or []
    if options_uuids:
        # Fetch toppings
        toppings = db.query(Product).filter(Product.id.in_(options_uuids), Product.deleted_at == None).all()
        if len(toppings) != len(set(options_uuids)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Um ou mais adicionais não existem.")
        for t in toppings:
            if not t.is_topping:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apenas adicionais (toppings) podem ser selecionados.")

    # Format options_selected as sorted list of string UUIDs for comparison and storage
    sorted_options_strs = sorted([str(uid) for uid in options_uuids])
    
    # Check if exact same item exists in cart
    existing_item = None
    for item in cart.items:
        if item.product_id == payload.product_id:
            item_options = sorted([str(uid) for uid in (item.options_selected or [])])
            if item_options == sorted_options_strs:
                existing_item = item
                break
                
    if existing_item:
        existing_item.quantity += payload.quantity
        if payload.notes:
            existing_item.notes = payload.notes
        db.commit()
        db.refresh(existing_item)
        return existing_item
    else:
        new_item = CartItem(
            cart_id=cart.id,
            product_id=payload.product_id,
            quantity=payload.quantity,
            unit_price=product.price,
            options_selected=sorted_options_strs if options_uuids else None,
            notes=payload.notes
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return new_item

@router.put("/items/{item_id}", response_model=CartItemOut)
def update_cart_item(
    item_id: uuid.UUID,
    payload: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(UserRole.CLIENTE))
):
    item = db.query(CartItem).join(Cart).filter(CartItem.id == item_id, Cart.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item do carrinho não encontrado.")
    
    if payload.quantity is not None:
        item.quantity = payload.quantity
    if payload.notes is not None:
        item.notes = payload.notes
        
    db.commit()
    db.refresh(item)
    return item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cart_item(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(UserRole.CLIENTE))
):
    item = db.query(CartItem).join(Cart).filter(CartItem.id == item_id, Cart.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item do carrinho não encontrado.")
    
    db.delete(item)
    db.commit()
    return None

@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(UserRole.CLIENTE))
):
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if cart:
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()
    return None
