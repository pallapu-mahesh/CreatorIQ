import { createContext, useContext, useMemo } from 'react';
import { useActivePlatform } from './ActivePlatformContext';
import { demoData } from './demoData';

const InstagramContext = createContext(null);

export function InstagramProvider({ children }) {
  const {
    connectedPlatforms,
    connectedAccounts,
    connectedContent,
    connectPlatform,
    disconnectPlatform,
  } = useActivePlatform();

  const value = useMemo(() => {
    const isConnected = (connectedPlatforms || []).includes('instagram');
    const profile = connectedAccounts?.instagram || (isConnected ? demoData.instagram.account : null);
    const mediaList = connectedContent?.instagram || (isConnected ? demoData.instagram.content : []);

    return {
      activeProfile: profile,
      media: mediaList,
      activeSource: isConnected ? 'connected' : null,
      connectedAccount: profile,
      noAccountFound: false,
      loading: false,
      error: null,
      hasActiveProfile: isConnected,
      activatePublicProfile: async () => { await connectPlatform('instagram'); },
      activateOAuthAccount: async () => { await connectPlatform('instagram'); },
      disconnectActiveProfile: async () => { await disconnectPlatform('instagram'); },
      syncInstagramData: async () => { return profile; },
      reloadConnectedStatus: async () => {},
    };
  }, [connectedPlatforms, connectedAccounts, connectedContent, connectPlatform, disconnectPlatform]);

  return <InstagramContext.Provider value={value}>{children}</InstagramContext.Provider>;
}

export function useInstagram() {
  const context = useContext(InstagramContext);
  if (!context) {
    throw new Error('useInstagram must be used within an InstagramProvider');
  }
  return context;
}
