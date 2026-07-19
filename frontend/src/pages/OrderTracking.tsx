import { useParams, useNavigate } from 'react-router-dom';
import { useGetOrderByIdQuery } from '../features/orders/ordersApi';
import { useGetProductsQuery } from '../features/catalog/catalogApi';
import { useCancelOrderMutation } from '../features/orders/ordersApi';
import { OrderStatus } from '../features/orders/types';
import { Loader2, ArrowLeft, CheckCircle2, Clock, ChefHat, PackageCheck, Truck, AlertCircle, XCircle } from 'lucide-react';

export const OrderTracking = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading: isLoadingOrder } = useGetOrderByIdQuery(id as string, {
    skip: !id,
    pollingInterval: 15000, // Poll every 15 seconds to update status
  });
  const { data: productsData } = useGetProductsQuery();
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();

  const products = productsData?.items || [];

  if (isLoadingOrder) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">Pedido não encontrado</h2>
        <button onClick={() => navigate('/orders/history')} className="text-primary hover:underline">
          Voltar para Meus Pedidos
        </button>
      </div>
    );
  }

  const handleCancel = async () => {
    if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
      try {
        await cancelOrder({ orderId: order.id }).unwrap();
        alert('Pedido cancelado com sucesso.');
      } catch (err: any) {
        alert(err.data?.detail || 'Erro ao cancelar o pedido.');
      }
    }
  };

  const statusConfig = {
    [OrderStatus.PENDING]: { icon: Clock, label: 'Aguardando', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    [OrderStatus.CONFIRMED]: { icon: CheckCircle2, label: 'Confirmado', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    [OrderStatus.PREPARING]: { icon: ChefHat, label: 'Preparando', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    [OrderStatus.READY]: { icon: PackageCheck, label: 'Pronto', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    [OrderStatus.DELIVERING]: { icon: Truck, label: 'Saiu para Entrega', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    [OrderStatus.DELIVERED]: { icon: CheckCircle2, label: 'Entregue', color: 'text-green-600', bg: 'bg-green-600/10' },
    [OrderStatus.COMPLETED]: { icon: CheckCircle2, label: 'Concluído', color: 'text-green-600', bg: 'bg-green-600/10' },
    [OrderStatus.CANCELLED]: { icon: XCircle, label: 'Cancelado', color: 'text-red-500', bg: 'bg-red-500/10' },
  };

  const steps = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    order.order_type === 'ONLINE_DELIVERY' ? OrderStatus.DELIVERING : null,
    OrderStatus.COMPLETED,
  ].filter(Boolean) as OrderStatus[];

  const currentStepIndex = steps.indexOf(
    order.status === OrderStatus.DELIVERED ? OrderStatus.COMPLETED : order.status
  );

  const CurrentIcon = statusConfig[order.status]?.icon || Clock;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/orders/history')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pedido #{order.order_number.split('-')[1]}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${statusConfig[order.status]?.bg} ${statusConfig[order.status]?.color}`}>
            <CurrentIcon size={20} />
            <span className="font-bold text-sm">{statusConfig[order.status]?.label}</span>
          </div>
        </div>

        {/* Stepper */}
        {order.status !== OrderStatus.CANCELLED && (
          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 rounded-full z-0" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full z-0 transition-all duration-500"
              style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
            />
            <div className="relative z-10 flex justify-between">
              {steps.map((step, index) => {
                const isCompleted = currentStepIndex >= index;
                const StepIcon = statusConfig[step].icon;
                return (
                  <div key={step} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-card transition-colors duration-500 ${
                        isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <StepIcon size={18} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                      {statusConfig[step].label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Itens do Pedido */}
        <div className="space-y-4 pt-6 border-t border-border">
          <h2 className="font-bold text-lg">Itens do Pedido</h2>
          <div className="space-y-3">
            {order.items.filter(item => !item.parent_item_id).map((item) => {
              const product = products.find((p) => p.id === item.product_id);
              const subItems = order.items.filter(i => i.parent_item_id === item.id);

              return (
                <div key={item.id} className="p-4 border rounded-xl bg-background flex justify-between">
                  <div>
                    <span className="font-bold">{item.quantity}x {product?.name || 'Produto'}</span>
                    {subItems.length > 0 && (
                      <ul className="text-xs text-muted-foreground list-disc list-inside pl-2 mt-1">
                        {subItems.map(sub => {
                          const subProduct = products.find(p => p.id === sub.product_id);
                          return <li key={sub.id}>{subProduct?.name} (+ R$ {Number(sub.unit_price).toFixed(2)})</li>;
                        })}
                      </ul>
                    )}
                    {item.notes && <p className="text-xs mt-2 italic text-muted-foreground">Obs: {item.notes}</p>}
                  </div>
                  <span className="font-semibold whitespace-nowrap">
                    R$ {(Number(item.subtotal) + subItems.reduce((acc, curr) => acc + Number(curr.subtotal), 0)).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo */}
        <div className="pt-6 border-t border-border space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>R$ {Number(order.subtotal).toFixed(2)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-sm text-primary font-semibold">
              <span>Desconto (Fidelidade)</span>
              <span>- R$ {Number(order.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
            <span>Total</span>
            <span>R$ {Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Cancelar */}
        {order.status === OrderStatus.PENDING && (
          <div className="pt-6 border-t border-border">
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="px-4 py-2 bg-destructive/10 text-destructive text-sm font-bold rounded-lg hover:bg-destructive/20 transition-colors"
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar Pedido'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
