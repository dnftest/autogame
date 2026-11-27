import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { assetLoader } from './assets/assetLoader';
import { BattleViewport } from './components/BattleViewport';
import { BottomTabs } from './components/BottomTabs';
import { OfflineRewardModal } from './components/OfflineRewardModal';
import { SkillBar } from './components/SkillBar';
import { TagSwitchBar } from './components/TagSwitchBar';
import { TopHud } from './components/TopHud';
import { useGameStore } from './store/useGameStore';

export function App() {
  useEffect(() => {
    const store = useGameStore.getState();
    store.loadGame();
    store.checkOfflineProgress();
    void assetLoader.loadAssets();

    if (Capacitor.isNativePlatform()) {
      void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    }

    const saveInterval = window.setInterval(() => {
      useGameStore.getState().saveGame();
    }, 5000);

    const autoUpgradeInterval = window.setInterval(() => {
      const st = useGameStore.getState();
      st.runAutoUpgrades();
      st.runAutoHeroBoss();
    }, 700);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        useGameStore.getState().saveGame();
      } else {
        useGameStore.getState().checkOfflineProgress();
      }
    };

    const handleBeforeUnload = () => {
      useGameStore.getState().saveGame();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    let capListenerHandle: { remove: () => Promise<void> } | null = null;
    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          useGameStore.getState().saveGame();
        } else {
          useGameStore.getState().checkOfflineProgress();
        }
      }).then((handle) => {
        capListenerHandle = handle;
      });
    }

    return () => {
      window.clearInterval(saveInterval);
      window.clearInterval(autoUpgradeInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (capListenerHandle) {
        void capListenerHandle.remove();
      }
    };
  }, []);

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[460px] flex-col overflow-hidden bg-[#0b1020] shadow-2xl shadow-black/70">
      <TopHud />
      <BattleViewport />
      <TagSwitchBar />
      <SkillBar />
      <BottomTabs />
      <OfflineRewardModal />
    </main>
  );
}

export default App;
