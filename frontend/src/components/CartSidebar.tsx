import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import {
  useGetCartQuery,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
} from '../features/cart/cartApi';
import { useGetProductsQuery } from '../features/catalog/catalogApi';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartSidebar = ({ isOpen, onClose }: CartSidebarProps) => {
  const navigate = useNavigate();
  const { data: cart, isLoading } = useGetCartQuery();
  const { data: productsData } = useGetProductsQuery();
  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeFromCart] = useRemoveFromCartMutation();

  const products = productsData?.items || [];

  const handleUpdateQuantity = async (itemId: string, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }
    await updateCartItem({ itemId, body: { quantity: newQuantity } });
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeFromCart(itemId);
  };

  const calculateSubtotal = () => {
    if (!cart) return 0;
    return cart.items.reduce((total, item) => {
      let itemTotal = Number(item.unit_price) * item.quantity;
      if (item.options_selected) {
        item.options_selected.forEach((optId) => {
          const product = products.find((p) => p.id === optId);
          if (product) {
            itemTotal += Number(product.price) * item.quantity;
          }
        });
      }
      return total + itemTotal;
    }, 0);
  };

  const subtotal = calculateSubtotal();

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-96 bg-card border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-primary" />
            <h2 className="text-lg font-bold">Seu Carrinho</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground mt-4">Carregando...</p>
          ) : !cart || cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <span className="text-4xl">🛒</span>
              <p className="text-muted-foreground">Seu carrinho está vazio.</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold"
              >
                Continuar Comprando
              </button>
            </div>
          ) : (
            cart.items.map((item) => {
              const product = products.find((p) => p.id === item.product_id);
              if (!product) return null;

              const optionsProducts = (item.options_selected || []).map((optId) =>
                products.find((p) => p.id === optId)
              ).filter(Boolean);

              const itemBasePrice = Number(item.unit_price);
              const optionsPrice = optionsProducts.reduce((acc, opt) => acc + (opt ? Number(opt.price) : 0), 0);
              const itemTotal = (itemBasePrice + optionsPrice) * item.quantity;

              return (
                <div
                  key={item.id}
                  className="p-3 border border-border rounded-xl space-y-2 bg-background shadow-sm"
                >
                  <div className="flex justify-between font-semibold text-sm">
                    <span>{product.name}</span>
                    <span className="text-primary">R$ {itemTotal.toFixed(2)}</span>
                  </div>
                  
                  {optionsProducts.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Adicionais:</p>
                      <ul className="list-disc list-inside">
                        {optionsProducts.map((opt) => (
                          <li key={opt?.id}>{opt?.name} (+R$ {Number(opt?.price).toFixed(2)})</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.notes && (
                    <div className="text-xs bg-muted/50 p-2 rounded-md italic">
                      Obs: {item.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center border border-border rounded-lg bg-card">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                        className="p-1 hover:bg-muted text-muted-foreground transition-colors rounded-l-lg"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-3 text-xs font-bold w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                        className="p-1 hover:bg-muted text-muted-foreground transition-colors rounded-r-lg"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="p-4 border-t border-border bg-card space-y-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-primary">R$ {subtotal.toFixed(2)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-[0.98]"
            >
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </>
  );
};
