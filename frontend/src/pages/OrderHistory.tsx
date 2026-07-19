import { useNavigate } from 'react-router-dom';
import { useGetOrdersQuery } from '../features/orders/ordersApi';
import { OrderStatus } from '../features/orders/types';
import { Loader2, History as HistoryIcon, ArrowRight, Package } from 'lucide-react';

export const OrderHistory = () => {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useGetOrdersQuery();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <HistoryIcon className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">Nenhum pedido encontrado</h2>
        <p className="text-muted-foreground">Você ainda não realizou nenhum pedido.</p>
        <button onClick={() => navigate('/menu')} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg">
          Fazer meu primeiro pedido
        </button>
      </div>
    );
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case OrderStatus.COMPLETED:
      case OrderStatus.DELIVERED: return 'bg-green-600/10 text-green-600 border-green-600/20';
      case OrderStatus.CANCELLED: return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <HistoryIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Pedidos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seus pedidos recentes e histórico.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <div
            key={order.id}
            onClick={() => navigate(`/orders/${order.id}`)}
            className="group flex flex-col sm:flex-row items-center justify-between p-5 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all cursor-pointer gap-4"
          >
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Package size={24} />
              </div>
              <div>
                <p className="font-bold text-foreground">
                  Pedido #{order.order_number.split('-')[1]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString('pt-BR')}
                </p>
                <div className="text-sm text-muted-foreground mt-1">
                  {order.items.filter(i => !i.parent_item_id).reduce((acc, item) => acc + item.quantity, 0)} itens • R$ {Number(order.total).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
