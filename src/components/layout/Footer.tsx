import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg brand-gradient flex items-center justify-center">
                <span className="text-xl font-bold text-white">D</span>
              </div>
              <span className="text-xl font-bold brand-gradient-text">Drama_Flix</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              Sua plataforma de streaming com os melhores doramas, novelas, filmes e séries. 
              Assista onde e quando quiser.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Navegação</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/categoria/doramas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Doramas
                </Link>
              </li>
              <li>
                <Link to="/categoria/novelas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Novelas
                </Link>
              </li>
              <li>
                <Link to="/categoria/filmes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Filmes
                </Link>
              </li>
              <li>
                <Link to="/categoria/series" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Séries
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Planos
                </Link>
              </li>
              <li>
                <Link to="/suporte" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Suporte
                </Link>
              </li>
              <li>
                <Link to="/termos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Drama_Flix. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
