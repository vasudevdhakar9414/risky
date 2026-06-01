import type { Trade } from '../types';
import { formatCurrency } from './helpers';

export interface CoachReport {
  summary: string;
  edgeSetup: string;
  riskViolationCount: number;
  tacticalAction: string;
  expectancyByStrategy: { name: string; score: number }[];
}

/**
 * Expert heuristic analyzer parsing trade history to diagnose trading performance
 */
export function analyzeTradingHistory(trades: Trade[], currencySymbol: string = '$'): CoachReport {
  const closed = trades.filter(t => t.status === 'Closed' && t.pnl !== undefined);

  if (closed.length === 0) {
    return {
      summary: "### AI Trading Coach Diagnostics\n\nWelcome to your trading journey! The AI Coach requires **closed trade logs** to perform deep statistical edge audits. Add executions in the journal or load sample data from the dashboard to begin analysis.",
      edgeSetup: "Insufficient Data",
      riskViolationCount: 0,
      tacticalAction: "Log your first set of closed trades.",
      expectancyByStrategy: [],
    };
  }

  // 1. Group PnL and metrics by Strategy
  const strategyStats: Record<string, { pnl: number; wins: number; count: number; winSum: number; lossSum: number }> = {};
  // 2. Group by Weekday
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const pnlByDay: Record<string, { pnl: number; count: number; wins: number }> = {
    'Monday': { pnl: 0, count: 0, wins: 0 },
    'Tuesday': { pnl: 0, count: 0, wins: 0 },
    'Wednesday': { pnl: 0, count: 0, wins: 0 },
    'Thursday': { pnl: 0, count: 0, wins: 0 },
    'Friday': { pnl: 0, count: 0, wins: 0 },
  };

  let riskViolations = 0;
  let revengeTradesDetected = false;
  let sizeInconsistencies = 0;

  // Sorting closed trades chronologically to detect streaks and habits
  const chronological = [...closed].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Sizing standard deviation calculation helper
  const sizes = chronological.map(t => t.quantity * t.entryPrice);
  const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;

  // Streak tracking variables
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  chronological.forEach((t, idx) => {
    const pnl = t.pnl || 0;
    const size = t.quantity * t.entryPrice;

    // Track streaks
    if (pnl > 0) {
      currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
      if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
    } else if (pnl < 0) {
      currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
      if (Math.abs(currentStreak) > maxLossStreak) maxLossStreak = Math.abs(currentStreak);
    }

    // 1. Audit Strategy expectancies
    if (!strategyStats[t.strategy]) {
      strategyStats[t.strategy] = { pnl: 0, wins: 0, count: 0, winSum: 0, lossSum: 0 };
    }
    const sStat = strategyStats[t.strategy];
    sStat.pnl += pnl;
    sStat.count++;
    if (pnl > 0) {
      sStat.wins++;
      sStat.winSum += pnl;
    } else {
      sStat.lossSum += Math.abs(pnl);
    }

    // 2. Audit Weekday patterns
    const date = new Date(t.date);
    const dayName = weekdays[date.getDay()];
    if (dayName && pnlByDay[dayName]) {
      pnlByDay[dayName].pnl += pnl;
      pnlByDay[dayName].count++;
      if (pnl > 0) pnlByDay[dayName].wins++;
    }

    // 3. Risk bounds checks
    // Check if entered without stop loss
    if (!t.stopLoss) {
      riskViolations++;
    }

    // Size inconsistency audit: position size > 2.5x of user's average sizing
    if (size > avgSize * 2.5) {
      sizeInconsistencies++;
    }

    // Revenge Trading heuristic:
    // If user takes a loss, and logs another trade in < 2 hours on the exact same instrument on the same day
    if (idx > 0 && chronological[idx - 1].pnl !== undefined && (chronological[idx - 1].pnl || 0) < 0) {
      const prev = chronological[idx - 1];
      if (prev.instrument === t.instrument && prev.date === t.date) {
        // Parse time difference
        const [prevH, prevM] = prev.time.split(':').map(Number);
        const [currH, currM] = t.time.split(':').map(Number);
        const diffMinutes = (currH * 60 + currM) - (prevH * 60 + prevM);
        if (diffMinutes > 0 && diffMinutes <= 120) {
          revengeTradesDetected = true;
        }
      }
    }
  });

  // Calculate expectancy score by strategy = (WinRatio * AvgWin) - (LossRatio * AvgLoss)
  const strategyExpectancies = Object.entries(strategyStats).map(([name, data]) => {
    const winRate = data.wins / data.count;
    const lossRate = 1 - winRate;
    const avgWin = data.wins > 0 ? data.winSum / data.wins : 0;
    const avgLoss = (data.count - data.wins) > 0 ? data.lossSum / (data.count - data.wins) : 0;
    const score = (winRate * avgWin) - (lossRate * avgLoss);
    
    return { name, score: parseFloat(score.toFixed(2)) };
  }).sort((a, b) => b.score - a.score);

  // Identify Best and Worst setups
  const bestStrat = strategyExpectancies[0];
  const worstStrat = strategyExpectancies[strategyExpectancies.length - 1];

  // Identify Best and Worst weekdays
  const weekdayExpectancies = Object.entries(pnlByDay).map(([day, data]) => {
    const avgPnL = data.count > 0 ? data.pnl / data.count : 0;
    return { day, avgPnL };
  }).sort((a, b) => b.avgPnL - a.avgPnL);

  const bestDay = weekdayExpectancies[0];
  const worstDay = weekdayExpectancies[weekdayExpectancies.length - 1];

  // Heuristic-based dynamic summary text generation
  let summary = `### 🤖 Tactical AI Trading Coach Report\n\n`;
  summary += `Based on an audit of **${closed.length} closed executions**, I have mapped out your mathematical trading habits and diagnosed structural areas of performance improvement:\n\n`;

  // Edge & Setup diagnostic
  if (bestStrat && bestStrat.score > 0) {
    summary += `> 🟢 **EDGE DETECTED**: Your highest expectancy setup is **${bestStrat.name}**, yielding an average expectation of **${formatCurrency(bestStrat.score, currencySymbol)}** per execution. Consider increasing size parameters on this setup and filtering out unaligned patterns.\n\n`;
  }

  if (worstStrat && worstStrat.score < 0) {
    summary += `> 🔴 **DRAG DETECTED**: The setup **${worstStrat.name}** has a negative expectancy of **${formatCurrency(worstStrat.score, currencySymbol)}** per execution. This setup is leaking capital. Review its rules immediately or pause logging it.\n\n`;
  }

  // Weekday diagnostics
  summary += `#### 📅 Calendar Expectancy Audit\n`;
  if (bestDay && bestDay.avgPnL > 10) {
    summary += `- **Optimal Day**: **${bestDay.day}** is highly profitable, with an average net of **${formatCurrency(bestDay.avgPnL, currencySymbol)}** per trade. Your focus is sharpest here.\n`;
  }
  if (worstDay && worstDay.avgPnL < -10) {
    summary += `- **Leak Day**: **${worstDay.day}s** register negative expectation of **${formatCurrency(worstDay.avgPnL, currencySymbol)}**. This day is highly prone to losses or over-trading. Restrict active volume on ${worstDay.day}s.\n`;
  }

  // Habits and psychological diagnostics
  summary += `\n#### 🧠 Risk & Psychological Audit\n`;
  if (riskViolations > 0) {
    summary += `- ⚠️ **Stop Loss Neglect**: **${riskViolations} trades** were entered **without an explicit stop loss**. Trading without an active safety gate exposes your account to tail-risk drawdowns. Establish a hard rule: *No stop, no execution*.\n`;
  }
  if (sizeInconsistencies > 0) {
    summary += `- ⚠️ **Position Sizing Spikes**: I detected **${sizeInconsistencies} size anomalies** where position sizes exceeded 2.5x of your standard sizing. This indicates erratic scaling or "hope-sizing." Retain absolute capital sizing discipline.\n`;
  }
  if (revengeTradesDetected) {
    summary += `- ⚠️ **Revenge Trading Pattern**: I identified consecutive executions taken on the same symbol within 2 hours of a stop out. This is a classic indicator of emotional revenge trading. When stopped out, step away for a minimum of 60 minutes.\n`;
  }
  if (maxLossStreak >= 3) {
    summary += `- ⚠️ **Loss Streak Hazard**: Your largest loss streak is **${maxLossStreak} consecutive trades**. When registering 3 consecutive losses, pause trading for the day to protect capital and mental clarity.\n`;
  }

  if (riskViolations === 0 && sizeInconsistencies === 0 && !revengeTradesDetected) {
    summary += `- 🏆 **Superb Discipline**: Zero stop-loss neglect, size anomalies, or emotional revenge patterns were registered. Your trading execution safety boundaries are solid.\n`;
  }

  // Kelly Criterion Suggestion
  const pnlWins = closed.filter(c => (c.pnl || 0) > 0);
  const pnlLosses = closed.filter(c => (c.pnl || 0) < 0);
  const winRateMetric = closed.length > 0 ? (pnlWins.length / closed.length) * 100 : 0;
  const avgWinMetric = pnlWins.length > 0 ? pnlWins.reduce((sum, c) => sum + (c.pnl || 0), 0) / pnlWins.length : 0;
  const avgLossMetric = pnlLosses.length > 0 ? pnlLosses.reduce((sum, c) => sum + (c.pnl || 0), 0) / pnlLosses.length : 0;
  const stats = { winRate: winRateMetric, avgWin: avgWinMetric, avgLoss: avgLossMetric };

  if (stats.winRate > 0) {
    if (pnlWins.length > 0 && pnlLosses.length > 0) {
      const avgW = stats.avgWin;
      const avgL = Math.abs(stats.avgLoss);
      const ratio = avgW / (avgL === 0 ? 1 : avgL);
      const wRate = stats.winRate / 100;
      
      // Kelly Formula = W - ( (1 - W) / R )
      const kelly = wRate - ((1 - wRate) / (ratio === 0 ? 1 : ratio));
      if (kelly > 0) {
        summary += `\n#### 📊 Sizing Guidelines (Kelly Criterion)\n`;
        summary += `- **Kelly Sizing**: Based on a Win Rate of **${stats.winRate.toFixed(0)}%** and a payoff ratio of **${ratio.toFixed(2)}x**, the Kelly Criterion suggests allocation of up to **${(kelly * 100).toFixed(0)}%** of your risk budget per trade. Standard fractional Kelly suggested: **${((kelly * 100) / 4).toFixed(0)}%** for conservation.\n`;
      }
    }
  }

  // Strategic Tactical Advice summary
  let tacticalAction = "Review strategy tag limits.";
  if (riskViolations > 0) {
    tacticalAction = "Enforce stop losses on 100% of executions.";
  } else if (revengeTradesDetected) {
    tacticalAction = "Impose a 60-minute mandatory break after any loss.";
  } else if (worstStrat && worstStrat.score < 0) {
    tacticalAction = `Temporarily halt execution of "${worstStrat.name}" setup.`;
  }

  return {
    summary,
    edgeSetup: bestStrat ? bestStrat.name : "N/A",
    riskViolationCount: riskViolations,
    tacticalAction,
    expectancyByStrategy: strategyExpectancies,
  };
}
