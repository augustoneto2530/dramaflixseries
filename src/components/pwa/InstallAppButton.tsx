import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

export function InstallAppButton() {
  const {
    isInstalled,
    isIOS,
    isAndroid,
    canPromptInstall,
    promptInstall,
  } = usePWAInstall();

  // One-click install is not possible on iOS Safari; hide the button to avoid instructions.
  if (isInstalled || isIOS) {
    return null;
  }

  const handleClick = async () => {
    console.log('PWA: Install button clicked');

    if (!canPromptInstall) {
      toast.info('Instalação disponível apenas no site publicado (HTTPS) e em navegadores compatíveis.', {
        duration: 5000,
      });
      return;
    }

    const installed = await promptInstall();
    console.log('PWA: Install result:', installed);
    
    if (!installed) {
      if (isIOS) {
        // iOS doesn't support automatic install
        toast.info('Toque em Compartilhar ⬆️ e depois "Adicionar à Tela de Início"', {
          duration: 5000,
        });
      } else if (isAndroid) {
        // Android but no prompt available - might be in preview
        toast.info('Abra o menu do navegador (⋮) e toque em "Instalar app" ou "Adicionar à tela inicial"', {
          duration: 5000,
        });
      } else {
        // Desktop
        toast.info('Clique no ícone ⊕ na barra de endereço para instalar', {
          duration: 5000,
        });
      }
    }
  };

  return (
    <Button
      onClick={handleClick}
      className="group relative overflow-hidden bg-gradient-to-r from-primary via-red-600 to-primary hover:from-red-600 hover:via-primary hover:to-red-600 text-primary-foreground font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:scale-105"
    >
      <span className="relative z-10 flex items-center gap-2">
        {isIOS ? (
          <Smartphone className="h-4 w-4" />
        ) : (
          <Download className="h-4 w-4 group-hover:animate-bounce" />
        )}
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </span>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </Button>
  );
}
