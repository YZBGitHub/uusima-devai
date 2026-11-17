import { useLocation, Link, Outlet } from 'react-router-dom';
import { Home, Cpu, LayoutDashboard } from 'lucide-react';
import Logo from './Logo';
import AIAssistantWidget from './AIAssistantWidget';
import UserTenantMenu from './UserTenantMenu';
import { cn } from '../lib/utils';

const navItems = [
  { name: '首页', path: '/', icon: Home },
  { name: '设备智能体大厅', path: '/agents', icon: Cpu },
  { name: '控制台', path: '/console', icon: LayoutDashboard },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* Unified Top Navigation Header across ALL pages */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md z-50 border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center shrink-0 group hover:opacity-95 transition-opacity">
            <Logo size="md" />
          </Link>

          {/* Navigation Links (Centered) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-purple-50 text-purple-700 shadow-xs font-semibold ring-1 ring-purple-200/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-purple-600" : "text-slate-400")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right User & Tenant Switcher */}
          <UserTenantMenu />
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 pt-16 flex flex-col">
        <Outlet />
      </main>

      {/* Persistent Bottom-Right AI Assistant Widget (hidden on dedicated agent detail chat workspace) */}
      {!/^\/agents\/[^/]+/.test(location.pathname) && <AIAssistantWidget />}
    </div>
  );
}
