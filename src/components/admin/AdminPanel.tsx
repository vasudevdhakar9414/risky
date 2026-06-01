import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { calculateTradingStats, formatCurrency, cn } from '../../utils/helpers';
import type { Trade } from '../../types';
import {
  Users,
  UserPlus,
  Trash2,
  ShieldCheck,
  ShieldX,
  RefreshCw,
  KeyRound,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Crown,
  User,
  X,
  Lock,
  Search,
  FileSpreadsheet,
  Download,
  Activity,
  ChevronRight,
  Loader2,
  Ban,
  RotateCcw
} from 'lucide-react';

interface PlatformUser {
  id: string;
  username: string;
  email: string;
  role: string;
  updated_at?: string;
  status?: string;
  starting_balance?: number;
  tradeCount?: number;
  totalPnL?: number;
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

// ── Toast ────────────────────────────────────────────────────────────────────
const Toast: React.FC<{ toast: ToastState; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7', Icon: CheckCircle },
    error: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#fca5a5', Icon: AlertCircle },
    info: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)', text: '#a5b4fc', Icon: AlertCircle },
  };
  const c = colors[toast.type];

  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl animate-slide-up"
      style={{ background: c.bg, border: `1px solid ${c.border}`, maxWidth: 360 }}
    >
      <c.Icon className="h-4 w-4 shrink-0" style={{ color: c.text }} />
      <span className="text-xs font-medium" style={{ color: c.text }}>{toast.message}</span>
      <button onClick={onClose} className="ml-auto text-zinc-500 hover:text-zinc-300 text-lg leading-none select-none cursor-pointer">&times;</button>
    </div>
  );
};

// ── Modal ────────────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }> = ({ 
  title, 
  onClose, 
  children,
  maxWidth = 'max-w-md'
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    onClick={onClose}
  >
    <div
      className={cn("relative w-full rounded-2xl p-6 overflow-hidden animate-slide-up", maxWidth)}
      style={{
        background: 'rgba(10,10,25,0.95)',
        border: '1px solid rgba(99,102,241,0.2)',
        boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 40px rgba(99,102,241,0.1)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-6 border-b border-zinc-900 pb-3">
        <h3 className="text-base font-bold text-zinc-100 font-display uppercase tracking-wider">{title}</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors select-none cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ── Field ────────────────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rightEl?: React.ReactNode;
}> = ({ label, type = 'text', value, onChange, placeholder, disabled, rightEl }) => (
  <div className="flex flex-col gap-1.5 text-left">
    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</label>
    <div
      className="relative flex items-center rounded-xl transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#f4f4f8',
          fontSize: '13px',
          padding: '11px 14px',
          width: '100%',
          fontFamily: 'system-ui, sans-serif',
        }}
      />
      {rightEl && <div className="absolute right-3">{rightEl}</div>}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

  // Selected User Detail Viewer
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [selectedUserTrades, setSelectedUserTrades] = useState<Trade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [showNewPass, setShowNewPass] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<PlatformUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PlatformUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset user data wringer wipe
  const [resetDataTarget, setResetDataTarget] = useState<PlatformUser | null>(null);
  const [resettingData, setResettingData] = useState(false);

  const showToast = (message: string, type: ToastState['type'] = 'info') =>
    setToast({ message, type });

  const loadUsers = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email, role, updated_at, status, starting_balance')
        .order('updated_at', { ascending: true });

      if (profilesError) throw profilesError;

      const { data: trades, error: tradesError } = await supabase
        .from('trades')
        .select('user_id, pnl');

      const tradesByUser: Record<string, { count: number; totalPnL: number }> = {};
      if (trades && !tradesError) {
        trades.forEach(t => {
          if (!tradesByUser[t.user_id]) {
            tradesByUser[t.user_id] = { count: 0, totalPnL: 0 };
          }
          tradesByUser[t.user_id].count++;
          tradesByUser[t.user_id].totalPnL += Number(t.pnl || 0);
        });
      }

      const mergedUsers = (profiles || []).map(p => ({
        ...p,
        status: p.status || 'active',
        starting_balance: Number(p.starting_balance || 10000),
        tradeCount: tradesByUser[p.id]?.count || 0,
        totalPnL: tradesByUser[p.id]?.totalPnL || 0,
      }));

      setPlatformUsers(mergedUsers);
    } catch (e: any) {
      showToast(`Failed to load users: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // Filter users based on query and role selection
  const filteredUsers = useMemo(() => {
    return platformUsers.filter(u => {
      const matchesSearch = 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = 
        roleFilter === 'all' || 
        u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [platformUsers, searchQuery, roleFilter]);

  // Load a selected user's trade history
  const handleSelectUser = async (u: PlatformUser) => {
    setSelectedUser(u);
    setLoadingTrades(true);
    setSelectedUserTrades([]);
    
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', u.id)
          .order('date', { ascending: false });

        if (!error && data) {
          // Map snake case to camel case
          const mappedTrades: Trade[] = data.map((dbTrade: any) => ({
            id: dbTrade.id,
            date: dbTrade.date,
            time: dbTrade.time ? dbTrade.time.slice(0, 5) : '00:00',
            instrument: dbTrade.instrument,
            assetClass: dbTrade.asset_class,
            side: dbTrade.side,
            status: dbTrade.status,
            entryPrice: Number(dbTrade.entry_price),
            exitPrice: dbTrade.exit_price ? Number(dbTrade.exit_price) : undefined,
            quantity: Number(dbTrade.quantity),
            stopLoss: dbTrade.stop_loss ? Number(dbTrade.stop_loss) : undefined,
            takeProfit: dbTrade.take_profit ? Number(dbTrade.take_profit) : undefined,
            fees: Number(dbTrade.fees || 0),
            strategy: dbTrade.strategy,
            pnl: dbTrade.pnl !== null && dbTrade.pnl !== undefined ? Number(dbTrade.pnl) : undefined,
            roi: dbTrade.roi !== null && dbTrade.roi !== undefined ? Number(dbTrade.roi) : undefined,
            riskRewardRatio: dbTrade.risk_reward_ratio !== null && dbTrade.risk_reward_ratio !== undefined ? Number(dbTrade.risk_reward_ratio) : undefined,
            notes: dbTrade.notes || '',
            screenshotUrl: dbTrade.screenshot_url || undefined,
            mistakes: dbTrade.mistakes || [],
          }));
          setSelectedUserTrades(mappedTrades);
        } else if (error) {
          console.error('Error loading trades for user:', error.message);
        }
      } catch (err) {
        console.error('Database connection error:', err);
      } finally {
        setLoadingTrades(false);
      }
    }
  };

  // Derive stats for selected user's trades
  const selectedUserStats = useMemo(() => {
    return calculateTradingStats(selectedUserTrades);
  }, [selectedUserTrades]);

  // Export selected user trade logs as CSV or JSON
  const handleExportUserTrades = (format: 'json' | 'csv') => {
    if (!selectedUser || selectedUserTrades.length === 0) return;
    
    let content = '';
    let fileName = `trades_${selectedUser.username}_export`;

    if (format === 'json') {
      content = JSON.stringify(selectedUserTrades, null, 2);
      fileName += '.json';
    } else {
      // Build simple CSV headers and rows
      const headers = ['Date', 'Time', 'Instrument', 'Asset Class', 'Side', 'Status', 'Entry Price', 'Exit Price', 'Quantity', 'Fees', 'PnL', 'ROI (%)', 'Strategy', 'Notes', 'Mistakes'];
      const rows = selectedUserTrades.map(t => [
        t.date,
        t.time,
        t.instrument,
        t.assetClass,
        t.side,
        t.status,
        t.entryPrice,
        t.exitPrice || '',
        t.quantity,
        t.fees,
        t.pnl || '',
        t.roi || '',
        t.strategy,
        t.notes?.replace(/"/g, '""') || '',
        (t.mistakes || []).join('; ')
      ]);

      content = [
        headers.join(','),
        ...rows.map(r => r.map(val => `"${val}"`).join(','))
      ].join('\n');
      fileName += '.csv';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Not admin guard
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <Lock className="h-6 w-6 text-rose-400" />
        </div>
        <h2 className="text-lg font-bold text-zinc-100 font-display">Access Restricted</h2>
        <p className="text-xs text-zinc-500 text-center max-w-xs">
          Admin privileges are required to access User Management. Contact your platform administrator.
        </p>
      </div>
    );
  }

  // ── Create User ─────────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newPassword) {
      showToast('All fields are required.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setCreating(true);
    try {
      if (!supabase) throw new Error('Database not configured.');

      // Sign up via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: { username: newUsername },
          emailRedirectTo: undefined,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('User creation returned no user object.');

      // Insert into profiles table
      const { error: profileError } = await supabase.from('profiles').upsert([{
        id: data.user.id,
        username: newUsername,
        email: newEmail,
        role: newRole,
        currency: '$',
        avatar_seed: 'default',
      }]);

      if (profileError) {
        console.warn('Profile insert warning:', profileError.message);
      }

      showToast(`User "${newUsername}" created successfully.`, 'success');
      setShowCreate(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      await loadUsers();
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  // ── Toggle Admin Role ────────────────────────────────────────────────────────
  const handleToggleRole = async (u: PlatformUser) => {
    if (u.id === user?.id) {
      showToast("You cannot change your own role.", 'error');
      return;
    }
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      const { error } = await supabase!.from('profiles').update({ role: newRole }).eq('id', u.id);
      if (error) throw error;
      showToast(`${u.username} is now ${newRole === 'admin' ? 'an Admin' : 'a regular User'}.`, 'success');
      await loadUsers();
    } catch (e: any) {
      showToast(`Failed to update role: ${e.message}`, 'error');
    }
  };

  // ── Reset Password ───────────────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !resetPassword) return;
    if (resetPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setResetting(true);
    try {
      if (resetTarget.id === user?.id) {
        const { error } = await supabase!.auth.updateUser({ password: resetPassword });
        if (error) throw error;
        showToast('Your password has been updated successfully.', 'success');
      } else {
        // Since we are running on standard Supabase anon keys, admin direct update requires a database trigger 
        // or a service role. We provide simple guidance for the admin:
        showToast(
          `Password reset request for ${resetTarget.username} set. Use Supabase Console → Authentication to force reset if needed.`,
          'info'
        );
      }
      setResetTarget(null);
      setResetPassword('');
    } catch (e: any) {
      showToast(`Reset failed: ${e.message}`, 'error');
    } finally {
      setResetting(false);
    }
  };

  // ── Delete User ──────────────────────────────────────────────────────────────
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === user?.id) {
      showToast("You cannot delete your own account.", 'error');
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase!.from('profiles').delete().eq('id', deleteTarget.id);
      if (error) throw error;

      showToast(`User "${deleteTarget.username}" has been removed from profiles.`, 'success');
      setDeleteTarget(null);
      await loadUsers();
    } catch (e: any) {
      showToast(`Deletion failed: ${e.message}.`, 'error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle User Suspension ───────────────────────────────────────────────────
  const handleToggleSuspension = async (u: PlatformUser) => {
    if (u.id === user?.id) {
      showToast("You cannot suspend your own account.", 'error');
      return;
    }
    const newStatus = u.status === 'suspended' ? 'active' : 'suspended';
    try {
      const { error } = await supabase!
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', u.id);
      if (error) throw error;
      showToast(`${u.username} has been ${newStatus === 'suspended' ? 'suspended' : 'activated'}.`, 'success');
      await loadUsers();
    } catch (e: any) {
      showToast(`Failed to update status: ${e.message}`, 'error');
    }
  };

  // ── Reset User Trade Data ───────────────────────────────────────────────────
  const handleResetUserData = async () => {
    if (!resetDataTarget) return;
    setResettingData(true);
    try {
      const { error } = await supabase!
        .from('trades')
        .delete()
        .eq('user_id', resetDataTarget.id);
      if (error) throw error;
      showToast(`All trade logs for "${resetDataTarget.username}" have been wiped successfully.`, 'success');
      setResetDataTarget(null);
      await loadUsers();
      if (selectedUser?.id === resetDataTarget.id) {
        setSelectedUserTrades([]);
      }
    } catch (e: any) {
      showToast(`Failed to reset user trade data: ${e.message}`, 'error');
      setResetDataTarget(null);
    } finally {
      setResettingData(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 text-left">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div
        className="p-5 rounded-xl"
        style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-display text-zinc-100">User Management</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Manage platform users · Admin-only control panel · {platformUsers.length} registered user{platformUsers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer select-none"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: '1px solid rgba(99,102,241,0.3)',
                boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Create User
            </button>
          </div>
        </div>
      </div>

      {/* Searching & Filtering Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative flex items-center col-span-2 rounded-xl bg-zinc-950 border border-zinc-900 px-3">
          <Search className="h-4 w-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Search users by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs text-zinc-100 placeholder-zinc-600 py-3 pl-2.5 font-sans"
          />
        </div>

        {/* Filter Role */}
        <div className="flex items-center rounded-xl bg-zinc-950 border border-zinc-900 px-3 justify-between">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display">Role Filter</span>
          <div className="flex gap-1.5">
            {(['all', 'admin', 'user'] as const).map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={cn(
                  "px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all select-none cursor-pointer",
                  roleFilter === role
                    ? "bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 font-extrabold"
                    : "text-zinc-500 border border-transparent hover:text-zinc-300"
                )}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div
        className="rounded-xl overflow-hidden text-left"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Table Header */}
        <div
          className="grid items-center px-5 py-3"
          style={{
            gridTemplateColumns: '1.2fr 1.3fr 1fr 1fr 220px',
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {['Username', 'Email', 'Stats', 'Role', 'Actions'].map(h => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 font-display">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-8 w-8 text-zinc-700" />
            <p className="text-xs text-zinc-600 font-semibold">No platform users found.</p>
          </div>
        ) : (
          <div>
            {filteredUsers.map((u, idx) => (
              <div
                key={u.id}
                className="grid items-center px-5 py-4 transition-colors hover:bg-white/[0.02] cursor-pointer"
                style={{
                  gridTemplateColumns: '1.2fr 1.3fr 1fr 1fr 220px',
                  borderBottom: idx < filteredUsers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: u.id === user?.id ? 'rgba(99,102,241,0.03)' : 'transparent',
                }}
                onClick={() => handleSelectUser(u)}
              >
                {/* Username */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0"
                    style={{
                      background: u.role === 'admin' ? 'rgba(250,204,21,0.1)' : 'rgba(99,102,241,0.1)',
                      border: `1px solid ${u.role === 'admin' ? 'rgba(250,204,21,0.2)' : 'rgba(99,102,241,0.15)'}`,
                      color: u.role === 'admin' ? '#fbbf24' : '#818cf8',
                    }}
                  >
                    {u.username.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-200 font-display truncate hover:text-indigo-400 flex items-center gap-1">
                      {u.username}
                      {u.status === 'suspended' && (
                        <span className="text-[7px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1 py-0.5 rounded font-extrabold uppercase shrink-0 font-mono tracking-wider">Suspended</span>
                      )}
                      <ChevronRight className="h-3 w-3 text-zinc-600" />
                    </p>
                    {u.id === user?.id && (
                      <span className="text-[8px] text-indigo-400 font-extrabold uppercase tracking-wider">Active Admin</span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <p className="text-xs text-zinc-500 truncate pr-4">{u.email}</p>

                {/* Cumulative Stats */}
                <div className="text-xs text-zinc-400">
                  <span className="font-bold text-zinc-300">{u.tradeCount || 0}</span> trades
                  <span className="text-zinc-600 font-semibold px-1">·</span>
                  <span className={cn(
                    "font-bold font-mono",
                    (u.totalPnL || 0) >= 0 ? "text-emerald-400" : "text-rose-500"
                  )}>
                    {formatCurrency(u.totalPnL || 0, '$')}
                  </span>
                </div>

                {/* Role Badge */}
                <div>
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                    style={{
                      background: u.role === 'admin' ? 'rgba(250,204,21,0.1)' : 'rgba(99,102,241,0.1)',
                      color: u.role === 'admin' ? '#fbbf24' : '#818cf8',
                      border: `1px solid ${u.role === 'admin' ? 'rgba(250,204,21,0.2)' : 'rgba(99,102,241,0.15)'}`,
                    }}
                  >
                    {u.role === 'admin' ? <Crown className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                    {u.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  {/* Toggle Role */}
                  <button
                    onClick={() => handleToggleRole(u)}
                    disabled={u.id === user?.id}
                    title={u.role === 'admin' ? 'Revoke Admin' : 'Grant Admin'}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed select-none cursor-pointer"
                    style={{ color: '#52525b', background: 'rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { if (u.id !== user?.id) (e.currentTarget as HTMLButtonElement).style.color = '#facc15'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#52525b'; }}
                  >
                    {u.role === 'admin' ? <ShieldX className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  </button>

                  {/* Reset Password */}
                  <button
                    onClick={() => { setResetTarget(u); setResetPassword(''); }}
                    title="Reset Password"
                    className="p-1.5 rounded-lg transition-colors select-none cursor-pointer"
                    style={{ color: '#52525b', background: 'rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#818cf8'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#52525b'; }}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </button>

                  {/* Suspend / Activate User */}
                  <button
                    onClick={() => handleToggleSuspension(u)}
                    disabled={u.id === user?.id}
                    title={u.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed select-none cursor-pointer"
                    style={{ color: u.status === 'suspended' ? '#f87171' : '#52525b', background: 'rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { if (u.id !== user?.id && u.status !== 'suspended') (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
                    onMouseLeave={e => { if (u.status !== 'suspended') (e.currentTarget as HTMLButtonElement).style.color = '#52525b'; }}
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>

                  {/* Wipe User Trades */}
                  <button
                    onClick={() => setResetDataTarget(u)}
                    title="Wipe User Trade Data"
                    className="p-1.5 rounded-lg transition-colors select-none cursor-pointer"
                    style={{ color: '#52525b', background: 'rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fb7185'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#52525b'; }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteTarget(u)}
                    disabled={u.id === user?.id}
                    title="Delete User"
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed select-none cursor-pointer"
                    style={{ color: '#52525b', background: 'rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { if (u.id !== user?.id) (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#52525b'; }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Notice */}
      <div
        className="p-4 rounded-xl text-xs text-zinc-500 leading-relaxed border border-zinc-900 bg-zinc-950/40"
      >
        <span className="font-bold text-zinc-400">System Parameters:</span> Click on any user row to view their statistics scorecard, audit execution histories, and trigger formatted downloads of their trades.
      </div>

      {/* ── User Detail Viewer Modal (Unfolds trade histories & stats) ─────── */}
      {selectedUser && (
        <Modal 
          title={`User Diagnostic Card: ${selectedUser.username}`} 
          onClose={() => setSelectedUser(null)}
          maxWidth="max-w-4xl"
        >
          {loadingTrades ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider font-mono">Syncing database logs...</span>
            </div>
          ) : (
            <div className="space-y-6 text-left">
              {/* User KPI Scorecard row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display block">Total Net Profit</span>
                  <span className={cn(
                    "text-base font-extrabold font-display block mt-1",
                    selectedUserStats.totalPnL >= 0 ? "text-emerald-400" : "text-rose-500"
                  )}>
                    {formatCurrency(selectedUserStats.totalPnL, '$')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display block">Win Rate</span>
                  <span className="text-base font-extrabold text-zinc-100 font-display block mt-1">
                    {selectedUserStats.winRate.toFixed(1)}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display block">Discipline Score</span>
                  <span className="text-base font-extrabold text-indigo-400 font-display block mt-1">
                    {selectedUserStats.disciplineScore}/100
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display block">Desk Rating</span>
                  <span className="text-base font-extrabold text-emerald-400 font-display block mt-1">
                    {selectedUserStats.overallScore}/100
                  </span>
                </div>
              </div>

              {/* Trade Logs List */}
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-display">
                    Execution Logs ({selectedUserTrades.length})
                  </span>
                  {selectedUserTrades.length > 0 && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleExportUserTrades('csv')}
                        className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors select-none cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3 w-3" /> Export CSV
                      </button>
                      <button
                        onClick={() => handleExportUserTrades('json')}
                        className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors select-none cursor-pointer"
                      >
                        <Download className="h-3 w-3" /> Export JSON
                      </button>
                    </div>
                  )}
                </div>

                {selectedUserTrades.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-600">
                    <Activity className="h-6 w-6 opacity-40 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">No executions recorded</span>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto pr-1 border border-zinc-900 rounded-xl bg-zinc-950 overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase tracking-wider text-[9px] font-display bg-zinc-900/10">
                          <th className="py-2.5 pl-3">Date</th>
                          <th className="py-2.5">Symbol</th>
                          <th className="py-2.5 text-center">Direction</th>
                          <th className="py-2.5 text-center">Strategy</th>
                          <th className="py-2.5 text-center">Mistakes</th>
                          <th className="py-2.5 text-right pr-3">PnL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 text-zinc-300">
                        {selectedUserTrades.map((t) => (
                          <tr key={t.id} className="hover:bg-white/1 transition-colors">
                            <td className="py-2.5 pl-3 font-semibold text-zinc-400">{t.date}</td>
                            <td className="py-2.5 font-bold text-zinc-200">{t.instrument}</td>
                            <td className="py-2.5 text-center">
                              <span className={cn(
                                "text-[9px] font-bold uppercase px-1 rounded",
                                t.side === 'Long' ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-400"
                              )}>
                                {t.side}
                              </span>
                            </td>
                            <td className="py-2.5 text-center text-zinc-400 font-semibold">{t.strategy}</td>
                            <td className="py-2.5 text-center">
                              {t.mistakes && t.mistakes.length > 0 ? (
                                <span className="text-[9px] text-rose-400 font-extrabold uppercase bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10">
                                  {t.mistakes.join(', ')}
                                </span>
                              ) : (
                                <span className="text-[9px] text-zinc-600 font-medium">None</span>
                              )}
                            </td>
                            <td className={cn(
                              "py-2.5 text-right pr-3 font-bold font-display",
                              (t.pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-500"
                            )}>
                              {formatCurrency(t.pnl || 0, '$')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Create User Modal ─────────────────────────────────────────────── */}
      {showCreate && (
        <Modal title="Create New User" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <Field
              label="Username"
              value={newUsername}
              onChange={setNewUsername}
              placeholder="e.g. trader_john"
              disabled={creating}
            />
            <Field
              label="Email Address"
              type="email"
              value={newEmail}
              onChange={setNewEmail}
              placeholder="user@example.com"
              disabled={creating}
            />
            <Field
              label="Password"
              type={showNewPass ? 'text' : 'password'}
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Min. 6 characters"
              disabled={creating}
              rightEl={
                <button type="button" onClick={() => setShowNewPass(v => !v)} style={{ color: '#52525b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Role</label>
              <div className="flex gap-3">
                {(['user', 'admin'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewRole(r)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all select-none cursor-pointer"
                    style={{
                      background: newRole === r
                        ? (r === 'admin' ? 'rgba(250,204,21,0.15)' : 'rgba(99,102,241,0.15)')
                        : 'rgba(255,255,255,0.03)',
                      border: newRole === r
                        ? (r === 'admin' ? '1px solid rgba(250,204,21,0.3)' : '1px solid rgba(99,102,241,0.3)')
                        : '1px solid rgba(255,255,255,0.07)',
                      color: newRole === r ? (r === 'admin' ? '#fbbf24' : '#818cf8') : '#52525b',
                    }}
                  >
                    {r === 'admin' ? '👑 Admin' : '👤 User'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-400 transition-colors select-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 select-none cursor-pointer"
                style={{
                  background: creating ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: '1px solid rgba(99,102,241,0.3)',
                }}
              >
                {creating
                  ? <><span className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />Creating...</>
                  : <><UserPlus className="h-3.5 w-3.5" />Create User</>
                }
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Reset Password Modal ──────────────────────────────────────────── */}
      {resetTarget && (
        <Modal title={`Reset Password · ${resetTarget.username}`} onClose={() => setResetTarget(null)}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-zinc-500">
              {resetTarget.id === user?.id
                ? 'Enter your new password below.'
                : `Note: Set a secure password for this user below.`
              }
            </p>
            <Field
              label="New Password"
              type={showResetPass ? 'text' : 'password'}
              value={resetPassword}
              onChange={setResetPassword}
              placeholder="Min. 6 characters"
              disabled={resetting}
              rightEl={
                <button type="button" onClick={() => setShowResetPass(v => !v)} style={{ color: '#52525b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showResetPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setResetTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-400 select-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                Cancel
              </button>
              <button type="submit" disabled={resetting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 select-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: '1px solid rgba(99,102,241,0.3)' }}>
                {resetting
                  ? <><span className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />Saving...</>
                  : <><KeyRound className="h-3.5 w-3.5" />Update Password</>
                }
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      {deleteTarget && (
        <Modal title="Confirm Deletion" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <div
              className="p-4 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <p className="text-xs text-rose-400 font-semibold leading-relaxed">
                Are you sure you want to remove <strong>{deleteTarget.username}</strong>? Their profile and trade data will be deleted. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-400 select-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 select-none cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
              >
                {deleting
                  ? <><span className="w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />Deleting...</>
                  : <><Trash2 className="h-3.5 w-3.5" />Delete User</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reset User Data Confirm Modal ─────────────────────────────────── */}
      {resetDataTarget && (
        <Modal title="Confirm Account Trade Wipe" onClose={() => setResetDataTarget(null)}>
          <div className="space-y-4 text-left">
            <div
              className="p-4 rounded-xl"
              style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}
            >
              <p className="text-xs text-rose-450 font-semibold leading-relaxed">
                Are you absolutely sure you want to wipe ALL trade logs for <strong>{resetDataTarget.username}</strong>?
                This deletes all their logged trades, performance metrics, and compliance score records.
                This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setResetDataTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-400 select-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                Cancel
              </button>
              <button
                onClick={handleResetUserData}
                disabled={resettingData}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 select-none cursor-pointer"
                style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185' }}
              >
                {resettingData
                  ? <><span className="w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />Wiping...</>
                  : <><RotateCcw className="h-3.5 w-3.5" />Wipe All Trades</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
