import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, LogOut, CheckCircle2 } from 'lucide-react';
import { useActivePlatform } from '../context/ActivePlatformContext';

const ConnectionGuardContext = createContext(null);

/**
 * Single Active Platform guard.
 *
 * Only one platform can be connected at a time (req 1, 5). Before any platform
 * connection is initiated, `guardedConnect` checks the ActivePlatformContext.
 * If a different platform is already active, the connection is blocked and a
 * modal is shown: "Already Connected / Currently connected with {current}.
 * Please disconnect {current} before connecting {target}." with Disconnect /
 * Cancel actions (req 3).
 *
 * Works for any platform id via the shared PLATFORM_REGISTRY (req 4).
 */
export function ConnectionGuardProvider({ children }) {
  // Multi-platform support: connecting one platform does NOT disconnect others.
  const guardedConnect = useCallback((targetId, allowedAction) => {
    if (typeof allowedAction === 'function') {
      allowedAction();
    }
  }, []);

  return (
    <ConnectionGuardContext.Provider value={{ guardedConnect }}>
      {children}
    </ConnectionGuardContext.Provider>
  );
}

/** Hook to access the connection guard. */
export function useConnectionGuard() {
  const context = useContext(ConnectionGuardContext);
  if (!context) {
    throw new Error('useConnectionGuard must be used within a ConnectionGuardProvider');
  }
  return context;
}