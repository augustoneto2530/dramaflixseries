import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  showIOSInstructions: boolean;
  canPromptInstall: boolean;
  promptInstall: () => Promise<boolean>;
  dismissIOSInstructions: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  
  // Check if running as standalone (installed PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  useEffect(() => {
    // Already installed
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      console.log('PWA: beforeinstallprompt event captured!');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      console.log('PWA: App was installed!');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if we're in a context where PWA install is possible
    console.log('PWA: Listening for install prompt...', {
      isSecure: window.location.protocol === 'https:',
      isStandalone,
      userAgent: navigator.userAgent.substring(0, 50)
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    // For iOS, show instructions modal
    if (isIOS && !isStandalone) {
      setShowIOSInstructions(true);
      return false;
    }

    // For Android/Chrome with deferred prompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error showing install prompt:', error);
        return false;
      }
    }

    // No prompt available - return false to trigger manual instructions
    return false;
  }, [deferredPrompt, isIOS, isStandalone]);

  const dismissIOSInstructions = useCallback(() => {
    setShowIOSInstructions(false);
  }, []);

  // Android/Chromium only: true when we have the real native prompt event captured.
  const canPromptInstall = !!deferredPrompt;

  // Always show install button (except when already installed)
  // On production with HTTPS, the native prompt will work
  // Otherwise, we show manual instructions
  return {
    // To behave like kdramatv: only show install UI when the native prompt is available.
    // (iOS doesn't support one-click install, so we don't mark it installable.)
    isInstallable: !isInstalled && !isStandalone && canPromptInstall,
    isInstalled: isInstalled || isStandalone,
    isIOS,
    isAndroid,
    isStandalone,
    showIOSInstructions,
    canPromptInstall,
    promptInstall,
    dismissIOSInstructions,
  };
}