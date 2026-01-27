import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { InstallAppButton } from './InstallAppButton';

export function InstallBanner() {
  const { isInstallable, isInstalled, isStandalone } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show banner after a short delay for better UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  // Don't show if already installed, not installable, dismissed, or running as standalone
  if (isInstalled || !isInstallable || isDismissed || isStandalone || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 animate-fade-in">
      <div className="max-w-md mx-auto bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Fechar banner"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-red-700 flex items-center justify-center shadow-lg shadow-primary/30">
            <Smartphone className="h-7 w-7 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-foreground">Instale o Dramflix</h3>
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              Acesse seus doramas favoritos direto da tela inicial, sem navegador!
            </p>
          </div>
        </div>

        {/* Install Button */}
        <div className="mt-4 flex justify-end">
          <InstallAppButton />
        </div>
      </div>
    </div>
  );
}
