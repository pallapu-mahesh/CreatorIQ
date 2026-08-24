import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 z-20 dark:bg-slate-900 dark:border-slate-700">
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            id="navbar-search"
            type="search"
            placeholder="Search…"
            className="form-input pl-9 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notification bell */}
        <button
          id="navbar-notifications"
          onClick={() => navigate('/dashboard/notifications')}
          className="relative btn-ghost p-2 rounded-lg"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-600 rounded-full" />
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            id="navbar-user-menu"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 btn-ghost px-2.5 py-1.5 rounded-lg"
          >
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user?.full_name || 'User'} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-brand-700">
                  {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block dark:text-slate-200">
              {user?.full_name?.split(' ')[0]}
            </span>
            <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-900 truncate dark:text-slate-100">{user?.full_name}</p>
                  <p className="text-xs text-slate-500 truncate dark:text-slate-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => { navigate('/dashboard/profile'); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <User size={15} /> Profile
                </button>
                <button
                  onClick={() => { navigate('/dashboard/settings'); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Settings size={15} /> Settings
                </button>
                <div className="border-t border-slate-100 mt-1 dark:border-slate-700" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
