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
  const { activePlatform, platformMeta, PLATFORM_REGISTRY, clearActivePlatform } = useActivePlatform();

  const [pending, setPending] = useState(null); // { targetId }
  const pendingActionRef = useRef(null);

  const close = useCallback(() => {
    setPending(null);
    pendingActionRef.current = null;
  }, []);

  // Run `allowedAction` if no other platform is already active, else block it.
  const guardedConnect = useCallback((targetId, allowedAction) => {
    if (!activePlatform || activePlatform === targetId) {
      allowedAction();
      return;
    }
    pendingActionRef.current = allowedAction;
    setPending({ targetId });
  }, [activePlatform]);

  // "Disconnect" button: tear down the currently active platform, then retry.
  const handleDisconnect = async () => {
    if (!pending) return;
    const action = pendingActionRef.current;
    try {
      clearActivePlatform();
    } catch (err) {
      console.error('Failed to disconnect active platform:', err);
    }
    setPending(null);
    pendingActionRef.current = null;
    if (typeof action === 'function') action();
  };

  const currentName = (activePlatform && PLATFORM_REGISTRY[activePlatform])?.displayName || 'a platform';
  const targetName = (pending && PLATFORM_REGISTRY[pending.targetId])?.displayName || 'this platform';

  return (
    <ConnectionGuardContext.Provider value={{ guardedConnect }}>
      {children}

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Already connected"
        >
          <div
            className="card bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 animate-fade-in dark:bg-slate-900 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-400">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Already Connected</h2>
                <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">
                  You are currently connected with <span className="font-semibold text-slate-700 dark:text-slate-200">{activePlatform ? platformMeta?.displayName || currentName : currentName}</span>.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-xl p-3 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
              Please disconnect {currentName} before connecting {targetName}.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleDisconnect}
                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <LogOut size={14} /> Disconnect {currentName}
              </button>
              <button
                type="button"
                onClick={close}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
              >
                <CheckCircle2 size={14} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ConnectionGuardContext.Provider>
  );
}

/** Hook to access the single-active-platform connection guard. */
export function useConnectionGuard() {
  const context = useContext(ConnectionGuardContext);
  if (!context) {
    throw new Error('useConnectionGuard must be used within a ConnectionGuardProvider');
  }
  return context;
}