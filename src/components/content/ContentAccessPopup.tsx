import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Flame, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContentAccessPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'premium' | 'adult';
  adultPurchaseLink?: string;
}

const ADULT_ACCESS_LINK = 'https://pay.lowify.com.br/checkout?product_id=PfECsZ';
const VIP_PLAN_LINK = 'https://pay.lowify.com.br/checkout?product_id=Z3NV2k';

export function ContentAccessPopup({ open, onOpenChange, type, adultPurchaseLink }: ContentAccessPopupProps) {
  const isAdult = type === 'adult';
  const purchaseLink = adultPurchaseLink || ADULT_ACCESS_LINK;

  if (isAdult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 border-0 bg-transparent overflow-hidden">
          <div className="relative rounded-2xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-orange-900/90 via-orange-950/95 to-zinc-950" />
            
            {/* Close button */}
            <button 
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-white/70" />
            </button>

            {/* Content */}
            <div className="relative z-10 p-8 text-center">
              {/* Icon with +18 badge */}
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Flame className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  +18
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2">
                Conteúdo <span className="text-orange-400">Exclusivo +18</span>
              </h2>

              {/* Description */}
              <p className="text-white/70 text-sm mb-6">
                Este conteúdo é reservado para maiores de 18 anos. Libere seu acesso agora!
              </p>

              {/* Blocked badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6">
                <Lock className="h-4 w-4 text-white/70" />
                <span className="text-sm text-white/70">Conteúdo bloqueado</span>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                {/* Main CTA - Adult Access */}
                <a
                  href={purchaseLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30">
                    <Flame className="w-5 h-5 mr-2" />
                    Liberar Acesso +18
                  </Button>
                </a>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-white/40 text-sm">OU</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>

                {/* VIP Plan Button */}
                <a
                  href={VIP_PLAN_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-base font-semibold border-2 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Plano VIP Anual
                    <Sparkles className="w-4 h-4 ml-2 text-amber-300" />
                  </Button>
                </a>

                {/* VIP info */}
                <p className="text-white/50 text-xs flex items-center justify-center gap-1">
                  O plano VIP anual inclui todo conteúdo +18
                  <span className="text-amber-400">🔥</span>
                </p>

                {/* Back button */}
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="w-full text-white/60 hover:text-white hover:bg-white/10 mt-2"
                >
                  Voltar ao início
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Premium content popup
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border border-border bg-card overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Conteúdo Premium</h2>
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-sm mb-6">
            Este conteúdo é exclusivo para assinantes. Assine agora para ter acesso ilimitado!
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Link to="/planos" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                Ver Oferta
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
