import React from 'react';

/**
 * Standard Sandstone Card Component
 * Follows exact design requirements:
 * - Padding: 16px–24px (p-5 sm:p-6)
 * - Border radius: 16px–20px (rounded-2xl)
 * - 1px solid border (#E5D8C6 / #382F26)
 * - Subtle shadow + smooth hover elevation (-2px) when interactive
 */
export function Card({
  children,
  className = '',
  interactive = false,
  accent = false,
  padding = 'p-5 sm:p-6',
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#FFFDF9] dark:bg-[#14221E] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl shadow-editorial transition-all duration-200
        ${padding}
        ${interactive ? (accent ? 'card-hover-accent cursor-pointer' : 'card-hover cursor-pointer') : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', title, subtitle, action }) {
  if (title || subtitle || action) {
    return (
      <div className={`flex items-start justify-between gap-3 pb-3.5 mb-4 border-b border-[#E4DCD0]/80 dark:border-[#233630]/80 ${className}`}>
        <div>
          {title && <h3 className="font-serif text-base sm:text-lg font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }

  return <div className={`pb-3.5 mb-4 border-b border-[#E4DCD0]/80 dark:border-[#233630]/80 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`pt-3.5 mt-4 border-t border-[#E4DCD0]/80 dark:border-[#233630]/80 flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E] ${className}`}>
      {children}
    </div>
  );
}

export default Card;
