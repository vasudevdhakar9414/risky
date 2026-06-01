import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TradeProvider } from './context/TradeContext';
import { NotificationProvider } from './context/NotificationContext';
import type { ActiveTab } from './types';
import { LoginPage } from './components/layout/LoginPage';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { JournalView } from './components/journal/JournalView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { CalendarView } from './components/calendar/CalendarView';
import { SettingsView } from './components/settings/SettingsView';
import { AdminPanel } from './components/admin/AdminPanel';
import { TradeFormDialog } from './components/journal/TradeFormDialog';
import { CertificatePreview } from './components/journal/CertificatePreview';
import { PublicVerifier } from './components/journal/PublicVerifier';

// Custom Wrapper to track active routes and security boundaries
const RouteController: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);

  // 1. Session Restoration Loading Gate
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col justify-center items-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-10 h-10 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-xs font-bold text-zinc-500 font-display uppercase tracking-widest animate-pulse">
            Synchronising Terminal...
          </span>
        </div>
      </div>
    );
  }

  // Derive activeTab name from current URL path
  const currentPath = location.pathname.substring(1) as ActiveTab;
  const activeTab: ActiveTab = currentPath || 'dashboard';

  const handleTabChange = (tab: ActiveTab) => {
    navigate(`/${tab === 'landing' ? '' : tab}`);
  };

  // 2. Routing Rules
  // Authenticated → redirect away from login
  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/dashboard" replace />;
  }

  // Unauthenticated → redirect to login for all private pages except public verification links
  const isPublicPath = location.pathname === '/login' || location.pathname.startsWith('/verify/');
  if (!isAuthenticated && !isPublicPath) {
    return <Navigate to="/login" replace />;
  }

  // Renders the Private Views inside AppShell
  const renderPrivateView = (view: React.ReactNode) => (
    <AppShell activeTab={activeTab} setActiveTab={handleTabChange}>
      {view}
      <TradeFormDialog isOpen={isAddTradeOpen} onClose={() => setIsAddTradeOpen(false)} />
    </AppShell>
  );

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage setActiveTab={handleTabChange} />} />
      <Route path="/verify/:tradeId" element={<PublicVerifier />} />

      {/* Standalone Full-screen Private Routes */}
      <Route path="/certificate/:tradeId" element={isAuthenticated ? <CertificatePreview /> : <Navigate to="/login" replace />} />

      {/* Private Dashboard Views */}
      <Route
        path="/dashboard"
        element={renderPrivateView(
          <DashboardView
            setActiveTab={handleTabChange}
            onAddTradeClick={() => setIsAddTradeOpen(true)}
          />
        )}
      />
      <Route path="/journal" element={renderPrivateView(<JournalView />)} />
      <Route path="/analytics" element={renderPrivateView(<AnalyticsView />)} />
      <Route path="/calendar" element={renderPrivateView(<CalendarView />)} />
      <Route path="/settings" element={renderPrivateView(<SettingsView />)} />
      <Route path="/admin" element={renderPrivateView(<AdminPanel />)} />

      {/* Root & Wildcard */}
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <TradeProvider>
            <RouteController />
          </TradeProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
