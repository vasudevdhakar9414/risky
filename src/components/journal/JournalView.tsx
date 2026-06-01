import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrades } from '../../context/TradeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../utils/supabaseClient';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Select } from '../ui/Select';
import type { Trade } from '../../types';
import { formatCurrency, cn, filterTradesByDatePreset } from '../../utils/helpers';
import { 
  Search, 
  Trash2, 
  Edit3, 
  Plus, 
  Eye, 
  CalendarDays,
  FileDown,
  Image,
  Table,
  Download,
  Import,
  Award
} from 'lucide-react';
import { TradeFormDialog } from './TradeFormDialog';
import { generatePdfReport } from '../../utils/pdfGenerator';
import { DateFilterBar, type DateFilterType } from '../ui/DateFilterBar';

export const JournalView: React.FC = () => {
  const { trades, deleteTrade, userProfile } = useTrades();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 1. Date Range & Search Filters
  const [activeFilter, setActiveFilter] = useState<DateFilterType>('Last 30 Days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState<string>('All');
  const [sideFilter, setSideFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Toggle layout
  const [activeLayout, setActiveLayout] = useState<'table' | 'gallery'>('table');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | undefined>(undefined);
  const [viewingScreenshotTrade, setViewingScreenshotTrade] = useState<Trade | undefined>(undefined);

  const importFileInputRef = useRef<HTMLInputElement>(null);

  // 2. Filter Trades dynamically
  const dateFilteredTrades = useMemo(() => {
    return filterTradesByDatePreset(trades, activeFilter, customStartDate, customEndDate);
  }, [trades, activeFilter, customStartDate, customEndDate]);

  const filteredTrades = useMemo(() => {
    return dateFilteredTrades.filter((t) => {
      const matchesSearch = t.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.strategy.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAsset = assetFilter === 'All' || t.assetClass === assetFilter;
      const matchesSide = sideFilter === 'All' || t.side === sideFilter;
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;

      return matchesSearch && matchesAsset && matchesSide && matchesStatus;
    });
  }, [dateFilteredTrades, searchTerm, assetFilter, sideFilter, statusFilter]);

  // Extract list of trades with screenshots
  const screenshotTrades = useMemo(() => {
    return filteredTrades.filter(t => !!t.screenshotUrl);
  }, [filteredTrades]);

  const handleEditClick = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsFormOpen(true);
  };

  const handleNewClick = () => {
    setSelectedTrade(undefined);
    setIsFormOpen(true);
  };

  // 3. Backup Exports (Filtered by active date preset & search filters)
  const handleExportJson = () => {
    const content = JSON.stringify(filteredTrades, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filterName = activeFilter.replace(/\s+/g, '_');
    link.download = `riskyvasu_trades_${filterName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTxt = () => {
    let content = `RiskyVasu Journal Export - ${new Date().toLocaleDateString()}\n`;
    content += `Timeframe Preset: ${activeFilter}\n`;
    content += `Total Executions: ${filteredTrades.length}\n\n`;
    filteredTrades.forEach((t, i) => {
      content += `[Trade #${i+1}] ${t.date} ${t.time} | Instrument: ${t.instrument} | Side: ${t.side} | Status: ${t.status}\n`;
      content += `- Entry Price: ${t.entryPrice} | Exit Price: ${t.exitPrice || 'N/A'} | Qty: ${t.quantity} | Fees: ${t.fees}\n`;
      content += `- Net PnL: ${t.pnl || 0} USD | ROI: ${t.roi || 0}% | Strategy: ${t.strategy}\n`;
      content += `- Mistakes: ${(t.mistakes || []).join(', ') || 'None'}\n`;
      content += `- Notes: ${t.notes || 'None'}\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filterName = activeFilter.replace(/\s+/g, '_');
    link.download = `riskyvasu_trades_${filterName}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 4. Backup Import
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const imported = JSON.parse(evt.target?.result as string);
          if (Array.isArray(imported)) {
            if (isSupabaseConfigured && supabase && imported.length > 0) {
              const dbPayloads = imported.map((t: any) => ({
                user_id: user?.id,
                date: t.date,
                time: t.time ? `${t.time}:00`.substring(0, 8) : '00:00:00',
                instrument: t.instrument.toUpperCase(),
                asset_class: t.assetClass || 'Stock',
                side: t.side || 'Long',
                status: t.status || 'Closed',
                entry_price: Number(t.entryPrice),
                exit_price: t.exitPrice ? Number(t.exitPrice) : null,
                quantity: Number(t.quantity),
                stop_loss: t.stopLoss ? Number(t.stopLoss) : null,
                take_profit: t.takeProfit ? Number(t.takeProfit) : null,
                fees: Number(t.fees || 0),
                strategy: t.strategy || 'VWAP Pullback',
                pnl: t.pnl ? Number(t.pnl) : null,
                roi: t.roi ? Number(t.roi) : null,
                risk_reward_ratio: t.riskRewardRatio ? Number(t.riskRewardRatio) : null,
                notes: t.notes || '',
                screenshot_url: t.screenshotUrl || '',
                mistakes: t.mistakes || []
              }));
              
              const { error } = await supabase.from('trades').insert(dbPayloads);
              if (error) {
                alert(`Import failed: ${error.message}`);
              } else {
                alert(`Restored ${imported.length} executions successfully. Please refresh.`);
                window.location.reload();
              }
            }
          } else {
            alert('Invalid backup. Must be a JSON array of trades.');
          }
        } catch (err) {
          alert('Failed to parse backup JSON.');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      alert('Error loading file.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left pb-12">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
        <div>
          <h2 className="text-xl font-bold font-display text-zinc-100 !m-0">Trading Journal Logs</h2>
          <p className="text-xs text-zinc-400 mt-1">Review historical execution metrics, audit strategies, and enforce risk discipline.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Backup Options */}
          <button
            onClick={() => importFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 border border-zinc-800 transition-colors select-none cursor-pointer"
          >
            <Import className="h-3.5 w-3.5" />
            <span>Import JSON</span>
          </button>
          <input
            type="file"
            ref={importFileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 border border-zinc-800 transition-colors select-none cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleExportTxt}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 border border-zinc-800 transition-colors select-none cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>TXT</span>
          </button>

          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => generatePdfReport(filteredTrades, userProfile.currency)} 
            className="flex items-center gap-1.5 text-xs uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-850"
          >
            <FileDown className="h-4 w-4 text-indigo-400" />
            <span>PDF</span>
          </Button>

          <Button size="sm" onClick={handleNewClick} className="flex items-center gap-1.5 text-xs uppercase tracking-wider shadow-indigo">
            <Plus className="h-4 w-4" />
            <span>Log execution</span>
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      {/* Advanced Filters Panel */}
      <Card className="!p-4 bg-zinc-900/20 text-left border-zinc-900/40">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          {/* Search bar */}
          <div className="relative col-span-2">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display block mb-1.5">Search Instrument / Strategy</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="e.g. BTCUSDT, TSLA, VWAP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-950/70 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Asset Class Filter */}
          <Select
            label="Asset Class"
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            className="!py-2 !text-xs border-zinc-800 bg-zinc-950/70 text-zinc-200"
            options={[
              { value: 'All', label: 'All Assets' },
              { value: 'Stock', label: 'Stocks' },
              { value: 'Crypto', label: 'Cryptocurrencies' },
              { value: 'Forex', label: 'Forex' },
              { value: 'Option', label: 'Options' },
            ]}
          />

          {/* Side Filter */}
          <Select
            label="Order Side"
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value)}
            className="!py-2 !text-xs border-zinc-800 bg-zinc-950/70 text-zinc-200"
            options={[
              { value: 'All', label: 'All Directions' },
              { value: 'Long', label: 'Long (Buy)' },
              { value: 'Short', label: 'Short (Sell)' },
            ]}
          />

          {/* Status Filter */}
          <Select
            label="Trade Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="!py-2 !text-xs border-zinc-800 bg-zinc-950/70 text-zinc-200"
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Open', label: 'Open Positions' },
              { value: 'Closed', label: 'Closed Trades' },
            ]}
          />
        </div>
      </Card>

      {/* Tab select layout */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex gap-1 bg-zinc-900/40 p-1 rounded-xl border border-zinc-900">
          <button
            onClick={() => setActiveLayout('table')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all select-none cursor-pointer",
              activeLayout === 'table'
                ? "bg-indigo-500/10 text-indigo-400 font-extrabold"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Table Log</span>
          </button>
          <button
            onClick={() => setActiveLayout('gallery')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all select-none cursor-pointer",
              activeLayout === 'gallery'
                ? "bg-indigo-500/10 text-indigo-400 font-extrabold"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Image className="h-3.5 w-3.5" />
            <span>Screenshot Gallery</span>
          </button>
        </div>

        <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">
          {filteredTrades.length} Trades matches
        </span>
      </div>

      {/* Table Layout */}
      {activeLayout === 'table' && (
        <Card className="overflow-hidden !p-0 bg-zinc-950 border border-zinc-900 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-900/10 text-zinc-500 font-bold uppercase tracking-wider text-[10px] font-display">
                  <th className="py-3.5 px-4">Date / Time</th>
                  <th className="py-3.5 px-4">Instrument</th>
                  <th className="py-3.5 px-4 text-center">Direction</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Entry Price</th>
                  <th className="py-3.5 px-4 text-right">Exit Price</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-center">Setup</th>
                  <th className="py-3.5 px-4 text-center">Mistakes</th>
                  <th className="py-3.5 px-4 text-right">Net PnL</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/40 text-zinc-300">
                {filteredTrades.length > 0 ? (
                  filteredTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-white/1 bg-transparent transition-colors group">
                      {/* Date */}
                      <td className="py-3 px-4 text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-zinc-600" />
                          <span>{t.date} <span className="text-[10px] text-zinc-600 ml-0.5">{t.time}</span></span>
                        </div>
                      </td>

                      {/* Instrument */}
                      <td className="py-3 px-4 font-bold text-zinc-100 font-display">
                        <div className="flex items-center gap-2">
                          <span>{t.instrument}</span>
                          <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                            {t.assetClass}
                          </span>
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          'text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded font-mono',
                          t.side === 'Long' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                        )}>
                          {t.side}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-mono',
                          t.status === 'Open' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/10' : 'bg-zinc-850 text-zinc-400'
                        )}>
                          {t.status}
                        </span>
                      </td>

                      {/* Entry Price */}
                      <td className="py-3 px-4 text-right font-semibold font-mono text-zinc-200">
                        {formatCurrency(t.entryPrice, '')}
                      </td>

                      {/* Exit Price */}
                      <td className="py-3 px-4 text-right font-semibold font-mono text-zinc-400">
                        {t.exitPrice !== undefined ? formatCurrency(t.exitPrice, '') : '—'}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-right font-semibold font-mono text-zinc-300">
                        {t.quantity.toLocaleString()}
                      </td>

                      {/* Setup Strategy */}
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] text-zinc-400 border border-zinc-900 bg-zinc-900/10 px-2 py-0.5 rounded-lg font-bold">
                          {t.strategy}
                        </span>
                      </td>

                      {/* Mistakes */}
                      <td className="py-3 px-4 text-center">
                        {t.mistakes && t.mistakes.length > 0 ? (
                          <div className="flex flex-wrap justify-center gap-1 max-w-[120px] mx-auto">
                            {t.mistakes.map(m => (
                              <span key={m} className="text-[8px] text-rose-400 font-extrabold uppercase bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/10">
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[9px] text-zinc-650 font-semibold">—</span>
                        )}
                      </td>

                      {/* Net P&L */}
                      <td className={cn(
                        'py-3 px-4 text-right font-extrabold font-display',
                        t.pnl !== undefined ? (t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-500') : 'text-zinc-500'
                      )}>
                        {t.pnl !== undefined ? formatCurrency(t.pnl, userProfile.currency) : 'OPEN'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {/* View Attachment */}
                          {t.screenshotUrl && (
                            <button
                              onClick={() => setViewingScreenshotTrade(t)}
                              className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer"
                              title="View Chart Screenshot"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {/* View Certificate */}
                          <button
                            onClick={() => navigate(`/certificate/${t.id}`)}
                            className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
                            title="View Certificate"
                          >
                            <Award className="h-3.5 w-3.5" />
                          </button>
                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditClick(t)}
                            className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => deleteTrade(t.id)}
                            className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-zinc-500 text-xs font-medium">
                      No matching execution logs found in journal database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Screenshot Gallery Layout */}
      {activeLayout === 'gallery' && (
        <div>
          {screenshotTrades.length === 0 ? (
            <div className="py-20 text-center text-zinc-650 border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/40">
              <Image className="h-8 w-8 mx-auto opacity-40 mb-2.5 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider">No execution charts found</p>
              <p className="text-[10px] text-zinc-550 mt-1 font-medium">Attach screenshot charts to your executions to populate gallery.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {screenshotTrades.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setViewingScreenshotTrade(t)}
                  className="group relative rounded-xl border border-zinc-900 bg-zinc-950 overflow-hidden cursor-pointer hover:border-zinc-800 transition-all flex flex-col justify-between"
                  style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                >
                  {/* Thumbnail Image */}
                  <div className="w-full h-44 bg-zinc-900 border-b border-zinc-900 relative overflow-hidden flex items-center justify-center">
                    <img
                      src={t.screenshotUrl}
                      alt={`Chart for ${t.instrument}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-[9px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> Fullscreen Preview
                      </span>
                    </div>
                  </div>

                  {/* Execution Specs Card */}
                  <div className="p-3 text-left space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-zinc-200 font-display">{t.instrument}</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-1 rounded font-mono",
                        t.pnl && t.pnl >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
                      )}>
                        {t.pnl ? formatCurrency(t.pnl, userProfile.currency) : 'OPEN'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-zinc-550 font-semibold font-mono">
                      <span>{t.date} {t.time}</span>
                      <span>{t.strategy}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trade Log Creation / Modification Overlay Dialog */}
      <TradeFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        trade={selectedTrade}
      />

      {/* Screenshot attachment view modal */}
      {viewingScreenshotTrade && (
        <Dialog
          isOpen={!!viewingScreenshotTrade}
          onClose={() => setViewingScreenshotTrade(undefined)}
          title={`Execution Chart: ${viewingScreenshotTrade.instrument}`}
        >
          <div className="flex flex-col gap-4 items-center">
            {viewingScreenshotTrade.screenshotUrl ? (
              <img
                src={viewingScreenshotTrade.screenshotUrl}
                alt={`Chart for ${viewingScreenshotTrade.instrument}`}
                className="w-full max-h-[50vh] object-contain rounded-lg border border-zinc-800"
              />
            ) : (
              <p className="text-zinc-500 text-xs">No screenshot url provided.</p>
            )}
            <div className="w-full text-left bg-zinc-950 p-4 rounded-lg border border-zinc-900 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display block">Execution Notes</span>
                <span className={cn(
                  "text-xs font-bold font-display",
                  (viewingScreenshotTrade.pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-500"
                )}>
                  Net outcome: {formatCurrency(viewingScreenshotTrade.pnl || 0, userProfile.currency)}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed italic">&ldquo;{viewingScreenshotTrade.notes || 'No comments logged.'}&rdquo;</p>
              {viewingScreenshotTrade.mistakes && viewingScreenshotTrade.mistakes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1 border-t border-zinc-900 pt-2 items-center">
                  <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider font-display">Errors Identified:</span>
                  {viewingScreenshotTrade.mistakes.map(m => (
                    <span key={m} className="text-[8px] text-rose-400 font-bold uppercase bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/10 font-mono">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex w-full gap-2 mt-1">
              <a
                href={viewingScreenshotTrade.screenshotUrl}
                download={`chart_${viewingScreenshotTrade.instrument}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-indigo cursor-pointer select-none"
              >
                <Download className="h-4 w-4" /> Download Chart
              </a>
              <Button
                onClick={() => navigate(`/certificate/${viewingScreenshotTrade.id}`)}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-amber cursor-pointer select-none"
              >
                <Award className="h-4 w-4" /> View Certificate
              </Button>
              <Button variant="secondary" onClick={() => setViewingScreenshotTrade(undefined)} className="flex-1 text-xs select-none">
                Close Preview
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
