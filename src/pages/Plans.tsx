import { Link } from "react-router-dom";
import { Check, Crown, Calendar, Tv, Flame, Star, Ban, Heart, Sparkles, Shield, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";

const monthlyFeatures = [
  { icon: Tv, text: "+10.000 minisséries e doramas" },
  { icon: Check, text: "Todos os episódios liberados" },
  { icon: Sparkles, text: "Assista em qualquer dispositivo" },
];

const annualFeatures = [
  { icon: Tv, text: "Séries, filmes, doramas e novelas" },
  { icon: Flame, text: "Conteúdo +18 exclusivo 🔥" },
  { icon: Star, text: "Qualidade HD e Full HD" },
  { icon: Ban, text: "Sem anúncios irritantes" },
  { icon: Heart, text: "Atualizações constantes" },
  { icon: Sparkles, text: "Lançamentos diários automáticos" },
  { icon: Shield, text: "Sem mensalidade surpresa!" },
];

export default function Plans() {
  const handleMonthlyClick = () => {
    window.open("https://ggcheckout.app/checkout/v5/7OKYddFAbmOKkwAJAwu5");
  };

  const handleAnnualClick = () => {
    window.open("https://ggcheckout.app/checkout/v5/mQb46CSFk2UVrn1L5lGE", "_blank");
  };

  return (
    <Layout>
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-12 h-12 rounded-lg brand-gradient flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">K</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="brand-gradient-text">Escolha seu plano</span>
            </h1>
            <p className="text-muted-foreground">Desbloqueie todo o conteúdo agora mesmo</p>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:border-muted-foreground">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Plano Mensal</h2>
                  <p className="text-sm text-muted-foreground">Renova a cada 30 dias</p>
                </div>
              </div>

              {/* Price */}
              <div className="bg-muted/50 rounded-xl p-4 my-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">R$10</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-6">
                {monthlyFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <li key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-foreground">{feature.text}</span>
                      </div>
                      <Check className="h-5 w-5 text-primary" />
                    </li>
                  );
                })}
              </ul>

              {/* CTA Button */}
              <Button onClick={handleMonthlyClick} variant="outline" className="w-full h-12 text-base">
                <Calendar className="h-5 w-5 mr-2" />
                Assinar mensal
              </Button>
            </div>

            {/* Annual Plan */}
            <div className="relative bg-card border-2 border-primary rounded-2xl p-6 glow-primary">
              {/* Badges */}
              <div className="absolute -top-3 left-4 flex gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                  💰 ECONOMIZE 80%
                </span>
              </div>
              <div className="absolute -top-3 right-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  <Sparkles className="h-3 w-3" />
                  MAIS VENDIDO
                </span>
              </div>

              <div className="flex items-center gap-3 mb-2 mt-2">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-accent">Plano Anual VIP</h2>
                  <p className="text-sm text-muted-foreground">Melhor custo-benefício!</p>
                </div>
              </div>

              {/* Price */}
              <div className="bg-muted/50 rounded-xl p-4 my-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">R$19,90</span>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">por ano</span>
                    <span className="text-xs text-primary">≈ R$1,65/mês</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {annualFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <li key={index} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-sm text-foreground">{feature.text}</span>
                      </div>
                      <Check className="h-5 w-5 text-primary" />
                    </li>
                  );
                })}
              </ul>

              {/* CTA Button */}
              <Button onClick={handleAnnualClick} className="w-full h-12 text-base brand-gradient glow-primary">
                <Crown className="h-5 w-5 mr-2" />
                Quero o plano anual
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                <Lock className="h-3 w-3" />
                Pagamento 100% seguro e instantâneo
              </p>
            </div>
          </div>

          {/* Login CTA */}
          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              Já fez o pagamento?{" "}
              <Link to="/entrar" className="text-primary hover:underline">
                Faça login para liberar seu acesso.
              </Link>
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-8 mt-8 text-muted-foreground">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-5 w-5" />
              <span>Seguro</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-5 w-5" />
              <span>Liberação imediata</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-5 w-5" />
              <span>Acesso completo</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
