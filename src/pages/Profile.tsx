import { Link, useNavigate } from 'react-router-dom';
import { User, Crown, Check, LogOut, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Profile() {
  const { user, profile, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    navigate('/entrar');
    return null;
  }

  const isVip = profile?.is_vip;
  const hasActivePlan = profile?.subscription_status === 'active';
  const planType = profile?.plan_type;
  const subscriptionEndDate = profile?.subscription_end_date 
    ? new Date(profile.subscription_end_date) 
    : null;
  const daysRemaining = subscriptionEndDate 
    ? differenceInDays(subscriptionEndDate, new Date()) 
    : 0;

  const getPlanLabel = () => {
    if (isVip) return 'VIP Vitalício';
    if (planType === 'annual') return 'Anual';
    if (planType === 'monthly') return 'Mensal';
    return 'Nenhum';
  };

  const vipFeatures = [
    'Acesso ilimitado a todo conteúdo',
    'Novos conteúdos adicionados semanalmente',
    'Sem anúncios ou interrupções',
    'Acesso garantido enquanto o plano estiver ativo',
  ];

  return (
    <Layout>
      <div className="min-h-screen py-20 px-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* User Info Card */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {profile?.full_name || 'Usuário'}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            {(isVip || hasActivePlan) && (
              <div className="mt-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-medium">
                  <Crown className="h-4 w-4" />
                  {getPlanLabel()}
                </span>
              </div>
            )}
          </div>

          {/* Plan Status Card */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {hasActivePlan || isVip ? 'Plano Ativo' : 'Sem Plano Ativo'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Plano: {getPlanLabel()}
                </p>
              </div>
            </div>

            {(hasActivePlan || isVip) && subscriptionEndDate && !isVip && (
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Expira em: {daysRemaining > 0 ? `${daysRemaining} dias` : 'Expirado'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Data de término: {format(subscriptionEndDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-6">
              <h4 className="font-semibold text-foreground mb-2">Renovar ou Trocar de Plano</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Assista seus doramas favoritos sem limites
              </p>
              <Link to="/planos">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Ver planos
                </Button>
              </Link>
            </div>
          </div>

          {/* VIP Access Card */}
          {(hasActivePlan || isVip) && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Acesso VIP</h3>
                  <p className="text-sm text-muted-foreground">
                    Você tem acesso completo!
                  </p>
                </div>
              </div>

              <ul className="space-y-3">
                {vipFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair da conta</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}
