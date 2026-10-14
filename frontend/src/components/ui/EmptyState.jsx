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
        flex flex-col items-center justify-center text-center bg-[#FFFDF9] dark:bg-[#14221E] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl shadow-editorial transition-colors duration-200
        ${compact ? 'p-6 sm:p-8' : 'p-8 sm:p-12'}
        ${className}
      `}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#E8EFEA] dark:bg-[#1A2B26] border border-[#173F36]/15 dark:border-[#233630] flex items-center justify-center text-[#173F36] dark:text-[#4EBA87] mb-3.5 shadow-2xs">
          <Icon className="w-7 h-7" />
        </div>
      )}

      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight">{title}</h3>

      {description && (
        <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-1.5 max-w-sm leading-relaxed">
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
