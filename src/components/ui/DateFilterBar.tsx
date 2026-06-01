import React from 'react';
import { cn } from '../../utils/helpers';
import { Calendar } from 'lucide-react';

export type DateFilterType =
  | 'Today'
  | 'Yesterday'
  | 'Last 7 Days'
  | 'Last 30 Days'
  | 'This Month'
  | 'Last Month'
  | 'This Year'
  | 'All Time'
  | 'Custom';

interface DateFilterBarProps {
  activeFilter: DateFilterType;
  setActiveFilter: (filter: DateFilterType) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  className?: string;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  activeFilter,
  setActiveFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  className,
}) => {
  const presets: DateFilterType[] = [
    'Today',
    'Yesterday',
    'Last 7 Days',
    'Last 30 Days',
    'This Month',
    'Last Month',
    'This Year',
    'All Time',
    'Custom',
  ];

  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-zinc-950/40 border border-zinc-900 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between text-left",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-2 flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
          Time Period
        </span>
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setActiveFilter(p)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
              activeFilter === p
                ? "bg-indigo-500/10 border border-indigo-500/25 text-indigo-400"
                : "border border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {activeFilter === 'Custom' && (
        <div className="flex items-center gap-2.5 animate-slide-up w-full md:w-auto">
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Start Date</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 outline-none focus:border-indigo-500/50"
            />
          </div>
          <span className="text-zinc-600 text-xs mt-3">&mdash;</span>
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest pl-1">End Date</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>
      )}
    </div>
  );
};
