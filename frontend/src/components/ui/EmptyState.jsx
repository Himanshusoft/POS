import React from 'react';
import { Button } from './Button';

/**
 * Standard Empty State Component
 * Features:
 * - Subtle circular/curated icon container
 * - Clear title & supportive subtitle
 * - Optional CTA button
 * - Proper theme awareness in Light and Dark mode
 */
export function EmptyState({
  icon: Icon,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  actionLabel,
  onAction,
  actionIcon,
  className = '',
  compact = false,
}) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl transition-colors duration-200
        ${compact ? 'p-6 sm:p-8' : 'p-8 sm:p-12'}
        ${className}
      `}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] dark:bg-[#201C18] border border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-center text-[#92400E] dark:text-[#D97706] mb-3.5 shadow-2xs">
          <Icon className="w-7 h-7" />
        </div>
      )}

      <h3 className="heading-card text-[#1F2937] dark:text-[#F7F3EC] tracking-tight">{title}</h3>

      {description && (
        <p className="text-xs sm:text-sm text-[#5B6470] dark:text-[#A89B8C] mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} icon={actionIcon} size="md">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
