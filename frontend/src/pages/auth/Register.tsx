import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { useRegisterMutation, useLoginMutation, useLazyGetMeQuery } from '../../features/auth/authApi';
import { setCredentials } from '../../store/authSlice';
import { Lock, Mail, Loader2, User as UserIcon, ShieldAlert, Phone } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    cpf: '',
    phone: '',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [registerApi, { isLoading: isRegistering }] = useRegisterMutation();
  const [loginApi, { isLoading: isLoggingIn }] = useLoginMutation();
  const [triggerGetMe, { isLoading: isFetchingUser }] = useLazyGetMeQuery();

  // Máscara simples de CPF (000.000.000-00)
  const formatCPF = (value: string) => {
    const rawValue = value.replace(/\D/g, '');
    let formatted = rawValue;
    if (rawValue.length > 3) formatted = `${rawValue.slice(0, 3)}.${rawValue.slice(3)}`;
    if (rawValue.length > 6) formatted = `${formatted.slice(0, 7)}.${formatted.slice(7)}`;
    if (rawValue.length > 9) formatted = `${formatted.slice(0, 11)}-${formatted.slice(11, 13)}`;
    return formatted.slice(0, 14);
  };

  // Máscara simples de Telefone ((00) 00000-0000)
  const formatPhone = (value: string) => {
    const rawValue = value.replace(/\D/g, '');
    let formatted = rawValue;
    if (rawValue.length > 2) formatted = `(${rawValue.slice(0, 2)}) ${rawValue.slice(2)}`;
    if (rawValue.length > 7) formatted = `${formatted.slice(0, 10)}-${formatted.slice(10, 14)}`;
    return formatted.slice(0, 15);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setFormData({ ...formData, [name]: formatCPF(value) });
    } else if (name === 'phone') {
      setFormData({ ...formData, [name]: formatPhone(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const { email, password, confirmPassword, first_name, last_name, cpf, phone } = formData;

    if (!email || !password || !confirmPassword || !first_name || !last_name || !cpf) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    if (cpf.length < 14) {
      setErrorMsg('Por favor, digite um CPF válido (000.000.000-00).');
      return;
    }

    try {
      // 1. Chamar API de registro (definimos sempre role='CLIENTE' no autocadastro)
      await registerApi({
        email,
        password,
        first_name,
        last_name,
        cpf,
        phone: phone || undefined,
        role: 'CLIENTE',
      }).unwrap();

      // 2. Auto-login após cadastro
      await loginApi({ email, password }).unwrap();

      // 3. Buscar dados do perfil
      const userData = await triggerGetMe().unwrap();
      dispatch(setCredentials(userData));

      // 4. Redirecionar cliente
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Falha no cadastro:', err);
      if (err.data && err.data.detail) {
        setErrorMsg(err.data.detail);
      } else {
        setErrorMsg('Erro ao cadastrar conta. CPF ou E-mail já podem estar em uso.');
      }
    }
  };

  const isLoading = isRegistering || isLoggingIn || isFetchingUser;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-purple-900/10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8 bg-card p-8 rounded-2xl border border-border shadow-xl shadow-primary/5 transition-all duration-300 hover:shadow-primary/10">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-5xl mb-3 animate-pulse">🍧</span>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Crie sua Conta
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre-se para acumular selos e fazer pedidos
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-shake">
            {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first_name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
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
                  disabled={isLoading}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div>
              <label htmlFor="last_name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
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
                  disabled={isLoading}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cpf" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                CPF *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <ShieldAlert size={18} />
                </div>
                <input
                  id="cpf"
                  name="cpf"
                  type="text"
                  required
                  value={formData.cpf}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Celular (Opcional)
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
                  disabled={isLoading}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="(85) 99999-9999"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Endereço de E-mail *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <Mail size={18} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="seuemail@exemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Senha *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="Mínimo 6 dígitos"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Confirmar Senha *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Lock size={18} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="block w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="Repita a senha"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                'Cadastrar e Entrar'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Já possui uma conta?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Fazer Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
