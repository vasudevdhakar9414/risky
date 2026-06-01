import React, { useState, useMemo } from 'react';
import { useTrades } from '../../context/TradeContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency, cn, calculateTradingStats, filterTradesByDatePreset } from '../../utils/helpers';
import { 
  TrendingUp, 
  Percent, 
  DollarSign, 
  Calculator,
  Plus,
  Zap,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import type { ActiveTab, Trade } from '../../types';
import { AiCoachPanel } from './AiCoachPanel';
import { EquityCurveChart } from './EquityCurveChart';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onAddTradeClick: () => void;
}

export type PresetPeriodType = 
  | 'Today' 
  | 'Yesterday' 
  | 'Last 7 Days' 
  | 'Last 30 Days' 
  | 'This Month' 
  | 'Last Month' 
  | 'This Year' 
  | 'All Time';

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  onAddTradeClick,
}) => {
  const { trades, userProfile, clearAllData } = useTrades();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // 1. Period Selector State
  const [activeFilter, setActiveFilter] = useState<PresetPeriodType>('Last 30 Days');
  const [comparisonMode, setComparisonMode] = useState<'prev_period' | 'last_month' | 'all_time'>('prev_period');

  const getLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 2. Compute quick statistics for presets bar
  const presetStats = useMemo(() => {
    const list: PresetPeriodType[] = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'This Year', 'All Time'];
    const statsMap: Record<PresetPeriodType, { count: number; pnl: number }> = {} as any;

    list.forEach(p => {
      const filtered = filterTradesByDatePreset(trades, p);
      const closed = filtered.filter(t => t.status === 'Closed' && t.pnl !== undefined);
      const sumPnL = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
      statsMap[p] = {
        count: filtered.length,
        pnl: sumPnL
      };
    });

    return statsMap;
  }, [trades]);

  // 3. Filter Trades dynamically based on selection
  const filteredTrades = useMemo(() => {
    return filterTradesByDatePreset(trades, activeFilter);
  }, [trades, activeFilter]);

  // 4. Re-calculate metrics on filtered subset
  const filteredStats = useMemo(() => {
    return calculateTradingStats(filteredTrades, userProfile.startingBalance);
  }, [filteredTrades, userProfile.startingBalance]);

  // All time closed PnL
  const allTimeClosedPnL = useMemo(() => {
    return trades
      .filter(t => t.status === 'Closed' && t.pnl !== undefined)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);
  }, [trades]);

  // Advanced SaaS Performance Calculations
  const startingBalance = userProfile.startingBalance || 10000;
  const currentBalance = startingBalance + allTimeClosedPnL;
  const totalReturnPercent = (allTimeClosedPnL / startingBalance) * 100;

  // Peak Equity Growth %
  const equityGrowthPercent = useMemo(() => {
    let peakBalance = startingBalance;
    let runningBalance = startingBalance;
    const chronological = [...trades]
      .filter(t => t.status === 'Closed' && t.pnl !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    chronological.forEach(t => {
      runningBalance += (t.pnl || 0);
      if (runningBalance > peakBalance) peakBalance = runningBalance;
    });
    return ((peakBalance - startingBalance) / startingBalance) * 100;
  }, [trades, startingBalance]);

  // Average Monthly Return
  const avgMonthlyReturn = useMemo(() => {
    const monthlyPnL: Record<string, number> = {};
    trades.forEach(t => {
      if (t.status === 'Closed' && t.pnl !== undefined) {
        const monthKey = t.date.substring(0, 7); // "YYYY-MM"
        monthlyPnL[monthKey] = (monthlyPnL[monthKey] || 0) + t.pnl;
      }
    });
    const months = Object.values(monthlyPnL);
    if (months.length === 0) return 0;
    return months.reduce((sum, val) => sum + val, 0) / months.length;
  }, [trades]);

  // Daily breakdowns (Best/Worst Day)
  const dailyPnL = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach(t => {
      if (t.status === 'Closed' && t.pnl !== undefined) {
        map[t.date] = (map[t.date] || 0) + t.pnl;
      }
    });
    return map;
  }, [trades]);

  const bestTradingDay = useMemo(() => {
    const values = Object.values(dailyPnL);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [dailyPnL]);

  const worstTradingDay = useMemo(() => {
    const values = Object.values(dailyPnL);
    return values.length > 0 ? Math.min(...values) : 0;
  }, [dailyPnL]);

  // Weekly breakdowns (Best Week)
  const bestTradingWeek = useMemo(() => {
    const weeklyPnL: Record<string, number> = {};
    trades.forEach(t => {
      if (t.status === 'Closed' && t.pnl !== undefined) {
        const d = new Date(t.date);
        const oneJan = new Date(d.getFullYear(), 0, 1);
        const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
        const weekKey = `${d.getFullYear()}-W${week}`;
        weeklyPnL[weekKey] = (weeklyPnL[weekKey] || 0) + t.pnl;
      }
    });
    const values = Object.values(weeklyPnL);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [trades]);

  // Monthly breakdowns (Best Month)
  const bestTradingMonth = useMemo(() => {
    const monthlyPnL: Record<string, number> = {};
    trades.forEach(t => {
      if (t.status === 'Closed' && t.pnl !== undefined) {
        const monthKey = t.date.substring(0, 7);
        monthlyPnL[monthKey] = (monthlyPnL[monthKey] || 0) + t.pnl;
      }
    });
    const values = Object.values(monthlyPnL);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [trades]);

  // 5. Compare timeframes vs previous equivalent period
  const comparisonStats = useMemo(() => {
    const now = new Date();
    let prevTrades: Trade[] = [];
    let compareLabel = '';

    switch (activeFilter) {
      case 'Today': {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);
        prevTrades = trades.filter(t => t.date === yesterdayStr);
        compareLabel = 'vs Yesterday';
        break;
      }
      case 'Yesterday': {
        const dayBefore = new Date();
        dayBefore.setDate(now.getDate() - 2);
        const dayBeforeStr = getLocalDateString(dayBefore);
        prevTrades = trades.filter(t => t.date === dayBeforeStr);
        compareLabel = 'vs Day Before';
        break;
      }
      case 'Last 7 Days': {
        const startCurrent = new Date();
        startCurrent.setDate(now.getDate() - 7);
        const startCurrentStr = getLocalDateString(startCurrent);
        
        const startPrev = new Date();
        startPrev.setDate(now.getDate() - 14);
        const startPrevStr = getLocalDateString(startPrev);
        
        prevTrades = trades.filter(t => t.date >= startPrevStr && t.date < startCurrentStr);
        compareLabel = 'vs Prev 7 Days';
        break;
      }
      case 'Last 30 Days': {
        const startCurrent = new Date();
        startCurrent.setDate(now.getDate() - 30);
        const startCurrentStr = getLocalDateString(startCurrent);
        
        const startPrev = new Date();
        startPrev.setDate(now.getDate() - 60);
        const startPrevStr = getLocalDateString(startPrev);
        
        prevTrades = trades.filter(t => t.date >= startPrevStr && t.date < startCurrentStr);
        compareLabel = 'vs Prev 30 Days';
        break;
      }
      case 'This Month': {
        const lastMonth = new Date();
        lastMonth.setMonth(now.getMonth() - 1);
        const lastMonthStr = getLocalDateString(lastMonth).substring(0, 7);
        prevTrades = trades.filter(t => t.date.startsWith(lastMonthStr));
        compareLabel = 'vs Last Month';
        break;
      }
      case 'Last Month': {
        const monthBeforeLast = new Date();
        monthBeforeLast.setMonth(now.getMonth() - 2);
        const monthBeforeLastStr = getLocalDateString(monthBeforeLast).substring(0, 7);
        prevTrades = trades.filter(t => t.date.startsWith(monthBeforeLastStr));
        compareLabel = 'vs Month Before';
        break;
      }
      case 'This Year': {
        const lastYear = now.getFullYear() - 1;
        prevTrades = trades.filter(t => t.date.startsWith(lastYear.toString()));
        compareLabel = 'vs Last Year';
        break;
      }
      default:
        prevTrades = [];
        compareLabel = 'vs Baseline';
    }

    const currentStats = filteredStats;
    const previousStats = calculateTradingStats(prevTrades, startingBalance);
    const allTimeStats = calculateTradingStats(trades, startingBalance);
    
    // last month base stats
    const lastMonthFilterStr = getLocalDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1)).substring(0, 7);
    const lastMonthTrades = trades.filter(t => t.date.startsWith(lastMonthFilterStr));
    const lastMonthStats = calculateTradingStats(lastMonthTrades, startingBalance);

    // net pnl delta
    const deltaPrev = currentStats.totalPnL - previousStats.totalPnL;
    const deltaLastMonth = currentStats.totalPnL - lastMonthStats.totalPnL;
    const deltaAllTime = currentStats.totalPnL - allTimeStats.totalPnL;

    // win rate delta
    const winRateDeltaPrev = currentStats.winRate - previousStats.winRate;
    const winRateDeltaLastMonth = currentStats.winRate - lastMonthStats.winRate;
    const winRateDeltaAllTime = currentStats.winRate - allTimeStats.winRate;

    return {
      compareLabel,
      deltaPrev,
      deltaLastMonth,
      deltaAllTime,
      winRateDeltaPrev,
      winRateDeltaLastMonth,
      winRateDeltaAllTime
    };
  }, [trades, activeFilter, filteredStats, startingBalance]);

  // Recents Closed trades sorted by date (filtered)
  const closedTrades = useMemo(() => {
    return filteredTrades
      .filter(t => t.status === 'Closed' && t.pnl !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTrades]);

  const recentTrades = useMemo(() => {
    return closedTrades.slice(0, 4);
  }, [closedTrades]);

  // Strategy setups metrics
  const strategyStats = useMemo(() => {
    const map: Record<string, { pnl: number; count: number; wins: number }> = {};
    filteredTrades.forEach(t => {
      if (t.status === 'Closed' && t.pnl !== undefined) {
        if (!map[t.strategy]) {
          map[t.strategy] = { pnl: 0, count: 0, wins: 0 };
        }
        map[t.strategy].pnl += t.pnl;
        map[t.strategy].count++;
        if (t.pnl > 0) map[t.strategy].wins++;
      }
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        pnl: parseFloat(data.pnl.toFixed(2)),
        winRate: (data.wins / data.count) * 100,
        count: data.count,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Determine delta details to render based on comparison mode
  const activeDeltaPnL = comparisonMode === 'prev_period' 
    ? comparisonStats.deltaPrev 
    : comparisonMode === 'last_month' 
      ? comparisonStats.deltaLastMonth 
      : comparisonStats.deltaAllTime;

  const activeDeltaWinRate = comparisonMode === 'prev_period' 
    ? comparisonStats.winRateDeltaPrev 
    : comparisonMode === 'last_month' 
      ? comparisonStats.winRateDeltaLastMonth 
      : comparisonStats.winRateDeltaAllTime;

  const comparisonModeText = comparisonMode === 'prev_period' 
    ? comparisonStats.compareLabel 
    : comparisonMode === 'last_month' 
      ? 'vs Last Month' 
      : 'vs All Time';

  return (
    <div className="space-y-6 animate-fade-in text-left pb-12">

      {/* Welcome SaaS Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900/60 to-zinc-950 border border-zinc-800/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black font-display text-zinc-100 !m-0 tracking-tight flex items-center gap-2">
            <span>Terminal Dashboard</span>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-extrabold border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
              {userProfile.accountType} Account
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-semibold flex items-center gap-1">
            <span>Broker: <strong>{userProfile.brokerName}</strong></span>
            <span className="text-zinc-600">&bull;</span>
            <span>Currency: <strong>{userProfile.currency}</strong></span>
            <span className="text-zinc-600">&bull;</span>
            <span>Journaling since launch</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 relative z-10">
          {trades.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearAllData} className="text-xs uppercase tracking-wider text-zinc-500 hover:text-rose-400 transition-colors select-none font-bold border-none bg-transparent">
              Reset Terminal
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={onAddTradeClick} className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-black shadow-indigo bg-indigo-600 hover:bg-indigo-500 border-none px-4 py-2 text-white">
            <Plus className="h-4 w-4" />
            <span>Add Execution</span>
          </Button>
        </div>
      </div>

      {/* SaaS Segmented Timeframe Presets Selection Strip */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch">
        {/* Modern Segmented Control */}
        <div className="bg-zinc-950/70 border border-zinc-900 p-1.5 rounded-2xl flex flex-wrap gap-1 items-center flex-1 shadow-inner">
          {(['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'This Year', 'All Time'] as PresetPeriodType[]).map((p) => {
            const isActive = activeFilter === p;
            const stats = presetStats[p];
            const hasTrades = stats?.count > 0;
            const isProfit = stats?.pnl > 0;
            const isLoss = stats?.pnl < 0;

            return (
              <button
                key={p}
                onClick={() => setActiveFilter(p)}
                className={cn(
                  "flex-1 min-w-[110px] px-3 py-2 rounded-xl text-left transition-all duration-300 relative cursor-pointer select-none group border-none",
                  isActive 
                    ? "bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 shadow-[0_4px_20px_rgba(99,102,241,0.05)]"
                    : "bg-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider block">{p}</span>
                  {hasTrades && (
                    <span className={cn(
                      "text-[8px] font-bold px-1 rounded-sm",
                      isProfit ? "text-emerald-400 bg-emerald-500/10" : isLoss ? "text-rose-500 bg-rose-500/10" : "text-zinc-400 bg-zinc-800"
                    )}>
                      {stats.count}T
                    </span>
                  )}
                </div>
                {hasTrades ? (
                  <span className={cn(
                    "text-[9px] font-mono font-bold block mt-1",
                    isProfit ? "text-emerald-500" : isLoss ? "text-rose-500" : "text-zinc-400"
                  )}>
                    {formatCurrency(stats.pnl, userProfile.currency)}
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-zinc-650 block mt-1">No logs</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Comparison Mode Selector */}
        <div className="bg-zinc-950/70 border border-zinc-900 p-1.5 rounded-2xl flex gap-1 items-center justify-between xl:w-[350px] shadow-inner">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-2">Comparison:</span>
          <div className="flex gap-1">
            {(['prev_period', 'last_month', 'all_time'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setComparisonMode(mode)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border-none select-none cursor-pointer",
                  comparisonMode === mode
                    ? "bg-zinc-800 text-zinc-100 font-black shadow"
                    : "text-zinc-500 hover:text-zinc-300 bg-transparent"
                )}
              >
                {mode === 'prev_period' ? 'Prev Period' : mode === 'last_month' ? 'Last Month' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SaaS Advanced Balance Performance Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Starting Balance */}
        <Card className="!p-5 bg-gradient-to-br from-zinc-950 to-zinc-900 border-zinc-900 hover:border-zinc-800 transition-all flex flex-col justify-between h-32 shadow-xl animate-fade-in">
          <div>
            <div className="flex justify-between items-center text-zinc-500 font-bold uppercase tracking-wider text-[10px] font-display">
              <span>Starting Balance</span>
              <Wallet className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="text-xl md:text-2xl font-black text-zinc-100 font-display mt-2.5 tracking-tight leading-none">
              {formatCurrency(startingBalance, userProfile.currency)}
            </div>
          </div>
          <span className="text-[9px] text-zinc-400 block font-semibold">
            Initial Capital Account Limit
          </span>
        </Card>

        {/* Current Balance */}
        <Card className="!p-5 bg-gradient-to-br from-zinc-950 to-zinc-900 border-zinc-900 hover:border-zinc-800 transition-all flex flex-col justify-between h-32 shadow-xl animate-fade-in">
          <div>
            <div className="flex justify-between items-center text-zinc-500 font-bold uppercase tracking-wider text-[10px] font-display">
              <span>Current Balance</span>
              <DollarSign className="h-4 w-4 text-indigo-400 animate-pulse" />
            </div>
            <div className="text-xl md:text-2xl font-black text-zinc-100 font-display mt-2.5 tracking-tight leading-none">
              {formatCurrency(currentBalance, userProfile.currency)}
            </div>
          </div>
          <span className="text-[9px] text-zinc-400 block font-semibold">
            Net Account Liquidity Assets
          </span>
        </Card>

        {/* Total Return % */}
        <Card className="!p-5 bg-gradient-to-br from-zinc-950 to-zinc-900 border-zinc-900 hover:border-zinc-800 transition-all flex flex-col justify-between h-32 shadow-xl animate-fade-in">
          <div>
            <div className="flex justify-between items-center text-zinc-500 font-bold uppercase tracking-wider text-[10px] font-display">
              <span>Total Return %</span>
              <Percent className="h-4 w-4 text-zinc-500" />
            </div>
            <div className={cn(
              "text-xl md:text-2xl font-black font-display mt-2.5 tracking-tight leading-none",
              totalReturnPercent >= 0 ? "text-emerald-400" : "text-rose-500"
            )}>
              {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
            </div>
          </div>
          <span className="text-[9px] text-zinc-400 block font-semibold">
            Lifetime growth yield ratio
          </span>
        </Card>

        {/* Equity Peak Growth % */}
        <Card className="!p-5 bg-gradient-to-br from-zinc-950 to-zinc-900 border-zinc-900 hover:border-zinc-800 transition-all flex flex-col justify-between h-32 shadow-xl animate-fade-in">
          <div>
            <div className="flex justify-between items-center text-zinc-500 font-bold uppercase tracking-wider text-[10px] font-display">
              <span>Peak Equity Growth</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-400 font-display mt-2.5 tracking-tight leading-none">
              +{equityGrowthPercent.toFixed(2)}%
            </div>
          </div>
          <span className="text-[9px] text-zinc-400 block font-semibold">
            Maximum historical balance height
          </span>
        </Card>
      </div>

      {/* KPI Cards Strip with comparison deltas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Net Profit */}
        <Card className="!p-4 bg-zinc-900/30 relative border-zinc-900/50 hover:border-zinc-800 transition-all flex flex-col justify-between h-32">
          <div>
            <div className="flex items-center justify-between text-zinc-500 font-bold tracking-wider text-[9px] uppercase font-display">
              <span>Selected Profit</span>
              <DollarSign className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <div className={cn(
              'text-lg md:text-xl font-black font-display mt-2.5 leading-none tracking-tight',
              filteredStats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'
            )}>
              {formatCurrency(filteredStats.totalPnL, userProfile.currency)}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[9px] text-zinc-400 font-bold uppercase">ROI: {filteredStats.netROI.toFixed(2)}%</span>
            {activeDeltaPnL !== 0 && (
              <span className={cn(
                "text-[8px] font-black font-mono flex items-center px-1 rounded",
                activeDeltaPnL >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
              )}>
                {activeDeltaPnL >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                {formatCurrency(Math.abs(activeDeltaPnL), '')}
              </span>
            )}
          </div>
        </Card>

        {/* Win Rate */}
        <Card className="!p-4 bg-zinc-900/30 border-zinc-900/50 hover:border-zinc-800 transition-all flex flex-col justify-between h-32">
          <div>
            <div className="flex items-center justify-between text-zinc-500 font-bold tracking-wider text-[9px] uppercase font-display">
              <span>Win Ratio</span>
              <Percent className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <div className="text-lg md:text-xl font-black text-zinc-100 font-display mt-2.5 leading-none tracking-tight">
              {filteredStats.winRate.toFixed(1)}%
            </div>
          </div>
          <div className="w-full">
            <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${filteredStats.winRate}%` }} />
              <div className="bg-rose-500 h-full flex-1" />
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[8px] text-zinc-500 font-bold uppercase">{comparisonModeText}</span>
              {activeDeltaWinRate !== 0 && (
                <span className={cn(
                  "text-[8px] font-black font-mono flex items-center",
                  activeDeltaWinRate >= 0 ? "text-emerald-400" : "text-rose-500"
                )}>
                  {activeDeltaWinRate >= 0 ? '+' : ''}{activeDeltaWinRate.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Profit Factor */}
        <Card className="!p-4 bg-zinc-900/30 border-zinc-900/50 hover:border-zinc-800 transition-all flex flex-col justify-between h-32">
          <div>
            <div className="flex items-center justify-between text-zinc-500 font-bold tracking-wider text-[9px] uppercase font-display">
              <span>Profit Factor</span>
              <Calculator className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <div className={cn(
              'text-lg md:text-xl font-black font-display mt-2.5 leading-none tracking-tight',
              filteredStats.profitFactor >= 2 ? 'text-emerald-400' : filteredStats.profitFactor >= 1.5 ? 'text-indigo-400' : 'text-zinc-100'
            )}>
              {filteredStats.profitFactor.toFixed(2)}
            </div>
          </div>
          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
            Expectancy edge
          </span>
        </Card>

        {/* Average Win/Loss */}
        <Card className="!p-4 bg-zinc-900/30 border-zinc-900/50 hover:border-zinc-800 transition-all flex flex-col justify-between h-32">
          <div>
            <div className="flex items-center justify-between text-zinc-500 font-bold tracking-wider text-[9px] uppercase font-display">
              <span>Avg Win / Loss</span>
              <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <div className="text-xs font-black font-display mt-2 flex flex-col gap-1">
              <span className="text-emerald-400">W: {formatCurrency(filteredStats.avgWin, userProfile.currency)}</span>
              <span className="text-rose-500">L: {formatCurrency(filteredStats.avgLoss, userProfile.currency)}</span>
            </div>
          </div>
          <span className="text-[9px] text-zinc-550 font-bold font-mono">
            R:R Ratio 1:{filteredStats.avgLoss !== 0 ? Math.abs(parseFloat((filteredStats.avgWin / filteredStats.avgLoss).toFixed(2))) : '0.00'}
          </span>
        </Card>

        {/* Total Trades */}
        <Card className="!p-4 bg-zinc-900/30 border-zinc-900/50 hover:border-zinc-800 transition-all flex flex-col justify-between h-32 col-span-2 md:col-span-1">
          <div>
            <div className="flex items-center justify-between text-zinc-500 font-bold tracking-wider text-[9px] uppercase font-display">
              <span>Executions</span>
              <Zap className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            </div>
            <div className="text-lg md:text-xl font-black text-zinc-100 font-display mt-2.5 leading-none tracking-tight">
              {filteredStats.totalTrades}
            </div>
          </div>
          <span className="text-[9px] text-zinc-400 font-bold block">
            {filteredStats.closedTrades} Closed | <span className="text-indigo-400 font-extrabold">{filteredStats.openTrades} Open</span>
          </span>
        </Card>
      </div>

      {/* Advanced SaaS Metric Cards - High-End Benchmarks */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Avg Monthly Return */}
        <Card className="!p-4 bg-zinc-950/40 relative border-zinc-900/70 hover:border-zinc-800 transition-all text-left">
          <div className="text-[9px] font-black text-zinc-550 uppercase tracking-widest font-display">Monthly Average</div>
          <div className={cn(
            "text-base font-black font-display mt-2",
            avgMonthlyReturn >= 0 ? "text-emerald-400" : "text-rose-500"
          )}>
            {formatCurrency(avgMonthlyReturn, userProfile.currency)}
          </div>
          <p className="text-[9px] text-zinc-500 mt-1 leading-normal font-semibold">Cumulative month-by-month profit bounds.</p>
        </Card>

        {/* Best Trading Day */}
        <Card className="!p-4 bg-zinc-950/40 relative border-zinc-900/70 hover:border-zinc-800 transition-all text-left">
          <div className="text-[9px] font-black text-zinc-550 uppercase tracking-widest font-display">Best Day PnL</div>
          <div className="text-base font-black text-emerald-400 font-display mt-2">
            {bestTradingDay > 0 ? '+' : ''}{formatCurrency(bestTradingDay, userProfile.currency)}
          </div>
          <p className="text-[9px] text-zinc-500 mt-1 leading-normal font-semibold">Highest single day net outcome.</p>
        </Card>

        {/* Worst Trading Day */}
        <Card className="!p-4 bg-zinc-950/40 relative border-zinc-900/70 hover:border-zinc-800 transition-all text-left">
          <div className="text-[9px] font-black text-zinc-550 uppercase tracking-widest font-display">Worst Day PnL</div>
          <div className="text-base font-black text-rose-500 font-display mt-2">
            {formatCurrency(worstTradingDay, userProfile.currency)}
          </div>
          <p className="text-[9px] text-zinc-500 mt-1 leading-normal font-semibold">Lowest single day drawdown event.</p>
        </Card>

        {/* Best Trading Week */}
        <Card className="!p-4 bg-zinc-950/40 relative border-zinc-900/70 hover:border-zinc-800 transition-all text-left">
          <div className="text-[9px] font-black text-zinc-550 uppercase tracking-widest font-display">Best Week PnL</div>
          <div className="text-base font-black text-emerald-400 font-display mt-2">
            {bestTradingWeek > 0 ? '+' : ''}{formatCurrency(bestTradingWeek, userProfile.currency)}
          </div>
          <p className="text-[9px] text-zinc-500 mt-1 leading-normal font-semibold">Highest single weekly block return.</p>
        </Card>

        {/* Best Trading Month */}
        <Card className="!p-4 bg-zinc-950/40 relative border-zinc-900/70 hover:border-zinc-800 transition-all text-left col-span-2 lg:col-span-1">
          <div className="text-[9px] font-black text-zinc-550 uppercase tracking-widest font-display">Best Month PnL</div>
          <div className="text-base font-black text-emerald-400 font-display mt-2">
            {bestTradingMonth > 0 ? '+' : ''}{formatCurrency(bestTradingMonth, userProfile.currency)}
          </div>
          <p className="text-[9px] text-zinc-500 mt-1 leading-normal font-semibold">Highest monthly cumulative net return.</p>
        </Card>
      </div>

      {/* Scorecard Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="!p-4 bg-zinc-900/20 relative border-zinc-900/30">
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display">Discipline Score</div>
          <div className="text-lg font-black text-indigo-400 font-display mt-1">{filteredStats.disciplineScore}/100</div>
          <p className="text-[9px] text-zinc-500 mt-0.5 leading-normal">Based on behavioral mistake frequencies.</p>
        </Card>
        <Card className="!p-4 bg-zinc-900/20 relative border-zinc-900/30">
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display">Risk Score</div>
          <div className="text-lg font-black text-indigo-400 font-display mt-1">{filteredStats.riskScore}/100</div>
          <p className="text-[9px] text-zinc-500 mt-0.5 leading-normal">Evaluates stop loss coverage on entries.</p>
        </Card>
        <Card className="!p-4 bg-zinc-900/20 relative border-zinc-900/30">
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display">Psychology Score</div>
          <div className="text-lg font-black text-indigo-400 font-display mt-1">{filteredStats.psychologyScore}/100</div>
          <p className="text-[9px] text-zinc-500 mt-0.5 leading-normal">Measures emotional tagging compliance.</p>
        </Card>
        <Card className="!p-4 bg-zinc-900/20 relative border-zinc-900/30">
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-display">Execution Score</div>
          <div className="text-lg font-black text-indigo-400 font-display mt-1">{filteredStats.executionScore}/100</div>
          <p className="text-[9px] text-zinc-500 mt-0.5 leading-normal">Outlines profit payoff multipliers.</p>
        </Card>
        <Card className="!p-4 bg-indigo-950/10 relative border-indigo-500/20 col-span-2 sm:col-span-1">
          <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-display">Overall Rating</div>
          <div className="text-xl font-black text-emerald-400 font-display mt-1">{filteredStats.overallScore}/100</div>
          <p className="text-[9px] text-zinc-400 mt-0.5 leading-normal">Unified performance score of your desk.</p>
        </Card>
      </div>

      {/* Main Charts & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advanced Equity Curve Chart Card */}
        <div className="lg:col-span-2">
          <Card
            className="h-full flex flex-col justify-between"
            title={
              <div className="flex items-center justify-between w-full">
                <span>Interactive Equity Curve</span>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-display">PnL Progression</span>
              </div>
            }
          >
            <EquityCurveChart trades={filteredTrades} currencySymbol={userProfile.currency} />
          </Card>
        </div>

        {/* AI Trading Coach Panel */}
        <div className="lg:col-span-1">
          <AiCoachPanel />
        </div>
      </div>

      {/* Bottom Leaderboard and Log Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setup Leaderboard */}
        <Card title="Strategy Setups Performance">
          {strategyStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase tracking-wider text-[10px] font-display">
                    <th className="py-2.5">Setup Name</th>
                    <th className="py-2.5 text-center">Executions</th>
                    <th className="py-2.5 text-center">Win Rate</th>
                    <th className="py-2.5 text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40 text-zinc-300">
                  {strategyStats.slice(0, 5).map((strat, idx) => (
                    <tr key={idx} className="hover:bg-white/1 bg-transparent transition-colors">
                      <td className="py-3 font-bold text-zinc-100 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>{strat.name}</span>
                      </td>
                      <td className="py-3 text-center text-zinc-400">{strat.count}</td>
                      <td className="py-3 text-center font-extrabold text-zinc-200">{strat.winRate.toFixed(0)}%</td>
                      <td className={cn(
                        'py-3 text-right font-extrabold font-display',
                        strat.pnl >= 0 ? 'text-emerald-400' : 'text-rose-500'
                      )}>
                        {formatCurrency(strat.pnl, userProfile.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 flex items-center justify-center text-xs text-zinc-500 font-medium">
              No executions in this period.
            </div>
          )}
        </Card>

        {/* Recent Trades Log feed */}
        <Card
          title="Recent Closed Executions Feed"
          headerAction={
            <button
              onClick={() => setActiveTab('journal')}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest font-display flex items-center gap-1 cursor-pointer select-none border-none bg-transparent"
            >
              <span>View Full Log</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          {recentTrades.length > 0 ? (
            <div className="space-y-3">
              {recentTrades.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/20 border border-zinc-900 hover:border-zinc-800/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-1 h-8 rounded-full',
                      (t.pnl || 0) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                    )} />
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100 font-display">{t.instrument}</span>
                        <span className={cn(
                          'text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded font-mono',
                          t.side === 'Long' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                        )}>
                          {t.side}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-semibold">{t.date}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 max-w-[240px] truncate">{t.notes || 'No comments logged.'}</p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col gap-1 items-end">
                    <span className={cn(
                      'text-xs font-extrabold font-display block',
                      (t.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-500'
                    )}>
                      {formatCurrency(t.pnl || 0, userProfile.currency)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] text-zinc-500 font-bold block">{t.strategy}</span>
                      {t.complianceScore !== undefined && (
                        <span className={cn(
                          "text-[8px] font-bold px-1 rounded-sm",
                          t.complianceScore >= 80 ? "text-emerald-400 bg-emerald-500/10" : t.complianceScore >= 50 ? "text-amber-400 bg-amber-500/10" : "text-rose-500 bg-rose-500/10"
                        )}>
                          {t.complianceScore}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 flex items-center justify-center text-xs text-zinc-500 font-medium">
              No recent closed trades logged.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
