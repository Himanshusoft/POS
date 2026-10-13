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
        bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl shadow-sandstone transition-colors duration-200
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
      <div className={`flex items-start justify-between gap-3 pb-4 mb-4 border-b border-[#E5D8C6]/70 dark:border-[#382F26]/70 ${className}`}>
        <div>
          {title && <h3 className="heading-card text-[#1F2937] dark:text-[#F7F3EC]">{title}</h3>}
          {subtitle && <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }

  return <div className={`pb-4 mb-4 border-b border-[#E5D8C6]/70 dark:border-[#382F26]/70 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`pt-4 mt-4 border-t border-[#E5D8C6]/70 dark:border-[#382F26]/70 flex items-center justify-between text-xs text-[#5B6470] dark:text-[#A89B8C] ${className}`}>
      {children}
    </div>
  );
}

export default Card;
