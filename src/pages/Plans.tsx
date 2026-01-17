import { Link } from 'react-router-dom';
import { Check, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';

const plans = [
  {
    id: 'monthly',
    name: 'Plano Mensal',
    price: 29.90,
    period: '/mês',
    description: 'Acesso completo a todo o catálogo',
    features: [
      'Acesso ilimitado a todos os conteúdos',
      'Qualidade HD',
      'Assista em até 2 dispositivos',
      'Sem anúncios',
      'Novos lançamentos toda semana',
    ],
    popular: false,
    icon: Zap,
  },
  {
    id: 'annual',
    name: 'Plano Anual',
    price: 239.90,
    priceMonthly: 19.99,
    period: '/ano',
    description: 'Melhor custo-benefício',
    features: [
      'Tudo do plano mensal',
      'Qualidade Full HD',
      'Assista em até 5 dispositivos',
      'Suporte prioritário',
      'Download para assistir offline',
      '2 meses grátis',
    ],
    popular: true,
    icon: Crown,
  },
];

export default function Plans() {
  return (
    <Layout>
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Escolha seu <span className="brand-gradient-text">Plano</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Assine agora e tenha acesso ilimitado a milhares de doramas, filmes, séries e muito mais.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`relative bg-card border rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] ${
                    plan.popular
                      ? 'border-primary glow-primary'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full brand-gradient text-sm font-medium text-white">
                        <Crown className="h-4 w-4" />
                        Mais Popular
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                      plan.popular ? 'brand-gradient' : 'bg-muted'
                    }`}>
                      <Icon className={`h-8 w-8 ${plan.popular ? 'text-white' : 'text-muted-foreground'}`} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <span className="text-5xl font-bold">{plan.price.toFixed(2).replace('.', ',')}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    {plan.priceMonthly && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Equivale a R$ {plan.priceMonthly.toFixed(2).replace('.', ',')} por mês
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                          plan.popular ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    className={`w-full ${plan.popular ? 'brand-gradient glow-primary' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    Assinar Agora
                  </Button>
                </div>
              );
            })}
          </div>

          {/* FAQ or Additional Info */}
          <div className="text-center mt-12">
            <p className="text-muted-foreground">
              Dúvidas? Entre em contato com nosso{' '}
              <Link to="/suporte" className="text-primary hover:underline">
                suporte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
