import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'creatoriq_notifications';

/**
 * Centralized notification source for the whole app.
 *
 * This is the ONLY place notification state lives. Components (e.g. the
 * Reports page) may call `addNotification` when an event happens, but the
 * notifications are rendered exclusively on the Notifications page.
 */
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // storage unavailable — ignore
    }
  }, [notifications]);

  const addNotification = useCallback(({ title, type, details, platform, reportPeriod, emailStatus, emailRecipient, format }) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        type,
        datetime: new Date().toISOString(),
        read: false,
        details,
        platform,
        reportPeriod,
        emailStatus,
        emailRecipient,
        format,
      },
      ...prev,
    ]);
  }, []);

  // Add a batch of notifications, skipping any whose id already exists
  // (used for data-derived seeding that must not duplicate on re-render).
  const addNotifications = useCallback((items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    setNotifications((prev) => {
      const existing = new Set(prev.map((n) => n.id));
      const fresh = items.filter((n) => n && n.id && !existing.has(n.id));
      return fresh.length ? [...fresh, ...prev] : prev;
    });
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markUnread = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      addNotifications,
      markRead,
      markUnread,
      markAllRead,
      clearNotifications,
    }),
    [notifications, unreadCount, addNotification, addNotifications, markRead, markUnread, markAllRead, clearNotifications],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
