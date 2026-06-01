import React, { useState } from 'react';
import { useTrades } from '../../context/TradeContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { 
  User, 
  ShieldAlert, 
  Layers, 
  Check, 
  Plus,
  Link2,
  CheckCircle2
} from 'lucide-react';
import { SupabaseOnboarding } from './SupabaseOnboarding';

export const SettingsView: React.FC = () => {
  const { 
    userProfile, 
    riskLimits, 
    strategies, 
    updateUserProfile, 
    updateRiskLimits, 
    addStrategy 
  } = useTrades();

  const { user, loginWithGoogle } = useAuth();
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleMsg, setGoogleMsg] = useState<string | null>(null);

  const isGoogleLinked = user?.providers?.includes('google') ?? false;
  const isEmailLinked = user?.providers?.includes('email') ?? true;

  const handleConnectGoogle = async () => {
    setGoogleConnecting(true);
    setGoogleMsg(null);
    const res = await loginWithGoogle();
    if (!res.success) {
      setGoogleMsg(res.error || 'Google linking failed.');
      setGoogleConnecting(false);
    }
    // On success, browser redirects to Google OAuth.
  };

  // Profile forms
  const [username, setUsername] = useState(userProfile.username);
  const [currency, setCurrency] = useState(userProfile.currency);
  const [startingBalance, setStartingBalance] = useState(userProfile.startingBalance?.toString() || '10000');
  const [brokerName, setBrokerName] = useState(userProfile.brokerName || 'Generic Broker');
  const [accountType, setAccountType] = useState(userProfile.accountType || 'Live');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Risk forms
  const [dailyLoss, setDailyLoss] = useState(riskLimits.dailyLossLimit.toString());
  const [maxDD, setMaxDD] = useState(riskLimits.maxDrawdown.toString());
  const [riskTrade, setRiskTrade] = useState(riskLimits.riskPerTrade.toString());
  const [riskSuccess, setRiskSuccess] = useState(false);

  // Strategy setups forms
  const [newStratName, setNewStratName] = useState('');
  const [newStratDesc, setNewStratDesc] = useState('');
  const [newStratRules, setNewStratRules] = useState('');

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(false);
    updateUserProfile({
      username,
      currency,
      startingBalance: parseFloat(startingBalance) || 10000,
      brokerName,
      accountType
    });
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handleRiskSave = (e: React.FormEvent) => {
    e.preventDefault();
    setRiskSuccess(false);
    updateRiskLimits({
      dailyLossLimit: parseFloat(dailyLoss) || 500,
      maxDrawdown: parseFloat(maxDD) || 2500,
      riskPerTrade: parseFloat(riskTrade) || 100,
    });
    setRiskSuccess(true);
    setTimeout(() => setRiskSuccess(false), 3000);
  };

  const handleAddStrategy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStratName) return;
    const rulesArray = newStratRules.split(',').map(r => r.trim()).filter(r => r !== '');
    addStrategy(newStratName, newStratDesc, rulesArray);
    setNewStratName('');
    setNewStratDesc('');
    setNewStratRules('');
  };

  return (
    <div className="space-y-6 animate-fade-in text-left pb-12">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
        <h2 className="text-xl font-bold font-display text-zinc-100 !m-0">Global Platform Settings</h2>
        <p className="text-xs text-zinc-400 mt-1">Configure profile tags, audit strategy setup dictionary, and establish rigid risk tolerances.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* User profile card */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-400" />
              <span>Trader Profile Specifications</span>
            </div>
          }
        >
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <Input
                label="Starting Account Balance"
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Broker Name"
                type="text"
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                required
              />
              
              <Select
                label="Account Type"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                options={[
                  { value: 'Live', label: 'Live standard' },
                  { value: 'Evaluation', label: 'Evaluation / Prop' },
                  { value: 'Demo', label: 'Demo Sandbox' },
                ]}
              />

              <Select
                label="Base Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: '$', label: 'USD ($)' },
                  { value: '€', label: 'EUR (€)' },
                  { value: '£', label: 'GBP (£)' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {profileSuccess ? (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                  <Check className="h-4 w-4" />
                  <span>Profile updated.</span>
                </span>
              ) : <div />}
              <Button type="submit" variant="primary" className="text-xs">
                Save Profile Details
              </Button>
            </div>
          </form>
        </Card>

        {/* Risk Limits Settings */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <span>Active Risk Limits Controls</span>
            </div>
          }
        >
          <form onSubmit={handleRiskSave} className="space-y-4">
            <Input
              label="Daily Loss Alarm Threshold"
              type="number"
              value={dailyLoss}
              onChange={(e) => setDailyLoss(e.target.value)}
              placeholder="e.g. 500"
              required
            />
            <Input
              label="Maximum Peak-to-Valley Drawdown Alarm"
              type="number"
              value={maxDD}
              onChange={(e) => setMaxDD(e.target.value)}
              placeholder="e.g. 2500"
              required
            />
            <Input
              label="Risk per Trade Limit"
              type="number"
              value={riskTrade}
              onChange={(e) => setRiskTrade(e.target.value)}
              placeholder="e.g. 100"
              required
            />

            <div className="flex items-center justify-between pt-2">
              {riskSuccess ? (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                  <Check className="h-4 w-4" />
                  <span>Risk bounds synced.</span>
                </span>
              ) : <div />}
              <Button type="submit" variant="rose" className="text-xs">
                Sync Risk Settings
              </Button>
            </div>
          </form>
        </Card>

        {/* Strategy tag setups Manager */}
        <Card
          className="lg:col-span-2"
          title={
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>Custom Strategy & Setup Dictionary</span>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Create new Strategy */}
            <form onSubmit={handleAddStrategy} className="space-y-4 bg-zinc-950 p-4 rounded-xl border border-zinc-900">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display block">Register New Strategy Tag</span>
              
              <Input
                label="Strategy Name *"
                type="text"
                placeholder="e.g. Opening Range Breakout"
                value={newStratName}
                onChange={(e) => setNewStratName(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-display">Description</label>
                <textarea
                  placeholder="Summarize trigger setups, filters, or rules..."
                  value={newStratDesc}
                  onChange={(e) => setNewStratDesc(e.target.value)}
                  className="w-full min-h-[70px] p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all shadow-inner resize-none font-sans"
                />
              </div>

              <Input
                label="Pre-flight checklist Rules"
                type="text"
                placeholder="e.g. Trend Alignment, RSI Overbought, Volume Surge (comma-separated)"
                value={newStratRules}
                onChange={(e) => setNewStratRules(e.target.value)}
              />

              <Button type="submit" variant="primary" className="text-xs w-full flex items-center justify-center gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Register Setup Tag</span>
              </Button>
            </form>

            {/* List Active Strategies */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display block">Active Strategies list</span>
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar pr-1">
                {strategies.map((strat) => (
                  <div key={strat.id} className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-900 flex flex-col justify-between gap-2 text-left">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200 font-display">{strat.name}</h4>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed italic">{strat.description || 'No strategy parameter definitions logged.'}</p>
                    </div>
                    {strat.rules && strat.rules.length > 0 && (
                      <div className="border-t border-zinc-950 pt-2 mt-1">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">Checklist Rules:</span>
                        <div className="flex flex-wrap gap-1">
                          {strat.rules.map(rule => (
                            <span key={rule} className="text-[9px] bg-zinc-950/80 border border-zinc-900 text-zinc-400 font-semibold px-2 py-0.5 rounded">
                              {rule}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Connected Accounts ─────────────────────────────────────────── */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-indigo-400" />
            <span>Connected Accounts &amp; Auth Providers</span>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Link your account to additional sign-in providers. Your role, trade history, and settings are preserved across all linked providers.
          </p>

          {/* Email/Password Provider */}
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: isEmailLinked ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <User className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-200">Email &amp; Password</p>
                <p className="text-[10px] text-zinc-500">{user?.email}</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#4ade80' }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </span>
          </div>

          {/* Google Provider */}
          <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: isGoogleLinked ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-200">Google</p>
                <p className="text-[10px] text-zinc-500">{isGoogleLinked ? 'Linked to your account' : 'Not connected'}</p>
              </div>
            </div>
            {isGoogleLinked ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#4ade80' }}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected
              </span>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={googleConnecting}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all select-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#e4e4e7' }}
              >
                {googleConnecting ? (
                  <><span className="w-3 h-3 border border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />Connecting...</>
                ) : (
                  <>Connect Google</>
                )}
              </button>
            )}
          </div>

          {googleMsg && (
            <p className="text-[11px] text-rose-400 font-semibold">{googleMsg}</p>
          )}

          <div className="pt-1 border-t border-zinc-900">
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              <strong className="text-zinc-500">Security note:</strong> Linking Google uses the same email address. Your role and trade history are never affected by linking additional providers.
            </p>
          </div>
        </div>
      </Card>

      {/* Supabase SaaS Integration */}
      <div className="pt-4 border-t border-zinc-900/60">
        <SupabaseOnboarding />
      </div>
    </div>
  );
};
