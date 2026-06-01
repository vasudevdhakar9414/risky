import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrades } from '../../context/TradeContext';
import { formatCurrency, formatPercent, cn } from '../../utils/helpers';
import { generateTradeCertificate } from '../../utils/pdfGenerator';
import { 
  Award, 
  Download, 
  Share2, 
  ArrowLeft, 
  Check, 
  CheckCircle,
  FileImage
} from 'lucide-react';

export const CertificatePreview: React.FC = () => {
  const { tradeId } = useParams<{ tradeId: string }>();
  const navigate = useNavigate();
  const { trades, userProfile } = useTrades();
  const [copied, setCopied] = useState(false);

  const trade = useMemo(() => {
    return trades.find(t => t.id === tradeId);
  }, [trades, tradeId]);

  const disciplineScore = useMemo(() => {
    if (!trade) return 100;
    const mistakes = trade.mistakes || [];
    return Math.max(0, 100 - mistakes.length * 20);
  }, [trade]);

  const verifyUrl = useMemo(() => {
    return `${window.location.origin}/verify/${tradeId}`;
  }, [tradeId]);

  const handleShare = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!trade) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col justify-center items-center p-6 text-center">
        <Award className="h-12 w-12 text-rose-500 animate-pulse mb-3" />
        <h2 className="text-xl font-bold font-display">Execution Certificate Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1.5 max-w-sm leading-relaxed">
          The requested trade record could not be located in your local terminal database.
        </p>
        <button
          onClick={() => navigate('/journal')}
          className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition-colors select-none cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Journal
        </button>
      </div>
    );
  }

  const isProfit = (trade.pnl || 0) >= 0;

  return (
    <div className="min-h-screen bg-[#06060c] text-zinc-100 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden pb-16">
      {/* Dynamic ambient backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-amber-500/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Header Toolbar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6 z-10">
        <button
          onClick={() => navigate('/journal')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 bg-zinc-950/70 border border-zinc-900 transition-all select-none cursor-pointer text-xs font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="h-4 w-4" /> back
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950/70 border border-zinc-900 hover:bg-zinc-900 text-xs font-black uppercase tracking-wider text-indigo-400 transition-all select-none cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>Share Verification</span>
              </>
            )}
          </button>
          <button
            onClick={() => generateTradeCertificate(trade, userProfile)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all select-none cursor-pointer shadow-[0_4px_25px_rgba(245,158,11,0.2)]"
          >
            <Download className="h-4 w-4" />
            <span>Download Certificate PDF</span>
          </button>
        </div>
      </div>

      {/* Main Certificate Interactive Frame */}
      <div 
        className="w-full max-w-4xl p-8 md:p-12 bg-zinc-950 border border-amber-500/25 rounded-3xl relative shadow-[0_30px_100px_rgba(0,0,0,0.8),_0_0_80px_rgba(99,102,241,0.02)]"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(10,10,25,0.8) 0%, rgba(3,3,8,1) 100%)'
        }}
      >
        {/* Double Gold Premium Borders */}
        <div className="absolute inset-3 border border-amber-500/20 rounded-2xl pointer-events-none" />
        <div className="absolute inset-4 border border-amber-500/10 rounded-2xl pointer-events-none" />

        {/* Decorative corner highlights */}
        <div className="absolute top-6 left-6 w-3 h-3 border-t-2 border-l-2 border-amber-500/60" />
        <div className="absolute top-6 right-6 w-3 h-3 border-t-2 border-r-2 border-amber-500/60" />
        <div className="absolute bottom-6 left-6 w-3 h-3 border-b-2 border-l-2 border-amber-500/60" />
        <div className="absolute bottom-6 right-6 w-3 h-3 border-b-2 border-r-2 border-amber-500/60" />

        {/* Certificate Contents */}
        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-amber-500 tracking-[0.25em] uppercase font-display block">
              RiskyVasu Trading Terminal
            </span>
            <Award className="h-8 w-8 text-amber-500 mt-4 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-tight font-display uppercase">
              Certificate of Execution Excellence
            </h1>
            <div className="w-32 h-[1px] bg-amber-500/40 mx-auto" />
          </div>

          <p className="text-sm text-zinc-400 max-w-lg leading-relaxed">
            This official document certifies that the execution logged by trader
          </p>

          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider font-display bg-white/2 px-6 py-1.5 rounded-full border border-white/5 shadow-inner">
            {userProfile.username}
          </h2>

          <p className="text-sm text-zinc-400 max-w-lg leading-relaxed">
            on date <strong className="text-zinc-200">{trade.date}</strong> at time <strong className="text-zinc-200">{trade.time}</strong> has successfully satisfied all professional performance rules.
          </p>

          {/* Specifications Dashboard Panel */}
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/30 border border-zinc-900 p-6 rounded-2xl text-left shadow-inner">
            <div>
              <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest block">Symbol / Pair</span>
              <span className="text-sm font-black text-zinc-100 block mt-1">{trade.instrument}</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest block">Order Side</span>
              <span className={cn(
                "text-xs font-black uppercase px-2 py-0.5 rounded mt-1.5 inline-block font-mono",
                trade.side === 'Long' ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-400"
              )}>
                {trade.side}
              </span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest block">Outcome PnL</span>
              <span className={cn(
                "text-sm font-black block mt-1 font-display",
                isProfit ? "text-emerald-400" : "text-rose-500"
              )}>
                {trade.pnl !== undefined ? formatCurrency(trade.pnl, userProfile.currency) : 'OPEN'}
              </span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest block">Return ROI %</span>
              <span className={cn(
                "text-sm font-black block mt-1 font-mono",
                isProfit ? "text-emerald-400" : "text-rose-500"
              )}>
                {trade.roi !== undefined ? formatPercent(trade.roi) : 'OPEN'}
              </span>
            </div>
          </div>

          {/* Deep Details Row */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Strategy Audit Checklists */}
            <div className="bg-zinc-900/20 border border-zinc-900/50 p-5 rounded-2xl shadow-inner">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-3 font-display">
                Strategy Checklist Compliance
              </span>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-400">Setup: <strong>{trade.strategy}</strong></span>
                <span className="text-xs font-extrabold text-emerald-400 font-mono">{trade.complianceScore || 100}% Score</span>
              </div>

              {trade.checkedRules && trade.checkedRules.length > 0 ? (
                <div className="space-y-1.5">
                  {trade.checkedRules.map((rule) => (
                    <div key={rule} className="flex items-center gap-2 text-[10px] text-zinc-300 font-semibold bg-zinc-950/55 p-2 rounded-lg border border-zinc-900">
                      <CheckCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-[10px] text-zinc-600 bg-zinc-950/20 border border-dashed border-zinc-900 rounded-xl font-medium">
                  No strategy checklist rules configured or logged.
                </div>
              )}
            </div>

            {/* Mistakes & Psychologist Notes */}
            <div className="bg-zinc-900/20 border border-zinc-900/50 p-5 rounded-2xl shadow-inner flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-3 font-display">
                  Behavioral Discipline Audit
                </span>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-zinc-400">Discipline Index:</span>
                  <span className={cn(
                    "text-xs font-extrabold font-mono",
                    disciplineScore >= 80 ? "text-emerald-400" : disciplineScore >= 50 ? "text-amber-400" : "text-rose-500"
                  )}>
                    {disciplineScore}/100 Score
                  </span>
                </div>

                {trade.mistakes && trade.mistakes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {trade.mistakes.map(m => (
                      <span key={m} className="text-[8px] text-rose-400 font-black uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10 font-mono">
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-400 font-extrabold uppercase bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 rounded-xl mb-4 text-center">
                    ✓ Perfect compliance - Zero behavioral rules broken
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-900">
                <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest block mb-1">Trader Execution Notes</span>
                <p className="text-[10px] text-zinc-300 italic leading-relaxed">&ldquo;{trade.notes || 'No notes compiled.'}&rdquo;</p>
              </div>
            </div>
          </div>

          {/* Screenshot Display if attached */}
          {trade.screenshotUrl && (
            <div className="w-full text-left bg-zinc-900/20 border border-zinc-900/50 p-5 rounded-2xl">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3 font-display flex items-center gap-1.5">
                <FileImage className="h-4 w-4 text-indigo-400" /> Attached Chart Screenshot
              </span>
              <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-1 overflow-hidden max-h-[300px] flex items-center justify-center">
                <img src={trade.screenshotUrl} alt="Chart Attachment" className="w-full h-full object-contain rounded-lg" />
              </div>
            </div>
          )}

          {/* Cryptographic Digital Seals Block */}
          <div className="w-full border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-left">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest block">Signature Verification ID</span>
              <span className="text-[10px] font-mono text-zinc-400 font-bold block">{trade.certificateId || trade.id}</span>
              <span className="text-[8px] text-zinc-600 block">Digitally registered in secure ledger &bull; Verified genuine</span>
            </div>

            <div className="flex items-center gap-6">
              {/* Dynamic Styled QR code mock */}
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-amber-500/20 flex gap-2 items-center">
                <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded flex flex-col items-center justify-center p-1 relative">
                  <div className="w-full h-full grid grid-cols-4 gap-0.5 opacity-80">
                    <div className="bg-amber-500 rounded-sm"></div>
                    <div className="bg-amber-500 rounded-sm"></div>
                    <div></div>
                    <div className="bg-amber-500 rounded-sm"></div>
                    <div></div>
                    <div className="bg-amber-500 rounded-sm"></div>
                    <div className="bg-amber-500 rounded-sm"></div>
                    <div></div>
                    <div className="bg-amber-500 rounded-sm"></div>
                    <div></div>
                    <div className="bg-amber-500 rounded-sm"></div>
                    <div className="bg-amber-500 rounded-sm"></div>
                    <div className="bg-amber-500 rounded-sm"></div>
                    <div className="bg-amber-500 rounded-sm"></div>
                    <div></div>
                    <div className="bg-amber-500 rounded-sm"></div>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block">Verify Authenticity</span>
                  <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">Scan terminal stamp</span>
                  <span className="text-[7px] text-indigo-400 font-bold block mt-0.5">Public link active</span>
                </div>
              </div>

              {/* Digital Verification stamp */}
              <div className="w-20 h-20 rounded-full border-4 border-double border-amber-500/40 flex flex-col items-center justify-center text-center p-1 font-display uppercase tracking-widest">
                <span className="text-[6px] font-black text-amber-500">VERIFIED</span>
                <span className="text-[9px] font-black text-amber-500 my-0.5">GENUINE</span>
                <span className="text-[5px] font-black text-zinc-500">RISKYVASU</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
