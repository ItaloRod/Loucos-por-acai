import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { useLazyGetMeQuery } from './features/auth/authApi';
import { setCredentials, logOut, setLoading } from './store/authSlice';

// Páginas e Componentes
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Menu from './pages/Menu';
import About from './pages/About';
import Contact from './pages/Contact';
import Loyalty from './pages/Loyalty';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import ProductsAdmin from './pages/admin/Products';
import Customers from './pages/admin/Customers';
import Employees from './pages/admin/Employees';
import { Checkout } from './pages/Checkout';
import { OrderTracking } from './pages/OrderTracking';
import { OrderHistory } from './pages/OrderHistory';
import { OrdersAdmin } from './pages/admin/OrdersAdmin';
import POS from './pages/POS';

// Placeholder para rotas das fases subsequentes
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="bg-card border border-border p-8 rounded-2xl shadow-sm text-center space-y-4 max-w-lg mx-auto my-12">
    <span className="text-5xl">🛠️</span>
    <h2 className="text-xl font-extrabold text-foreground tracking-tight">{title}</h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      Esta funcionalidade está planejada para as próximas etapas do plano de desenvolvimento (Fases
      3 a 10).
    </p>
  </div>
);

// Componente Wrapper para inicialização de sessão
const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const [triggerGetMe] = useLazyGetMeQuery();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      dispatch(setLoading(true));
      try {
        // Tentar obter o perfil do usuário logado via cookies httpOnly
        const user = await triggerGetMe().unwrap();
        dispatch(setCredentials(user));
      } catch {
        // Sem sessão ativa ou token expirado
        dispatch(logOut());
      } finally {
        dispatch(setLoading(false));
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [dispatch, triggerGetMe]);

  if (!initialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
            role="status"
          >
            <span className="sr-only">Inicializando...</span>
          </div>
          <p className="text-sm font-semibold text-primary/70 animate-pulse">
            Iniciando Loucos por Açaí...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function AppContent() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas de Autenticação */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={user?.role === 'CLIENTE' ? '/' : '/dashboard'} replace />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
        />

        {/* Área do App com Layout Sidebar/Header */}
        <Route element={<Layout />}>
          {/* Rotas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* Rota Protegida Comum (Edição de perfil próprio, rastreio) */}
          <Route element={<ProtectedRoute allowedRoles={['CLIENTE', 'FUNCIONARIO', 'GERENTE']} />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/orders/:id" element={<OrderTracking />} />
          </Route>

          {/* Rotas Protegidas de CLIENTE */}
          <Route element={<ProtectedRoute allowedRoles={['CLIENTE']} />}>
            <Route path="/loyalty" element={<Loyalty />} />
            <Route path="/orders/history" element={<OrderHistory />} />
            <Route path="/checkout" element={<Checkout />} />
          </Route>

          {/* Rotas Protegidas de FUNCIONARIO & GERENTE (Operação de Vendas) */}
          <Route element={<ProtectedRoute allowedRoles={['GERENTE', 'FUNCIONARIO']} />}>
            <Route path="/pos" element={<POS />} />
            <Route path="/admin/orders" element={<OrdersAdmin />} />
            <Route path="/admin/customers" element={<Customers />} />
          </Route>

          {/* Rotas Protegidas de GERENTE (Administração Geral) */}
          <Route element={<ProtectedRoute allowedRoles={['GERENTE']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/products" element={<ProductsAdmin />} />
            <Route path="/admin/employees" element={<Employees />} />
          </Route>
        </Route>

        {/* Fallback de 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppInitializer>
        <AppContent />
      </AppInitializer>
    </Provider>
  );
}

export default App;
