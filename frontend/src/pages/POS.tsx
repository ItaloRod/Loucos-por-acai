import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Minus, X, Trash2, CheckCircle, CreditCard, Banknote, Coins, User } from 'lucide-react';
import { useGetProductsQuery, useGetCategoriesQuery } from '../features/catalog/catalogApi';
import { useLazyGetCustomerByCpfQuery } from '../features/customers/customersApi';
import { useCreateOrderMutation } from '../features/orders/ordersApi';
import { useGetDailySummaryQuery } from '../features/sales/salesApi';
import { AcaiBuilderModal } from '../components/AcaiBuilderModal';
import type { Product } from '../features/catalog/types';

interface POSCartItem {
  id: string; // local unique id for list keys
  product_id: string;
  product: Product;
  quantity: number;
  options_selected: string[];
  notes?: string;
}

export default function POS() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Queries
  const { data: categoriesData } = useGetCategoriesQuery();
  const { data: productsData } = useGetProductsQuery();
  const [getCustomer, { data: customerData, isFetching: isFetchingCustomer }] = useLazyGetCustomerByCpfQuery();
  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();
  const { data: dailySummary, refetch: refetchDailySummary } = useGetDailySummaryQuery();

  // State
  const [cartItems, setCartItems] = useState<POSCartItem[]>([]);
  const [cpfInput, setCpfInput] = useState('');
  const [customer, setCustomer] = useState<any | null>(null);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [cashTendered, setCashTendered] = useState<string>('');
  
  // Builder Modal State
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderProduct, setBuilderProduct] = useState<Product | null>(null);

  // Success Modal State
  const [successOrder, setSuccessOrder] = useState<any>(null);

  // Categories list (memoized)
  const categories = useMemo(() => {
    return categoriesData || [];
  }, [categoriesData]);

  // Products list (filtered by active category)
  const products = useMemo(() => {
    if (!productsData) return [];
    let list = productsData.items.filter(p => p.is_active && !p.deleted_at && !p.is_topping);
    if (activeCategory) {
      list = list.filter(p => p.category_id === activeCategory);
    }
    return list;
  }, [productsData, activeCategory]);

  const toppings = useMemo(() => {
    if (!productsData) return [];
    return productsData.items.filter(p => p.is_active && p.is_topping && !p.deleted_at);
  }, [productsData]);

  // Handlers
  const handleProductClick = (product: Product) => {
    if (product.is_base) {
      setBuilderProduct(product);
      setBuilderOpen(true);
    } else {
      // Add direct product
      setCartItems(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          product_id: product.id,
          product,
          quantity: 1,
          options_selected: [],
        }
      ]);
    }
  };

  const handleBuilderAddToCart = (payload: { product_id: string; quantity: number; options_selected: string[]; notes?: string }) => {
    if (!builderProduct) return;
    setCartItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        product_id: payload.product_id,
        product: builderProduct,
        quantity: payload.quantity,
        options_selected: payload.options_selected,
        notes: payload.notes,
      }
    ]);
    setBuilderProduct(null);
  };

  const handleSearchCustomer = async () => {
    if (!cpfInput.trim()) return;
    try {
      const res = await getCustomer(cpfInput.replace(/\D/g, '')).unwrap();
      setCustomer(res);
      setApplyDiscount(false);
    } catch (err) {
      alert('Cliente não encontrado ou erro na busca.');
      setCustomer(null);
    }
  };

  const handleClearCustomer = () => {
    setCustomer(null);
    setCpfInput('');
    setApplyDiscount(false);
  };

  const updateItemQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return { ...item, quantity: Math.max(1, newQ) };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  // Calculations
  const calculateItemSubtotal = (item: POSCartItem) => {
    let base = Number(item.product.price);
    item.options_selected.forEach(toppingId => {
      const topping = toppings.find(t => t.id === toppingId);
      if (topping) {
        base += Number(topping.price);
      }
    });
    return base * item.quantity;
  };

  const subtotal = cartItems.reduce((acc, item) => acc + calculateItemSubtotal(item), 0);
  const discountAmount = applyDiscount ? 20.00 : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const parsedCash = parseFloat(cashTendered.replace(',', '.')) || 0;
  const changeDue = paymentMethod === 'CASH' && parsedCash > total ? parsedCash - total : 0;
  const isCashValid = paymentMethod !== 'CASH' || parsedCash >= total;

  const handleCheckout = async () => {
    if (cartItems.length === 0) return alert('Carrinho vazio.');
    if (!isCashValid) return alert('Valor recebido menor que o total.');

    const orderPayload = {
      order_type: 'POS' as const,
      items: cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        options_selected: item.options_selected,
        notes: item.notes,
      })),
      apply_stamps_discount: applyDiscount,
      payment_method: paymentMethod,
      customer_id: customer?.id,
      cash_tendered: paymentMethod === 'CASH' ? parsedCash : undefined,
      change_due: paymentMethod === 'CASH' ? changeDue : undefined,
    };

    try {
      const res = await createOrder(orderPayload).unwrap();
      setSuccessOrder({ ...res, change_due: changeDue });
      // Reset state
      setCartItems([]);
      handleClearCustomer();
      setPaymentMethod('PIX');
      setCashTendered('');
      setApplyDiscount(false);
      refetchDailySummary();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao finalizar venda: ' + (err.data?.detail || err.message));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 space-y-4">
      <div className="flex flex-1 gap-4 overflow-hidden">
        
        {/* Product Grid (Left Side) */}
        <div className="flex-1 flex flex-col bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold mb-4">Produtos</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-colors ${
                  activeCategory === null ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Todos
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-colors ${
                    activeCategory === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max">
            {products.map(p => (
              <div
                key={p.id}
                onClick={() => handleProductClick(p)}
                className="border rounded-xl p-3 flex flex-col gap-2 cursor-pointer hover:border-primary hover:shadow-md transition-all h-36"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-sm line-clamp-2">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <span className="font-bold text-primary">R$ {Number(p.price).toFixed(2)}</span>
                  {p.is_base && <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded font-bold">MONTAR</span>}
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p className="col-span-full text-center py-10 text-muted-foreground">Nenhum produto encontrado.</p>
            )}
          </div>
        </div>

        {/* Sales Checkout Panel (Right Side) */}
        <div className="w-[400px] flex flex-col bg-card border rounded-2xl shadow-sm overflow-hidden flex-shrink-0">
          
          {/* Customer Identification */}
          <div className="p-4 border-b bg-muted/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><User size={18} /> Cliente</h3>
            {!customer ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CPF (apenas números)"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  value={cpfInput}
                  onChange={e => setCpfInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchCustomer()}
                />
                <button
                  onClick={handleSearchCustomer}
                  disabled={isFetchingCustomer}
                  className="bg-primary text-primary-foreground px-3 rounded-lg hover:bg-primary/90"
                >
                  <Search size={18} />
                </button>
              </div>
            ) : (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 relative">
                <button onClick={handleClearCustomer} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
                <p className="font-semibold text-sm">{customer.first_name} {customer.last_name}</p>
                <p className="text-xs text-muted-foreground">CPF: {customer.cpf || 'Não informado'}</p>
                {customer.stamp_card && (
                  <div className="mt-2 text-xs font-medium text-primary">
                    Selos: {customer.stamp_card.current_stamps} / 10
                    {customer.stamp_card.current_stamps >= 10 && (
                      <label className="flex items-center gap-2 mt-2 cursor-pointer bg-primary/10 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={applyDiscount}
                          onChange={(e) => setApplyDiscount(e.target.checked)}
                          className="rounded text-primary"
                        />
                        <span>Aplicar desconto de R$ 20,00</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cartItems.map(item => (
              <div key={item.id} className="flex flex-col gap-2 p-3 border rounded-lg text-sm bg-background">
                <div className="flex justify-between items-start font-medium">
                  <span className="flex-1">{item.product.name}</span>
                  <span className="ml-2">R$ {calculateItemSubtotal(item).toFixed(2)}</span>
                </div>
                {item.options_selected.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    + {item.options_selected.map(id => toppings.find(t => t.id === id)?.name).filter(Boolean).join(', ')}
                  </div>
                )}
                {item.notes && <div className="text-xs text-muted-foreground italic">Obs: {item.notes}</div>}
                
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateItemQuantity(item.id, -1)} className="p-1 hover:bg-muted rounded"><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateItemQuantity(item.id, 1)} className="p-1 hover:bg-muted rounded"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {cartItems.length === 0 && (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center">
                Adicione produtos para<br/>iniciar a venda
              </div>
            )}
          </div>

          {/* Payment & Checkout */}
          <div className="p-4 border-t bg-muted/10 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold mb-2">Forma de Pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                {['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-2 border rounded-lg text-xs font-bold transition-colors ${
                      paymentMethod === method ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:border-primary/50'
                    }`}
                  >
                    {method === 'PIX' ? 'PIX' : method === 'CREDIT_CARD' ? 'Crédito' : method === 'DEBIT_CARD' ? 'Débito' : 'Dinheiro'}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="flex gap-2 items-center text-sm">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Valor Recebido (R$)</label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0.00"
                    step="0.01"
                    min={total}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Troco</label>
                  <div className="w-full border rounded-lg px-3 py-2 bg-muted text-right font-bold text-green-600">
                    R$ {changeDue.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {applyDiscount && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Desconto (Selos)</span>
                  <span>- R$ {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black mt-2">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cartItems.length === 0 || !isCashValid || isCreatingOrder}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {isCreatingOrder ? 'Finalizando...' : 'Finalizar Venda'}
            </button>
          </div>
        </div>
      </div>

      {/* Daily Summary Panel */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm flex gap-6 items-center overflow-x-auto whitespace-nowrap flex-shrink-0">
        <div className="flex flex-col pr-6 border-r">
          <span className="text-xs text-muted-foreground font-bold uppercase">Hoje</span>
          <span className="text-sm font-semibold">{dailySummary?.total_orders || 0} Vendas</span>
        </div>
        <div className="flex flex-col pr-6 border-r">
          <span className="text-xs text-muted-foreground font-bold uppercase">Faturamento</span>
          <span className="text-lg font-black text-green-600">R$ {Number(dailySummary?.total_revenue || 0).toFixed(2)}</span>
        </div>
        {dailySummary && Object.entries(dailySummary.by_payment_method).map(([method, data]) => (
          <div key={method} className="flex flex-col pr-6">
            <span className="text-xs text-muted-foreground font-bold uppercase">
              {method === 'PIX' ? 'PIX' : method === 'CREDIT_CARD' ? 'Crédito' : method === 'DEBIT_CARD' ? 'Débito' : method === 'CASH' ? 'Dinheiro' : method}
            </span>
            <span className="text-sm font-medium">R$ {Number(data.revenue).toFixed(2)} ({data.count})</span>
          </div>
        ))}
      </div>

      {/* Builder Modal */}
      {builderProduct && (
        <AcaiBuilderModal
          isOpen={builderOpen}
          onClose={() => {
            setBuilderOpen(false);
            setBuilderProduct(null);
          }}
          baseProductId={builderProduct.id}
          baseProductName={builderProduct.name}
          baseProductPrice={Number(builderProduct.price)}
          onAddToCart={handleBuilderAddToCart}
        />
      )}

      {/* Success Modal (Receipt Mockup) */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="bg-green-600 p-6 flex flex-col items-center justify-center text-white">
              <CheckCircle size={48} className="mb-2" />
              <h2 className="text-2xl font-black">Venda Concluída!</h2>
              <p className="text-green-100">Pedido #{successOrder.order_number}</p>
            </div>
            
            <div className="p-6 font-mono text-sm flex-1 overflow-y-auto bg-yellow-50 text-gray-800">
              <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-4">
                <p className="font-bold text-lg">LOUCOS POR AÇAÍ</p>
                <p>Comprovante de Venda</p>
                <p>{new Date().toLocaleString()}</p>
              </div>
              
              <div className="space-y-2 mb-4 border-b border-dashed border-gray-400 pb-4">
                {successOrder.items.map((item: any) => (
                  <div key={item.id}>
                    <div className="flex justify-between">
                      <span>{item.quantity}x {item.product.name}</span>
                      <span>R$ {Number(item.subtotal).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 mb-4 border-b border-dashed border-gray-400 pb-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {Number(successOrder.subtotal).toFixed(2)}</span>
                </div>
                {Number(successOrder.discount) > 0 && (
                  <div className="flex justify-between">
                    <span>Desconto:</span>
                    <span>- R$ {Number(successOrder.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base mt-2">
                  <span>TOTAL:</span>
                  <span>R$ {Number(successOrder.total).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1 mb-4 border-b border-dashed border-gray-400 pb-4">
                <div className="flex justify-between">
                  <span>Pagamento:</span>
                  <span>{successOrder.payment_method}</span>
                </div>
                {successOrder.payment_method === 'CASH' && (
                  <>
                    <div className="flex justify-between">
                      <span>Recebido:</span>
                      <span>R$ {Number(successOrder.cash_tendered || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Troco:</span>
                      <span>R$ {Number(successOrder.change_due || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="text-center text-xs text-gray-500">
                <p>Obrigado pela preferência!</p>
              </div>
            </div>

            <div className="p-4 bg-gray-100 border-t">
              <button
                onClick={() => setSuccessOrder(null)}
                className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
