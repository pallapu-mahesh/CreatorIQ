import { createContext, useContext, useMemo } from 'react';
import { useActivePlatform } from './ActivePlatformContext';
import { demoData } from './demoData';

const FacebookContext = createContext(null);

export function FacebookProvider({ children }) {
  const {
    connectedPlatforms,
    connectedAccounts,
    connectedContent,
    connectPlatform,
    disconnectPlatform,
  } = useActivePlatform();

  const value = useMemo(() => {
    const isConnected = (connectedPlatforms || []).includes('facebook');
    const page = connectedAccounts?.facebook || (isConnected ? demoData.facebook.account : null);
    const postsList = connectedContent?.facebook || (isConnected ? demoData.facebook.content : []);

    return {
      activePage: page,
      posts: postsList,
      activeSource: isConnected ? 'connected' : null,
      connectedAccount: page,
      noPageFound: false,
      loading: false,
      error: null,
      hasActivePage: isConnected,
      activatePublicPage: async () => { await connectPlatform('facebook'); },
      activateOAuthAccount: async () => { await connectPlatform('facebook'); },
      disconnectActivePage: async () => { await disconnectPlatform('facebook'); },
      syncFacebookData: async () => { return page; },
      reloadConnectedStatus: async () => {},
    };
  }, [connectedPlatforms, connectedAccounts, connectedContent, connectPlatform, disconnectPlatform]);

  return <FacebookContext.Provider value={value}>{children}</FacebookContext.Provider>;
}

export function useFacebook() {
  const context = useContext(FacebookContext);
  if (!context) {
    throw new Error('useFacebook must be used within a FacebookProvider');
  }
  return context;
}