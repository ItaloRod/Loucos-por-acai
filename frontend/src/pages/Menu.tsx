import { useState } from 'react';
import { Utensils, Plus, Sparkles, Search, SlidersHorizontal } from 'lucide-react';
import {
  useGetCategoriesQuery,
  useGetProductsQuery,
} from '../features/catalog/catalogApi';

export const Menu = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  // Buscar categorias do backend
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategoriesQuery();

  // Preparar os parâmetros de busca de produtos
  const productParams = {
    category_id: selectedCategory !== 'todos' ? selectedCategory : undefined,
    search: searchQuery ? searchQuery : undefined,
    page,
    page_size: pageSize,
  };

  // Buscar produtos do backend
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    isFetching: isFetchingProducts,
  } = useGetProductsQuery(productParams);

  const products = productsData?.items || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = productsData?.pages || 0;

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setPage(1); // Reiniciar para a primeira página
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Intro */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase border border-primary/20">
            <Sparkles size={12} /> Sabores Originais
          </div>
          <h2 className="text-4xl font-extrabold text-foreground tracking-tight sm:text-5xl">
            Nosso Cardápio
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">
            Navegue por nossas deliciosas opções e monte o açaí do seu jeito. Ingredientes frescos e premium selecionados com carinho!
          </p>
        </div>

        {/* Barra de Busca Premium */}
        <div className="relative w-full md:w-80 group">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-200"
          />
          <input
            type="text"
            placeholder="Buscar sabor ou adicional..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-card hover:bg-card/85 focus:bg-card border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl text-sm transition-all duration-200 shadow-sm outline-none"
          />
        </div>
      </div>

      {/* Filtros de Categoria */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <SlidersHorizontal size={14} /> Categorias
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange('todos')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wide border transition-all duration-300 ${
              selectedCategory === 'todos'
                ? 'bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/25 scale-105'
                : 'bg-card border-border text-muted-foreground hover:bg-muted/70 hover:text-foreground'
            }`}
          >
            Todos
          </button>
          
          {isLoadingCategories ? (
            // Skeleton para categorias
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-full" />
            ))
          ) : (
            categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wide border transition-all duration-300 ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/25 scale-105'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Grid de Produtos com Tratamento de Estados */}
      {isLoadingProducts ? (
        // Grid de Skeletons Premium
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl h-80 flex flex-col justify-between overflow-hidden shadow-sm animate-pulse"
            >
              <div className="h-44 bg-muted" />
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-muted rounded w-1/4" />
                  <div className="h-8 bg-muted rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        // Estado Vazio Estilizado
        <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
          <span className="text-6xl block">🍧</span>
          <h3 className="text-xl font-bold text-foreground">Nenhum produto encontrado</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? 'Não encontramos nenhum produto correspondente à sua busca. Tente buscar outros termos.'
              : 'Esta categoria ainda não possui produtos ativos cadastrados.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/95 transition-all"
            >
              Limpar Busca
            </button>
          )}
        </div>
      ) : (
        // Grid de Produtos Real
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const categoryObj = categories.find((c) => c.id === product.category_id);
              
              return (
                <div
                  key={product.id}
                  className="bg-card border border-border rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  {/* Imagem do Produto */}
                  <div className="h-44 bg-gradient-to-br from-primary/10 via-purple-900/5 to-primary/5 flex items-center justify-center border-b border-border relative overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={`${(import.meta.env.VITE_API_URL as string)?.replace('/api/v1', '') || 'http://localhost:8000'}${product.image_url}`}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback se falhar
                          e.currentTarget.style.display = 'none';
                          const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                          if (sibling) sibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    {/* Fallback Icon / Emoji Decorativo */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-300"
                      style={{ display: product.image_url ? 'none' : 'flex' }}
                    >
                      {product.is_topping ? '🍓' : categoryObj?.slug.includes('bebida') || product.name.toLowerCase().includes('suco') ? '🍹' : '🍧'}
                    </div>

                    {/* Badge de Destaque */}
                    {product.is_base && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/15 text-yellow-600 dark:text-yellow-500 text-[10px] font-bold tracking-wider uppercase border border-yellow-500/20 backdrop-blur-sm">
                        <Sparkles size={10} /> Base
                      </span>
                    )}
                  </div>

                  {/* Detalhes do Produto */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                        <span className="font-extrabold text-sm text-primary whitespace-nowrap">
                          R$ {Number(product.price).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {product.description || 'Nenhuma descrição fornecida para este item delicioso.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md">
                        <Utensils size={10} /> {categoryObj?.name || 'Geral'}
                      </span>

                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all duration-200 active:scale-95 shadow-sm hover:shadow-primary/20 shadow-transparent hover:shadow-md"
                      >
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-border bg-card rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                Anterior
              </button>
              
              <div className="text-xs text-muted-foreground font-semibold px-4">
                Página <span className="text-foreground font-bold">{page}</span> de{' '}
                <span className="text-foreground font-bold">{totalPages}</span> ({totalProducts}{' '}
                {totalProducts === 1 ? 'item' : 'itens'})
              </div>

              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-border bg-card rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Menu;
