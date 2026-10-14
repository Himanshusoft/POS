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
    // Soft Sage & Deep Forest Green / Available / Paid / Completed / Active
    success: 'bg-[#E8F3ED] dark:bg-[#1B3629] text-[#2D6A4F] dark:text-[#4EBA87] border-[#B7DAC7] dark:border-[#2D5441]',
    AVAILABLE: 'bg-[#E8F3ED] dark:bg-[#1B3629] text-[#2D6A4F] dark:text-[#4EBA87] border-[#B7DAC7] dark:border-[#2D5441]',
    PAID: 'bg-[#E8F3ED] dark:bg-[#1B3629] text-[#2D6A4F] dark:text-[#4EBA87] border-[#B7DAC7] dark:border-[#2D5441]',
    COMPLETED: 'bg-[#E8F3ED] dark:bg-[#1B3629] text-[#2D6A4F] dark:text-[#4EBA87] border-[#B7DAC7] dark:border-[#2D5441]',
    SERVED: 'bg-[#E8F3ED] dark:bg-[#1B3629] text-[#2D6A4F] dark:text-[#4EBA87] border-[#B7DAC7] dark:border-[#2D5441]',
    ACTIVE: 'bg-[#E8F3ED] dark:bg-[#1B3629] text-[#2D6A4F] dark:text-[#4EBA87] border-[#B7DAC7] dark:border-[#2D5441]',

    // Warm Amber / In Progress / Occupied
    warning: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',
    OCCUPIED: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',
    PREPARING: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',
    IN_PREPARATION: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',
    PENDING: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',
    NEW: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',

    // Subtle Forest Tint / Info / Ready / Billing
    info: 'bg-[#EAF2F0] dark:bg-[#172D28] text-[#1E5248] dark:text-[#5FA596] border-[#BED9D3] dark:border-[#2A4B43]',
    READY: 'bg-[#E8F3ED] dark:bg-[#1B3629] text-[#173F36] dark:text-[#4EBA87] border-[#B7DAC7] dark:border-[#2D5441]',
    BILLING: 'bg-[#EAF2F0] dark:bg-[#172D28] text-[#1E5248] dark:text-[#5FA596] border-[#BED9D3] dark:border-[#2A4B43]',
    ACCEPTED: 'bg-[#EAF2F0] dark:bg-[#172D28] text-[#1E5248] dark:text-[#5FA596] border-[#BED9D3] dark:border-[#2A4B43]',
    DELIVERED: 'bg-[#E8F3ED] dark:bg-[#1B3629] text-[#2D6A4F] dark:text-[#4EBA87] border-[#B7DAC7] dark:border-[#2D5441]',

    // Muted Terracotta / Danger / Cancelled / Low Stock
    danger: 'bg-[#FDF0ED] dark:bg-[#361A1A] text-[#C53030] dark:text-[#F87171] border-[#F5C6BE] dark:border-[#572727]',
    CANCELLED: 'bg-[#FDF0ED] dark:bg-[#361A1A] text-[#C53030] dark:text-[#F87171] border-[#F5C6BE] dark:border-[#572727]',
    FAILED: 'bg-[#FDF0ED] dark:bg-[#361A1A] text-[#C53030] dark:text-[#F87171] border-[#F5C6BE] dark:border-[#572727]',
    OUT_OF_SERVICE: 'bg-[#FDF0ED] dark:bg-[#361A1A] text-[#C53030] dark:text-[#F87171] border-[#F5C6BE] dark:border-[#572727]',
    REFUNDED: 'bg-[#FDF0ED] dark:bg-[#361A1A] text-[#C53030] dark:text-[#F87171] border-[#F5C6BE] dark:border-[#572727]',
    INACTIVE: 'bg-[#FDF0ED] dark:bg-[#361A1A] text-[#C53030] dark:text-[#F87171] border-[#F5C6BE] dark:border-[#572727]',
    OUT_OF_STOCK: 'bg-[#FDF0ED] dark:bg-[#361A1A] text-[#C53030] dark:text-[#F87171] border-[#F5C6BE] dark:border-[#572727]',
    LOW_STOCK: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',

    // Dietary
    VEG: 'bg-[#E8F3ED] dark:bg-[#1B3629] text-[#2D6A4F] dark:text-[#4EBA87] border-[#B7DAC7] dark:border-[#2D5441]',
    'NON-VEG': 'bg-[#FDF0ED] dark:bg-[#361A1A] text-[#C53030] dark:text-[#F87171] border-[#F5C6BE] dark:border-[#572727]',
    NON_VEG: 'bg-[#FDF0ED] dark:bg-[#361A1A] text-[#C53030] dark:text-[#F87171] border-[#F5C6BE] dark:border-[#572727]',
    JAIN: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',
    EGG: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',

    // Neutral / Warm Linen
    neutral: 'bg-[#F4ECE1] dark:bg-[#1A2521] text-[#55635B] dark:text-[#A0ABA2] border-[#DDD3C5] dark:border-[#233630]',
    RESERVED: 'bg-[#EAF2F0] dark:bg-[#172D28] text-[#1E5248] dark:text-[#5FA596] border-[#BED9D3] dark:border-[#2A4B43]',
    GUEST: 'bg-[#F4ECE1] dark:bg-[#1A2521] text-[#55635B] dark:text-[#A0ABA2] border-[#DDD3C5] dark:border-[#233630]',
    DINE_IN: 'bg-[#E8EFEA] dark:bg-[#172D28] text-[#173F36] dark:text-[#5FA596] border-[#C8DDD2] dark:border-[#2A4B43]',
    TAKEAWAY: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',
    DELIVERY: 'bg-[#EAF2F0] dark:bg-[#172D28] text-[#1E5248] dark:text-[#5FA596] border-[#BED9D3] dark:border-[#2A4B43]',
  };

  const currentStyle =
    variantStyles[variant] ||
    variantStyles[normalized] ||
    'bg-[#F4ECE1] dark:bg-[#1A2521] text-[#55635B] dark:text-[#A0ABA2] border-[#DDD3C5] dark:border-[#233630]';

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-xs px-3 py-1 font-bold',
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
            currentStyle.includes('text-[#2D6A4F]') || currentStyle.includes('text-[#173F36]')
              ? 'bg-[#2D6A4F]'
              : currentStyle.includes('text-[#C53030]')
              ? 'bg-[#C53030]'
              : currentStyle.includes('text-[#1E5248]')
              ? 'bg-[#1E5248]'
              : currentStyle.includes('text-[#9A5B13]')
              ? 'bg-[#C07D37]'
              : 'bg-[#7A8C82]'
          }`}
        />
      )}
      <span>{children || status}</span>
    </span>
  );
}

export default Badge;
