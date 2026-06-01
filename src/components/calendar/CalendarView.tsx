import React, { useState, useMemo } from 'react';
import { useTrades } from '../../context/TradeContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { formatCurrency, cn } from '../../utils/helpers';
import type { Trade } from '../../types';
import { 
  ChevronLeft, 
  ChevronRight,
  FileImage,
  Layers
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { trades, userProfile, riskLimits } = useTrades();

  // Calendar Date Navigation
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 4, 1)); // Default to May 2026

  // Modal details
  const [selectedDayTrades, setSelectedDayTrades] = useState<Trade[] | null>(null);
  const [selectedDateString, setSelectedDateString] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Group closed trades by Date
  const tradesByDate = useMemo(() => {
    const map: Record<string, { trades: Trade[]; pnl: number }> = {};
    
    trades.forEach(t => {
      if (t.status === 'Closed' && t.pnl !== undefined) {
        const dateStr = t.date;
        if (!map[dateStr]) {
          map[dateStr] = { trades: [], pnl: 0 };
        }
        map[dateStr].trades.push(t);
        map[dateStr].pnl += t.pnl;
      }
    });

    return map;
  }, [trades]);

  // Generate calendar days grid
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const cells = [];
    
    // Fill blank cells for start of month alignment
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ date: null });
    }

    // Fill days
    for (let d = 1; d <= totalDays; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateString = `${year}-${mm}-${dd}`;
      
      const dayData = tradesByDate[dateString];
      cells.push({
        date: d,
        dateString,
        trades: dayData?.trades || [],
        pnl: dayData ? parseFloat(dayData.pnl.toFixed(2)) : 0,
      });
    }

    return cells;
  }, [year, month, tradesByDate]);

  // Group cells into Weeks for weekly PnL card column
  const calendarWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < calendarCells.length; i += 7) {
      const weekCells = calendarCells.slice(i, i + 7);
      const weeklyPnL = weekCells.reduce((sum, cell) => sum + (cell.pnl || 0), 0);
      weeks.push({
        cells: weekCells,
        pnl: weeklyPnL
      });
    }
    return weeks;
  }, [calendarCells]);

  // Monthly stats calculations
  const monthlyStats = useMemo(() => {
    const currentYearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthlyTrades = trades.filter(t => t.date.startsWith(currentYearMonth));
    const closed = monthlyTrades.filter(t => t.status === 'Closed' && t.pnl !== undefined);
    
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let rrSum = 0;
    let rrCount = 0;
    const dailyPnLMap: Record<string, number> = {};

    closed.forEach(t => {
      totalPnL += t.pnl || 0;
      if ((t.pnl || 0) > 0) wins++;
      else if ((t.pnl || 0) < 0) losses++;
      
      if (t.riskRewardRatio) {
        rrSum += t.riskRewardRatio;
        rrCount++;
      }
      dailyPnLMap[t.date] = (dailyPnLMap[t.date] || 0) + (t.pnl || 0);
    });

    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    const avgRR = rrCount > 0 ? rrSum / rrCount : 0;
    const dailyVals = Object.values(dailyPnLMap);
    const bestDay = dailyVals.length > 0 ? Math.max(...dailyVals) : 0;
    const worstDay = dailyVals.length > 0 ? Math.min(...dailyVals) : 0;

    return {
      totalPnL,
      totalTrades: monthlyTrades.length,
      winRate,
      avgRR,
      bestDay,
      worstDay
    };
  }, [trades, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCellClick = (cell: any) => {
    if (cell.date && cell.trades.length > 0) {
      setSelectedDayTrades(cell.trades);
      setSelectedDateString(cell.dateString || '');
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 shadow-lg">
        <div>
          <h2 className="text-xl font-bold font-display text-zinc-100 !m-0">PnL Performance Calendar</h2>
          <p className="text-xs text-zinc-400 mt-1 font-semibold">Audit daily outcomes. Dark segments outline extreme target expectations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handlePrevMonth} className="!p-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-black font-display text-zinc-100 min-w-[120px] text-center uppercase tracking-wider">
            {monthNames[month]} {year}
          </span>
          <Button variant="secondary" size="sm" onClick={handleNextMonth} className="!p-2">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modern SaaS Monthly Analytics strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="!p-4 bg-zinc-950 border border-zinc-900 flex flex-col justify-between h-24">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block font-display">Month Win Rate</span>
          <span className="text-base font-black text-zinc-100 block mt-1.5">{monthlyStats.winRate.toFixed(1)}%</span>
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden mt-1 flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${monthlyStats.winRate}%` }} />
            <div className="bg-rose-500 h-full flex-1" />
          </div>
        </Card>

        <Card className="!p-4 bg-zinc-950 border border-zinc-900 flex flex-col justify-between h-24">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block font-display">Month Executions</span>
          <span className="text-base font-black text-indigo-400 block mt-1.5">{monthlyStats.totalTrades} Trades</span>
          <span className="text-[8px] text-zinc-400 font-semibold block">Total logged logs</span>
        </Card>

        <Card className="!p-4 bg-zinc-950 border border-zinc-900 flex flex-col justify-between h-24">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block font-display">Average RR Edge</span>
          <span className="text-base font-black text-zinc-100 block mt-1.5">1 : {monthlyStats.avgRR.toFixed(2)}</span>
          <span className="text-[8px] text-zinc-400 font-semibold block">Risk Reward Expectancy</span>
        </Card>

        <Card className="!p-4 bg-zinc-950 border border-zinc-900 flex flex-col justify-between h-24">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block font-display">Best Day Return</span>
          <span className="text-base font-black text-emerald-400 block mt-1.5">
            {monthlyStats.bestDay > 0 ? '+' : ''}{formatCurrency(monthlyStats.bestDay, userProfile.currency)}
          </span>
          <span className="text-[8px] text-zinc-400 font-semibold block">Max single day harvest</span>
        </Card>

        <Card className="!p-4 bg-zinc-950 border border-zinc-900 flex flex-col justify-between h-24 col-span-2 md:col-span-1">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block font-display">Worst Day Drawdown</span>
          <span className="text-base font-black text-rose-500 block mt-1.5">{formatCurrency(monthlyStats.worstDay, userProfile.currency)}</span>
          <span className="text-[8px] text-zinc-400 font-semibold block">Max single day drawdown</span>
        </Card>
      </div>

      {/* Calendar Grid Container with Weekly PnL Card Column */}
      <Card className="!p-4 bg-zinc-950 border border-zinc-900 shadow-2xl overflow-hidden">
        {/* Days Name Header */}
        <div className="grid grid-cols-8 gap-2.5 mb-3 text-center text-zinc-500 font-black uppercase tracking-wider text-[9px] font-display border-b border-zinc-900/60 pb-2">
          {dayNames.map((name) => (
            <div key={name} className="py-1">{name}</div>
          ))}
          <div className="py-1 text-indigo-400 font-black uppercase">Weekly PnL</div>
        </div>

        {/* Rows of Weeks */}
        <div className="space-y-2.5">
          {calendarWeeks.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-8 gap-2.5">
              {/* 7 Days cells */}
              {week.cells.map((cell, idx) => {
                const hasTrades = cell.date && cell.trades.length > 0;
                const pnl = cell.pnl || 0;
                const isProfit = pnl > 0;
                const isLoss = pnl < 0;
                
                // Graded heatmap boundaries
                const dailyLossLimit = riskLimits.dailyLossLimit || 500;
                const strongProfitThreshold = (riskLimits.riskPerTrade || 100) * 2;
                const strongLossThreshold = -dailyLossLimit;

                const heatmapClass = hasTrades
                  ? pnl >= strongProfitThreshold
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/40 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-bold'
                    : isProfit
                      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/15'
                      : pnl <= strongLossThreshold
                        ? 'bg-rose-950/70 border-rose-500/60 text-rose-300 hover:bg-rose-900/40 shadow-[0_0_12px_rgba(244,63,94,0.15)] font-bold'
                        : isLoss
                          ? 'bg-rose-500/10 border-rose-500/35 text-rose-300 hover:bg-rose-500/15'
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:bg-zinc-800/50'
                  : cell.date
                    ? 'bg-zinc-950/40 border-zinc-900 text-zinc-600'
                    : 'bg-transparent border-transparent opacity-0 pointer-events-none';

                return (
                  <div
                    key={idx}
                    onClick={() => hasTrades && handleCellClick(cell)}
                    className={cn(
                      'min-h-[85px] p-2 rounded-xl border flex flex-col justify-between transition-all select-none calendar-day-cell',
                      cell.date ? 'cursor-pointer' : '',
                      heatmapClass
                    )}
                  >
                    {cell.date && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black font-display">{cell.date}</span>
                        {hasTrades && (
                          <span className={cn(
                            'text-[8px] font-black uppercase px-1.5 py-0.5 rounded font-mono',
                            isProfit ? 'bg-emerald-500/20 text-emerald-400' : isLoss ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-400'
                          )}>
                            {cell.trades.length} T
                          </span>
                        )}
                      </div>
                    )}

                    {hasTrades && cell.date && (
                      <div className={cn(
                        'text-[10px] font-black font-display text-right mt-3 truncate tracking-tighter',
                        isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-500' : 'text-zinc-300'
                      )}>
                        {formatCurrency(pnl, userProfile.currency)}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 8th Column: Weekly PnL summary card */}
              <div className={cn(
                "min-h-[85px] p-2.5 rounded-xl border flex flex-col justify-center items-center text-center shadow-lg font-display transition-all duration-300 select-none",
                week.pnl > 0 
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-[inset_0_0_12px_rgba(99,102,241,0.02)]"
                  : week.pnl < 0
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-[inset_0_0_12px_rgba(244,63,94,0.02)]"
                    : "bg-zinc-950/40 border-zinc-900 text-zinc-650"
              )}>
                <span className="text-[7px] font-black text-zinc-550 uppercase tracking-widest block mb-1">Weekly Return</span>
                <span className="text-[11px] font-black font-mono block">
                  {formatCurrency(week.pnl, userProfile.currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily breakdown modern popup drawer */}
      {selectedDayTrades && (
        <Dialog
          isOpen={!!selectedDayTrades}
          onClose={() => setSelectedDayTrades(null)}
          title={`Closed Trades on ${selectedDateString}`}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar pr-1">
            <div className="space-y-3.5">
              {selectedDayTrades.map((t) => {
                const profitVal = t.pnl || 0;
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-900 flex flex-col gap-3 text-left relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-zinc-100 font-display">{t.instrument}</span>
                        <span className={cn(
                          'text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono',
                          t.side === 'Long' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                        )}>
                          {t.side}
                        </span>
                        <span className="text-[10px] text-zinc-550 font-bold">{t.time}</span>
                      </div>
                      
                      <div className="text-right">
                        <span className={cn(
                          'text-sm font-black font-display block',
                          profitVal >= 0 ? 'text-emerald-400' : 'text-rose-500'
                        )}>
                          {formatCurrency(profitVal, userProfile.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Setup compliance details */}
                    <div className="flex flex-wrap gap-2 items-center text-[10px]">
                      <span className="text-zinc-500 font-bold flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-zinc-650" /> Strategy: <strong>{t.strategy}</strong>
                      </span>
                      {t.complianceScore !== undefined && (
                        <span className={cn(
                          "text-[9px] font-black px-1.5 py-0.5 rounded-sm font-mono uppercase",
                          t.complianceScore >= 80 ? "text-emerald-400 bg-emerald-500/10" : t.complianceScore >= 50 ? "text-amber-400 bg-amber-500/10" : "text-rose-500 bg-rose-500/10"
                        )}>
                          Compliance: {t.complianceScore}%
                        </span>
                      )}
                    </div>

                    {/* Attachment Thumbnail if available */}
                    {t.screenshotUrl && (
                      <div className="rounded-lg overflow-hidden border border-zinc-900 bg-zinc-950 p-1 flex items-center gap-3">
                        <div className="w-16 h-12 rounded bg-zinc-900 overflow-hidden flex-shrink-0 flex items-center justify-center border border-zinc-800">
                          <img src={t.screenshotUrl} alt="Chart Mini" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                          <FileImage className="h-3.5 w-3.5 text-indigo-400" /> Chart screenshot attached
                        </span>
                      </div>
                    )}

                    {/* Notes & mistakes tag block */}
                    <p className="text-xs text-zinc-300 italic leading-relaxed bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900">&ldquo;{t.notes || 'No comments logged.'}&rdquo;</p>
                    
                    {t.mistakes && t.mistakes.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider font-display">Rule Breaks:</span>
                        {t.mistakes.map(m => (
                          <span key={m} className="text-[8px] text-rose-400 font-extrabold uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10 font-mono">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-900">
              <Button variant="secondary" onClick={() => setSelectedDayTrades(null)} className="text-xs select-none">
                Close Logs
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
