import React, { useState, useMemo } from 'react';
import { useTrades } from '../../context/TradeContext';
import { Card } from '../ui/Card';
import { formatCurrency, cn, calculateTradingStats, filterTradesByDatePreset } from '../../utils/helpers';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Layers,
  CalendarCheck,
  CheckCircle2
} from 'lucide-react';
import { DateFilterBar, type DateFilterType } from '../ui/DateFilterBar';

export const AnalyticsView: React.FC = () => {
  const { trades, userProfile } = useTrades();

  // 1. Date Range Filter State
  const [activeFilter, setActiveFilter] = useState<DateFilterType>('Last 30 Days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // 2. Filter Trades dynamically
  const filteredTrades = useMemo(() => {
    return filterTradesByDatePreset(trades, activeFilter, customStartDate, customEndDate);
  }, [trades, activeFilter, customStartDate, customEndDate]);

  // 3. Compute Stats dynamically on filtered set
  const filteredStats = useMemo(() => {
    return calculateTradingStats(filteredTrades);
  }, [filteredTrades]);

  // Closed trades sorted by date
  const closedTrades = useMemo(() => {
    return filteredTrades.filter(t => t.status === 'Closed' && t.pnl !== undefined);
  }, [filteredTrades]);

  // Performance calculations by Day of the Week
  const dayOfWeekStats = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const pnlByDay: Record<string, number> = {
      'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0
    };

    closedTrades.forEach(t => {
      const date = new Date(t.date);
      const dayName = days[date.getDay()];
      if (dayName && dayName !== 'Saturday' && dayName !== 'Sunday') {
        pnlByDay[dayName] += t.pnl || 0;
      }
    });

    return Object.entries(pnlByDay).map(([day, pnl]) => ({
      day,
      pnl: parseFloat(pnl.toFixed(2))
    }));
  }, [closedTrades]);

  // Performance calculations by Asset Class
  const assetClassStats = useMemo(() => {
    const pnlByAsset: Record<string, number> = {
      'Stock': 0, 'Crypto': 0, 'Forex': 0, 'Option': 0
    };

    closedTrades.forEach(t => {
      if (pnlByAsset[t.assetClass] !== undefined) {
        pnlByAsset[t.assetClass] += t.pnl || 0;
      }
    });

    return Object.entries(pnlByAsset).map(([asset, pnl]) => ({
      asset,
      pnl: parseFloat(pnl.toFixed(2))
    }));
  }, [closedTrades]);

  // Strategy performance calculations (Advanced metrics)
  const strategyPerformance = useMemo(() => {
    const metrics: Record<string, { 
      name: string; 
      count: number; 
      wins: number; 
      winsSum: number; 
      lossesSum: number; 
      totalPnL: number;
      totalSize: number;
    }> = {};

    closedTrades.forEach(t => {
      const pnl = t.pnl || 0;
      const size = t.quantity * t.entryPrice;
      if (!metrics[t.strategy]) {
        metrics[t.strategy] = { 
          name: t.strategy, 
          count: 0, 
          wins: 0, 
          winsSum: 0, 
          lossesSum: 0, 
          totalPnL: 0,
          totalSize: 0 
        };
      }

      const m = metrics[t.strategy];
      m.count++;
      m.totalPnL += pnl;
      m.totalSize += size;
      if (pnl > 0) {
        m.wins++;
        m.winsSum += pnl;
      } else if (pnl < 0) {
        m.lossesSum += Math.abs(pnl);
      }
    });

    return Object.values(metrics).map(m => {
      const winRate = m.count > 0 ? (m.wins / m.count) * 100 : 0;
      const avgReturn = m.count > 0 ? m.totalPnL / m.count : 0;
      const profitFactor = m.lossesSum > 0 ? m.winsSum / m.lossesSum : m.winsSum > 0 ? 99.9 : 0;
      
      // Calculate Setup ROI based on total deployed position sizing parameters
      const avgSize = m.count > 0 ? m.totalSize / m.count : 1;
      const roi = (m.totalPnL / (avgSize || 1)) * 100;

      return {
        name: m.name,
        count: m.count,
        winRate,
        avgReturn: parseFloat(avgReturn.toFixed(2)),
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        totalPnL: parseFloat(m.totalPnL.toFixed(2)),
        roi: parseFloat(roi.toFixed(2)),
      };
    }).sort((a, b) => b.totalPnL - a.totalPnL);
  }, [closedTrades]);

  // Derived financial expectancy stats
  const expectancy = useMemo(() => {
    if (closedTrades.length === 0) return 0;
    
    const winRateDec = filteredStats.winRate / 100;
    const lossRateDec = 1 - winRateDec;
    const winAvg = filteredStats.avgWin;
    // stats.avgLoss is negative, take absolute value
    const lossAvg = Math.abs(filteredStats.avgLoss);

    // Expectancy Formula = (WinRate * AvgWin) - (LossRate * AvgLoss)
    const exp = (winRateDec * winAvg) - (lossRateDec * lossAvg);
    return parseFloat(exp.toFixed(2));
  }, [closedTrades, filteredStats]);

  // Max bounds for bar charts
  const maxDayPnl = Math.max(...dayOfWeekStats.map(d => Math.abs(d.pnl)), 100);
  const maxAssetPnl = Math.max(...assetClassStats.map(a => Math.abs(a.pnl)), 100);

  return (
    <div className="space-y-6 animate-fade-in text-left pb-12">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
        <h2 className="text-xl font-bold font-display text-zinc-100 !m-0">Performance Analytics Suite</h2>
        <p className="text-xs text-zinc-400 mt-1">Deep-dive mathematical analysis, strategy tag audit, and day-of-week win ratios.</p>
      </div>

      {/* Date Range Filter Bar */}
      <DateFilterBar
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      {/* Advanced KPIs Block */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Expectancy Ratio */}
        <Card className="!p-4 bg-zinc-900/40 border-zinc-900/40">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display flex items-center justify-between">
            <span>Trading Expectancy</span>
            <Activity className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className={cn(
            'text-lg md:text-xl font-extrabold font-display mt-2 leading-none',
            expectancy >= 0 ? 'text-emerald-400' : 'text-rose-500'
          )}>
            {formatCurrency(expectancy, userProfile.currency)}
          </div>
          <span className="text-[10px] text-zinc-400 mt-2 block font-medium">
            Expected return per logged execution
          </span>
        </Card>

        {/* Max Drawdown */}
        <Card className="!p-4 bg-zinc-900/40 border-zinc-900/40">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display flex items-center justify-between">
            <span>Maximum Drawdown</span>
            <Activity className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-lg md:text-xl font-extrabold text-rose-500 font-display mt-2 leading-none">
            {formatCurrency(-filteredStats.maxDrawdown, userProfile.currency)}
          </div>
          <span className="text-[10px] text-zinc-400 mt-2 block font-medium">
            Peak-to-valley drawdown registered
          </span>
        </Card>

        {/* Largest Win */}
        <Card className="!p-4 bg-zinc-900/40 border-zinc-900/40">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display flex items-center justify-between">
            <span>Largest Win</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-lg md:text-xl font-extrabold text-emerald-400 font-display mt-2 leading-none">
            {formatCurrency(filteredStats.largestWin, userProfile.currency)}
          </div>
          <span className="text-[10px] text-zinc-400 mt-2 block font-medium">
            Best single execution outcome
          </span>
        </Card>

        {/* Largest Loss */}
        <Card className="!p-4 bg-zinc-900/40 border-zinc-900/40">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-display flex items-center justify-between">
            <span>Largest Loss</span>
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-lg md:text-xl font-extrabold text-rose-500 font-display mt-2 leading-none">
            {formatCurrency(filteredStats.largestLoss, userProfile.currency)}
          </div>
          <span className="text-[10px] text-zinc-400 mt-2 block font-medium">
            Worst single stop execution outcome
          </span>
        </Card>
      </div>

      {/* Advanced Setup Performance Analytics */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400" />
            <span>Setup Performance Metrics</span>
          </div>
        }
        subtitle="Statistical performance breakdowns audited by setup tag"
      >
        {strategyPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase tracking-wider text-[10px] font-display">
                  <th className="py-2.5">Setup Name</th>
                  <th className="py-2.5 text-center">Trades</th>
                  <th className="py-2.5 text-center">Win Rate</th>
                  <th className="py-2.5 text-center">Profit Factor</th>
                  <th className="py-2.5 text-center">Avg. Return</th>
                  <th className="py-2.5 text-center">ROI</th>
                  <th className="py-2.5 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/40 text-zinc-300">
                {strategyPerformance.map((strat, idx) => (
                  <tr key={idx} className="hover:bg-white/1 bg-transparent transition-colors">
                    <td className="py-3 font-bold text-zinc-100">{strat.name}</td>
                    <td className="py-3 text-center text-zinc-400">{strat.count}</td>
                    <td className="py-3 text-center font-extrabold text-zinc-200">{strat.winRate.toFixed(1)}%</td>
                    <td className="py-3 text-center font-extrabold text-indigo-400">{strat.profitFactor.toFixed(2)}</td>
                    <td className={cn(
                      'py-3 text-center font-semibold',
                      strat.avgReturn >= 0 ? 'text-emerald-400' : 'text-rose-500'
                    )}>
                      {formatCurrency(strat.avgReturn, userProfile.currency)}
                    </td>
                    <td className={cn(
                      'py-3 text-center font-bold font-mono',
                      strat.roi >= 0 ? 'text-emerald-400' : 'text-rose-500'
                    )}>
                      {strat.roi >= 0 ? '+' : ''}{strat.roi}%
                    </td>
                    <td className={cn(
                      'py-3 text-right font-extrabold font-display',
                      strat.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'
                    )}>
                      {formatCurrency(strat.totalPnL, userProfile.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 flex items-center justify-center text-xs text-zinc-600 font-medium">
            No strategy executions recorded in this timeframe.
          </div>
        )}
      </Card>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Performance by Day of the Week */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-indigo-400" />
              <span>Performance by Day of Week</span>
            </div>
          }
        >
          {closedTrades.length > 0 ? (
            <div className="space-y-4 py-2">
              {dayOfWeekStats.map((item, idx) => {
                const percentage = (Math.abs(item.pnl) / maxDayPnl) * 100;
                const isPositive = item.pnl >= 0;
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-zinc-400 font-medium">
                      <span>{item.day}</span>
                      <span className={cn('font-bold', isPositive ? 'text-emerald-400' : 'text-rose-500')}>
                        {formatCurrency(item.pnl, userProfile.currency)}
                      </span>
                    </div>
                    {/* Bar Container */}
                    <div className="w-full h-3.5 bg-zinc-950 rounded border border-zinc-900 overflow-hidden relative">
                      <div
                        className={cn('h-full transition-all duration-500 rounded-sm', isPositive ? 'bg-emerald-500/20 border-r border-emerald-500' : 'bg-rose-500/20 border-r border-rose-500')}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-500 text-xs font-medium">
              Log closed trades to review Day of Week statistics.
            </div>
          )}
        </Card>

        {/* Performance by Asset Class */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span>Performance by Asset Class</span>
            </div>
          }
        >
          {closedTrades.length > 0 ? (
            <div className="space-y-4 py-2">
              {assetClassStats.map((item, idx) => {
                const percentage = (Math.abs(item.pnl) / maxAssetPnl) * 100;
                const isPositive = item.pnl >= 0;
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-zinc-400 font-medium">
                      <span>{item.asset}s</span>
                      <span className={cn('font-bold', isPositive ? 'text-emerald-400' : 'text-rose-500')}>
                        {formatCurrency(item.pnl, userProfile.currency)}
                      </span>
                    </div>
                    {/* Bar Container */}
                    <div className="w-full h-3.5 bg-zinc-950 rounded border border-zinc-900 overflow-hidden">
                      <div
                        className={cn('h-full transition-all duration-500 rounded-sm', isPositive ? 'bg-emerald-500/20 border-r border-emerald-500' : 'bg-rose-500/20 border-r border-rose-500')}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-500 text-xs font-medium">
              Log closed trades to review Asset Class distributions.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
