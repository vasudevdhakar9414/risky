import React, { useState, useMemo } from 'react';
import type { Trade } from '../../types';
import { formatCurrency, formatPercent, cn } from '../../utils/helpers';
import { ZoomIn, ZoomOut, LineChart } from 'lucide-react';

interface EquityCurveChartProps {
  trades: Trade[];
  currencySymbol?: string;
}

type ChartMode = 'pnl' | 'roi' | 'count';

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  trades,
  currencySymbol = '$',
}) => {
  const [mode, setMode] = useState<ChartMode>('pnl');
  const [zoom, setZoom] = useState<number>(1); // 1 = 100%, 2 = 200%, etc.
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Closed trades sorted chronologically
  const closedTrades = useMemo(() => {
    return trades
      .filter(t => t.status === 'Closed' && t.pnl !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [trades]);

  // Derived datasets
  const chartData = useMemo(() => {
    const data: { date: string; pnl: number; roi: number; cumulativePnL: number; cumulativeRoi: number; instrument: string; strategy: string }[] = [];
    let runningPnL = 0;
    let runningRoi = 0;

    closedTrades.forEach(t => {
      const pnl = t.pnl || 0;
      const roi = t.roi || 0;
      runningPnL += pnl;
      runningRoi += roi;

      data.push({
        date: t.date,
        pnl,
        roi,
        cumulativePnL: runningPnL,
        cumulativeRoi: runningRoi,
        instrument: t.instrument,
        strategy: t.strategy,
      });
    });

    return data;
  }, [closedTrades]);

  // Handle zooming by slicing the end of the array or full viewport
  const visibleData = useMemo(() => {
    if (chartData.length === 0) return [];
    if (zoom === 1) return chartData;
    
    // Zoom in: show only the last fractional percentage of trades
    const showCount = Math.max(3, Math.round(chartData.length / zoom));
    return chartData.slice(-showCount);
  }, [chartData, zoom]);

  // SVG Coordinates calculation
  const width = 800;
  const height = 240;
  const padding = 40;

  const points = useMemo(() => {
    if (visibleData.length === 0) return [];

    // Prepend starting zero coordinate
    const values = mode === 'pnl' 
      ? [0, ...visibleData.map(d => d.cumulativePnL)]
      : mode === 'roi' 
      ? [0, ...visibleData.map(d => d.cumulativeRoi)]
      : [0, ...visibleData.map((_, i) => i + 1)];

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal === 0 ? 100 : maxVal - minVal;

    const xStep = (width - padding * 2) / (values.length - 1);
    
    return values.map((val, idx) => {
      const x = padding + idx * xStep;
      const ratio = (val - minVal) / valRange;
      const y = height - padding - ratio * (height - padding * 2);
      return { x, y, val };
    });
  }, [visibleData, mode]);

  // SVG Path string
  const path = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, idx) => {
      return acc + `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }, '');
  }, [points]);

  const activeHoverData = hoverIndex !== null && hoverIndex > 0 && visibleData[hoverIndex - 1] 
    ? visibleData[hoverIndex - 1] 
    : null;

  return (
    <div className="space-y-4">
      {/* Chart Headers and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/10 p-2 rounded-xl border border-zinc-900/30">
        {/* Mode Toggles */}
        <div className="flex items-center gap-1.5">
          {(['pnl', 'roi', 'count'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setHoverIndex(null); }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                mode === m
                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold"
                  : "text-zinc-500 border border-transparent hover:text-zinc-300"
              )}
            >
              {m === 'pnl' ? 'PnL ($)' : m === 'roi' ? 'ROI (%)' : 'Executions'}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(prev => Math.max(1, prev - 0.5))}
            disabled={zoom <= 1}
            className="p-1 rounded bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer disabled:opacity-40"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">{zoom * 100}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(4, prev + 0.5))}
            disabled={chartData.length < 5 || zoom >= 4}
            className="p-1 rounded bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer disabled:opacity-40"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Canvas with Interactive Area */}
      <div className="relative border border-zinc-900 rounded-2xl bg-zinc-950 p-4 overflow-hidden">
        {points.length > 0 ? (
          <div className="h-60 w-full relative pt-2">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

              {/* Zero baseline (if min and max overlap) */}
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1f1f23" strokeWidth="1.5" />

              {/* Chart Path and Fill */}
              {path && (
                <>
                  {/* Fill Area */}
                  <path
                    d={`${path} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`}
                    fill="url(#chartGrad)"
                  />
                  {/* Draw main line */}
                  <path
                    d={path}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Hover Highlight Marker Line */}
              {hoverIndex !== null && points[hoverIndex] && (
                <line
                  x1={points[hoverIndex].x}
                  y1={padding}
                  x2={points[hoverIndex].x}
                  y2={height - padding}
                  stroke="rgba(99, 102, 241, 0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
              )}

              {/* Highlight Circle dots */}
              {points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={hoverIndex === idx ? 6 : idx === points.length - 1 ? 4 : 2.5}
                  onMouseEnter={() => setHoverIndex(idx)}
                  className={cn(
                    "cursor-pointer transition-all",
                    hoverIndex === idx
                      ? "fill-indigo-400 stroke-indigo-600 stroke-2"
                      : idx === points.length - 1
                      ? "fill-indigo-500 stroke-indigo-600 animate-pulse stroke-2"
                      : "fill-zinc-950 stroke-indigo-500 stroke-1 hover:fill-indigo-400"
                  )}
                />
              ))}

              {/* Interactive Transparent overlay boxes for touch-areas */}
              {points.map((p, idx) => {
                const xStart = idx === 0 ? padding : p.x - (points[idx].x - points[idx - 1].x) / 2;
                const xEnd = idx === points.length - 1 ? width - padding : p.x + (points[idx + 1].x - p.x) / 2;
                return (
                  <rect
                    key={idx}
                    x={xStart}
                    y={padding}
                    width={Math.max(1, xEnd - xStart)}
                    height={height - padding * 2}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoverIndex(idx)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="h-60 flex flex-col items-center justify-center text-xs text-zinc-600 gap-2">
            <LineChart className="h-8 w-8 opacity-40" />
            <span>No historical closed trade logs found.</span>
          </div>
        )}

        {/* Hover Popup details card */}
        {activeHoverData && (
          <div
            className="absolute bottom-4 left-4 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md shadow-2xl flex flex-col gap-1.5 text-left animate-slide-up"
            style={{ maxWidth: 280 }}
          >
            <div className="flex items-center justify-between gap-6 border-b border-zinc-900 pb-1.5">
              <span className="text-xs font-bold text-zinc-100 font-display">{activeHoverData.instrument}</span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{activeHoverData.date}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <span className="text-zinc-500 font-semibold uppercase tracking-wider">PnL ($):</span>
              <span className={cn("font-bold text-right", activeHoverData.pnl >= 0 ? "text-emerald-400" : "text-rose-500")}>
                {formatCurrency(activeHoverData.pnl, currencySymbol)}
              </span>
              <span className="text-zinc-500 font-semibold uppercase tracking-wider">ROI (%):</span>
              <span className={cn("font-bold text-right", activeHoverData.roi >= 0 ? "text-emerald-400" : "text-rose-500")}>
                {formatPercent(activeHoverData.roi)}
              </span>
              <span className="text-zinc-500 font-semibold uppercase tracking-wider">Strategy:</span>
              <span className="font-semibold text-zinc-300 text-right truncate">{activeHoverData.strategy}</span>
              <span className="text-zinc-500 font-semibold uppercase tracking-wider">Cum. Profit:</span>
              <span className={cn("font-extrabold text-right", activeHoverData.cumulativePnL >= 0 ? "text-emerald-400" : "text-rose-500")}>
                {formatCurrency(activeHoverData.cumulativePnL, currencySymbol)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
