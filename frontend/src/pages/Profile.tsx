import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { setCredentials } from '../store/authSlice';
import {
  useGetMeQuery,
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
} from '../features/auth/authApi';
import {
  User as UserIcon,
  Mail,
  ShieldAlert,
  Phone,
  Lock,
  Loader2,
  Save,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  Star,
  X,
} from 'lucide-react';

export const Profile = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { data: latestUser, refetch: refetchUser } = useGetMeQuery();

  // Buscar endereços
  const { data: addresses = [], refetch: refetchAddresses } = useGetAddressesQuery();

  // Mutations de endereço
  const [createAddress] = useCreateAddressMutation();
  const [updateAddress] = useUpdateAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();

  // State do formulário de perfil
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // States do Modal de Endereço
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    is_default: false,
  });

  // State de Toast local
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (latestUser) {
      setFormData({
        first_name: latestUser.first_name || '',
        last_name: latestUser.last_name || '',
        phone: latestUser.phone || '',
        password: '',
        confirmPassword: '',
      });
      // Sincronizar store do Redux caso haja atualizações externas
      dispatch(setCredentials(latestUser));
    }
  }, [latestUser, dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const { first_name, last_name, phone, password, confirmPassword } = formData;

    if (!first_name || !last_name) {
      setMessage({ text: 'Nome e Sobrenome são obrigatórios.', type: 'error' });
      return;
    }

    if (password && password !== confirmPassword) {
      setMessage({ text: 'As senhas não coincidem.', type: 'error' });
      return;
    }

    if (password && password.length < 6) {
      setMessage({ text: 'A nova senha precisa ter pelo menos 6 caracteres.', type: 'error' });
      return;
    }

    setIsUpdating(true);
    try {
      const tokenUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api/v1';
      // Realizar PUT request para /users/me
      const response = await fetch(`${tokenUrl}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name,
          last_name,
          phone: phone || undefined,
          password: password || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Falha ao atualizar dados.');
      }

      const updatedUser = await response.json();
      dispatch(setCredentials(updatedUser));
      refetchUser(); // Recarregar dados via query RTK
      setMessage({ text: 'Seus dados foram atualizados com sucesso!', type: 'success' });

      // Limpar campos de senha
      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar perfil.';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  // CEP formatter & ViaCEP auto-fill
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = raw.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
    setAddressForm((prev) => ({ ...prev, zip_code: formatted }));

    if (formatted.length === 9) {
      try {
        const cepDigits = formatted.replace(/\D/g, '');
        const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddressForm((prev) => ({
            ...prev,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          }));
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      }
    }
  };

  // Open Modal Helpers
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      zip_code: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      is_default: false,
    });
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      zip_code: addr.zip_code || '',
      street: addr.street || '',
      number: addr.number || '',
      complement: addr.complement || '',
      neighborhood: addr.neighborhood || '',
      city: addr.city || '',
      state: addr.state || '',
      is_default: addr.is_default || false,
    });
    setIsAddressModalOpen(true);
  };

  // Address Submit (Add / Edit)
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar CEP
    const cepRegex = /^\d{5}-\d{3}$/;
    if (!cepRegex.test(addressForm.zip_code)) {
      showToast('O CEP deve estar no formato 00000-000', 'error');
      return;
    }

    if (addressForm.state.length !== 2) {
      showToast('O estado (UF) deve ter 2 caracteres (Ex: SP)', 'error');
      return;
    }

    const payload = {
      zip_code: addressForm.zip_code,
      street: addressForm.street,
      number: addressForm.number,
      complement: addressForm.complement || null,
      neighborhood: addressForm.neighborhood,
      city: addressForm.city,
      state: addressForm.state.toUpperCase(),
      is_default: addressForm.is_default,
    };

    try {
      if (editingAddressId) {
        await updateAddress({ id: editingAddressId, body: payload }).unwrap();
        showToast('Endereço atualizado com sucesso!');
      } else {
        await createAddress(payload).unwrap();
        showToast('Endereço adicionado com sucesso!');
      }
      setIsAddressModalOpen(false);
      refetchAddresses();
      refetchUser(); // Atualiza a query do perfil se necessário
    } catch (err: any) {
      showToast(err?.data?.detail || 'Erro ao salvar o endereço.', 'error');
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este endereço?')) return;
    try {
      await deleteAddress(id).unwrap();
      showToast('Endereço excluído com sucesso!');
      refetchAddresses();
      refetchUser();
    } catch (err: any) {
      showToast(err?.data?.detail || 'Erro ao excluir o endereço.', 'error');
    }
  };

  // Set default Address
  const handleSetDefaultAddress = async (addr: any) => {
    try {
      await updateAddress({ id: addr.id, body: { is_default: true } }).unwrap();
      showToast('Endereço padrão atualizado!');
      refetchAddresses();
      refetchUser();
    } catch (err: any) {
      showToast(err?.data?.detail || 'Erro ao definir endereço padrão.', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-2xl mx-auto relative">
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

      {/* Intro */}
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Meu Perfil</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie suas informações cadastrais, segurança e endereços de entrega.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-500' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}
        >
          {message.text}
        </div>
      )}

      {/* Formulário do Perfil */}
      <form
        onSubmit={handleSubmitProfile}
        className="bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm space-y-6"
      >
        <div className="space-y-4">
          <h3 className="font-bold text-base text-foreground border-b border-border/50 pb-2">
            Informações Cadastrais
          </h3>

          {/* CPF e E-mail */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                CPF (Não alterável)
              </span>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                  <ShieldAlert size={18} />
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={user?.cpf || ''}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/60 border border-border rounded-xl text-muted-foreground cursor-not-allowed text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                E-mail (Não alterável)
              </span>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                  <Mail size={18} />
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={user?.email || ''}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/60 border border-border rounded-xl text-muted-foreground cursor-not-allowed text-sm"
                />
              </div>
            </div>
          </div>

          {/* Nome e Sobrenome */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="first_name"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
              >
                Nome *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <UserIcon size={18} />
                </div>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={handleInputChange}
                  disabled={isUpdating}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="last_name"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
              >
                Sobrenome *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <UserIcon size={18} />
                </div>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={handleInputChange}
                  disabled={isUpdating}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Telefone */}
          <div>
            <label
              htmlFor="phone"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
            >
              Celular
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <Phone size={18} />
              </div>
              <input
                id="phone"
                name="phone"
                type="text"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={isUpdating}
                className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </div>

        {/* Segurança (Opcional) */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <h3 className="font-bold text-base text-foreground pb-2">Segurança (Opcional)</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="password"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
              >
                Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isUpdating}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Mínimo 6 dígitos"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
              >
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Lock size={18} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isUpdating}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Repita a senha"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isUpdating}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all duration-200 shadow-md shadow-primary/10 active:scale-95 disabled:opacity-60"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save size={16} /> Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>

      {/* SEÇÃO DE ENDEREÇOS */}
      <div className="bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <MapPin className="text-primary animate-pulse" size={20} />
            Endereços de Entrega
          </h3>
          <button
            onClick={handleOpenAddAddress}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all"
          >
            <Plus size={14} /> Novo Endereço
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Você não possui endereços cadastrados. Adicione um endereço para facilitar as entregas!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 relative group transition-all duration-200 ${
                  addr.is_default
                    ? 'border-primary/40 bg-primary/[0.02]'
                    : 'border-border bg-card/50 hover:border-border/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-xs text-foreground truncate block pr-8">
                      {addr.street}, {addr.number}
                    </span>
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-extrabold uppercase border border-primary/20">
                        Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground space-y-0.5 leading-relaxed">
                    {addr.complement && <span className="block">Compl.: {addr.complement}</span>}
                    <span className="block">Bairro: {addr.neighborhood}</span>
                    <span className="block">
                      {addr.city} - {addr.state}
                    </span>
                    <span className="block font-mono">CEP: {addr.zip_code}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[10px] font-bold">
                  {!addr.is_default ? (
                    <button
                      onClick={() => handleSetDefaultAddress(addr)}
                      className="text-muted-foreground hover:text-primary transition-all flex items-center gap-1"
                    >
                      <Star size={12} /> Tornar Padrão
                    </button>
                  ) : (
                    <span className="text-primary flex items-center gap-1">
                      <Star size={12} fill="currentColor" /> Endereço Padrão
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditAddress(addr)}
                      className="text-muted-foreground hover:text-foreground transition-all p-1"
                      title="Editar"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-destructive hover:text-destructive/80 transition-all p-1"
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE ENDEREÇO */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[95vh] animate-scaleIn">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <MapPin className="text-primary" size={18} />
                {editingAddressId ? 'Editar Endereço' : 'Adicionar Novo Endereço'}
              </h3>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddressSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">CEP (00000-000) *</label>
                  <input
                    type="text"
                    required
                    placeholder="00000-000"
                    value={addressForm.zip_code}
                    onChange={handleCepChange}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">UF / Estado *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    placeholder="Ex: SP"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none uppercase font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Logradouro / Rua *</label>
                  <input
                    type="text"
                    required
                    placeholder="Av. Paulista"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Número *</label>
                  <input
                    type="text"
                    required
                    placeholder="1000"
                    value={addressForm.number}
                    onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Bairro *</label>
                  <input
                    type="text"
                    required
                    placeholder="Centro"
                    value={addressForm.neighborhood}
                    onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Cidade *</label>
                  <input
                    type="text"
                    required
                    placeholder="São Paulo"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase tracking-wide">Complemento</label>
                <input
                  type="text"
                  placeholder="Apto 42, Bloco B"
                  value={addressForm.complement}
                  onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5 py-2 border-t border-border/60">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/10 cursor-pointer"
                />
                <label htmlFor="is_default" className="font-bold text-foreground cursor-pointer uppercase tracking-wide select-none">
                  Definir como endereço padrão
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4.5 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all shadow-md shadow-primary/10"
                >
                  {editingAddressId ? 'Salvar Alterações' : 'Adicionar Endereço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

