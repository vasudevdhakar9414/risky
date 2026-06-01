import React, { useState, useEffect, useRef } from 'react';
import type { ActiveTab } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

interface LoginPageProps {
  setActiveTab: (tab: ActiveTab) => void;
}

// ─── Particle System ─────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#4f46e5', '#7c3aed', '#a78bfa'];

function useParticles(count: number) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const makeParticles = (): Particle[] =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.05,
        speedY: (Math.random() - 0.5) * 0.05,
        opacity: Math.random() * 0.5 + 0.15,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));

    setParticles(makeParticles());

    const animate = () => {
      setParticles(prev =>
        prev.map(p => {
          let nx = p.x + p.speedX;
          let ny = p.y + p.speedY;
          if (nx < 0 || nx > 100) { nx = Math.random() * 100; ny = Math.random() * 100; }
          if (ny < 0 || ny > 100) { nx = Math.random() * 100; ny = Math.random() * 100; }
          return { ...p, x: nx, y: ny };
        })
      );
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [count]);

  return particles;
}

// ─── Google Icon SVG ──────────────────────────────────────────────────────────
const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ─── Toast ───────────────────────────────────────────────────────────────────
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed top-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-500 animate-slide-in"
      style={{
        background: type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        borderColor: type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
        maxWidth: '360px',
      }}
    >
      {type === 'success'
        ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
        : <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
      }
      <span className="text-xs font-medium" style={{ color: type === 'success' ? '#6ee7b7' : '#fca5a5' }}>
        {message}
      </span>
      <button onClick={onClose} className="ml-auto text-zinc-500 hover:text-zinc-300 text-lg leading-none">&times;</button>
    </div>
  );
};

// ─── Divider ─────────────────────────────────────────────────────────────────
const Divider: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
    <span style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: 2, whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
  </div>
);

// ─── Main Login Page ──────────────────────────────────────────────────────────
export const LoginPage: React.FC<LoginPageProps> = ({ setActiveTab }) => {
  const { login, loginWithGoogle } = useAuth();
  const particles = useParticles(60);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [shake, setShake] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setToast({ message: 'Username and password are required.', type: 'error' });
      triggerShake();
      return;
    }
    setLoading(true);
    const res = await login(username, password);
    if (res.success) {
      setToast({ message: 'Access granted. Initializing secure terminal...', type: 'success' });
      setTimeout(() => setActiveTab('dashboard'), 1400);
    } else {
      setToast({ message: res.error || 'Invalid credentials. Access denied.', type: 'error' });
      triggerShake();
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const res = await loginWithGoogle();
    if (!res.success) {
      setToast({ message: res.error || 'Google sign-in failed. Try again.', type: 'error' });
      setGoogleLoading(false);
    }
    // On success, browser redirects to Google. No further action here.
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 50%, #0a0a1a 0%, #030303 100%)' }}
    >
      {/* ── Particle Canvas ── */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full transition-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              opacity: p.opacity,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      {/* ── Background Glows ── */}
      <div className="absolute pointer-events-none" style={{ top: '20%', left: '15%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />

      {/* ── Grid Lines ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Brand top-left ── */}
      <div className="absolute top-7 left-8 flex items-center gap-2.5 select-none">
        <div style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: '6px', borderRadius: '10px', boxShadow: '0 0 20px rgba(99,102,241,0.5)' }}>
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-extrabold tracking-tight" style={{ color: '#e4e4f4', fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.02em' }}>
          RiskyVasu
        </span>
        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ml-1" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
          Private
        </span>
      </div>

      {/* ── Login Card ── */}
      <div className={`relative w-full mx-4 transition-transform ${shake ? 'animate-shake' : ''}`} style={{ maxWidth: '440px' }}>
        {/* Card glow ring */}
        <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(124,58,237,0.1), transparent)', zIndex: 0 }} />

        <div className="relative rounded-2xl p-8" style={{ background: 'rgba(8, 8, 20, 0.85)', backdropFilter: 'blur(40px)', border: '1px solid rgba(99,102,241,0.15)', boxShadow: '0 25px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)', zIndex: 1 }}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(124,58,237,0.1))', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 30px rgba(99,102,241,0.2)' }}>
              <Lock className="h-6 w-6" style={{ color: '#818cf8' }} />
            </div>
            <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#f1f1f8', fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.03em' }}>
              Secure Access
            </h1>
            <p className="text-xs" style={{ color: '#52525b' }}>
              Private trading journal · Authorised personnel only
            </p>
          </div>

          {/* ── Google OAuth Button ── */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl font-semibold text-sm transition-all duration-200 mb-5"
            style={{
              padding: '12px',
              background: googleLoading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: googleLoading ? '#52525b' : '#e4e4e7',
              cursor: googleLoading || loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              fontSize: '13px',
            }}
            onMouseEnter={e => { if (!googleLoading && !loading) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            {googleLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon size={18} />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* ── Divider ── */}
          <Divider label="or sign in with credentials" />

          {/* ── Email/Password Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
            {/* Username */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: focused === 'username' ? '#818cf8' : '#52525b', transition: 'color 0.2s' }}>
                Username or Email
              </label>
              <div className="relative flex items-center rounded-xl transition-all duration-200" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${focused === 'username' ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`, boxShadow: focused === 'username' ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none' }}>
                <User className="absolute left-3.5 h-4 w-4" style={{ color: focused === 'username' ? '#818cf8' : '#3f3f46', transition: 'color 0.2s' }} />
                <input
                  type="text"
                  placeholder="Enter your username or email"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  disabled={loading}
                  autoComplete="username"
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f4f4f8', fontSize: '13px', padding: '12px 12px 12px 40px', width: '100%' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: focused === 'password' ? '#818cf8' : '#52525b', transition: 'color 0.2s' }}>
                Password
              </label>
              <div className="relative flex items-center rounded-xl transition-all duration-200" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${focused === 'password' ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.07)'}`, boxShadow: focused === 'password' ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none' }}>
                <Lock className="absolute left-3.5 h-4 w-4" style={{ color: focused === 'password' ? '#818cf8' : '#3f3f46', transition: 'color 0.2s' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  disabled={loading}
                  autoComplete="current-password"
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f4f4f8', fontSize: '13px', padding: '12px 40px 12px 40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5"
                  style={{ color: '#3f3f46', transition: 'color 0.2s', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#818cf8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#3f3f46')}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full relative rounded-xl font-bold text-sm overflow-hidden mt-2"
              style={{
                padding: '13px',
                background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%)',
                color: loading ? 'rgba(255,255,255,0.5)' : '#fff',
                border: '1px solid rgba(99,102,241,0.3)',
                boxShadow: loading ? 'none' : '0 4px 25px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontSize: '11px',
              }}
              onMouseEnter={e => { if (!loading && !googleLoading) { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 35px rgba(99,102,241,0.6), inset 0 1px 0 rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { if (!loading && !googleLoading) { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 25px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; } }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Access Terminal'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[10px] mt-6" style={{ color: '#27272a' }}>
            RiskyVasu · Private Trading Journal · All rights reserved
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        .animate-slide-in { animation: slide-in 0.3s ease forwards; }
      `}</style>
    </div>
  );
};
