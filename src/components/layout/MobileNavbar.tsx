import { Link, useLocation } from 'react-router-dom';
import { Home, Crown, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function MobileNavbar() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0f1419] border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {/* Início */}
        <Link
          to="/"
          className={cn(
            'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
            location.pathname === '/' ? 'text-cyan-400' : 'text-muted-foreground'
          )}
        >
          <div className={cn(
            'p-2 rounded-lg transition-all',
            location.pathname === '/' && 'bg-cyan-400/20'
          )}>
            <Home className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Início</span>
        </Link>

        {/* VIP */}
        <Link
          to="/planos"
          className={cn(
            'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
            location.pathname === '/planos' ? 'text-amber-500' : 'text-muted-foreground'
          )}
        >
          <div className={cn(
            'p-2.5 rounded-full transition-all',
            location.pathname === '/planos' 
              ? 'bg-amber-500/30 ring-2 ring-amber-500/50' 
              : 'bg-amber-900/40 ring-1 ring-amber-700/30'
          )}>
            <Crown className={cn(
              'h-5 w-5',
              location.pathname === '/planos' ? 'text-amber-400' : 'text-amber-500'
            )} />
          </div>
          <span className={cn(
            'text-[10px] font-medium',
            location.pathname === '/planos' ? 'text-amber-400' : 'text-amber-500'
          )}>VIP</span>
        </Link>

        {/* Entrar / Perfil */}
        <Link
          to={user ? '/perfil' : '/entrar'}
          className={cn(
            'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
            (location.pathname === '/entrar' || location.pathname === '/perfil') 
              ? 'text-white' 
              : 'text-muted-foreground'
          )}
        >
          <div className="p-2">
            <LogIn className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">{user ? 'Perfil' : 'Entrar'}</span>
        </Link>
      </div>
    </nav>
  );
}
