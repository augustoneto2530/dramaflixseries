import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContentAccessPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'premium' | 'adult';
  adultPurchaseLink?: string;
}

export function ContentAccessPopup({ open, onOpenChange, type, adultPurchaseLink }: ContentAccessPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            {type === 'adult' ? (
              <Flame className="w-8 h-8 text-category-adult" />
            ) : (
              <Crown className="w-8 h-8 text-primary" />
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {type === 'adult' ? 'Conteúdo +18 Exclusivo' : 'Conteúdo Premium'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            {type === 'adult' ? (
              <>
                Este conteúdo é exclusivo para usuários com acesso +18.
                <br />
                Libere agora para ter acesso a todos os conteúdos adultos!
              </>
            ) : (
              <>
                Este conteúdo é exclusivo para assinantes Premium.
                <br />
                Assine agora e tenha acesso a todo o catálogo!
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          {type === 'adult' ? (
            <>
              {adultPurchaseLink ? (
                <a
                  href={adultPurchaseLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button className="w-full bg-gradient-to-r from-category-adult to-pink-600 hover:from-category-adult/90 hover:to-pink-600/90">
                    <Flame className="w-4 h-4 mr-2" />
                    Liberar Conteúdo +18
                  </Button>
                </a>
              ) : (
                <Button
                  disabled
                  className="w-full bg-gradient-to-r from-category-adult to-pink-600 opacity-50"
                >
                  <Flame className="w-4 h-4 mr-2" />
                  Link de compra não disponível
                </Button>
              )}
              <Link to="/plans" className="w-full">
                <Button variant="outline" className="w-full border-muted-foreground/30">
                  Ver Planos Premium
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/plans" className="w-full">
                <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                  <Crown className="w-4 h-4 mr-2" />
                  Ver Planos
                </Button>
              </Link>
            </>
          )}

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Voltar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
