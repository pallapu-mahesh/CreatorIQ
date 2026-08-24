import { createContext, useContext, useMemo } from 'react';
import { useActivePlatform } from './ActivePlatformContext';
import { demoData } from './demoData';

const InstagramContext = createContext(null);

export function InstagramProvider({ children }) {
  const { activePlatform, switchPlatform, clearActivePlatform } = useActivePlatform();

  const value = useMemo(() => {
    const isActive = activePlatform === 'instagram';
    const profile = isActive ? demoData.instagram.account : null;
    const mediaList = isActive ? demoData.instagram.content : [];

    return {
      activeProfile: profile,
      media: mediaList,
      activeSource: isActive ? 'demo' : null,
      connectedAccount: profile,
      noAccountFound: false,
      loading: false,
      error: null,
      hasActiveProfile: isActive,
      activatePublicProfile: async () => { switchPlatform('instagram'); },
      activateOAuthAccount: async () => { switchPlatform('instagram'); },
      disconnectActiveProfile: async () => { clearActivePlatform(); },
      syncInstagramData: async () => { return profile; },
      reloadConnectedStatus: async () => {},
    };
  }, [activePlatform, switchPlatform, clearActivePlatform]);

  return <InstagramContext.Provider value={value}>{children}</InstagramContext.Provider>;
}

export function useInstagram() {
  const context = useContext(InstagramContext);
  if (!context) {
    throw new Error('useInstagram must be used within an InstagramProvider');
  }
  return context;
}
