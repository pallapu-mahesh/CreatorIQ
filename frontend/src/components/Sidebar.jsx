import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileVideo,
  Users,
  TrendingUp,
  DollarSign,
  Share2,
  FileText,
  Bell,
  User,
  Settings,
  LogOut,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useSidebar } from '../layouts/DashboardLayout';

const navItems = [
  { to: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dashboard/content',      icon: FileVideo,        label: 'Content Analytics' },
  { to: '/dashboard/audience',     icon: Users,            label: 'Audience Analytics' },
  { to: '/dashboard/growth',       icon: TrendingUp,       label: 'Growth Trends' },
  { to: '/dashboard/revenue',      icon: DollarSign,       label: 'Revenue Analytics' },
  { to: '/dashboard/social',       icon: Share2,           label: 'Social Accounts' },
  { to: '/dashboard/reports',      icon: FileText,         label: 'Reports' },
  { to: '/dashboard/notifications',icon: Bell,             label: 'Notifications' },
];

const bottomItems = [
  { to: '/dashboard/profile',  icon: User,     label: 'Profile' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { collapsed, toggleSidebar } = useSidebar();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarWidth = collapsed ? 'var(--sidebar-collapsed-width, 72px)' : 'var(--sidebar-width, 256px)';

  return (
    <aside
      className="fixed top-0 left-0 h-full bg-white border-r border-slate-200 flex flex-col z-30 dark:bg-slate-900 dark:border-slate-700 transition-all duration-300 ease-in-out overflow-hidden"
      style={{ width: sidebarWidth }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between gap-2.5 px-4 h-16 border-b border-slate-200 shrink-0 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={15} className="text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-bold text-slate-900 tracking-tight dark:text-slate-100 transition-opacity duration-200 ease-in-out">CreatorIQ</span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="btn-ghost p-1.5 rounded-lg shrink-0 transition-transform duration-300 ease-in-out"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} justify-center`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={17} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && <span className="transition-opacity duration-200 ease-in-out">{label}</span>}
            {to === '/dashboard/notifications' && unreadCount > 0 && !collapsed && (
              <span className="ml-auto bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 transition-opacity duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-slate-200 space-y-0.5 dark:border-slate-700">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} justify-center`}
            title={collapsed ? label : undefined}
          >
            <Icon size={17} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && <span className="transition-opacity duration-200 ease-in-out">{label}</span>}
          </NavLink>
        ))}

        {/* User info + logout */}
        {!collapsed && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden shrink-0">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user?.full_name || 'User'} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-brand-700">
                    {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate dark:text-slate-100">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500 capitalize truncate dark:text-slate-400">{user?.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="nav-link w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300 justify-center" title="Logout">
              <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
              <span className="transition-opacity duration-200 ease-in-out">Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}