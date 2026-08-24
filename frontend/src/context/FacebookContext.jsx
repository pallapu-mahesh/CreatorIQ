import { createContext, useContext, useMemo } from 'react';
import { useActivePlatform } from './ActivePlatformContext';
import { demoData } from './demoData';

const FacebookContext = createContext(null);

export function FacebookProvider({ children }) {
  const { activePlatform, switchPlatform, clearActivePlatform } = useActivePlatform();

  const value = useMemo(() => {
    const isActive = activePlatform === 'facebook';
    const page = isActive ? demoData.facebook.account : null;
    const postsList = isActive ? demoData.facebook.content : [];

    return {
      activePage: page,
      posts: postsList,
      activeSource: isActive ? 'demo' : null,
      connectedAccount: page,
      noPageFound: false,
      loading: false,
      error: null,
      hasActivePage: isActive,
      activatePublicPage: async () => { switchPlatform('facebook'); },
      activateOAuthAccount: async () => { switchPlatform('facebook'); },
      disconnectActivePage: async () => { clearActivePlatform(); },
      syncFacebookData: async () => { return page; },
      reloadConnectedStatus: async () => {},
    };
  }, [activePlatform, switchPlatform, clearActivePlatform]);

  return <FacebookContext.Provider value={value}>{children}</FacebookContext.Provider>;
}

export function useFacebook() {
  const context = useContext(FacebookContext);
  if (!context) {
    throw new Error('useFacebook must be used within a FacebookProvider');
  }
  return context;
}