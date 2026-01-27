import { useState } from 'react';
import { Download, Smartphone, Share, Plus, X, Check, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function InstallAppButton() {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    showIOSInstructions,
    promptInstall,
    dismissIOSInstructions,
  } = usePWAInstall();
  
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    const installed = await promptInstall();
    // If prompt didn't work and it's not iOS (which shows its own modal), show manual instructions
    if (!installed && !isIOS) {
      setShowManualInstructions(true);
    }
  };

  return (
    <>
      {/* Install Button */}
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

      {/* iOS Instructions Modal */}
      <Dialog open={showIOSInstructions} onOpenChange={dismissIOSInstructions}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Smartphone className="h-6 w-6 text-primary" />
              Instalar Dramaflix
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Adicione o app à sua tela inicial para uma experiência completa de streaming
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">1</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  Toque no botão <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-md"><Share className="h-4 w-4" /> Compartilhar</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Na barra inferior do Safari
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">2</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  Toque em <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-md"><Plus className="h-4 w-4" /> Adicionar à Tela de Início</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Role para baixo se necessário
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">3</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  Toque em <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-md"><Check className="h-4 w-4" /> Adicionar</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  O app aparecerá na sua tela inicial
                </p>
              </div>
            </div>
          </div>

          {/* Visual Preview */}
          <div className="mt-2 p-4 bg-muted/50 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">D</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Dramaflix</p>
                <p className="text-xs text-muted-foreground">Seu app de streaming favorito</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={dismissIOSInstructions} 
            className="w-full mt-4 bg-primary hover:bg-primary/90"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>

      {/* Android/Desktop Manual Instructions Modal */}
      <Dialog open={showManualInstructions} onOpenChange={setShowManualInstructions}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {isAndroid ? (
                <Smartphone className="h-6 w-6 text-primary" />
              ) : (
                <Monitor className="h-6 w-6 text-primary" />
              )}
              Instalar Dramaflix
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isAndroid 
                ? 'Adicione o app à sua tela inicial'
                : 'Instale o app no seu computador'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {isAndroid ? (
              <>
                {/* Android Chrome Instructions */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Toque no menu <span className="px-2 py-0.5 bg-muted rounded-md">⋮</span> do Chrome
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      No canto superior direito
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Toque em "Adicionar à tela inicial" ou "Instalar app"
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Confirme tocando em "Adicionar"
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Desktop Chrome Instructions */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Clique no ícone <span className="px-2 py-0.5 bg-muted rounded-md">⊕</span> na barra de endereço
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ou vá em Menu → "Instalar Dramaflix..."
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Clique em "Instalar" no popup
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      O app será adicionado aos seus aplicativos
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Visual Preview */}
          <div className="mt-2 p-4 bg-muted/50 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">D</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Dramaflix</p>
                <p className="text-xs text-muted-foreground">Seu app de streaming favorito</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setShowManualInstructions(false)} 
            className="w-full mt-4 bg-primary hover:bg-primary/90"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
