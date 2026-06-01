import React from 'react';
import { cn } from '../../utils/helpers';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: string | React.ReactNode;
  subtitle?: string;
  headerAction?: React.ReactNode;
  hoverGlow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  headerAction,
  hoverGlow = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'glass-panel rounded-xl p-5 shadow-2xl transition-all duration-300 relative overflow-hidden',
        hoverGlow && 'glass-panel-hover',
        className
      )}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between gap-4 mb-4 border-b border-zinc-800/60 pb-3">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-zinc-100 font-display flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      )}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
