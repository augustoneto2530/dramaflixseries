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

  // Hide only when already installed
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    console.log('PWA: Install button clicked');

    // If native prompt available → 1-click install
    if (canPromptInstall) {
      const installed = await promptInstall();
      console.log('PWA: Install result:', installed);
      if (installed) return; // Success, nothing else needed
    }

    // Fallback: short toast with instructions
    if (isIOS) {
      toast.info('Toque em ⬆️ Compartilhar → "Adicionar à Tela de Início"', { duration: 4000 });
    } else if (isAndroid) {
      toast.info('Menu ⋮ → "Instalar app"', { duration: 4000 });
    } else {
      toast.info('Clique em ⊕ na barra de endereço', { duration: 4000 });
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
