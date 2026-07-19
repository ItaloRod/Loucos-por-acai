import { useState, useMemo } from 'react';
import { X, Plus, Minus, Info } from 'lucide-react';
import { useGetProductsQuery } from '../features/catalog/catalogApi';
import { useAddToCartMutation } from '../features/cart/cartApi';

interface AcaiBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseProductId: string;
  baseProductName: string;
  baseProductPrice: number;
}

export const AcaiBuilderModal = ({
  isOpen,
  onClose,
  baseProductId,
  baseProductName,
  baseProductPrice,
}: AcaiBuilderModalProps) => {
  const { data: productsData, isLoading } = useGetProductsQuery();
  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();

  const [quantity, setQuantity] = useState(1);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const toppings = useMemo(() => {
    if (!productsData) return [];
    return productsData.items.filter((p) => p.is_topping && !p.deleted_at);
  }, [productsData]);

  if (!isOpen) return null;

  const handleToggleTopping = (toppingId: string) => {
    setSelectedToppings((prev) =>
      prev.includes(toppingId)
        ? prev.filter((id) => id !== toppingId)
        : [...prev, toppingId]
    );
  };

  const calculateTotal = () => {
    let total = Number(baseProductPrice);
    selectedToppings.forEach((id) => {
      const topping = toppings.find((t) => t.id === id);
      if (topping) {
        total += Number(topping.price);
      }
    });
    return total * quantity;
  };

  const handleAddToCart = async () => {
    try {
      await addToCart({
        product_id: baseProductId,
        quantity,
        options_selected: selectedToppings,
        notes: notes || undefined,
      }).unwrap();
      onClose();
    } catch (err) {
      console.error('Falha ao adicionar ao carrinho:', err);
      alert('Ocorreu um erro ao adicionar ao carrinho.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-xl font-bold text-foreground">Monte seu Açaí</h2>
            <p className="text-sm text-muted-foreground">Base: {baseProductName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground">Carregando acompanhamentos...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-primary" />
                <h3 className="font-semibold">Escolha seus Acompanhamentos</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {toppings.map((topping) => {
                  const isSelected = selectedToppings.includes(topping.id);
                  return (
                    <div
                      key={topping.id}
                      onClick={() => handleToggleTopping(topping.id)}
                      className={`cursor-pointer border rounded-xl p-3 flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm leading-tight">
                          {topping.name}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-bold mt-2">
                        + R$ {Number(topping.price).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantidade e Observações */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Quantidade</span>
              <div className="flex items-center gap-4 bg-muted p-1 rounded-xl">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 bg-card rounded-lg hover:text-primary transition-colors shadow-sm"
                >
                  <Minus size={16} />
                </button>
                <span className="font-bold w-4 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-2 bg-card rounded-lg hover:text-primary transition-colors shadow-sm"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Observações</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Tirar banana, sem leite em pó..."
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-24"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-muted/30">
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full flex items-center justify-between py-3 px-6 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg active:scale-[0.98] disabled:opacity-70"
          >
            <span>{isAdding ? 'Adicionando...' : 'Adicionar ao Carrinho'}</span>
            <span>R$ {calculateTotal().toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
