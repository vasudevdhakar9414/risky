import React, { useState, useRef, useEffect } from 'react';
import type { ActiveTab } from '../../types';
import { useTrades } from '../../context/TradeContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency, cn } from '../../utils/helpers';
import { Menu, Bell, ShieldAlert, Check, Inbox } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setMobileSidebarOpen,
}) => {
  const { stats, riskLimits, userProfile } = useTrades();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'journal':
        return 'Trade Journal';
      case 'analytics':
        return 'Performance Analytics';
      case 'calendar':
        return 'PnL Calendar';
      case 'settings':
        return 'Settings';
      case 'admin':
        return 'User Management';
      default:
        return 'RiskyVasu';
    }
  };

  // Close panel on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    if (panelOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [panelOpen]);

  // Determine if drawdown or daily limits are exceeded
  const isLossWarning = Math.abs(stats.totalPnL) > riskLimits.maxDrawdown && stats.totalPnL < 0;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <header className="h-16 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md flex items-center justify-between px-4 md:px-6 relative z-30">
      {/* Mobile Drawer Trigger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 md:hidden cursor-pointer active:scale-95 animate-transition"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm md:text-base font-bold text-zinc-50 font-display uppercase tracking-wider !m-0">
          {getPageTitle()}
        </h1>
      </div>

      {/* Mini KPI Dashboard Banner */}
      <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 rounded-xl bg-zinc-900/40 border border-zinc-800/40 text-xs">
        {/* Net Profit */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-semibold font-display">NET PNL:</span>
          <span
            className={cn(
              'font-bold tracking-tight',
              stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'
            )}
          >
            {formatCurrency(stats.totalPnL, userProfile.currency)}
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-zinc-800" />

        {/* Win Rate */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-semibold font-display">WIN RATE:</span>
          <span className="text-zinc-100 font-bold tracking-tight">
            {stats.winRate.toFixed(1)}%
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-zinc-800" />

        {/* Profit Factor */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-semibold font-display">PROFIT FACTOR:</span>
          <span
            className={cn(
              'font-bold tracking-tight',
              stats.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-zinc-300'
            )}
          >
            {stats.profitFactor.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 relative">
        {/* Risk Warning Alert Indicator */}
        {isLossWarning && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 font-semibold tracking-wider font-display uppercase animate-pulse">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Drawdown Alert</span>
          </div>
        )}

        {/* Notification Bell with interactive panel */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className={cn(
              "p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/40 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none relative",
              panelOpen && "text-zinc-100 bg-zinc-900 border-zinc-800"
            )}
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold text-white shadow-lg animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Glassmorphic Dropdown Panel */}
          {panelOpen && (
            <div
              className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-4 z-50 text-left animate-slide-up"
              style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.05)' }}
            >
              {/* Dropdown Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-display">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                    Read All
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-zinc-600">
                    <Inbox className="h-6 w-6 opacity-60" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">No alerts active</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all cursor-pointer relative",
                        n.isRead
                          ? "bg-zinc-900/10 border-zinc-900/30 text-zinc-400"
                          : "bg-indigo-500/5 border-indigo-500/10 text-zinc-200 hover:bg-indigo-500/10 hover:border-indigo-500/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[11px] font-bold font-display truncate pr-4">{n.title}</span>
                        {!n.isRead && (
                          <span className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-normal">{n.message}</p>
                      <span className="text-[8px] text-zinc-600 mt-1.5 block font-semibold">{formatDate(n.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
};
