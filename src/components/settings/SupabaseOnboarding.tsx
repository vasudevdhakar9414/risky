import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { isSupabaseConfigured } from '../../utils/supabaseClient';
import { 
  Database, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCode
} from 'lucide-react';

export const SupabaseOnboarding: React.FC = () => {
  const [url, setUrl] = useState(localStorage.getItem('trademaster_supabase_url') || '');
  const [key, setKey] = useState(localStorage.getItem('trademaster_supabase_anon_key') || '');
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'cleared'>('idle');

  const configured = isSupabaseConfigured;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && key.trim()) {
      localStorage.setItem('trademaster_supabase_url', url.trim());
      localStorage.setItem('trademaster_supabase_anon_key', key.trim());
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        window.location.reload(); // Reload to initialize Supabase client with new parameters
      }, 1000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('trademaster_supabase_url');
    localStorage.removeItem('trademaster_supabase_anon_key');
    setUrl('');
    setKey('');
    setSaveStatus('cleared');
    setTimeout(() => {
      setSaveStatus('idle');
      window.location.reload(); // Reload to fall back to LocalStorage
    }, 1000);
  };

  const copySqlToClipboard = () => {
    const sqlScript = `-- 1. Create Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    currency TEXT DEFAULT '$' NOT NULL,
    subscription_tier TEXT DEFAULT 'Pro' NOT NULL, -- 'Free' | 'Pro' | 'Elite'
    avatar_seed TEXT DEFAULT 'outfit-default' NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profiles" ON public.profiles 
    FOR ALL USING (auth.uid() = id);

-- Automatic Profile Creator Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, currency, subscription_tier, avatar_seed)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        new.email,
        '$',
        'Pro',
        'outfit-default'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Create Strategies Table
CREATE TABLE public.strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Strategies
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own strategies" ON public.strategies 
    FOR ALL USING (auth.uid() = user_id);

-- 3. Create Trades Table
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME WITHOUT TIME ZONE NOT NULL,
    instrument TEXT NOT NULL,
    asset_class TEXT NOT NULL, -- 'Stock' | 'Crypto' | 'Forex' | 'Option'
    side TEXT NOT NULL,        -- 'Long' | 'Short'
    status TEXT NOT NULL,      -- 'Open' | 'Closed'
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC,
    quantity NUMERIC NOT NULL,
    stop_loss NUMERIC,
    take_profit NUMERIC,
    fees NUMERIC DEFAULT 0 NOT NULL,
    strategy TEXT NOT NULL,
    pnl NUMERIC,
    roi NUMERIC,
    risk_reward_ratio NUMERIC,
    notes TEXT,
    screenshot_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own trades" ON public.trades 
    FOR ALL USING (auth.uid() = user_id);`;

    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Dynamic Connection Status Widget */}
      <Card className="bg-zinc-900/30 border-zinc-800/80 !p-5 relative overflow-hidden">
        {/* Glow accent */}
        <div className={`absolute top-0 right-0 h-48 w-48 rounded-full blur-3xl opacity-10 ${
          configured ? 'bg-emerald-500' : 'bg-amber-500'
        }`} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border ${
              configured 
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400 animate-pulse' 
                : 'bg-amber-950/20 border-amber-800/40 text-amber-500'
            }`}>
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100 font-display">Database Sync Mode</h3>
                <span className={`text-[10px] font-extrabold font-mono uppercase px-2 py-0.5 rounded-full border ${
                  configured 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {configured ? 'Cloud Sync Active' : 'LocalStorage Sandbox'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                {configured 
                  ? 'Your journal entries, execution logs, and custom strategies are synchronizing instantly with your secure, private cloud database.'
                  : 'Your data is currently stored locally in your browser. Configure your Supabase connection parameters below to synchronise with a secure, permanent cloud database.'}
              </p>
            </div>
          </div>

          {!configured && (
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs shrink-0 self-start md:self-center border-zinc-800 text-zinc-300 bg-zinc-900 hover:bg-zinc-800"
            >
              How to set up?
            </Button>
          )}
        </div>
      </Card>

      {/* Guide Details Accordion */}
      {showGuide && (
        <Card className="bg-zinc-950/40 border-zinc-900 !p-5 space-y-4">
          <h4 className="text-xs font-bold text-zinc-300 font-display uppercase tracking-widest flex items-center gap-2">
            <span>⚙️ Step-by-Step Supabase Setup Guide</span>
          </h4>
          <div className="text-xs text-zinc-400 space-y-3 leading-relaxed">
            <p>
              1. <strong>Create an Account:</strong> Register for a free tier database at{' '}
              <a 
                href="https://supabase.com" 
                target="_blank" 
                rel="noreferrer" 
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline inline-flex items-center gap-0.5"
              >
                supabase.com <ExternalLink className="h-3 w-3" />
              </a>.
            </p>
            <p>
              2. <strong>Create a Project:</strong> Click <strong>New Project</strong>, name it <code>RiskyVasu</code>, set a secure password, and select your preferred region.
            </p>
            <p>
              3. <strong>Run Database Schema DDL:</strong> Open the <strong>SQL Editor</strong> in the left sidebar, click <strong>New Query</strong>, paste the SQL schema provided below, and click <strong>Run</strong>.
            </p>
            <p>
              4. <strong>Enable Storage (Screenshots):</strong> Navigate to <strong>Storage</strong> in the left sidebar. Click <strong>New Bucket</strong>. Name it exactly <code>trade-attachments</code> and set the bucket to <strong>Public</strong>. Create a storage policy granting public access to read objects.
            </p>
            <p>
              5. <strong>Link Credentials:</strong> Go to <strong>Project Settings</strong> &rarr; <strong>API</strong>, copy your <strong>Project URL</strong> and <strong>Anon Public API Key</strong>, paste them in the form below, and click <strong>Save</strong>.
            </p>
          </div>
        </Card>
      )}

      {/* Configuration Form */}
      <Card className="bg-zinc-900/10 border-zinc-900 !p-5">
        <form onSubmit={handleSave} className="space-y-4">
          <h4 className="text-xs font-bold text-zinc-400 font-display uppercase tracking-widest">
            Connection Parameters
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Supabase Project URL"
              placeholder="e.g. https://xyz.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={saveStatus !== 'idle'}
            />
            <Input
              label="Supabase Anon Key"
              placeholder="your-anon-public-api-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              type="password"
              required
              disabled={saveStatus !== 'idle'}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              {saveStatus === 'success' && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" /> Credentials saved! Synchronising backend...
                </span>
              )}
              {saveStatus === 'cleared' && (
                <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Connection cleared. Falling back to sandbox...
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {configured && (
                <Button 
                  type="button" 
                  variant="rose" 
                  onClick={handleClear}
                  className="text-xs py-2"
                  disabled={saveStatus !== 'idle'}
                >
                  Disconnect Database
                </Button>
              )}
              <Button 
                type="submit" 
                className="text-xs py-2 bg-indigo-600 hover:bg-indigo-500"
                disabled={saveStatus !== 'idle'}
              >
                {configured ? 'Update Sync Keys' : 'Connect & Sync'}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Schema DDL Panel */}
      <Card className="bg-zinc-950/20 border-zinc-900 !p-4">
        <button
          onClick={() => setShowSql(!showSql)}
          className="w-full flex items-center justify-between text-xs text-zinc-400 font-bold font-display uppercase tracking-widest hover:text-zinc-200 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-indigo-400" />
            <span>Database SQL Schema (DDL)</span>
          </div>
          {showSql ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showSql && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-zinc-500 leading-normal">
              Execute this script within your Supabase SQL Editor. It structures the tables and enables Row Level Security (RLS) policies scoped strictly to each registered user.
            </p>
            <div className="relative">
              <pre className="text-[10px] text-zinc-400 font-mono bg-zinc-950 border border-zinc-900 rounded-lg p-4 overflow-x-auto max-h-60 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800">
{`-- 1. Create Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    currency TEXT DEFAULT '$' NOT NULL,
    subscription_tier TEXT DEFAULT 'Pro' NOT NULL, -- 'Free' | 'Pro' | 'Elite'
    avatar_seed TEXT DEFAULT 'outfit-default' NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profiles" ON public.profiles 
    FOR ALL USING (auth.uid() = id);

-- Automatic Profile Creator Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, currency, subscription_tier, avatar_seed)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        new.email,
        '$',
        'Pro',
        'outfit-default'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Create Strategies Table
CREATE TABLE public.strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Strategies
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own strategies" ON public.strategies 
    FOR ALL USING (auth.uid() = user_id);

-- 3. Create Trades Table
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME WITHOUT TIME ZONE NOT NULL,
    instrument TEXT NOT NULL,
    asset_class TEXT NOT NULL, -- 'Stock' | 'Crypto' | 'Forex' | 'Option'
    side TEXT NOT NULL,        -- 'Long' | 'Short'
    status TEXT NOT NULL,      -- 'Open' | 'Closed'
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC,
    quantity NUMERIC NOT NULL,
    stop_loss NUMERIC,
    take_profit NUMERIC,
    fees NUMERIC DEFAULT 0 NOT NULL,
    strategy TEXT NOT NULL,
    pnl NUMERIC,
    roi NUMERIC,
    risk_reward_ratio NUMERIC,
    notes TEXT,
    screenshot_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own trades" ON public.trades 
    FOR ALL USING (auth.uid() = user_id);`}
              </pre>
              <button
                onClick={copySqlToClipboard}
                className="absolute top-2.5 right-2.5 p-1.5 rounded bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                title="Copy DDL Code"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
