import { Link } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import {
  ShoppingBag,
  Users,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ClipboardList,
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAppSelector((state) => state.auth);

  // Dados mockados para exibição estática da Fase 2
  const stats = [
    {
      label: 'Vendas Hoje',
      value: 'R$ 840,00',
      change: '+12% vs ontem',
      icon: <TrendingUp size={22} />,
      color: 'bg-green-500/10 text-green-600 dark:text-green-500',
    },
    {
      label: 'Pedidos Pendentes',
      value: '5',
      change: '3 delivery, 2 retirada',
      icon: <ClipboardList size={22} />,
      color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500',
    },
    {
      label: 'Clientes Ativos',
      value: '142',
      change: '+8 cadastrados essa semana',
      icon: <Users size={22} />,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-500',
    },
    {
      label: 'Alertas de Estoque',
      value: '2',
      change: 'Leite Condensado, Granola',
      icon: <AlertTriangle size={22} />,
      color: 'bg-red-500/10 text-red-600 dark:text-red-500',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Mensagem de Boas Vindas */}
      <section className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            Olá, {user?.first_name}! <Sparkles className="text-yellow-500" size={20} />
          </h2>
          <p className="text-sm text-muted-foreground">
            Bem-vindo ao painel operacional do Loucos por Açaí. Nível de acesso:{' '}
            <strong className="text-primary font-bold">{user?.role}</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/pos"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all duration-200 active:scale-95 shadow-md shadow-primary/10"
          >
            <ShoppingBag size={14} /> Nova Venda (PDV)
          </Link>
        </div>
      </section>

      {/* Grid de Estatísticas */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.color}`}
              >
                {stat.icon}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-foreground tracking-tight">{stat.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground">{stat.change}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Seção de Atalhos e Pedidos Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel de Ações Rápidas */}
        <section className="lg:col-span-1 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-base text-foreground border-b border-border/50 pb-2">
              Ações Rápidas
            </h3>
            <div className="space-y-2">
              <Link
                to="/pos"
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted text-xs font-semibold text-foreground transition-all"
              >
                Abrir frente de caixa (PDV)
                <ArrowRight size={14} className="text-primary" />
              </Link>
              <Link
                to="/admin/orders"
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted text-xs font-semibold text-foreground transition-all"
              >
                Gerenciar painel de pedidos
                <ArrowRight size={14} className="text-primary" />
              </Link>
              <Link
                to="/admin/customers"
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted text-xs font-semibold text-foreground transition-all"
              >
                Consultar / Cadastrar Clientes
                <ArrowRight size={14} className="text-primary" />
              </Link>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground text-center mt-4 bg-muted/10 p-2.5 rounded border border-border/30">
            Dica: use o menu lateral para navegar por relatórios e configurações do sistema.
          </div>
        </section>

        {/* Kanban Simplificado de Pedidos de Teste */}
        <section className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-base text-foreground border-b border-border/50 pb-2">
            Últimos Pedidos Recebidos
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/10 border border-border/40">
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">LPA-20260719-0012</p>
                <p className="text-[10px] text-muted-foreground">
                  Cliente: Paulo Rodrigues • Delivery
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                  Preparando
                </span>
                <span className="text-xs font-extrabold text-foreground">R$ 42,50</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/10 border border-border/40">
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">LPA-20260719-0011</p>
                <p className="text-[10px] text-muted-foreground">Cliente: João Silva • Retirada</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-yellow-600 bg-yellow-500/10 px-2 py-0.5 rounded-full uppercase">
                  Pendente
                </span>
                <span className="text-xs font-extrabold text-foreground">R$ 18,00</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/10 border border-border/40">
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">LPA-20260719-0010</p>
                <p className="text-[10px] text-muted-foreground">
                  Cliente: Maria Souza • PDV Caixa
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full uppercase">
                  Concluído
                </span>
                <span className="text-xs font-extrabold text-foreground">R$ 31,00</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
