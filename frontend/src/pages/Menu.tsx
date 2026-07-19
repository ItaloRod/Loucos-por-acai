import { useState } from 'react';
import { Utensils, Award, Plus, Sparkles } from 'lucide-react';

interface MockProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image?: string;
  isBase: boolean;
}

export const Menu = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Produtos simulados para exibição estática da Fase 2
  const mockProducts: MockProduct[] = [
    { id: '1', name: 'Copo Açaí Tradicional 300ml', price: 12.00, description: 'Açaí cremoso batido na hora, perfeito para matar a fome.', category: 'bases', isBase: true },
    { id: '2', name: 'Copo Açaí Tradicional 500ml', price: 18.00, description: 'Nosso tamanho mais pedido! Ideal para combinar com vários toppings.', category: 'bases', isBase: true },
    { id: '3', name: 'Tigela Açaí Premium 700ml', price: 24.00, description: 'Super tigela de açaí cremoso para os verdadeiros loucos por açaí.', category: 'bases', isBase: true },
    { id: '4', name: 'Leite em Pó', price: 2.00, description: 'Leite em pó Ninho de altíssima qualidade.', category: 'toppings', isBase: false },
    { id: '5', name: 'Leite Condensado Moça', price: 2.50, description: 'Creme de leite condensado Moça original bem cremoso.', category: 'toppings', isBase: false },
    { id: '6', name: 'Granola Especial', price: 2.00, description: 'Granola crocante com castanhas e banana desidratada.', category: 'toppings', isBase: false },
    { id: '7', name: 'Paçoca Esfarelada', price: 1.50, description: 'Paçoca de amendoim esfarelada.', category: 'toppings', isBase: false },
    { id: '8', name: 'Suco Natural de Laranja', price: 7.00, description: 'Espremido na hora com laranjas frescas selecionadas.', category: 'bebidas', isBase: false },
  ];

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'bases', label: 'Açaí na Tigela/Copo' },
    { id: 'toppings', label: 'Complementos/Toppings' },
    { id: 'bebidas', label: 'Bebidas' },
  ];

  const filteredProducts = selectedCategory === 'todos' 
    ? mockProducts 
    : mockProducts.filter(p => p.category === selectedCategory);

  return (
    <div className="space-y-8 pb-12">
      {/* Intro */}
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Nosso Cardápio</h2>
        <p className="text-muted-foreground text-sm max-w-lg">Navegue pelas nossas opções deliciosas. Monte o açaí da sua maneira!</p>
      </div>

      {/* Filtros de Categoria */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 ${selectedCategory === cat.id ? 'bg-primary text-primary-foreground border-transparent shadow-md' : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-card border border-border rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group"
          >
            {/* Imagem Placeholder Decorativa com gradiente açaí */}
            <div className="h-44 bg-gradient-to-br from-primary/20 via-purple-900/10 to-primary/5 flex items-center justify-center border-b border-border relative">
              <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                {product.category === 'bebidas' ? '🍹' : '🍧'}
              </span>
              {product.isBase && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-[10px] font-bold tracking-wider uppercase border border-yellow-500/10">
                  <Sparkles size={10} /> Base
                </span>
              )}
            </div>

            {/* Conteúdo */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <span className="font-extrabold text-sm text-primary whitespace-nowrap">
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {product.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded">
                  <Utensils size={10} /> {product.category}
                </span>
                
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all duration-200 active:scale-95 shadow-sm"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Menu;
