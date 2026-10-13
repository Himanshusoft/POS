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
    'inline-flex items-center justify-center font-bold transition-all duration-150 cursor-pointer select-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] dark:focus-visible:ring-[#D97706] focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none touch-manipulation';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-xs sm:text-sm gap-2',
    lg: 'h-11 sm:h-12 px-5 text-sm gap-2.5',
    icon: 'h-10 w-10 p-0',
  };

  const variantStyles = {
    primary:
      'bg-[#92400E] hover:bg-[#78350F] active:bg-[#5F280A] text-white shadow-sandstone hover:shadow-sandstone-md focus:ring-[#92400E] dark:bg-[#B45309] dark:hover:bg-[#92400E] dark:active:bg-[#78350F]',
    secondary:
      'bg-[#FAF7F2] hover:bg-[#F1E8DB] active:bg-[#E5D8C6] text-[#1F2937] border border-[#E5D8C6] shadow-2xs hover:border-[#D9C3A5] focus:ring-[#92400E] dark:bg-[#201C18] dark:hover:bg-[#2A241F] dark:active:bg-[#342D26] dark:text-[#F7F3EC] dark:border-[#382F26] dark:hover:border-[#524436]',
    outline:
      'bg-transparent hover:bg-[#FAF7F2] text-[#1F2937] border border-[#E5D8C6] hover:border-[#92400E] focus:ring-[#92400E] dark:hover:bg-[#201C18] dark:text-[#F7F3EC] dark:border-[#382F26] dark:hover:border-[#D97706]',
    danger:
      'bg-[#EF4444] hover:bg-[#DC2626] active:bg-[#B91C1C] text-white shadow-sandstone focus:ring-[#EF4444]',
    success:
      'bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white shadow-sandstone focus:ring-[#16A34A]',
    ghost:
      'bg-transparent hover:bg-[#F1E8DB] text-[#5B6470] hover:text-[#1F2937] focus:ring-[#92400E] dark:hover:bg-[#26201B] dark:text-[#A89B8C] dark:hover:text-[#F7F3EC]',
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
      <span>{children}</span>
    </button>
  );
}

export default Button;
