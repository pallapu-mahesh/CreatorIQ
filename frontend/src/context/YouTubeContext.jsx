import { createContext, useContext, useMemo } from 'react';
import { useActivePlatform } from './ActivePlatformContext';
import { demoData } from './demoData';
import { toLegacyChannel, toLegacyVideos } from '../lib/platformAdapter';

const YouTubeContext = createContext(null);

export function YouTubeProvider({ children }) {
  const { activePlatform, platformMeta, switchPlatform, clearActivePlatform } = useActivePlatform();

  const value = useMemo(() => {
    const isActive = activePlatform === 'youtube';
    // Map the fixed demo account/content into the legacy "channel + videos"
    // shape that YouTubeIntegration and other legacy pages consume.
    const channel = isActive ? toLegacyChannel(demoData.youtube.account, platformMeta) : null;
    const videosList = isActive ? toLegacyVideos(demoData.youtube.content) : [];

    return {
      activeChannel: channel,
      videos: videosList,
      activeSource: isActive ? 'demo' : null,
      connectedAccount: channel,
      noChannelFound: false,
      loading: false,
      error: null,
      hasActiveChannel: isActive,
      activatePublicChannel: async () => { switchPlatform('youtube'); },
      activateOAuthChannel: async () => { switchPlatform('youtube'); },
      disconnectActiveChannel: async () => { clearActivePlatform(); },
      refreshActiveChannel: async () => {},
      reloadConnectedStatus: async () => {},
    };
  }, [activePlatform, platformMeta, switchPlatform, clearActivePlatform]);

  return <YouTubeContext.Provider value={value}>{children}</YouTubeContext.Provider>;
}

export function useYouTube() {
  const context = useContext(YouTubeContext);
  if (!context) {
    throw new Error('useYouTube must be used within a YouTubeProvider');
  }
  return context;
}
