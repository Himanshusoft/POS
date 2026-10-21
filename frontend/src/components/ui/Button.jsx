import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Standard Sandstone Button Component
 * Follows exact design requirements:
 * - Heights: sm (h-8), md (h-10), lg (h-12)
 * - Rounded-xl border-radius
 * - Consistent hover, active, and disabled micro-interactions
 * - Warm terracotta/burnt-orange primary action language
 */
export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-bold tracking-wide transition-all duration-150 cursor-pointer select-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] dark:focus-visible:ring-[#4EBA87] focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none touch-manipulation whitespace-nowrap';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-xs sm:text-sm gap-2',
    lg: 'h-11 sm:h-12 px-5 text-sm gap-2.5',
    icon: 'h-10 w-10 p-0',
  };

  const variantStyles = {
    primary:
      'bg-[#173F36] hover:bg-[#12332C] active:bg-[#0E2621] text-[#FFFDF9] shadow-sandstone hover:shadow-editorial-md hover:-translate-y-0.5 focus:ring-[#173F36] dark:bg-[#235A4D] dark:hover:bg-[#1B463D] dark:active:bg-[#153831] dark:text-[#F7EFE4]',
    secondary:
      'bg-[#FFFDF9] hover:bg-[#F4ECE0] active:bg-[#EFE6D8] text-[#173F36] border border-[#173F36]/20 shadow-2xs hover:border-[#173F36]/40 hover:-translate-y-0.5 focus:ring-[#173F36] dark:bg-[#14221E] dark:hover:bg-[#1A2B26] dark:active:bg-[#20332D] dark:text-[#E4EFE9] dark:border-[#233630] dark:hover:border-[#3B574E]',
    outline:
      'bg-transparent hover:bg-[#F7EFE4] text-[#173F36] border border-[#173F36]/25 hover:border-[#173F36] focus:ring-[#173F36] dark:hover:bg-[#14221E] dark:text-[#E4EFE9] dark:border-[#233630] dark:hover:border-[#4EBA87]',
    danger:
      'bg-[#C53030] hover:bg-[#A82626] active:bg-[#8C1F1F] text-white shadow-sandstone hover:-translate-y-0.5 focus:ring-[#C53030]',
    success:
      'bg-[#2D6A4F] hover:bg-[#23543E] active:bg-[#1B4231] text-white shadow-sandstone hover:-translate-y-0.5 focus:ring-[#2D6A4F]',
    ghost:
      'bg-transparent hover:bg-[#F3ECE0] text-[#173F36] hover:text-[#12332C] focus:ring-[#173F36] dark:hover:bg-[#1A2B26] dark:text-[#9FB29E] dark:hover:text-[#F7EFE4]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${sizeStyles[size] || sizeStyles.md}
        ${variantStyles[variant] || variantStyles.primary}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">{children}</span>
    </button>
  );
}

export default Button;
