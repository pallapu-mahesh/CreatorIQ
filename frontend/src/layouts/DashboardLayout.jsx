import { Outlet } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const SidebarContext = createContext({ collapsed: false, toggleSidebar: () => {} });

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed((c) => !c);
  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar />
        <Navbar />
        <MainContent />
      </div>
    </SidebarProvider>
  );
}

function MainContent() {
  const { collapsed } = useSidebar();
  const sidebarWidth = collapsed ? 'var(--sidebar-collapsed-width, 72px)' : 'var(--sidebar-width, 256px)';
  return (
    <main
      className="pt-16 min-h-screen transition-all duration-300 ease-in-out"
      style={{ marginLeft: sidebarWidth }}
    >
      <div className="p-6 transition-all duration-300 ease-in-out">
        <Outlet />
      </div>
    </main>
  );
}
