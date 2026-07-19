import { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Layers,
  Upload,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadImageMutation,
} from '../../features/catalog/catalogApi';
import type { Product, Category } from '../../features/catalog/types';

export const ProductsAdmin = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  
  // States para busca e paginação de produtos
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('todos');
  const [productPage, setProductPage] = useState(1);
  const pageSize = 10;

  // Buscar dados
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategoriesQuery();
  const { data: productsData, isLoading: isLoadingProducts, refetch: refetchProducts } = useGetProductsQuery({
    category_id: selectedCategoryFilter !== 'todos' ? selectedCategoryFilter : undefined,
    search: productSearch ? productSearch : undefined,
    page: productPage,
    page_size: pageSize,
    include_unavailable: true,
  });

  const products = productsData?.items || [];
  const totalProducts = productsData?.total || 0;
  const totalProductPages = productsData?.pages || 0;

  // Mutations
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const [uploadImage] = useUploadImageMutation();

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form States para Produto
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    category_id: '',
    is_available: true,
    is_topping: false,
    is_base: false,
    display_order: 0,
    tags: '',
    image_url: '',
  });

  // Form States para Categoria
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: '',
    display_order: 0,
    is_active: true,
    image_url: '',
  });

  // Upload image states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Feedback Messages
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper para preencher formulário de edição de produto
  const handleOpenProductModal = (product: Product | null = null) => {
    setUploadError('');
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        price: String(product.price),
        category_id: product.category_id,
        is_available: product.is_available,
        is_topping: product.is_topping,
        is_base: product.is_base,
        display_order: product.display_order,
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        image_url: product.image_url || '',
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        slug: '',
        description: '',
        price: '',
        category_id: categories[0]?.id || '',
        is_available: true,
        is_topping: false,
        is_base: false,
        display_order: 0,
        tags: '',
        image_url: '',
      });
    }
    setIsProductModalOpen(true);
  };

  // Helper para preencher formulário de edição de categoria
  const handleOpenCategoryModal = (category: Category | null = null) => {
    setUploadError('');
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parent_id: category.parent_id || '',
        display_order: category.display_order,
        is_active: category.is_active,
        image_url: category.image_url || '',
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        slug: '',
        description: '',
        parent_id: '',
        display_order: 0,
        is_active: true,
        image_url: '',
      });
    }
    setIsCategoryModalOpen(true);
  };

  // Auto-gerar slug a partir do nome
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleProductNameChange = (name: string) => {
    setProductForm((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleCategoryNameChange = (name: string) => {
    setCategoryForm((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  // Handle Image File Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar formato
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setUploadError('Formato inválido. Use JPG, PNG, WEBP ou GIF.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await uploadImage(formData).unwrap();
      if (activeTab === 'products') {
        setProductForm((prev) => ({ ...prev, image_url: response.image_url }));
      } else {
        setCategoryForm((prev) => ({ ...prev, image_url: response.image_url }));
      }
      showToast('Imagem enviada com sucesso!');
    } catch (err: any) {
      setUploadError(err?.data?.detail || 'Erro ao enviar a imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  // Submissão do Produto
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedTags = productForm.tags
      ? productForm.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    const body = {
      name: productForm.name,
      slug: productForm.slug,
      description: productForm.description || null,
      price: Number(productForm.price),
      category_id: productForm.category_id,
      is_available: productForm.is_available,
      is_topping: productForm.is_topping,
      is_base: productForm.is_base,
      display_order: Number(productForm.display_order),
      tags: formattedTags,
      image_url: productForm.image_url || null,
    };

    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct.id, body }).unwrap();
        showToast('Produto atualizado com sucesso!');
      } else {
        await createProduct(body).unwrap();
        showToast('Produto criado com sucesso!');
      }
      setIsProductModalOpen(false);
      setProductPage(1);
    } catch (err: any) {
      showToast(err?.data?.detail || 'Erro ao salvar o produto.', 'error');
    }
  };

  // Submissão da Categoria
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const body = {
      name: categoryForm.name,
      slug: categoryForm.slug,
      description: categoryForm.description || null,
      parent_id: categoryForm.parent_id || null,
      display_order: Number(categoryForm.display_order),
      is_active: categoryForm.is_active,
      image_url: categoryForm.image_url || null,
    };

    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, body }).unwrap();
        showToast('Categoria atualizada com sucesso!');
      } else {
        await createCategory(body).unwrap();
        showToast('Categoria criada com sucesso!');
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      showToast(err?.data?.detail || 'Erro ao salvar a categoria.', 'error');
    }
  };

  // Deleção de Produto
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir logicamente este produto?')) return;
    try {
      await deleteProduct(id).unwrap();
      showToast('Produto removido com sucesso!');
      refetchProducts();
    } catch (err: any) {
      showToast(err?.data?.detail || 'Erro ao excluir o produto.', 'error');
    }
  };

  // Deleção de Categoria
  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await deleteCategory(id).unwrap();
      showToast('Categoria excluída com sucesso!');
    } catch (err: any) {
      showToast(err?.data?.detail || 'Erro ao excluir a categoria.', 'error');
    }
  };

  const getBaseImageUrl = () => {
    return (import.meta.env.VITE_API_URL as string)?.replace('/api/v1', '') || 'http://localhost:8000';
  };

  return (
    <div className="space-y-8 pb-12 relative animate-fadeIn">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl border shadow-xl flex items-center gap-2.5 transition-all duration-300 animate-slideUp ${
            toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400'
          }`}
        >
          {toast.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
            Gerenciamento do Catálogo
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre e edite produtos, configure categorias de exibição e gerencie imagens.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'products' ? (
            <button
              onClick={() => handleOpenProductModal()}
              className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all duration-200 active:scale-95 shadow-md shadow-primary/10"
            >
              <Plus size={16} /> Novo Produto
            </button>
          ) : (
            <button
              onClick={() => handleOpenCategoryModal()}
              className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all duration-200 active:scale-95 shadow-md shadow-primary/10"
            >
              <Plus size={16} /> Nova Categoria
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            activeTab === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package size={16} /> Produtos ({totalProducts})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            activeTab === 'categories'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers size={16} /> Categorias ({categories.length})
        </button>
      </div>

      {/* CONTROLE DOS PRODUTOS */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Barra de Filtros */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
              />
              <input
                type="text"
                placeholder="Buscar produto pelo nome ou descrição..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border focus:border-primary/50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/10 shadow-sm"
              />
            </div>
            
            <div className="w-full md:w-56">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  setProductPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-card border border-border focus:border-primary/50 rounded-xl text-xs outline-none shadow-sm text-foreground"
              >
                <option value="todos">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela de Produtos */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16">Foto</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Produto</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categoria</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preço</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Regras</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estoque</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoadingProducts ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="p-4"><div className="h-10 w-10 bg-muted rounded-lg" /></td>
                        <td className="p-4"><div className="h-4 bg-muted rounded w-24 mb-1" /><div className="h-3 bg-muted rounded w-32" /></td>
                        <td className="p-4"><div className="h-4 bg-muted rounded w-16" /></td>
                        <td className="p-4"><div className="h-4 bg-muted rounded w-12" /></td>
                        <td className="p-4"><div className="h-4 bg-muted rounded w-20" /></td>
                        <td className="p-4"><div className="h-4 bg-muted rounded w-8" /></td>
                        <td className="p-4"><div className="h-4 bg-muted rounded w-12" /></td>
                        <td className="p-4 text-right"><div className="h-8 bg-muted rounded w-16 inline-block" /></td>
                      </tr>
                    ))
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                        Nenhum produto cadastrado com os filtros ativos.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => {
                      const productCat = categories.find((c) => c.id === product.category_id);
                      const isLowStock = product.inventory && product.inventory.quantity <= product.inventory.minimum_threshold;
                      
                      return (
                        <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="h-10 w-10 bg-muted/40 rounded-lg overflow-hidden border border-border flex items-center justify-center text-lg">
                              {product.image_url ? (
                                <img
                                  src={`${getBaseImageUrl()}${product.image_url}`}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                product.is_topping ? '🍓' : '🍧'
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-xs text-foreground">{product.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate max-w-xs">{product.slug}</div>
                          </td>
                          <td className="p-4 text-xs font-semibold text-muted-foreground">
                            {productCat?.name || 'Geral'}
                          </td>
                          <td className="p-4 text-xs font-bold text-foreground">
                            R$ {Number(product.price).toFixed(2)}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {product.is_base && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-[9px] font-extrabold uppercase tracking-wide border border-yellow-500/10">
                                  Base
                                </span>
                              )}
                              {product.is_topping && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-600 dark:text-pink-500 text-[9px] font-extrabold uppercase tracking-wide border border-pink-500/10">
                                  Topping
                                </span>
                              )}
                              {!product.is_base && !product.is_topping && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-500 text-[9px] font-extrabold uppercase tracking-wide border border-blue-500/10">
                                  Pronto
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {product.inventory ? (
                              <span className={`inline-flex items-center gap-1 text-xs font-bold ${isLowStock ? 'text-red-500' : 'text-foreground'}`}>
                                {isLowStock && <AlertTriangle size={12} />}
                                {product.inventory.quantity} {product.inventory.unit}s
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                              product.is_available
                                ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                                : 'bg-red-500/10 text-red-700 border border-red-500/20'
                            }`}>
                              {product.is_available ? 'Ativo' : 'Pausado'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenProductModal(product)}
                                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                title="Editar"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-1.5 rounded-lg border border-border bg-card text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                title="Excluir"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalProductPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Mostrando <span className="text-foreground font-bold">{products.length}</span> de{' '}
                  <span className="text-foreground font-bold">{totalProducts}</span> produtos
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setProductPage((p) => Math.max(p - 1, 1))}
                    disabled={productPage === 1}
                    className="px-2.5 py-1.5 border border-border bg-card rounded disabled:opacity-50 text-xs font-bold hover:bg-muted"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setProductPage((p) => Math.min(p + 1, totalProductPages))}
                    disabled={productPage === totalProductPages}
                    className="px-2.5 py-1.5 border border-border bg-card rounded disabled:opacity-50 text-xs font-bold hover:bg-muted"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTROLE DAS CATEGORIAS */}
      {activeTab === 'categories' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16">Ícone</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categoria</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descrição</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ordem</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pai</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoadingCategories ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="p-4"><div className="h-10 w-10 bg-muted rounded-lg" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-20 mb-1" /><div className="h-3 bg-muted rounded w-24" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-44" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-6" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-16" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-10" /></td>
                      <td className="p-4 text-right"><div className="h-8 bg-muted rounded w-16 inline-block" /></td>
                    </tr>
                  ))
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                      Nenhuma categoria cadastrada.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => {
                    const parentCat = categories.find((c) => c.id === category.parent_id);
                    return (
                      <tr key={category.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div className="h-10 w-10 bg-muted/40 rounded-lg overflow-hidden border border-border flex items-center justify-center text-lg">
                            {category.image_url ? (
                              <img
                                src={`${getBaseImageUrl()}${category.image_url}`}
                                alt={category.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              '📁'
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-xs text-foreground">{category.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{category.slug}</div>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground max-w-sm truncate">
                          {category.description || '-'}
                        </td>
                        <td className="p-4 text-xs font-mono font-bold text-foreground">
                          {category.display_order}
                        </td>
                        <td className="p-4 text-xs font-semibold text-muted-foreground">
                          {parentCat?.name || '-'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            category.is_active
                              ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                              : 'bg-red-500/10 text-red-700 border border-red-500/20'
                          }`}>
                            {category.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenCategoryModal(category)}
                              className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                              title="Editar"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="p-1.5 rounded-lg border border-border bg-card text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE PRODUTO */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scaleIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-foreground">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleProductSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome do Produto */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Açaí com Leite Condensado"
                    value={productForm.name}
                    onChange={(e) => handleProductNameChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Slug (Identificador URL) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: acai-leite-condensado"
                    value={productForm.slug}
                    onChange={(e) => setProductForm((p) => ({ ...p, slug: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none font-mono"
                  />
                </div>

                {/* Preço */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Preço Base (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 18.50"
                    value={productForm.price}
                    onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                  />
                </div>

                {/* Categoria */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Categoria *</label>
                  <select
                    required
                    value={productForm.category_id}
                    onChange={(e) => setProductForm((p) => ({ ...p, category_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 rounded-xl outline-none text-foreground"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase tracking-wide">Descrição</label>
                <textarea
                  placeholder="Descreva este item com detalhes e curiosidades que chamem atenção do cliente..."
                  value={productForm.description}
                  onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tags */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    placeholder="Ex: vegano, sem-gluten, zero-lactose"
                    value={productForm.tags}
                    onChange={(e) => setProductForm((p) => ({ ...p, tags: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                  />
                </div>

                {/* Ordem de Exibição */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Ordem de Exibição</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={productForm.display_order}
                    onChange={(e) => setProductForm((p) => ({ ...p, display_order: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              {/* Opções Booleanas */}
              <div className="bg-muted/30 border border-border/50 p-4 rounded-xl space-y-3.5">
                <h4 className="font-bold text-foreground">Regras e Disponibilidade</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.is_available}
                      onChange={(e) => setProductForm((p) => ({ ...p, is_available: e.target.checked }))}
                      className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground block text-[11px]">Disponível para venda</span>
                      <span className="text-[10px] text-muted-foreground">Clientes podem ver e comprar</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.is_base}
                      onChange={(e) => setProductForm((p) => ({ ...p, is_base: e.target.checked }))}
                      className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground block text-[11px]">É um Açaí Base</span>
                      <span className="text-[10px] text-muted-foreground">Usado no monte seu açaí</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.is_topping}
                      onChange={(e) => setProductForm((p) => ({ ...p, is_topping: e.target.checked }))}
                      className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground block text-[11px]">É um Topping/Adicional</span>
                      <span className="text-[10px] text-muted-foreground">Mostrado como acompanhamento</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Upload de Imagem */}
              <div className="space-y-2">
                <label className="font-bold text-muted-foreground uppercase tracking-wide block">Foto do Produto</label>
                <div className="flex flex-col sm:flex-row items-center gap-4 border border-border border-dashed p-4 rounded-xl bg-muted/10">
                  <div className="h-20 w-20 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden text-2xl relative">
                    {productForm.image_url ? (
                      <img
                        src={`${getBaseImageUrl()}${productForm.image_url}`}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      '📸'
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="relative">
                      <input
                        type="file"
                        id="prod-image"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="prod-image"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-card hover:bg-muted border border-border rounded-lg font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Upload size={14} /> {isUploading ? 'Enviando...' : 'Carregar Imagem'}
                      </label>
                    </div>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP de até 5MB.</p>
                    {uploadError && <p className="text-[10px] text-red-500 font-semibold">{uploadError}</p>}
                    {productForm.image_url && (
                      <p className="text-[9px] text-green-500 font-mono font-bold truncate max-w-xs">{productForm.image_url}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4.5 py-2.5 border border-border rounded-xl font-bold hover:bg-muted transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/10 transition-all active:scale-95"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CATEGORIA */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col animate-scaleIn">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-foreground">
                {editingCategory ? 'Editar Categoria' : 'Cadastrar Nova Categoria'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="p-6 space-y-5 text-xs">
              {/* Nome */}
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase tracking-wide">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Açaí na Tigela"
                  value={categoryForm.name}
                  onChange={(e) => handleCategoryNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase tracking-wide">Slug *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: acai-na-tigela"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, slug: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Categoria Pai */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Categoria Pai</label>
                  <select
                    value={categoryForm.parent_id}
                    onChange={(e) => setCategoryForm((p) => ({ ...p, parent_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 rounded-xl outline-none text-foreground"
                  >
                    <option value="">Nenhuma (Categoria Raiz)</option>
                    {categories
                      .filter((c) => !editingCategory || c.id !== editingCategory.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Ordem de Exibição */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Ordem de Exibição</label>
                  <input
                    type="number"
                    value={categoryForm.display_order}
                    onChange={(e) => setCategoryForm((p) => ({ ...p, display_order: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase tracking-wide">Descrição</label>
                <textarea
                  placeholder="Breve descrição da categoria..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                />
              </div>

              {/* Status */}
              <label className="flex items-center gap-2 cursor-pointer bg-muted/20 border border-border/40 p-3 rounded-xl">
                <input
                  type="checkbox"
                  checked={categoryForm.is_active}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block text-[11px]">Categoria Ativa</span>
                  <span className="text-[10px] text-muted-foreground">Mostrada no cardápio de clientes se marcado</span>
                </div>
              </label>

              {/* Upload de Imagem */}
              <div className="space-y-2">
                <label className="font-bold text-muted-foreground uppercase tracking-wide block">Foto da Categoria</label>
                <div className="flex items-center gap-4 border border-border border-dashed p-4 rounded-xl bg-muted/10">
                  <div className="h-16 w-16 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden text-2xl relative">
                    {categoryForm.image_url ? (
                      <img
                        src={`${getBaseImageUrl()}${categoryForm.image_url}`}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      '📁'
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="relative">
                      <input
                        type="file"
                        id="cat-image"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="cat-image"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-lg font-bold cursor-pointer transition-all active:scale-95"
                      >
                        <Upload size={13} /> {isUploading ? 'Enviando...' : 'Carregar Imagem'}
                      </label>
                    </div>
                    {uploadError && <p className="text-[10px] text-red-500 font-semibold">{uploadError}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4.5 py-2.5 border border-border rounded-xl font-bold hover:bg-muted transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/10 transition-all active:scale-95"
                >
                  {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsAdmin;
