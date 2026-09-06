import { createContext, useContext, useMemo } from 'react';
import { useActivePlatform } from './ActivePlatformContext';
import { demoData } from './demoData';
import { toLegacyChannel, toLegacyVideos } from '../lib/platformAdapter';

const YouTubeContext = createContext(null);

export function YouTubeProvider({ children }) {
  const {
    connectedPlatforms,
    connectedAccounts,
    connectedContent,
    platformMeta,
    connectPlatform,
    disconnectPlatform,
  } = useActivePlatform();

  const value = useMemo(() => {
    const isConnected = (connectedPlatforms || []).includes('youtube');
    const rawAccount = connectedAccounts?.youtube || (isConnected ? demoData.youtube.account : null);
    const rawContent = connectedContent?.youtube || (isConnected ? demoData.youtube.content : []);
    const channel = isConnected ? toLegacyChannel(rawAccount, platformMeta) : null;
    const videosList = isConnected ? toLegacyVideos(rawContent) : [];

    return {
      activeChannel: channel,
      videos: videosList,
      activeSource: isConnected ? 'connected' : null,
      connectedAccount: channel,
      noChannelFound: false,
      loading: false,
      error: null,
      hasActiveChannel: isConnected,
      activatePublicChannel: async () => { await connectPlatform('youtube'); },
      activateOAuthChannel: async () => { await connectPlatform('youtube'); },
      disconnectActiveChannel: async () => { await disconnectPlatform('youtube'); },
      refreshActiveChannel: async () => {},
      reloadConnectedStatus: async () => {},
    };
  }, [connectedPlatforms, connectedAccounts, connectedContent, platformMeta, connectPlatform, disconnectPlatform]);

  return <YouTubeContext.Provider value={value}>{children}</YouTubeContext.Provider>;
}

export function useYouTube() {
  const context = useContext(YouTubeContext);
  if (!context) {
    throw new Error('useYouTube must be used within a YouTubeProvider');
  }
  return context;
}
