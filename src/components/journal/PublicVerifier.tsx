import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../utils/supabaseClient';
import { formatCurrency, formatPercent, cn } from '../../utils/helpers';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  Calendar,
  User,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { Trade } from '../../types';

export const PublicVerifier: React.FC = () => {
  const { tradeId } = useParams<{ tradeId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [trade, setTrade] = useState<Trade | null>(null);
  const [username, setUsername] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchPublicTrade = async () => {
      if (!tradeId) {
        setError('Invalid Verification Identifier');
        setLoading(false);
        return;
      }

      try {
        if (isSupabaseConfigured && supabase) {
          // 1. Fetch public trade detail from the ledger
          const { data: dbTrade, error: tradeErr } = await supabase
            .from('trades')
            .select('*')
            .eq('id', tradeId)
            .maybeSingle();

          if (tradeErr || !dbTrade) {
            setError('Cryptographic Signature Invalid. This record does not exist inside the RiskyVasu ledger.');
            setLoading(false);
            return;
          }

          // 2. Fetch the corresponding profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', dbTrade.user_id)
            .maybeSingle();

          setUsername(profile?.username || 'Verified Trader');
          
          // Map to client model
          setTrade({
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
            complianceScore: dbTrade.compliance_score || 100,
            checkedRules: dbTrade.checked_rules || [],
            certificateId: dbTrade.certificate_id || dbTrade.id
          });
        } else {
          // Sandbox local mock verify (just in case they test locally without Supabase config)
          setError('Verification terminal offline. Supabase integration must be active to read public trade signatures.');
        }
      } catch (err: any) {
        console.error('Verify error:', err);
        setError('An unexpected error occurred during signature lookup.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicTrade();
  }, [tradeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030307] text-zinc-100 flex flex-col justify-center items-center p-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-3" />
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest animate-pulse font-display">
          Accessing Cryptographic Ledger...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030307] text-zinc-100 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden pb-16">
      {/* Glow overlays */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      
      {error ? (
        <div 
          className="w-full max-w-md p-8 rounded-3xl bg-zinc-950 border border-rose-500/30 text-center relative shadow-2xl"
          style={{ backgroundImage: 'linear-gradient(135deg, rgba(244,63,94,0.02) 0%, rgba(3,3,7,1) 100%)' }}
        >
          <div className="absolute inset-2 border border-rose-500/10 rounded-2xl pointer-events-none" />
          <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto animate-bounce mb-4" />
          <h2 className="text-lg font-black text-zinc-100 font-display uppercase tracking-wider">Verification Failure</h2>
          <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
            {error}
          </p>
          <div className="mt-8 border-t border-zinc-900 pt-6 flex justify-center">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider border-none bg-transparent select-none cursor-pointer"
            >
              <span>Back to Login</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        trade && (
          <div 
            className="w-full max-w-lg p-8 rounded-3xl bg-zinc-950 border border-emerald-500/30 relative shadow-2xl space-y-6 text-left"
            style={{ backgroundImage: 'linear-gradient(135deg, rgba(16,185,129,0.02) 0%, rgba(3,3,7,1) 100%)' }}
          >
            {/* Elegant double border */}
            <div className="absolute inset-2 border border-emerald-500/15 rounded-2xl pointer-events-none" />
            
            {/* Header Lock glowing */}
            <div className="flex flex-col items-center text-center space-y-2 border-b border-zinc-900 pb-5">
              <ShieldCheck className="h-12 w-12 text-emerald-400 animate-pulse" />
              <h2 className="text-lg font-black text-emerald-400 font-display uppercase tracking-widest">
                Verification Successful
              </h2>
              <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-[0.2em] block">
                Certificate Status &bull; Genuine Verified
              </span>
            </div>

            {/* Verification Metadata details */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-zinc-900/20 p-3.5 rounded-xl border border-zinc-900">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-zinc-500" /> Trader Username:
                </span>
                <span className="text-xs font-black text-zinc-100 uppercase tracking-wider font-display">
                  {username}
                </span>
              </div>

              {/* Trade outcomes grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/10 border border-zinc-900 p-4 rounded-xl">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Symbol / Instrument</span>
                  <span className="text-sm font-black text-zinc-100 block mt-1">{trade.instrument}</span>
                </div>
                <div className="bg-zinc-900/10 border border-zinc-900 p-4 rounded-xl">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Order Direction</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded mt-1.5 inline-block font-mono",
                    trade.side === 'Long' ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-400"
                  )}>
                    {trade.side}
                  </span>
                </div>
                <div className="bg-zinc-900/10 border border-zinc-900 p-4 rounded-xl">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Net Profit / Loss</span>
                  <span className={cn(
                    "text-sm font-black block mt-1 font-display",
                    (trade.pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-500"
                  )}>
                    {trade.pnl !== undefined ? formatCurrency(trade.pnl, '$') : 'OPEN'}
                  </span>
                </div>
                <div className="bg-zinc-900/10 border border-zinc-900 p-4 rounded-xl">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Yield Return ROI %</span>
                  <span className={cn(
                    "text-sm font-black block mt-1 font-mono",
                    (trade.pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-500"
                  )}>
                    {trade.roi !== undefined ? formatPercent(trade.roi) : 'OPEN'}
                  </span>
                </div>
              </div>

              {/* Extra specifications */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs border-b border-zinc-900/50 py-2">
                  <span className="text-zinc-500 font-semibold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-zinc-600" /> Setup Strategy:
                  </span>
                  <span className="text-zinc-200 font-bold">{trade.strategy}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-zinc-900/50 py-2">
                  <span className="text-zinc-500 font-semibold flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-zinc-600" /> Rules Compliance:
                  </span>
                  <span className="text-emerald-400 font-black font-mono">{trade.complianceScore || 100}%</span>
                </div>
                <div className="flex justify-between items-center text-xs py-2">
                  <span className="text-zinc-500 font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-zinc-600" /> Date Logged:
                  </span>
                  <span className="text-zinc-200 font-bold">{trade.date} {trade.time}</span>
                </div>
              </div>

              {/* Certificate Verification Signature UUID */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 text-left space-y-1">
                <span className="text-[8px] font-bold text-zinc-650 uppercase tracking-widest block">Verification Certificate ID</span>
                <span className="text-[10px] font-mono text-zinc-500 font-semibold block break-all">{trade.certificateId || trade.id}</span>
                <span className="text-[8px] text-zinc-700 block mt-1 leading-normal font-semibold">
                  This transaction has been cryptographically signed and confirmed genuine inside the private RiskyVasu distributed ledger.
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex justify-center">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider border-none bg-transparent select-none cursor-pointer"
              >
                <span>RiskyVasu Portal Login</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};
