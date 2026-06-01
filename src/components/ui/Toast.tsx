import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { cn } from '../../utils/helpers';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />,
    info: <Info className="h-5 w-5 text-indigo-400 shrink-0 animate-pulse" />,
  };

  const borders = {
    success: 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    error: 'border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    info: 'border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]',
  };

  const bgColors = {
    success: 'bg-emerald-950/80',
    error: 'bg-rose-950/80',
    info: 'bg-indigo-950/80',
  };

  return (
    <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full animate-slide-in-right pointer-events-auto">
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md transition-all duration-300',
          borders[type],
          bgColors[type]
        )}
      >
        <div className="mt-0.5">{icons[type]}</div>
        <div className="flex-grow text-left">
          <h4 className="text-xs font-bold text-zinc-100 font-display uppercase tracking-wider">
            {type === 'success' ? 'Success' : type === 'error' ? 'Authentication Alert' : 'Notification'}
          </h4>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed font-sans font-medium">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors hover:bg-white/5 cursor-pointer shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
