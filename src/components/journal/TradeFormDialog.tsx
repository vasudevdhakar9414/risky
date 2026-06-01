import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTrades } from '../../context/TradeContext';
import { useAuth } from '../../context/AuthContext';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { Trade, AssetClass, TradeSide, TradeStatus } from '../../types';
import { formatPercent, cn } from '../../utils/helpers';
import { UploadCloud, Trash2, Loader2, Link as LinkIcon, CheckCircle2, HelpCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../utils/supabaseClient';

interface TradeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trade?: Trade; // If present, we are editing
}

export const TradeFormDialog: React.FC<TradeFormDialogProps> = ({
  isOpen,
  onClose,
  trade,
}) => {
  const { addTrade, updateTrade, strategies, userProfile } = useTrades();
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [instrument, setInstrument] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('Stock');
  const [side, setSide] = useState<TradeSide>('Long');
  const [status, setStatus] = useState<TradeStatus>('Closed');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [fees, setFees] = useState('');
  const [strategy, setStrategy] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);

  // Strategy Checklist states
  const [checkedRules, setCheckedRules] = useState<string[]>([]);

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Live calculations
  const [livePnl, setLivePnl] = useState<number | null>(null);
  const [liveRoi, setLiveRoi] = useState<number | null>(null);
  const [liveRr, setLiveRr] = useState<number | null>(null);

  // Load rules when strategy selection changes or modal loads
  const currentStrategyObj = useMemo(() => {
    return strategies.find(s => s.name === strategy);
  }, [strategies, strategy]);

  const strategyRules = useMemo(() => {
    return currentStrategyObj?.rules || [];
  }, [currentStrategyObj]);

  const liveComplianceScore = useMemo(() => {
    if (strategyRules.length === 0) return 100;
    return Math.round((checkedRules.length / strategyRules.length) * 100);
  }, [checkedRules, strategyRules]);

  // Instrument suggestions based on selected asset class
  const instrumentSuggestions = useMemo(() => {
    if (assetClass === 'Crypto') return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
    if (assetClass === 'Forex') return ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'];
    if (assetClass === 'Stock') return ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];
    if (assetClass === 'Option') return ['SPY', 'QQQ', 'IWM'];
    return [];
  }, [assetClass]);

  // Specific calculator contracts label
  const assetQuantityLabel = useMemo(() => {
    if (assetClass === 'Forex') return 'Quantity (Lots) *';
    if (assetClass === 'Option') return 'Quantity (Contracts) *';
    if (instrument.toUpperCase().includes('XAU') || instrument.toUpperCase().includes('GOLD')) return 'Quantity (Lots) *';
    if (instrument.toUpperCase().includes('XAG') || instrument.toUpperCase().includes('SILVER')) return 'Quantity (Lots) *';
    return 'Quantity (Units) *';
  }, [assetClass, instrument]);

  const assetMultiplierTooltip = useMemo(() => {
    if (assetClass === 'Forex') return 'Forex Lot calculator uses 100,000 unit standard base contract calculations.';
    if (assetClass === 'Option') return 'Option multiplier assumes standard 100 shares equity coverage.';
    if (instrument.toUpperCase().includes('XAU') || instrument.toUpperCase().includes('GOLD')) return 'Gold (XAUUSD) lot uses standard 100 oz contracts.';
    if (instrument.toUpperCase().includes('XAG') || instrument.toUpperCase().includes('SILVER')) return 'Silver (XAGUSD) lot uses standard 5,000 oz contracts.';
    return 'Standard unit-based standard multipliers.';
  }, [assetClass, instrument]);

  // Initialize fields on load or when trade updates
  useEffect(() => {
    if (isOpen) {
      setUploadError('');
      setIsUploading(false);

      if (trade) {
        setDate(trade.date);
        setTime(trade.time);
        setInstrument(trade.instrument);
        setAssetClass(trade.assetClass);
        setSide(trade.side);
        setStatus(trade.status);
        setEntryPrice(trade.entryPrice.toString());
        setExitPrice(trade.exitPrice?.toString() || '');
        setQuantity(trade.quantity.toString());
        setStopLoss(trade.stopLoss?.toString() || '');
        setTakeProfit(trade.takeProfit?.toString() || '');
        setFees(trade.fees.toString());
        setStrategy(trade.strategy);
        setNotes(trade.notes || '');
        setScreenshotUrl(trade.screenshotUrl || '');
        setSelectedMistakes(trade.mistakes || []);
        setCheckedRules(trade.checkedRules || []);
      } else {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');

        setDate(`${yyyy}-${mm}-${dd}`);
        setTime(`${hh}:${min}`);
        setInstrument('');
        setAssetClass('Stock');
        setSide('Long');
        setStatus('Closed');
        setEntryPrice('');
        setExitPrice('');
        setQuantity('');
        setStopLoss('');
        setTakeProfit('');
        setFees('0.00');
        setStrategy(strategies[0]?.name || 'VWAP Pullback');
        setNotes('');
        setScreenshotUrl('');
        setSelectedMistakes([]);
        setCheckedRules([]);
      }
    }
  }, [isOpen, trade, strategies]);

  // Recalculate live indicators on inputs change
  useEffect(() => {
    const entry = parseFloat(entryPrice);
    const qty = parseFloat(quantity);
    const fee = parseFloat(fees) || 0;
    const exit = parseFloat(exitPrice);

    if (isNaN(entry) || isNaN(qty)) {
      setLivePnl(null);
      setLiveRoi(null);
      setLiveRr(null);
      return;
    }

    // PnL & ROI Calculations
    if (status === 'Closed' && !isNaN(exit)) {
      let pnl = 0;
      const isLong = side === 'Long';
      const sideMult = isLong ? 1 : -1;
      const symb = instrument.toUpperCase();

      if (assetClass === 'Forex') {
        const isJpy = symb.includes('JPY');
        if (isJpy) {
          const pnlJpy = sideMult * (exit - entry) * qty * 100000;
          pnl = (pnlJpy / (exit || 1)) - fee;
        } else {
          pnl = sideMult * (exit - entry) * qty * 100000 - fee;
        }
      } else if (assetClass === 'Option') {
        pnl = sideMult * (exit - entry) * 100 * qty - fee;
      } else if (symb.includes('XAU') || symb.includes('GOLD')) {
        pnl = sideMult * (exit - entry) * qty * 100 - fee;
      } else if (symb.includes('XAG') || symb.includes('SILVER')) {
        pnl = sideMult * (exit - entry) * qty * 5000 - fee;
      } else if (assetClass === 'Crypto') {
        pnl = sideMult * (exit - entry) * qty - fee;
      } else if (assetClass === 'Stock') {
        pnl = sideMult * (exit - entry) * qty - fee;
      } else {
        const isIndex = ['US30', 'NAS', 'SPX', 'GER', 'UK100'].some(idx => symb.includes(idx));
        const indexMult = isIndex ? 10 : 1;
        pnl = sideMult * (exit - entry) * qty * indexMult - fee;
      }

      const startingBal = userProfile.startingBalance || 10000;
      const roi = (pnl / startingBal) * 100;

      setLivePnl(parseFloat(pnl.toFixed(2)));
      setLiveRoi(parseFloat(roi.toFixed(2)));
    } else {
      setLivePnl(null);
      setLiveRoi(null);
    }

    // Risk-Reward Calculations
    const stop = parseFloat(stopLoss);
    const profit = parseFloat(takeProfit);
    if (!isNaN(stop) && !isNaN(profit)) {
      const risk = Math.abs(entry - stop);
      const reward = Math.abs(profit - entry);
      const rr = reward / (risk === 0 ? 1 : risk);
      setLiveRr(parseFloat(rr.toFixed(2)));
    } else {
      setLiveRr(null);
    }
  }, [entryPrice, exitPrice, quantity, fees, stopLoss, takeProfit, status, side, assetClass, instrument, userProfile.startingBalance]);

  // Handle Dynamic File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be smaller than 5MB.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      if (isSupabaseConfigured && supabase && isAuthenticated && user?.id && user.id !== 'sandbox-demo') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_trade_screenshot.${fileExt}`;

        const { error } = await supabase.storage
          .from('trade-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (error) throw new Error(error.message);

        const { data: { publicUrl } } = supabase.storage
          .from('trade-attachments')
          .getPublicUrl(fileName);

        setScreenshotUrl(publicUrl);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setScreenshotUrl(reader.result as string);
          setIsUploading(false);
        };
        reader.onerror = () => {
          setUploadError('Failed to parse local image file.');
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Create public bucket named "trade-attachments" in Supabase Dashboard.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotUrl('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !time || !instrument || !entryPrice || !quantity) {
      alert('Please fill out all required parameters.');
      return;
    }

    const tradeFields = {
      date,
      time,
      instrument: instrument.toUpperCase(),
      assetClass,
      side,
      status,
      entryPrice: parseFloat(entryPrice),
      exitPrice: status === 'Closed' && exitPrice !== '' ? parseFloat(exitPrice) : undefined,
      quantity: parseFloat(quantity),
      stopLoss: stopLoss !== '' ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit !== '' ? parseFloat(takeProfit) : undefined,
      fees: parseFloat(fees) || 0,
      strategy,
      notes: notes !== '' ? notes : undefined,
      screenshotUrl: screenshotUrl !== '' ? screenshotUrl : undefined,
      mistakes: selectedMistakes,
      complianceScore: liveComplianceScore,
      checkedRules: checkedRules,
    };

    if (trade) {
      updateTrade({ ...tradeFields, id: trade.id });
    } else {
      addTrade(tradeFields);
    }

    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={trade ? `Modify Execution: ${trade.instrument}` : 'Log New Execution'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Core details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input
            label="Date *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Time *"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
          
          {/* Symbol combined suggestion selector */}
          <div className="flex flex-col gap-1.5">
            <Input
              label="Symbol *"
              type="text"
              placeholder="e.g. EURUSD, BTC"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              required
            />
            {instrumentSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {instrumentSuggestions.map(sym => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setInstrument(sym)}
                    className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded-md transition-all select-none border border-zinc-800 bg-zinc-950/80 cursor-pointer text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/30",
                      instrument.toUpperCase() === sym ? "text-indigo-400 border-indigo-500/40 bg-indigo-500/10" : ""
                    )}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Select
            label="Asset Class"
            value={assetClass}
            onChange={(e) => setAssetClass(e.target.value as AssetClass)}
            options={[
              { value: 'Stock', label: 'Stock' },
              { value: 'Crypto', label: 'Crypto' },
              { value: 'Forex', label: 'Forex' },
              { value: 'Option', label: 'Option' },
            ]}
          />
        </div>

        {/* Action types */}
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Direction"
            value={side}
            onChange={(e) => setSide(e.target.value as TradeSide)}
            options={[
              { value: 'Long', label: 'Long (Buy)' },
              { value: 'Short', label: 'Short (Sell)' },
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TradeStatus)}
            options={[
              { value: 'Closed', label: 'Closed' },
              { value: 'Open', label: 'Open Position' },
            ]}
          />
          <Select
            label="Setup Strategy"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            options={strategies.map(s => ({ value: s.name, label: s.name }))}
          />
        </div>

        {/* Pricing inputs with Asset Calculators Tooltip help */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input
            label="Entry Price *"
            type="number"
            step="any"
            placeholder="0.00"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            required
          />
          <Input
            label="Exit Price"
            type="number"
            step="any"
            placeholder="0.00"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            disabled={status === 'Open'}
            className={status === 'Open' ? 'opacity-40' : ''}
          />
          
          <div className="flex flex-col gap-1.5 relative">
            <Input
              label={assetQuantityLabel}
              type="number"
              step="any"
              placeholder="Min 0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <div className="absolute right-1 top-6 hover:text-indigo-400 text-zinc-500 cursor-help" title={assetMultiplierTooltip}>
              <HelpCircle className="h-3.5 w-3.5" />
            </div>
          </div>

          <Input
            label="Exchange Fees"
            type="number"
            step="any"
            placeholder="0.00"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
          />
        </div>

        {/* Risk limits */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Stop Loss Price"
            type="number"
            step="any"
            placeholder="Optional stop"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
          />
          <Input
            label="Take Profit Price"
            type="number"
            step="any"
            placeholder="Optional target"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
          />
        </div>

        {/* Strategy Rules Pre-flight Checklist */}
        {strategyRules.length > 0 && (
          <div className="flex flex-col gap-1.5 text-left bg-zinc-950/80 p-4 rounded-xl border border-zinc-900 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-indigo-400 uppercase tracking-wider font-display">Strategy Rules checklist</label>
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded font-mono uppercase",
                liveComplianceScore >= 80 ? "text-emerald-400 bg-emerald-500/10" : liveComplianceScore >= 50 ? "text-amber-400 bg-amber-500/10" : "text-rose-500 bg-rose-500/10"
              )}>
                Compliance: {liveComplianceScore}%
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-semibold">Ticking checklist guidelines ensures high-discipline setup triggers.</p>
            <div className="grid grid-cols-1 gap-2.5 mt-2">
              {strategyRules.map((rule) => {
                const isChecked = checkedRules.includes(rule);
                return (
                  <button
                    key={rule}
                    type="button"
                    onClick={() => {
                      if (isChecked) {
                        setCheckedRules(prev => prev.filter(r => r !== rule));
                      } else {
                        setCheckedRules(prev => [...prev, rule]);
                      }
                    }}
                    className={cn(
                      "px-3 py-2.5 rounded-lg text-xs font-bold text-left transition-all flex items-center gap-3 border select-none border-zinc-900 cursor-pointer",
                      isChecked
                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-sm animate-pulse"
                        : "bg-zinc-900/10 border-zinc-900 text-zinc-500 hover:text-zinc-400 hover:border-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center text-[9px] font-black shrink-0 font-mono transition-all",
                      isChecked ? "border-indigo-400 bg-indigo-500 text-white" : "border-zinc-700 bg-transparent text-transparent"
                    )}>
                      ✓
                    </div>
                    <span className="leading-snug">{rule}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mistakes and screenshots upload */}
        <div className="space-y-4">
          {/* Screenshot Attachments Region */}
          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-display">Execution Chart Attachment</span>
            
            {screenshotUrl ? (
              <div className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 p-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-zinc-900 border border-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img src={screenshotUrl} alt="Chart Thumbnail" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-200 block truncate max-w-[200px]">Screenshot Attachment</span>
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                      <LinkIcon className="h-3 w-3 text-indigo-400" /> {screenshotUrl.substring(0, 40)}...
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 font-mono uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Attached
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveScreenshot}
                    className="p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:border-rose-900/30 transition-all cursor-pointer border-none bg-transparent"
                    title="Remove Screenshot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`border border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center ${
                  isUploading 
                    ? 'border-indigo-500 bg-indigo-500/5 cursor-wait' 
                    : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/80'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading}
                />
                
                {isUploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                    <span className="text-xs font-bold text-zinc-200">Uploading Screenshot...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-6 w-6 text-zinc-500 hover:text-indigo-400 transition-colors" />
                    <span className="text-xs font-bold text-zinc-200">Upload execution chart attachment</span>
                    <span className="text-[10px] text-zinc-500">
                      {isSupabaseConfigured 
                        ? 'Support PNG, JPG, WEBP (Max 5MB) synced to secure cloud bucket' 
                        : 'Running sandbox: Attachments read as local Base64 assets'}
                    </span>
                  </>
                )}
              </div>
            )}

            {uploadError && (
              <span className="text-[10px] text-rose-400 font-medium leading-normal mt-1 block">
                ⚠️ Upload Error: {uploadError}
              </span>
            )}
          </div>

          {/* Mistakes Tagging */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-display">Behavioral & Mistake Tags</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {['FOMO', 'Revenge Trading', 'Over Risk', 'Early Exit', 'Late Exit', 'Rule Break', 'Emotional Trade'].map((m) => {
                const isSelected = selectedMistakes.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMistakes(prev => prev.filter(x => x !== m));
                      } else {
                        setSelectedMistakes(prev => [...prev, m]);
                      }
                    }}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-bold text-left transition-all flex items-center gap-2 border select-none cursor-pointer",
                      isSelected
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400 font-extrabold"
                        : "bg-zinc-950/40 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                    )}
                  >
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-rose-400" : "bg-zinc-700"
                    )} />
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes Input */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-display">Notes & Comments</label>
            <textarea
              placeholder="Record setups validation, feelings, trade errors, or market context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[80px] p-3 bg-zinc-950/70 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all shadow-inner resize-y font-sans"
            />
          </div>
        </div>

        {/* Live Metrics preview bar */}
        {(livePnl !== null || liveRr !== null) && (
          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-center justify-between text-xs font-display">
            <div className="flex items-center gap-6">
              {livePnl !== null && (
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Live Calculated Net PnL</span>
                  <span className={`text-sm font-extrabold block mt-0.5 ${livePnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {livePnl >= 0 ? '+' : ''}{livePnl.toLocaleString()} {userProfile.currency} ({liveRoi !== null ? formatPercent(liveRoi) : ''})
                  </span>
                </div>
              )}
              {liveRr !== null && (
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Est. Risk/Reward Ratio</span>
                  <span className="text-sm font-extrabold text-indigo-400 block mt-0.5">
                    1 : {liveRr}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[9px] text-zinc-550 font-black uppercase tracking-widest font-mono">live_math_active</span>
          </div>
        )}

        {/* Action footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-900">
          <Button variant="outline" type="button" onClick={onClose} className="text-xs" disabled={isUploading}>
            Discard
          </Button>
          <Button variant="emerald" type="submit" className="text-xs uppercase tracking-wider" disabled={isUploading}>
            {trade ? 'Save Changes' : 'Confirm Entry'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
