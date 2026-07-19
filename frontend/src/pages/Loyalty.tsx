import { Award, Check, AlertCircle } from 'lucide-react';

export const Loyalty = () => {
  // Selos simulados de teste para a Fase 2 (em fases posteriores virá do backend via RTK Query)
  const currentStamps = 6;
  const totalSlots = 10;

  return (
    <div className="space-y-8 pb-12 max-w-2xl mx-auto">
      {/* Intro */}
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          Programa Fidelidade
        </h2>
        <p className="text-muted-foreground text-sm">
          Acumule selos em suas compras e troque por descontos deliciosos!
        </p>
      </div>

      {/* Cartão de Selos Premium */}
      <section className="bg-card border border-border p-6 md:p-8 rounded-3xl shadow-xl shadow-primary/5 border-primary/20 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 text-9xl text-primary/5 select-none pointer-events-none font-bold">
          10
        </div>

        <div className="space-y-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-extrabold text-xl text-foreground flex items-center gap-1.5">
                <Award className="text-yellow-500" size={24} /> Meu Cartão Fidelidade
              </h3>
              <p className="text-xs text-muted-foreground">
                Cada selo aproxima você de um açaí grátis!
              </p>
            </div>
            <span className="font-extrabold text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
              {currentStamps} / {totalSlots} Selos
            </span>
          </div>

          {/* Grid de Selos */}
          <div className="grid grid-cols-5 gap-4 py-4">
            {Array.from({ length: totalSlots }).map((_, index) => {
              const isFilled = index < currentStamps;
              return (
                <div
                  key={index}
                  className={`aspect-square rounded-2xl flex items-center justify-center border-2 transition-all duration-300 relative ${isFilled ? 'bg-gradient-to-br from-primary to-purple-700 text-white border-transparent scale-105 shadow-md shadow-primary/20' : 'bg-muted/30 border-dashed border-border text-muted-foreground/30 hover:border-muted-foreground/30'}`}
                >
                  {isFilled ? (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-xl md:text-2xl animate-pulse">🍧</span>
                      <div className="absolute bottom-1.5 right-1.5 bg-yellow-500 rounded-full p-0.5 text-black border border-white">
                        <Check size={8} strokeWidth={3} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-bold font-mono">{index + 1}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar e Regra */}
          <div className="space-y-2 pt-2">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${(currentStamps / totalSlots) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{currentStamps} selos acumulados</span>
              <span className="font-semibold text-primary">
                {totalSlots - currentStamps} restantes para resgate
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Regras e Informações */}
      <section className="bg-card border border-border p-6 rounded-2xl space-y-4">
        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
          <AlertCircle size={16} className="text-primary" /> Regras do Programa
        </h4>
        <ul className="text-xs text-muted-foreground space-y-2.5 list-disc list-inside leading-relaxed pl-1">
          <li>
            A cada <strong>R$ 20,00</strong> gastos em uma única compra (Delivery, Retirada ou
            Balcão), você ganha <strong>1 selo</strong>.
          </li>
          <li>
            Ao completar o cartão com <strong>10 selos</strong>, você poderá resgatar um desconto
            especial de <strong>R$ 20,00</strong> na sua próxima compra.
          </li>
          <li>
            Os selos são adicionados automaticamente em sua conta ao finalizar um pedido autenticado
            com seu CPF.
          </li>
          <li>
            O resgate pode ser realizado no checkout do carrinho de compras do site ou diretamente
            no caixa físico informando seu CPF cadastrado.
          </li>
        </ul>
      </section>
    </div>
  );
};

export default Loyalty;
