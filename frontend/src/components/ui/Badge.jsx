import React from 'react';

/**
 * Standard Status Badge Component
 * Consistent pill shape, contrast, semantic color mappings
 */
export function Badge({
  status,
  variant,
  children,
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
  dot = true,
}) {
  const normalized = (status || '').toString().toUpperCase().trim();

  // Semantic color configurations
  const variantStyles = {
    // Green / Available / Paid / Completed / Active
    success: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25',
    AVAILABLE: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25',
    PAID: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25',
    COMPLETED: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25',
    SERVED: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25',
    ACTIVE: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/25',

    // Amber / Warning / In Progress / Occupied
    warning: 'bg-[#D97706]/10 text-[#92400E] border-[#D97706]/25',
    OCCUPIED: 'bg-[#D97706]/10 text-[#92400E] border-[#D97706]/25',
    PREPARING: 'bg-[#D97706]/10 text-[#92400E] border-[#D97706]/25',
    IN_PREPARATION: 'bg-[#D97706]/10 text-[#92400E] border-[#D97706]/25',
    PENDING: 'bg-amber-100/80 text-amber-800 border-amber-300',
    NEW: 'bg-amber-100/80 text-amber-800 border-amber-300',

    // Blue / Info / Ready / Billing / Out for Delivery
    info: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25',
    READY: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25',
    BILLING: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25',
    ACCEPTED: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25',
    DELIVERED: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25',

    // Red / Danger / Cancelled / Failed / Out of Service
    danger: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25',
    CANCELLED: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25',
    FAILED: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25',
    OUT_OF_SERVICE: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25',
    REFUNDED: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25',
    INACTIVE: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25',
    OUT_OF_STOCK: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25',
    LOW_STOCK: 'bg-[#D97706]/10 text-[#92400E] border-[#D97706]/25',

    // Dietary
    VEG: 'bg-emerald-50 text-[#16A34A] border-emerald-300',
    'NON-VEG': 'bg-rose-50 text-[#EF4444] border-rose-300',
    NON_VEG: 'bg-rose-50 text-[#EF4444] border-rose-300',
    JAIN: 'bg-amber-50 text-[#D97706] border-amber-300',
    EGG: 'bg-amber-50 text-amber-800 border-amber-300',

    // Neutral / Sandstone Gray / Reserved
    neutral: 'bg-[#FAF7F2] text-[#4B5563] border-[#E5D8C6]',
    RESERVED: 'bg-[#8B5CF6]/10 text-[#7C3AED] border-[#8B5CF6]/25',
    GUEST: 'bg-[#FAF7F2] text-[#4B5563] border-[#E5D8C6]',
    DINE_IN: 'bg-amber-50 text-[#92400E] border-amber-200',
    TAKEAWAY: 'bg-blue-50 text-[#2563EB] border-blue-200',
    DELIVERY: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const currentStyle =
    variantStyles[variant] ||
    variantStyles[normalized] ||
    'bg-[#FAF7F2] text-[#5B6470] border-[#E5D8C6]';

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-xs px-3 py-1 font-bold',
  };

  const dotColors = {
    success: 'bg-[#16A34A]',
    warning: 'bg-[#D97706]',
    info: 'bg-[#2563EB]',
    danger: 'bg-[#EF4444]',
    neutral: 'bg-[#8C7E72]',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold rounded-full border shadow-2xs tracking-wide
        ${sizeStyles[size] || sizeStyles.md}
        ${currentStyle}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            currentStyle.includes('text-[#16A34A]')
              ? 'bg-[#16A34A]'
              : currentStyle.includes('text-[#EF4444]')
              ? 'bg-[#EF4444]'
              : currentStyle.includes('text-[#2563EB]')
              ? 'bg-[#2563EB]'
              : currentStyle.includes('text-[#92400E]')
              ? 'bg-[#D97706]'
              : 'bg-[#8C7E72]'
          }`}
        />
      )}
      <span>{children || status}</span>
    </span>
  );
}

export default Badge;
