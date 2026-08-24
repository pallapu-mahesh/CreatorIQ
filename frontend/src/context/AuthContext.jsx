import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('creatoriq_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() =>
    localStorage.getItem('creatoriq_token') || null
  );
  const [loading, setLoading] = useState(Boolean(token));

  const persistAuth = useCallback((tokenValue, userData) => {
    localStorage.setItem('creatoriq_token', tokenValue);
    localStorage.setItem('creatoriq_user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
    setLoading(false);
  }, []);

  const register = useCallback(async ({ fullName, email, password, role }) => {
    const { data } = await api.post('/api/auth/register', {
      full_name: fullName,
      email,
      password,
      role,
    });
    persistAuth(data.access_token, data.user);
    return data;
  }, [persistAuth]);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    persistAuth(data.access_token, data.user);
    return data;
  }, [persistAuth]);

  const loginWithGoogle = useCallback(async (googlePayload) => {
    const { data } = await api.post('/api/auth/google', googlePayload);
    persistAuth(data.access_token, data.user);
    return data;
  }, [persistAuth]);

  const updateProfile = useCallback(async ({ fullName, email, role, avatarUrl }) => {
    const { data } = await api.patch('/api/auth/me', {
      full_name: fullName,
      email,
      role,
      avatar_url: avatarUrl || null,
    });
    persistAuth(data.access_token, data.user);
    return data;
  }, [persistAuth]);

  const updateSettings = useCallback(async ({ theme, language, defaultDashboard }) => {
    const { data } = await api.patch('/api/auth/me', {
      theme,
      language,
      default_dashboard: defaultDashboard,
    });
    persistAuth(data.access_token, data.user);
    return data;
  }, [persistAuth]);

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    const { data } = await api.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    persistAuth(data.access_token, data.user);
    return data;
  }, [persistAuth]);

  const logoutAllSessions = useCallback(async () => {
    const { data } = await api.post('/api/auth/logout-all');
    persistAuth(data.access_token, data.user);
    return data;
  }, [persistAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem('creatoriq_token');
    localStorage.removeItem('creatoriq_user');
    setToken(null);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    const { data } = await api.delete('/api/auth/me');
    logout();
    return data;
  }, [logout]);

  // Validate active session on initial mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get('/api/auth/me')
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem('creatoriq_user', JSON.stringify(data));
      })
      .catch(() => {
        // Clear invalid or expired session
        logout();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, logout]);

  // Apply the user's theme preference to the document root
  useEffect(() => {
    const root = document.documentElement;
    if (user?.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [user?.theme]);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, loginWithGoogle, logout, register, updateProfile, updateSettings, changePassword, logoutAllSessions, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
