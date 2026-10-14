import React from 'react';

/**
 * Standard Skeleton Loading Components
 * Features:
 * - Subtle shimmer gradient
 * - Zero Layout Shift (CLS)
 * - Flexible row, card, and table variations
 */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`skeleton-shimmer rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow({ cols = 5, className = '' }) {
  return (
    <tr className={`border-b border-[#E4DCD0]/60 ${className}`} aria-hidden="true">
      {Array.from({ length: cols }).map((_, idx) => (
        <td key={idx} className="px-5 py-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 5, className = '' }) {
  return (
    <tbody className={`divide-y divide-[#E4DCD0]/60 ${className}`}>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <SkeletonRow key={rIdx} cols={cols} />
      ))}
    </tbody>
  );
}

export default Skeleton;
