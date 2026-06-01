import React, { useEffect } from 'react';
import { Button } from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  // Prevent background scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm cursor-pointer transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl transition-all transform scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
          <h2 className="text-lg font-bold text-zinc-100 font-display">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="!p-1 h-7 w-7">
            <svg
              className="h-4.5 w-4.5 text-zinc-400 hover:text-zinc-100"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {/* Content body */}
        <div className="flex-1 px-5 py-4 overflow-y-auto scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
