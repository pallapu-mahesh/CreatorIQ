import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  KeyRound,
  Palette,
  Share2,
  AlertTriangle,
  LogOut,
  Trash2,
  Moon,
  Sun,
  Link2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useActivePlatform } from '../context/ActivePlatformContext';
import { useConnectionGuard } from '../components/ConnectionGuard';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS = ['creator', 'agency', 'marketing', 'admin'];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

const DASHBOARD_OPTIONS = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/dashboard/content', label: 'Content Analytics' },
  { value: '/dashboard/audience', label: 'Audience Analytics' },
  { value: '/dashboard/growth', label: 'Growth Trends' },
  { value: '/dashboard/revenue', label: 'Revenue Analytics' },
  { value: '/dashboard/social', label: 'Social Accounts' },
  { value: '/dashboard/reports', label: 'Reports' },
  { value: '/dashboard/notifications', label: 'Notifications' },
];

const formatRole = (role) =>
  role ? role.charAt(0).toUpperCase() + role.slice(1) : '—';

const extractError = (err) => {
  const detail = err.response?.data?.detail;
  if (detail) return detail;
  if (err.response?.status) return `Backend error (HTTP ${err.response.status}) — check the server logs.`;
  return 'Network error — could not reach the backend. Make sure the server is running.';
};

function SectionCard({ icon: Icon, title, description, danger = false, children }) {
  return (
    <div className={`card p-6 ${danger ? 'border-red-200' : ''}`}>
      <div className="flex items-center gap-2 mb-5">
        <div className={`w-9 h-9 ${danger ? 'bg-red-50' : 'bg-slate-100'} rounded-xl flex items-center justify-center shrink-0`}>
          <Icon size={16} className={danger ? 'text-red-500' : 'text-slate-600'} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionMessage({ type, children }) {
  if (!children) return null;
  return (
    <div className={`flex items-center gap-2 ${type === 'error' ? 'alert-error mb-4' : 'alert-success mb-4'}`} role="alert">
      {type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
      {children}
    </div>
  );
}

export default function Settings() {
  const {
    user,
    updateProfile,
    updateSettings,
    changePassword,
    logoutAllSessions,
    deleteAccount,
  } = useAuth();
  const { activePlatform, PLATFORM_REGISTRY, switchPlatform, clearActivePlatform } = useActivePlatform();
  const { guardedConnect } = useConnectionGuard();
  const navigate = useNavigate();

  // Account Settings
  const [accountForm, setAccountForm] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'creator',
  });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMsg, setAccountMsg] = useState(null);

  // Security
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [securityMsg, setSecurityMsg] = useState(null);

  // Application Preferences
  const [prefs, setPrefs] = useState({
    theme: user?.theme || 'light',
    language: user?.language || 'en',
    defaultDashboard: user?.default_dashboard || '/dashboard',
  });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState(null);

  // Platform + danger zone
  const [platformMsg, setPlatformMsg] = useState(null);
  const [dangerMsg, setDangerMsg] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleAccountChange = (e) => {
    setAccountForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (accountMsg) setAccountMsg(null);
  };

  const handleAccountSave = async (e) => {
    e.preventDefault();
    const fullName = accountForm.fullName.trim();
    const email = accountForm.email.trim();

    if (fullName.length < 2) {
      setAccountMsg({ type: 'error', text: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!email) {
      setAccountMsg({ type: 'error', text: 'Email is required.' });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setAccountMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setAccountSaving(true);
    setAccountMsg(null);
    try {
      await updateProfile({ fullName, email, role: accountForm.role });
      setAccountForm({ fullName, email, role: accountForm.role });
      setAccountMsg({ type: 'success', text: 'Account settings saved successfully.' });
    } catch (err) {
      console.error('Account settings update failed:', err);
      setAccountMsg({ type: 'error', text: extractError(err) });
    } finally {
      setAccountSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (securityMsg) setSecurityMsg(null);
  };

  const handlePasswordSubmit = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      setSecurityMsg({ type: 'error', text: 'Enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setSecurityMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordSaving(true);
    setSecurityMsg(null);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSecurityMsg({ type: 'success', text: 'Password updated successfully.' });
    } catch (err) {
      console.error('Password change failed:', err);
      setSecurityMsg({ type: 'error', text: extractError(err) });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePrefsSave = async () => {
    setPrefsSaving(true);
    setPrefsMsg(null);
    try {
      await updateSettings({
        theme: prefs.theme,
        language: prefs.language,
        defaultDashboard: prefs.defaultDashboard,
      });
      setPrefsMsg({ type: 'success', text: 'Preferences saved successfully.' });
    } catch (err) {
      console.error('Preferences update failed:', err);
      setPrefsMsg({ type: 'error', text: extractError(err) });
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleConnect = (platformId) => {
    guardedConnect(platformId, () => {
      switchPlatform(platformId);
      setPlatformMsg({ type: 'success', text: 'Platform connected.' });
    });
  };

  const handleDisconnect = () => {
    clearActivePlatform();
    setPlatformMsg({ type: 'success', text: 'Platform disconnected.' });
  };

  const handleConfirm = async () => {
    if (confirmModal === 'logout-all') {
      setConfirmModal(null);
      setLoggingOut(true);
      setSecurityMsg(null);
      try {
        await logoutAllSessions();
        setSecurityMsg({ type: 'success', text: 'Logged out of all other sessions.' });
      } catch (err) {
        console.error('Logout all sessions failed:', err);
        setSecurityMsg({ type: 'error', text: extractError(err) });
      } finally {
        setLoggingOut(false);
      }
      return;
    }

    if (confirmModal === 'delete') {
      setDeleting(true);
      setDangerMsg(null);
      try {
        await deleteAccount();
        navigate('/login', { replace: true });
      } catch (err) {
        console.error('Account deletion failed:', err);
        setConfirmModal(null);
        setDeleting(false);
        setDangerMsg({ type: 'error', text: extractError(err) });
      }
    }
  };

  const isGoogleConnected = user?.auth_provider === 'google';
  const platformEntries = Object.values(PLATFORM_REGISTRY);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account, security, and application preferences</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* 1. Account Settings */}
        <SectionCard
          icon={User}
          title="Account Settings"
          description="Your personal information"
        >
          <form onSubmit={handleAccountSave} noValidate className="space-y-4">
            <SectionMessage type={accountMsg?.type}>{accountMsg?.text}</SectionMessage>

            <div>
              <label htmlFor="settings-fullname" className="form-label">Full Name</label>
              <input
                id="settings-fullname"
                name="fullName"
                type="text"
                autoComplete="name"
                value={accountForm.fullName}
                onChange={handleAccountChange}
                className="form-input"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="settings-email" className="form-label">Email</label>
              <input
                id="settings-email"
                name="email"
                type="email"
                autoComplete="email"
                value={accountForm.email}
                onChange={handleAccountChange}
                className="form-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="settings-role" className="form-label">Role</label>
              <select
                id="settings-role"
                name="role"
                value={accountForm.role}
                onChange={handleAccountChange}
                className="form-input"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{formatRole(role)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <p className="text-xs text-slate-500">Account Status</p>
                <span className={`badge mt-1 ${user?.is_active ? 'badge-green' : 'badge-red'}`}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button
                type="submit"
                disabled={accountSaving}
                className="btn-primary text-xs font-bold rounded-xl px-5 py-2.5"
              >
                {accountSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* 2. Security */}
        <SectionCard
          icon={Shield}
          title="Security"
          description="Password and session management"
        >
          <div className="space-y-4">
            <SectionMessage type={securityMsg?.type}>{securityMsg?.text}</SectionMessage>

            {/* Change Password */}
            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={14} className="text-slate-500" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Change Password</h3>
            </div>
            <div>
              <label htmlFor="settings-current-password" className="form-label">Current Password</label>
              <input
                id="settings-current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                className="form-input"
                placeholder="Your current password"
              />
            </div>
            <div>
              <label htmlFor="settings-new-password" className="form-label">New Password</label>
              <input
                id="settings-new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                className="form-input"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label htmlFor="settings-confirm-password" className="form-label">Confirm New Password</label>
              <input
                id="settings-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className="form-input"
                placeholder="Repeat your new password"
              />
            </div>
            <button
              type="button"
              onClick={handlePasswordSubmit}
              disabled={passwordSaving}
              className="btn-primary text-xs font-bold rounded-xl px-5 py-2.5"
            >
              {passwordSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>

          <div className="my-5 border-t border-slate-100" />

          {/* Google Account connection status */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Google Account</p>
              <p className="text-xs text-slate-500">Sign-in connection status</p>
            </div>
            <span className={`badge shrink-0 ${isGoogleConnected ? 'badge-green' : 'badge-slate'}`}>
              {isGoogleConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 mt-5 pt-5 border-t border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">Logout from all sessions</p>
              <p className="text-xs text-slate-500">Sign out of every device where you are logged in</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmModal('logout-all')}
              disabled={loggingOut}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <LogOut size={13} /> {loggingOut ? 'Logging out…' : 'Logout All'}
            </button>
          </div>
        </SectionCard>

        {/* 3. Application Preferences */}
        <SectionCard
          icon={Palette}
          title="Application Preferences"
          description="Personalize your experience"
        >
          <div className="space-y-4">
            <SectionMessage type={prefsMsg?.type}>{prefsMsg?.text}</SectionMessage>

            <div>
              <label className="form-label">Theme</label>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, theme: 'light' }))}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                    prefs.theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sun size={13} /> Light
                </button>
                <button
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, theme: 'dark' }))}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                    prefs.theme === 'dark' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Moon size={13} /> Dark
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="settings-language" className="form-label">Language</label>
              <select
                id="settings-language"
                value={prefs.language}
                onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))}
                className="form-input"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="settings-default-dashboard" className="form-label">Default Dashboard Page</label>
              <select
                id="settings-default-dashboard"
                value={prefs.defaultDashboard}
                onChange={(e) => setPrefs((p) => ({ ...p, defaultDashboard: e.target.value }))}
                className="form-input"
              >
                {DASHBOARD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrefsSave}
              disabled={prefsSaving}
              className="btn-primary text-xs font-bold rounded-xl px-5 py-2.5"
            >
              {prefsSaving ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </SectionCard>

        {/* 5. Danger Zone */}
        <SectionCard
          icon={AlertTriangle}
          title="Danger Zone"
          description="Permanently remove your account and all associated data"
          danger
        >
          <SectionMessage type={dangerMsg?.type}>{dangerMsg?.text}</SectionMessage>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-red-700">Delete Account</p>
              <p className="text-xs text-slate-500">This action cannot be undone.</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmModal('delete')}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Trash2 size={13} /> Delete Account
            </button>
          </div>
        </SectionCard>
      </div>

      {/* Confirmation modal */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setConfirmModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={confirmModal === 'delete' ? 'Delete account confirmation' : 'Logout all sessions confirmation'}
        >
          <div
            className="card bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                confirmModal === 'delete' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}>
                {confirmModal === 'delete' ? <Trash2 size={22} /> : <LogOut size={22} />}
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-slate-900">
                  {confirmModal === 'delete' ? 'Delete your account?' : 'Log out of all sessions?'}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {confirmModal === 'delete'
                    ? 'Your account and all associated data will be permanently removed. This cannot be undone.'
                    : 'You will be signed out on every other device. Your current session will remain active.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={deleting || loggingOut}
                className={`py-2.5 px-3 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  confirmModal === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {confirmModal === 'delete' ? (
                  <>{deleting ? 'Deleting…' : 'Delete Account'}</>
                ) : (
                  <>{loggingOut ? 'Logging out…' : 'Logout All'}</>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}