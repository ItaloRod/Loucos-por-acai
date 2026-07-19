import { useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Check,
  User as UserIcon,
  Shield,
  Phone,
  FileText,
} from 'lucide-react';
import {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} from '../../features/employees/employeesApi';
import type { User, UserRole } from '../../store/authSlice';

export const Employees = () => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = currentUser?.id;

  // State para busca e paginação
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Buscar funcionários
  const { data: employeesData, isLoading, refetch } = useGetEmployeesQuery({
    page,
    page_size: pageSize,
    search: search || undefined,
  });

  const employees = employeesData?.items || [];
  const totalEmployees = employeesData?.total || 0;
  const totalPages = employeesData?.pages || 0;

  // Mutations
  const [createEmployee] = useCreateEmployeeMutation();
  const [updateEmployee] = useUpdateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);

  // Form States
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    cpf: '',
    phone: '',
    role: 'FUNCIONARIO' as UserRole,
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

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      cpf: '',
      phone: '',
      role: 'FUNCIONARIO',
      is_active: true,
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (employee: User) => {
    setEditingEmployee(employee);
    setForm({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email,
      cpf: employee.cpf || '',
      phone: employee.phone || '',
      role: employee.role,
      is_active: employee.is_active,
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (employee: User) => {
    if (employee.id === currentUserId) {
      showToast('Você não pode desativar sua própria conta de gerente.', 'error');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja desativar o funcionário ${employee.first_name}?`)) {
      return;
    }

    try {
      await deleteEmployee(employee.id).unwrap();
      showToast('Funcionário desativado com sucesso!');
      refetch();
    } catch (err: any) {
      showToast(err?.data?.detail || 'Erro ao desativar o funcionário.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar CPF
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(form.cpf)) {
      showToast('O CPF deve estar no formato 000.000.000-00', 'error');
      return;
    }

    // Validar Senha
    if (!editingEmployee && (!form.password || form.password.length < 6)) {
      showToast('A senha é obrigatória e deve ter pelo menos 6 caracteres', 'error');
      return;
    }

    if (editingEmployee && form.password && form.password.length < 6) {
      showToast('A nova senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }

    const payload: any = {
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email,
      cpf: form.cpf,
      phone: form.phone || null,
      role: form.role,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (editingEmployee) {
        // Impedir autodesativação no envio do formulário de edição
        if (editingEmployee.id === currentUserId && !form.is_active) {
          showToast('Você não pode desativar sua própria conta de gerente.', 'error');
          return;
        }
        
        const updatePayload = { ...payload, is_active: form.is_active };
        await updateEmployee({ id: editingEmployee.id, body: updatePayload }).unwrap();
        showToast('Funcionário atualizado com sucesso!');
      } else {
        await createEmployee(payload).unwrap();
        showToast('Funcionário criado com sucesso!');
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err?.data?.detail || 'Erro ao salvar funcionário.', 'error');
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
            Gerenciamento de Funcionários
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre novos membros da equipe, altere permissões (Funcionário/Gerente) ou desative contas de acesso.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all duration-200 active:scale-95 shadow-md shadow-primary/10 self-start sm:self-auto"
        >
          <Plus size={16} /> Novo Funcionário
        </button>
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

      {/* Tabela de Funcionários */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Membro da Equipe</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cargo / Permissão</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contato</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CPF</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-4"><div className="h-4 bg-muted rounded w-32 mb-1" /><div className="h-3 bg-muted rounded w-20" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-16" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-12" /></td>
                    <td className="p-4 text-right"><div className="h-8 bg-muted rounded w-16 inline-block" /></td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const isSelf = emp.id === currentUserId;
                  
                  return (
                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold flex">
                            {emp.first_name ? emp.first_name[0].toUpperCase() : 'E'}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              {emp.first_name || 'Sem'} {emp.last_name || 'Nome'}
                              {isSelf && (
                                <span className="inline-flex px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[9px] font-bold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-xs">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold ${
                          emp.role === 'GERENTE'
                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                        }`}>
                          <Shield size={10} />
                          {emp.role}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-semibold text-muted-foreground">
                        {emp.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className="text-muted-foreground/60" />
                            {emp.phone}
                          </div>
                        ) : (
                          <span className="text-[10px] italic text-muted-foreground/50">Sem telefone</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-foreground font-mono">
                        <div className="flex items-center gap-1.5">
                          <FileText size={12} className="text-muted-foreground/60" />
                          {emp.cpf}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          emp.is_active
                            ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                            : 'bg-red-500/10 text-red-700 border border-red-500/20'
                        }`}>
                          {emp.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            title="Editar"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg border border-border bg-card transition-all ${
                              isSelf
                                ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                                : 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'
                            }`}
                            title={isSelf ? 'Você não pode desativar a si mesmo' : 'Desativar'}
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
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Mostrando <span className="text-foreground font-bold">{employees.length}</span> de{' '}
              <span className="text-foreground font-bold">{totalEmployees}</span> funcionários
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

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scaleIn">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                <UserIcon className="text-primary" size={20} />
                {editingEmployee ? 'Editar Funcionário' : 'Adicionar Novo Funcionário'}
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

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase tracking-wide">Cargo *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 rounded-xl outline-none text-foreground"
                  >
                    <option value="FUNCIONARIO">Funcionário</option>
                    <option value="GERENTE">Gerente</option>
                  </select>
                </div>
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
                <label className="font-bold text-muted-foreground uppercase tracking-wide">
                  Senha {editingEmployee ? '(deixe em branco para manter)' : '*'}
                </label>
                <input
                  type="password"
                  placeholder={editingEmployee ? 'Nova senha (mín. 6 caracteres)' : 'Senha de acesso (mín. 6 caracteres)'}
                  required={!editingEmployee}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 rounded-xl outline-none"
                />
              </div>

              {editingEmployee && (
                <div className="flex items-center gap-2.5 py-2 border-t border-border/60">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    disabled={editingEmployee.id === currentUserId}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/10 disabled:opacity-50"
                  />
                  <label htmlFor="is_active" className={`font-bold text-foreground cursor-pointer uppercase tracking-wide select-none ${editingEmployee.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    Ativo (Permitir acesso ao sistema)
                  </label>
                </div>
              )}

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
                  {editingEmployee ? 'Salvar Alterações' : 'Criar Funcionário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
