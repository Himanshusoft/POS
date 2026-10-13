import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Toast() {
  const { toasts, removeToast } = useAuth();

  if (!toasts || toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0" />,
    info: <Info className="w-5 h-5 text-[#2563EB] shrink-0" />,
  };

  const borderStyles = {
    success: 'border-l-4 border-l-[#16A34A]',
    error: 'border-l-4 border-l-[#EF4444]',
    warning: 'border-l-4 border-l-[#D97706]',
    info: 'border-l-4 border-l-[#2563EB]',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] shadow-lg text-[#1F2937] dark:text-[#F7F3EC] pointer-events-auto transition-all duration-200 animate-slide-in ${
            borderStyles[toast.type] || borderStyles.info
          }`}
        >
          {icons[toast.type] || icons.info}
          <div className="flex-1 text-sm font-medium leading-snug">{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] transition-colors p-0.5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
