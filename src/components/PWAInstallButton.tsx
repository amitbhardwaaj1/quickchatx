import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export const PWAInstallButton = () => {
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const ua = navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isApple);

    // Listen for install prompt
    const handleBeforeInstallPrompt = () => {
      setShowInstall(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setShowInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (typeof window !== 'undefined' && 'installApp' in window) {
      await (window as any).installApp();
    }
  };

  if (!showInstall && !isIOS) {
    return null;
  }

  if (isIOS) {
    return (
      <button
        onClick={() => {/* iOS install instructions */}}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
        title="Install app on iOS: Tap Share > Add to Home Screen"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Install</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
      title="Install app to home screen"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
};

export default PWAInstallButton;
