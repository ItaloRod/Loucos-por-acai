import { ShieldCheck, Heart, Sparkles } from 'lucide-react';

export const About = () => {
  return (
    <div className="space-y-12 pb-12 max-w-4xl mx-auto">
      {/* Intro */}
      <div className="text-center space-y-4">
        <span className="text-4xl">💜</span>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
          Nossa Loucura por Açaí
        </h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
          Conheça a história do estabelecimento que conquistou a cidade com a cremosidade do açaí
          puro e o carinho no atendimento.
        </p>
      </div>

      {/* Grid de Missão/Valores */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-2xl text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Heart size={20} />
          </div>
          <h3 className="font-bold text-base text-foreground">Feito com Amor</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cada tigela e copo de açaí é montado com ingredientes frescos de altíssima qualidade e
            extremo zelo de nossa equipe.
          </p>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
            <ShieldCheck size={20} />
          </div>
          <h3 className="font-bold text-base text-foreground">Origem Controlada</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Trabalhamos exclusivamente com polpa de açaí orgânica, proveniente de produtores
            sustentáveis da região amazônica.
          </p>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-500">
            <Sparkles size={20} />
          </div>
          <h3 className="font-bold text-base text-foreground">Cremosidade Única</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Desenvolvemos um processo exclusivo de batimento que garante a textura aveludada do açaí
            sem cristais de gelo.
          </p>
        </div>
      </section>

      {/* História institucional */}
      <section className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
        <h3 className="text-xl font-bold text-foreground">Como tudo começou</h3>
        <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
          <p>
            O <strong>Loucos por Açaí</strong> nasceu do sonho de oferecer uma experiência superior
            de consumo de açaí. Percebendo que o mercado carecia de opções de açaí verdadeiramente
            puro, cremoso e com ingredientes selecionados de verdade, abrimos nossa primeira loja
            com foco em personalização total (o cliente escolhe exatamente o que quer).
          </p>
          <p>
            Ao longo dos anos, expandimos nosso cardápio e criamos nosso famoso{' '}
            <strong>Programa de Fidelidade</strong> (o cartão de selos) para retribuir a preferência
            dos clientes que, assim como nós, são apaixonados por essa fruta deliciosa e nutritiva.
          </p>
          <p>
            Hoje, nossa v2.0 traz uma renovação tecnológica completa para acelerar os pedidos
            online, melhorar a segurança do cadastro e tornar a retirada na loja física ou entrega
            em domicílio um processo super dinâmico e agradável.
          </p>
        </div>
      </section>
    </div>
  );
};

export default About;
