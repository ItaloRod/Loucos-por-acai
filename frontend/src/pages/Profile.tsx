import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { setCredentials } from '../store/authSlice';
import { useGetMeQuery } from '../features/auth/authApi';
import { apiSlice } from '../store/apiSlice';
import { User as UserIcon, Mail, ShieldAlert, Phone, Lock, Loader2, Save } from 'lucide-react';

export const Profile = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { data: latestUser, refetch } = useGetMeQuery();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
          // O fetch inclui credenciais de cookies se configurado
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
      refetch(); // Recarregar dados via query RTK
      setMessage({ text: 'Seus dados foram atualizados com sucesso!', type: 'success' });
      
      // Limpar campos de senha
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || 'Falha ao atualizar perfil.', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-2xl mx-auto">
      {/* Intro */}
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Meu Perfil</h2>
        <p className="text-muted-foreground text-sm">Gerencie suas informações cadastrais e segurança da conta.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-500' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
          {message.text}
        </div>
      )}

      {/* Formulário do Perfil */}
      <form onSubmit={handleSubmit} className="bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
        <div className="space-y-4">
          <h3 className="font-bold text-base text-foreground border-b border-border/50 pb-2">Informações Cadastrais</h3>

          {/* CPF e E-mail (Apenas leitura por convenção de segurança) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">CPF (Não alterável)</span>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/50">
                  <ShieldAlert size={18} />
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={user?.cpf || ''}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/60 border border-border rounded-xl text-muted-foreground cursor-not-allowed text-sm"
                />
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">E-mail (Não alterável)</span>
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
              <label htmlFor="first_name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Nome *</label>
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
              <label htmlFor="last_name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Sobrenome *</label>
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
            <label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Celular</label>
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

        <div className="space-y-4 pt-4 border-t border-border/50">
          <h3 className="font-bold text-base text-foreground pb-2">Segurança (Opcional)</h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Nova Senha</label>
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
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Confirmar Nova Senha</label>
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
    </div>
  );
};

export default Profile;
