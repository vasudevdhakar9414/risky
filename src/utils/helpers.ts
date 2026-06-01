import type { Trade } from '../types';

/**
 * Clean class names merger helper
 */
export function cn(...classes: (string | boolean | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currencySymbol: string = '$'): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-${currencySymbol}${formatted}` : `${currencySymbol}${formatted}`;
}

/**
 * Format percentages
 */
export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * Calculate KPI summary stats from closed trades list
 */
export interface TradingStats {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  totalPnL: number;
  winRate: number;
  winsCount: number;
  lossesCount: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  netROI: number;
  maxDrawdown: number;
  disciplineScore: number;
  riskScore: number;
  psychologyScore: number;
  executionScore: number;
  overallScore: number;
  historicalScores: { date: string; score: number }[];
}

export function calculateTradingStats(trades: Trade[], startingBalance: number = 10000): TradingStats {
  const closed = trades.filter(t => t.status === 'Closed' && t.pnl !== undefined);
  const openCount = trades.filter(t => t.status === 'Open').length;
  
  if (closed.length === 0) {
    return {
      totalTrades: trades.length,
      closedTrades: 0,
      openTrades: openCount,
      totalPnL: 0,
      winRate: 0,
      winsCount: 0,
      lossesCount: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      netROI: 0,
      maxDrawdown: 0,
      disciplineScore: 100,
      riskScore: 100,
      psychologyScore: 100,
      executionScore: 100,
      overallScore: 100,
      historicalScores: [],
    };
  }

  let totalPnL = 0;
  let winsCount = 0;
  let lossesCount = 0;
  let totalWinsAmount = 0;
  let totalLossesAmount = 0;
  let largestWin = 0;
  let largestLoss = 0;
  
  // Drawdown tracking variables
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;

  // Score accumulation variables
  let totalMistakes = 0;
  let hasStopLossCount = 0;
  let emotionalTradesCount = 0;

  closed.forEach(t => {
    const pnl = t.pnl || 0;
    totalPnL += pnl;
    cumulative += pnl;

    // Track peak and drawdowns
    if (cumulative > peak) {
      peak = cumulative;
    }
    const dd = peak - cumulative;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }

    if (pnl > 0) {
      winsCount++;
      totalWinsAmount += pnl;
      if (pnl > largestWin) largestWin = pnl;
    } else if (pnl < 0) {
      lossesCount++;
      totalLossesAmount += Math.abs(pnl);
      if (pnl < largestLoss) largestLoss = pnl; // largestLoss is negative
    }

    // Accumulate scores
    const mistakes = t.mistakes || [];
    totalMistakes += mistakes.length;
    if (t.stopLoss) {
      hasStopLossCount++;
    }
    if (mistakes.includes('FOMO') || mistakes.includes('Revenge Trading') || mistakes.includes('Emotional Trade') || mistakes.includes('Over Risk')) {
      emotionalTradesCount++;
    }
  });

  const winRate = (winsCount / closed.length) * 100;
  const avgWin = winsCount > 0 ? totalWinsAmount / winsCount : 0;
  const avgLoss = lossesCount > 0 ? totalLossesAmount / lossesCount : 0;
  const profitFactor = totalLossesAmount > 0 ? totalWinsAmount / totalLossesAmount : totalWinsAmount > 0 ? 99.9 : 0;

  // Sizing standard deviation and scores calculation
  const disciplineScore = Math.max(0, 100 - (totalMistakes * 10));
  const riskScore = Math.round((hasStopLossCount / closed.length) * 100);
  const psychologyScore = Math.max(0, 100 - Math.round((emotionalTradesCount / closed.length) * 100));
  const executionScore = Math.round((winRate * 0.6) + (Math.min(3, profitFactor) / 3 * 40));
  const overallScore = Math.round((disciplineScore + riskScore + psychologyScore + executionScore) / 4);

  // Generate historical score progression chronologically
  const chronological = [...closed].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let runningMistakes = 0;
  let runningStopLoss = 0;
  let runningEmotional = 0;
  let runningWins = 0;
  let runningLossesAmount = 0;
  let runningWinsAmount = 0;
  
  const historicalScores = chronological.map((t, idx) => {
    const mistakes = t.mistakes || [];
    runningMistakes += mistakes.length;
    if (t.stopLoss) runningStopLoss++;
    if (mistakes.includes('FOMO') || mistakes.includes('Revenge Trading') || mistakes.includes('Emotional Trade') || mistakes.includes('Over Risk')) {
      runningEmotional++;
    }
    const count = idx + 1;
    const pnl = t.pnl || 0;
    if (pnl > 0) {
      runningWins++;
      runningWinsAmount += pnl;
    } else {
      runningLossesAmount += Math.abs(pnl);
    }
    
    const runningWinRate = (runningWins / count) * 100;
    const runningPF = runningLossesAmount > 0 ? runningWinsAmount / runningLossesAmount : 3;
    
    const dScore = Math.max(0, 100 - (runningMistakes * 10 / count));
    const rScore = Math.round((runningStopLoss / count) * 100);
    const pScore = Math.max(0, 100 - Math.round((runningEmotional / count) * 100));
    const eScore = Math.round((runningWinRate * 0.6) + (Math.min(3, runningPF) / 3 * 40));
    
    const overall = Math.round((dScore + rScore + pScore + eScore) / 4);
    
    return {
      date: t.date,
      score: overall,
    };
  });

  // Calculate Net ROI based on user's custom account starting balance
  const netROI = (totalPnL / (startingBalance || 10000)) * 100;

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: openCount,
    totalPnL,
    winRate,
    winsCount,
    lossesCount,
    profitFactor,
    avgWin,
    avgLoss: -avgLoss, // represent as negative
    largestWin,
    largestLoss,
    netROI,
    maxDrawdown,
    disciplineScore,
    riskScore,
    psychologyScore,
    executionScore,
    overallScore,
    historicalScores,
  };
}

/**
 * Generates an SVG path string for a cumulative P&L chart
 */
export function generateSvgPath(trades: Trade[], width: number, height: number, padding: number = 30): { path: string; points: {x: number, y: number, pnl: number}[] } {
  const closed = trades
    .filter(t => t.status === 'Closed' && t.pnl !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (closed.length === 0) {
    return { path: '', points: [] };
  }

  // Prepend a starting zero point
  const cumulativeValues = [0];
  let currentPnL = 0;
  closed.forEach(t => {
    currentPnL += t.pnl || 0;
    cumulativeValues.push(currentPnL);
  });

  const minPnL = Math.min(...cumulativeValues);
  const maxPnL = Math.max(...cumulativeValues);
  const pnlRange = maxPnL - minPnL === 0 ? 100 : maxPnL - minPnL;

  const xStep = (width - padding * 2) / (cumulativeValues.length - 1);
  const points = cumulativeValues.map((val, idx) => {
    const x = padding + idx * xStep;
    // Map val onto Y coordinate (invert since SVG origin is top-left)
    const ratio = (val - minPnL) / pnlRange;
    const y = height - padding - ratio * (height - padding * 2);
    return { x, y, pnl: val };
  });

  const path = points.reduce((acc, p, idx) => {
    return acc + `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  return { path, points };
}

/**
 * Filter trades list based on standard timeframes
 */
export function filterTradesByDatePreset(
  trades: Trade[],
  preset: string,
  customStart?: string,
  customEnd?: string
): Trade[] {
  const now = new Date();
  
  const getLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = getLocalDateString(now);
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  return trades.filter((t) => {
    if (!t.date) return false;
    
    switch (preset) {
      case 'Today':
        return t.date === todayStr;
      case 'Yesterday':
        return t.date === yesterdayStr;
      case 'Last 7 Days': {
        const limit = new Date();
        limit.setDate(now.getDate() - 7);
        const limitStr = getLocalDateString(limit);
        return t.date >= limitStr;
      }
      case 'Last 30 Days': {
        const limit = new Date();
        limit.setDate(now.getDate() - 30);
        const limitStr = getLocalDateString(limit);
        return t.date >= limitStr;
      }
      case 'This Month': {
        const currentYearMonth = todayStr.substring(0, 7); // "YYYY-MM"
        return t.date.startsWith(currentYearMonth);
      }
      case 'Last Month': {
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(now.getMonth() - 1);
        const lastMonthStr = getLocalDateString(lastMonthDate).substring(0, 7);
        return t.date.startsWith(lastMonthStr);
      }
      case 'This Year': {
        const currentYear = todayStr.substring(0, 4); // "YYYY"
        return t.date.startsWith(currentYear);
      }
      case 'Custom': {
        if (customStart && customEnd) {
          return t.date >= customStart && t.date <= customEnd;
        }
        if (customStart) {
          return t.date >= customStart;
        }
        if (customEnd) {
          return t.date <= customEnd;
        }
        return true;
      }
      case 'All Time':
      default:
        return true;
    }
  });
}
