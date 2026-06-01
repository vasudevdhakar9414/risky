import React from 'react';
import type { ActiveTab } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTrades } from '../../context/TradeContext';
import { cn } from '../../utils/helpers';
import {
  TrendingUp,
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Calendar,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
}) => {
  const { logout, user } = useAuth();
  const { userProfile } = useTrades();
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal', label: 'Trade Journal', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
    ...(isAdmin ? [{ id: 'admin', label: 'User Management', icon: ShieldCheck }] : []),
  ] as const;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden cursor-pointer"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950/90 border-r border-zinc-900 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col flex-1">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-zinc-900/60 bg-zinc-950/20 gap-2.5">
            <div className="bg-indigo-600 p-1.5 rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.4)]">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-extrabold text-zinc-50 font-display tracking-tight leading-none">
              RiskyVasu
            </span>
            {isAdmin && (
              <span
                className="ml-auto text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(250,204,21,0.1)', color: '#fbbf24', border: '1px solid rgba(250,204,21,0.2)' }}
              >
                Admin
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="p-4 flex flex-col gap-1.5 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isAdminItem = item.id === 'admin';
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer select-none font-display relative group',
                    isActive
                      ? isAdminItem
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.02)]'
                      : 'bg-transparent text-zinc-400 border border-transparent hover:bg-white/5 hover:text-zinc-200'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isActive
                        ? isAdminItem ? 'text-yellow-400' : 'text-indigo-400'
                        : 'text-zinc-500 group-hover:text-zinc-300'
                    )}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      className={cn(
                        'absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full',
                        isAdminItem ? 'bg-yellow-400' : 'bg-indigo-500'
                      )}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/30 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold uppercase font-display text-sm">
              {(userProfile.username || user?.username || 'TR').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-zinc-200 truncate font-display">
                {userProfile.username || user?.username || 'Trader'}
              </h4>
              <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5 leading-none"
                style={{ color: isAdmin ? '#fbbf24' : '#818cf8' }}>
                {isAdmin ? 'Administrator' : 'Active Trader'}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-rose-950/20 hover:text-rose-400 border border-zinc-800 hover:border-rose-900/30 rounded-lg text-xs font-medium text-zinc-400 transition-all duration-200 cursor-pointer select-none font-display active:scale-98"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
