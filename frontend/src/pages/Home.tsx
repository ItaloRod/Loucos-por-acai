import { Link } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import { ArrowRight, Award, ShoppingBag, Clock } from 'lucide-react';

export const Home = () => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="space-y-10 pb-12">
      {/* Banner Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-purple-950 to-primary-foreground text-primary-foreground px-8 py-12 md:p-16 shadow-xl shadow-primary/10">
        <div className="relative z-10 max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wider text-purple-200">
            🍧 O melhor açaí da cidade
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Monte o seu Açaí Perfeito e receba onde estiver!
          </h1>
          <p className="text-purple-100/90 text-sm md:text-base leading-relaxed max-w-xl">
            Escolha seu tamanho favorito, acompanhamentos frescos e deliciosas caldas. Acumule selos
            em nosso programa de fidelidade a cada pedido!
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              to="/menu"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-primary font-bold text-sm hover:bg-purple-50 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-black/10"
            >
              Pedir Açaí Agora
              <ArrowRight size={16} />
            </Link>
            {!user && (
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 text-white border border-white/20 font-bold text-sm hover:bg-white/20 transition-all duration-200"
              >
                Criar Conta Fidelidade
              </Link>
            )}
          </div>
        </div>

        {/* Decorativo de fundo */}
        <div className="absolute right-0 bottom-0 top-0 opacity-10 md:opacity-20 flex items-center justify-center text-[12rem] md:text-[20rem] select-none pointer-events-none pr-8">
          🍧
        </div>
      </section>

      {/* Cards de Atalho Rápidos */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-lg transition-all duration-300">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Cardápio Variado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Navegue pelas opções de potes, copos, toppings adicionais e bebidas.
            </p>
          </div>
          <Link
            to="/menu"
            className="text-sm font-semibold text-primary inline-flex items-center gap-1 hover:underline"
          >
            Ver Cardápio <ArrowRight size={14} />
          </Link>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-lg transition-all duration-300">
          <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
            <Award size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Cartão Fidelidade</h3>
            <p className="text-sm text-muted-foreground mt-1">
              A cada R$ 20 em compras você ganha 1 selo. Junte 10 selos e ganhe R$ 20 de desconto!
            </p>
          </div>
          <Link
            to="/loyalty"
            className="text-sm font-semibold text-primary inline-flex items-center gap-1 hover:underline"
          >
            Acessar Selos <ArrowRight size={14} />
          </Link>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-lg transition-all duration-300">
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-500">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Horário de Funcionamento</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Segunda a Sábado, das 13:00 às 22:00. Domingos fechados.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-green-500/10 text-green-600 dark:text-green-500 self-start">
            Loja Aberta
          </span>
        </div>
      </section>
    </div>
  );
};

export default Home;
