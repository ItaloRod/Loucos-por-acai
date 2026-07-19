import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCartQuery, useClearCartMutation } from '../features/cart/cartApi';
import { useGetProductsQuery } from '../features/catalog/catalogApi';
import { useGetAddressesQuery } from '../features/auth/authApi';
import { useCreateOrderMutation } from '../features/orders/ordersApi';
import { OrderType } from '../features/orders/types';
import { CreditCard, Banknote, MapPin, Loader2, Store } from 'lucide-react';

export const Checkout = () => {
  const navigate = useNavigate();
  const { data: cart, isLoading: isLoadingCart } = useGetCartQuery();
  const { data: productsData } = useGetProductsQuery();
  const { data: addresses, isLoading: isLoadingAddresses } = useGetAddressesQuery();
  const [createOrder, { isLoading: isCreating }] = useCreateOrderMutation();
  const [clearCart] = useClearCartMutation();

  const [orderType, setOrderType] = useState<OrderType>(OrderType.ONLINE_DELIVERY);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [applyDiscount, setApplyDiscount] = useState<boolean>(false);

  // Todo: fetch user stamps dynamically if needed, or assume backend validates.
  // We'll leave the checkbox and if backend returns 400 we show alert.

  const products = productsData?.items || [];

  if (isLoadingCart || isLoadingAddresses) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <span className="text-6xl">🛒</span>
        <h2 className="text-xl font-bold">Carrinho Vazio</h2>
        <p className="text-muted-foreground">Adicione produtos antes de finalizar a compra.</p>
        <button
          onClick={() => navigate('/menu')}
          className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg"
        >
          Ir para o Cardápio
        </button>
      </div>
    );
  }

  const calculateSubtotal = () => {
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
  const discountAmount = applyDiscount ? 20 : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const handleCheckout = async () => {
    if (orderType === OrderType.ONLINE_DELIVERY && !selectedAddressId) {
      alert('Por favor, selecione um endereço para entrega.');
      return;
    }

    try {
      const order = await createOrder({
        order_type: orderType,
        delivery_address_id: orderType === OrderType.ONLINE_DELIVERY ? selectedAddressId : undefined,
        apply_stamps_discount: applyDiscount,
        payment_method: paymentMethod,
      }).unwrap();

      await clearCart().unwrap();
      navigate(`/orders/${order.id}`);
    } catch (err: any) {
      console.error('Erro ao criar pedido:', err);
      alert(err.data?.detail || 'Erro ao finalizar pedido. Verifique seus selos se aplicou o desconto.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Finalizar Pedido</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Tipo de Pedido */}
          <section className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Store size={20} className="text-primary" />
              Retirada ou Entrega?
            </h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orderType"
                  value={OrderType.ONLINE_DELIVERY}
                  checked={orderType === OrderType.ONLINE_DELIVERY}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                  className="text-primary focus:ring-primary"
                />
                <span>Entrega (Delivery)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orderType"
                  value={OrderType.ONLINE_PICKUP}
                  checked={orderType === OrderType.ONLINE_PICKUP}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                  className="text-primary focus:ring-primary"
                />
                <span>Retirar na Loja</span>
              </label>
            </div>
          </section>

          {/* Endereço de Entrega */}
          {orderType === OrderType.ONLINE_DELIVERY && (
            <section className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MapPin size={20} className="text-primary" />
                  Endereço de Entrega
                </h2>
                <button
                  onClick={() => navigate('/profile')}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Adicionar Novo
                </button>
              </div>

              {addresses && addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`block p-4 border rounded-xl cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={(e) => setSelectedAddressId(e.target.value)}
                          className="text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="font-semibold text-sm">
                            {addr.street}, {addr.number} {addr.complement && `- ${addr.complement}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {addr.neighborhood}, {addr.city} - {addr.state} | CEP: {addr.zip_code}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Você não tem nenhum endereço cadastrado.{' '}
                  <button onClick={() => navigate('/profile')} className="text-primary underline">
                    Cadastre um agora
                  </button>.
                </p>
              )}
            </section>
          )}

          {/* Forma de Pagamento */}
          <section className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CreditCard size={20} className="text-primary" />
              Pagamento na Entrega/Retirada
            </h2>
            <div className="space-y-3">
              {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'].map((method) => (
                <label
                  key={method}
                  className={`block p-3 border rounded-xl cursor-pointer transition-all ${
                    paymentMethod === method
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-sm">{method}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Resumo do Pedido */}
        <div className="space-y-6">
          <section className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4 sticky top-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Banknote size={20} className="text-primary" />
              Resumo do Pedido
            </h2>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {cart.items.map((item) => {
                const product = products.find((p) => p.id === item.product_id);
                if (!product) return null;
                
                const optionsProducts = (item.options_selected || []).map((optId) =>
                  products.find((p) => p.id === optId)
                ).filter(Boolean);

                const itemBasePrice = Number(item.unit_price);
                const optionsPrice = optionsProducts.reduce((acc, opt) => acc + (opt ? Number(opt.price) : 0), 0);
                const itemTotal = (itemBasePrice + optionsPrice) * item.quantity;

                return (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="font-semibold">{item.quantity}x {product.name}</span>
                      {optionsProducts.length > 0 && (
                        <p className="text-xs text-muted-foreground pl-4">
                          + {optionsProducts.map((o) => o?.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold">R$ {itemTotal.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              {/* Fidelidade */}
              <label className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyDiscount}
                  onChange={(e) => setApplyDiscount(e.target.checked)}
                  className="text-primary focus:ring-primary rounded"
                />
                <span className="text-sm font-semibold">Aplicar Desconto Fidelidade (- R$ 20.00)</span>
              </label>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {applyDiscount && (
                <div className="flex justify-between text-sm text-primary font-semibold">
                  <span>Desconto</span>
                  <span>- R$ {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCreating}
              className="w-full py-4 mt-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isCreating && <Loader2 className="w-5 h-5 animate-spin" />}
              {isCreating ? 'Finalizando...' : 'Finalizar Pedido'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
