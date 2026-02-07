import { Link } from 'react-router-dom';
import dramaflixLogo from '@/assets/dramaflix-logo.png';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-10">
        {/* Logo centralizada */}
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img
              src={dramaflixLogo}
              alt="Dramaflix"
              className="w-20 h-20 rounded-2xl object-contain"
            />
          </Link>
        </div>

        {/* Links em linha */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-8">
          <Link to="/termos" className="text-muted-foreground hover:text-foreground transition-colors">
            Termos de Uso
          </Link>
          <Link to="/privacidade" className="text-muted-foreground hover:text-foreground transition-colors">
            Política de Privacidade
          </Link>
          <Link to="/suporte" className="text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </Link>
          <Link to="/suporte" className="text-muted-foreground hover:text-foreground transition-colors">
            Contato
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-center text-muted-foreground">
          © {new Date().getFullYear()} Dramaflix. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
