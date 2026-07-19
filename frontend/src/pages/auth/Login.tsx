import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { useLoginMutation, useLazyGetMeQuery } from '../../features/auth/authApi';
import { setCredentials } from '../../store/authSlice';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [loginApi, { isLoading: isLoggingIn }] = useLoginMutation();
  const [triggerGetMe, { isLoading: isFetchingUser }] = useLazyGetMeQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    try {
      // 1. Executar login (salvará cookies access_token e refresh_token)
      await loginApi({ email, password }).unwrap();

      // 2. Buscar dados do usuário logado via GET /users/me
      const userData = await triggerGetMe().unwrap();

      // 3. Salvar na Store do Redux
      dispatch(setCredentials(userData));

      // 4. Redirecionar baseado no papel
      if (userData.role === 'CLIENTE') {
        navigate('/', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error('Falha no login:', err);
      if (err.status === 429) {
        setErrorMsg('Muitas tentativas! Por favor, aguarde um minuto e tente novamente.');
      } else if (err.data && err.data.detail) {
        setErrorMsg(err.data.detail);
      } else {
        setErrorMsg('Falha ao conectar-se ao servidor. Tente novamente mais tarde.');
      }
    }
  };

  const isLoading = isLoggingIn || isFetchingUser;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-purple-900/10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border border-border shadow-xl shadow-primary/5 transition-all duration-300 hover:shadow-primary/10">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-5xl mb-3 animate-bounce">🍧</span>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Bem-vindo de volta!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesse sua conta do Loucos por Açaí
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-shake">
            {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Endereço de E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Mail size={18} />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="block w-full pl-10 pr-4 py-3 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 disabled:opacity-60"
                  placeholder="seuemail@exemplo.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="block w-full pl-10 pr-4 py-3 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 disabled:opacity-60"
                  placeholder="Sua senha secreta"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Ainda não tem uma conta?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Cadastre-se aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
