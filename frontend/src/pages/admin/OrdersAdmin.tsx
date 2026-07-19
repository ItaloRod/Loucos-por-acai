import { useMemo } from 'react';
import { useGetOrdersQuery, useUpdateOrderStatusMutation } from '../../features/orders/ordersApi';
import { OrderStatus } from '../../features/orders/types';
import { Loader2, ArrowRight } from 'lucide-react';

export const OrdersAdmin = () => {
  const { data: orders, isLoading } = useGetOrdersQuery();
  const [updateStatus] = useUpdateOrderStatusMutation();

  const columns = useMemo(() => [
    { id: OrderStatus.PENDING, label: 'Pendentes' },
    { id: OrderStatus.CONFIRMED, label: 'Confirmados' },
    { id: OrderStatus.PREPARING, label: 'Preparando' },
    { id: OrderStatus.READY, label: 'Prontos' },
    { id: OrderStatus.DELIVERING, label: 'Em Entrega' },
  ], []);

  const activeOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(
      o => o.status !== OrderStatus.COMPLETED &&
           o.status !== OrderStatus.DELIVERED &&
           o.status !== OrderStatus.CANCELLED
    );
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus | null = null;
    switch (currentStatus) {
      case OrderStatus.PENDING: nextStatus = OrderStatus.CONFIRMED; break;
      case OrderStatus.CONFIRMED: nextStatus = OrderStatus.PREPARING; break;
      case OrderStatus.PREPARING: nextStatus = OrderStatus.READY; break;
      case OrderStatus.READY: 
        // Need to know order type to know if next is DELIVERING or COMPLETED.
        // Assuming we look at order_type
        const order = orders?.find(o => o.id === orderId);
        if (order?.order_type === 'ONLINE_DELIVERY') {
          nextStatus = OrderStatus.DELIVERING;
        } else {
          nextStatus = OrderStatus.COMPLETED;
        }
        break;
      case OrderStatus.DELIVERING: nextStatus = OrderStatus.COMPLETED; break;
    }
    if (nextStatus) {
      await updateStatus({ orderId, body: { status: nextStatus } });
    }
  };

  const handleCancel = async (orderId: string) => {
    if (window.confirm('Cancelar este pedido?')) {
      await updateStatus({ orderId, body: { status: OrderStatus.CANCELLED } });
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestão de Pedidos (Kanban)</h1>
        <p className="text-sm text-muted-foreground">{activeOrders.length} pedidos ativos</p>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex h-full gap-4 min-w-max">
          {columns.map(col => {
            const colOrders = activeOrders.filter(o => o.status === col.id);
            return (
              <div key={col.id} className="w-80 bg-muted/30 rounded-2xl border border-border flex flex-col">
                <div className="p-4 border-b border-border bg-card rounded-t-2xl flex justify-between items-center">
                  <h3 className="font-bold">{col.label}</h3>
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                    {colOrders.length}
                  </span>
                </div>
                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                  {colOrders.map(order => (
                    <div key={order.id} className="bg-background p-4 rounded-xl shadow-sm border border-border flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-primary">#{order.order_number.split('-')[1]}</span>
                          <span className="ml-2 text-[10px] uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {order.order_type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-foreground">Itens:</p>
                        {order.items.filter(i => !i.parent_item_id).map(item => (
                          <div key={item.id} className="pl-2">
                            <span>{item.quantity}x Produto ID: {item.product_id.substring(0,4)}</span>
                            {/* In real app, we'd lookup product names here or backend returns them */}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleAdvanceStatus(order.id, order.status)}
                          className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Avançar <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {colOrders.length === 0 && (
                    <div className="text-center p-4 text-sm text-muted-foreground italic">
                      Vazio
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
