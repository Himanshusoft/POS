import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Toast() {
  const { toasts, removeToast } = useAuth();

  if (!toasts || toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#2D6A4F] shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[#C53030] shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#C07D37] shrink-0" />,
    info: <Info className="w-5 h-5 text-[#173F36] shrink-0" />,
  };

  const borderStyles = {
    success: 'border-l-4 border-l-[#2D6A4F]',
    error: 'border-l-4 border-l-[#C53030]',
    warning: 'border-l-4 border-l-[#C07D37]',
    info: 'border-l-4 border-l-[#173F36]',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-xl bg-[#FFFDF9] dark:bg-[#14221E] border border-[#E4DCD0] dark:border-[#233630] shadow-editorial-md text-[#17251F] dark:text-[#F7EFE4] pointer-events-auto transition-all duration-200 animate-slide-in ${
            borderStyles[toast.type] || borderStyles.info
          }`}
        >
          {icons[toast.type] || icons.info}
          <div className="flex-1 text-xs sm:text-sm font-medium leading-snug">{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] transition-colors p-0.5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
