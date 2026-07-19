import { useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import {
  Search,
  Edit2,
  X,
  AlertTriangle,
  Check,
  Award,
  User as UserIcon,
  Phone,
  FileText,
} from 'lucide-react';
import {
  useGetCustomersQuery,
  useUpdateCustomerMutation,
} from '../../features/customers/customersApi';
import type { Customer } from '../../features/customers/types';

export const Customers = () => {
  const currentUserRole = useAppSelector((state) => state.auth.user?.role);
  const isGerente = currentUserRole === 'GERENTE';

  // State para busca e paginação
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Buscar clientes
  const { data: customersData, isLoading, refetch } = useGetCustomersQuery({
    page,
    page_size: pageSize,
    search: search || undefined,
  });

  const customers = customersData?.items || [];
  const totalCustomers = customersData?.total || 0;
  const totalPages = customersData?.pages || 0;

  // Mutations
  const [updateCustomer] = useUpdateCustomerMutation();

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form States
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    cpf: '',
    phone: '',
    is_active: true,
    password: '',
  });

  // Feedback Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper CPF formatting
  const formatCPF = (val: string) => {
    const digits = val.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14);
  };

  // Helper Phone formatting
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .substring(0, 14);
    }
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  };

  const handleOpenEditModal = (customer: Customer) => {
    if (!isGerente) return;
    setEditingCustomer(customer);
    setForm({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email,
      cpf: customer.cpf || '',
      phone: customer.phone || '',
      is_active: customer.is_active,
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    // Validar formato do CPF
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(form.cpf)) {
      showToast('O CPF deve estar no formato 000.000.000-00', 'error');
      return;
    }

    const body: any = {
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email,
      cpf: form.cpf,
      phone: form.phone || null,
      is_active: form.is_active,
    };

    if (form.password) {
      body.password = form.password;
    }

    try {
      await updateCustomer({ id: editingCustomer.id, body }).unwrap();
      showToast('Cliente atualizado com sucesso!');
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err?.data?.detail || 'Erro ao atualizar o cliente.', 'error');
    }
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
            Gerenciamento de Clientes
          </h2>
          <p className="text-sm text-muted-foreground">
            Visualize os clientes cadastrados, acompanhe o progresso de fidelidade e edite suas informações de cadastro.
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
          />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, CPF ou telefone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border focus:border-primary/50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/10 shadow-sm"
          />
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cliente</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contato</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Identidade / CPF</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cartão Fidelidade</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                {isGerente && (
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24 text-right">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-4"><div className="h-4 bg-muted rounded w-32 mb-1" /><div className="h-3 bg-muted rounded w-20" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-28" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-12" /></td>
                    {isGerente && <td className="p-4 text-right"><div className="h-8 bg-muted rounded w-10 inline-block" /></td>}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={isGerente ? 6 : 5} className="p-8 text-center text-xs text-muted-foreground">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const stamps = customer.stamp_card?.current_stamps || 0;
                  const totalEarned = customer.stamp_card?.total_stamps_earned || 0;
                  
                  return (
                    <tr key={customer.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold flex">
                            {customer.first_name ? customer.first_name[0].toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-foreground">
                              {customer.first_name || 'Sem'} {customer.last_name || 'Nome'}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-xs">{customer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-muted-foreground space-y-1">
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className="text-muted-foreground/60" />
                            {customer.phone}
                          </div>
                        ) : (
                          <span className="text-[10px] italic text-muted-foreground/50">Sem telefone</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-foreground font-mono">
                        <div className="flex items-center gap-1.5">
                          <FileText size={12} className="text-muted-foreground/60" />
                          {customer.cpf || 'Não cadastrado'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1.5 max-w-[180px]">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-primary flex items-center gap-1">
                              <Award size={12} /> {stamps}/10 Selos
                            </span>
                            <span className="text-muted-foreground">{totalEarned} Acumulados</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((stamps / 10) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          customer.is_active
                            ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                            : 'bg-red-500/10 text-red-700 border border-red-500/20'
                        }`}>
                          {customer.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {isGerente && (
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all inline-flex"
                            title="Editar"
                          >
                            <Edit2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Mostrando <span className="text-foreground font-bold">{customers.length}</span> de{' '}
              <span className="text-foreground font-bold">{totalCustomers}</span> clientes
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-2.5 py-1.5 border border-border bg-card rounded disabled:opacity-50 text-xs font-bold hover:bg-muted"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 border border-border bg-card rounded disabled:opacity-50 text-xs font-bold hover:bg-muted"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO */}
      {isModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scaleIn">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                <UserIcon className="text-primary" size={20} />
                Editar Dados do Cliente
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Nome *</label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Sobrenome *</label>
                  <input
                    type="text"
                    required
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase tracking-wide">E-mail *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">CPF (000.000.000-00) *</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Telefone</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase tracking-wide">Senha (deixe em branco para manter)</label>
                <input
                  type="password"
                  placeholder="Nova senha (mín. 6 caracteres)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5 py-2 border-t border-border/60">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/10"
                />
                <label htmlFor="is_active" className="font-bold text-foreground cursor-pointer uppercase tracking-wide select-none">
                  Cliente Ativo (Permitir acesso ao sistema)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4.5 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all shadow-md shadow-primary/10"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
