import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="
        backdrop-blur-xl bg-white/[0.08] border border-white/15
        rounded-full px-6 py-3
        shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_40px_rgba(52,211,153,0.15)]
        flex items-center gap-3
      ">
        <span className="w-2 h-2 rounded-full bg-status-online shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        <span className="text-sm font-medium text-slate-200">{message}</span>
      </div>
    </div>
  );
};
