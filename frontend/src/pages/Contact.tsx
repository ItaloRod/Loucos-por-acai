import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.message) {
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    }
  };

  return (
    <div className="space-y-10 pb-12 max-w-4xl mx-auto">
      {/* Intro */}
      <div className="text-center space-y-4">
        <span className="text-4xl">📞</span>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Fale Conosco</h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
          Tem alguma dúvida, crítica, sugestão ou deseja fazer um pedido corporativo? Preencha o
          formulário abaixo ou fale direto pelo WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Informações de Contato */}
        <section className="bg-card border border-border p-8 rounded-2xl flex flex-col justify-between space-y-8 shadow-sm">
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-foreground">Canais de Atendimento</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Estamos disponíveis de Segunda a Sábado das 13:00 às 22:00 para tirar suas dúvidas.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Telefone / WhatsApp</p>
                  <p className="text-sm font-bold text-foreground">(85) 99999-9999</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-500">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">E-mail Corporativo</p>
                  <p className="text-sm font-bold text-foreground">contato@loucosporacai.com</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Endereço da Loja</p>
                  <p className="text-sm font-bold text-foreground leading-snug">
                    Av. dos Açaizeiros, 123 - Centro, Fortaleza - CE
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 text-xs text-muted-foreground">
            Loucos por Açaí 🍧 CNPJ: 00.000.000/0001-00
          </div>
        </section>

        {/* Formulário de Mensagem */}
        <section className="bg-card border border-border p-8 rounded-2xl shadow-sm">
          {submitted ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8 animate-fadeIn">
              <span className="text-5xl">🎉</span>
              <h3 className="text-lg font-bold text-foreground">Mensagem Enviada!</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Agradecemos o contato. Nossa equipe retornará seu e-mail em até 24 horas.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold shadow-md"
              >
                Nova Mensagem
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Envie uma Mensagem</h3>

              <div>
                <label
                  htmlFor="name"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
                >
                  Seu Nome *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
                >
                  E-mail de Contato *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1"
                >
                  Sua Mensagem *
                </label>
                <textarea
                  id="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="block w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
                  placeholder="O que você gostaria de nos dizer?"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold transition-all duration-200 shadow-lg shadow-primary/10 active:scale-95"
              >
                <Send size={14} /> Enviar Mensagem
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default Contact;
