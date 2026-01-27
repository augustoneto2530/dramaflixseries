import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, User, LogOut, Settings, Crown, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import dramaflixLogo from '@/assets/dramaflix-logo.png';

const categories = [
  { name: '+18', href: '/categoria/adult' },
  { name: 'Doramas', href: '/categoria/doramas' },
  { name: 'Novelas', href: '/categoria/novelas' },
  { name: 'Filmes', href: '/categoria/filmes' },
  { name: 'Séries', href: '/categoria/series' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black">
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={dramaflixLogo} 
              alt="DramaFlix" 
              className="h-20 md:h-20 w-auto object-contain"
            />
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar doramas, séries, filmes..."
                className="pl-10 bg-muted/50 border-border focus:bg-muted rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Search Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 text-foreground hover:bg-white/10"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Install App Button - Desktop */}
            <div className="hidden md:block">
              <InstallAppButton />
            </div>

            {/* Support Link - Desktop */}
            <Link to="/suporte" className="hidden md:flex">
              <Button variant="ghost" size="sm" className="gap-2 text-secondary">
                <MessageCircle className="h-4 w-4" />
                Suporte
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 text-foreground hover:bg-white/10">
                    <User className="h-5 w-5" />
                    {profile?.is_vip && (
                      <Crown className="absolute -top-1 -right-1 h-3 w-3 text-accent" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile?.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {profile?.subscription_status === 'active' && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-success">
                        <Crown className="h-3 w-3" />
                        {profile.plan_type === 'annual' ? 'Plano Anual' : 'Plano Mensal'}
                      </span>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/minha-lista">Minha Lista</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/perfil">Perfil</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 text-primary">
                          <Settings className="h-4 w-4" />
                          Área Admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/planos" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  Planos
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 text-foreground hover:bg-white/10"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        {isSearchOpen && (
          <div className="md:hidden pb-3 animate-fade-in">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar doramas, séries, filmes..."
                className="pl-10 bg-muted/80 rounded-full h-10 text-sm border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 bg-background/95 backdrop-blur-md rounded-lg mt-2 animate-fade-in border border-border">
            <div className="flex flex-col gap-1">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  to={category.href}
                  className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
              <div className="border-t border-border my-2" />
              <Link
                to="/planos"
                className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Planos
              </Link>
              <Link
                to="/suporte"
                className="px-4 py-3 text-sm font-medium text-secondary hover:text-foreground hover:bg-muted/50 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Suporte
              </Link>
              {!user && (
                <Link
                  to="/entrar"
                  className="px-4 py-3 text-sm font-medium text-primary hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Entrar
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
