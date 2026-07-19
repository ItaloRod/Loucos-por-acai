import { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { useLogoutMutation } from '../features/auth/authApi';
import { logOut } from '../store/authSlice';
import {
  Menu as MenuIcon,
  X,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  Calendar,
  Award,
  History,
  Home,
  UtensilsCrossed,
} from 'lucide-react';

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: ('CLIENTE' | 'FUNCIONARIO' | 'GERENTE')[];
}

export const Layout = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutApi] = useLogoutMutation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
      dispatch(logOut());
      navigate('/login');
    } catch (error) {
      console.error('Falha no logout:', error);
      // Fallback em caso de erro na requisição: limpar localmente de qualquer forma
      dispatch(logOut());
      navigate('/login');
    }
  };

  const sidebarLinks: SidebarLink[] = [
    // Links Gerais para Clientes
    { to: '/', label: 'Início', icon: <Home size={20} />, roles: ['CLIENTE'] },
    { to: '/menu', label: 'Cardápio', icon: <UtensilsCrossed size={20} />, roles: ['CLIENTE'] },
    { to: '/loyalty', label: 'Fidelidade', icon: <Award size={20} />, roles: ['CLIENTE'] },
    {
      to: '/orders/history',
      label: 'Meus Pedidos',
      icon: <History size={20} />,
      roles: ['CLIENTE'],
    },
    { to: '/profile', label: 'Meu Perfil', icon: <UserIcon size={20} />, roles: ['CLIENTE'] },

    // Links para Funcionários & Gerentes (Área de Gestão/Operação)
    {
      to: '/dashboard',
      label: 'Painel Geral',
      icon: <LayoutDashboard size={20} />,
      roles: ['GERENTE'],
    },
    {
      to: '/pos',
      label: 'Atendimento (PDV)',
      icon: <ShoppingBag size={20} />,
      roles: ['GERENTE', 'FUNCIONARIO'],
    },
    {
      to: '/admin/orders',
      label: 'Pedidos Ativos',
      icon: <Calendar size={20} />,
      roles: ['GERENTE', 'FUNCIONARIO'],
    },
    {
      to: '/admin/customers',
      label: 'Clientes',
      icon: <Users size={20} />,
      roles: ['GERENTE', 'FUNCIONARIO'],
    },
    {
      to: '/admin/products',
      label: 'Estoque / Produtos',
      icon: <Package size={20} />,
      roles: ['GERENTE'],
    },
    {
      to: '/admin/employees',
      label: 'Funcionários',
      icon: <Users size={20} />,
      roles: ['GERENTE'],
    },
  ];

  // Filtra links baseados no papel do usuário
  const filteredLinks = sidebarLinks.filter(
    (link) => !link.roles || (user && link.roles.includes(user.role)),
  );

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar para desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card border-r border-border transition-transform duration-300 md:translate-x-0 md:static md:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-border bg-primary/5">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🍧</span>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Loucos por Açaí
            </span>
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-muted md:hidden"
            aria-label="Fechar barra lateral"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {filteredLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-foreground">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop para fechar sidebar mobile */}
      {isSidebarOpen && (
        <div onClick={toggleSidebar} className="fixed inset-0 z-30 bg-black/40 md:hidden" />
      )}

      {/* Conteúdo principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-muted md:hidden"
              aria-label="Abrir barra lateral"
            >
              <MenuIcon size={20} />
            </button>
            <h1 className="text-base font-semibold text-foreground md:text-lg">
              {sidebarLinks.find((l) => l.to === location.pathname)?.label || 'Painel'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5 rounded-lg border border-transparent hover:border-destructive/20 transition-all duration-200"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </header>

        {/* Área de conteúdo do dashboard */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
