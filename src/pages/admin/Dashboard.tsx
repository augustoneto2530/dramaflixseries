import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Film, Webhook, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/entrar');
    }
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!isAdmin) return null;

  const menuItems = [
    { title: 'Membros', description: 'Gerenciar usuários e VIPs', icon: Users, href: '/admin/membros' },
    { title: 'Conteúdos', description: 'Gerenciar filmes e séries', icon: Film, href: '/admin/conteudos' },
    { title: 'Webhooks', description: 'Visualizar compras', icon: Webhook, href: '/admin/webhooks' },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Drama_Flix</p>
          </div>
          <Link to="/"><Button variant="outline">Voltar ao Site</Button></Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="w-12 h-12 rounded-lg brand-gradient flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>{item.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-success" />
              Usuários Online em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Funcionalidade de presença em tempo real ativada.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
