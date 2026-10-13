import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Standardized KPI / Stat Card
 * Features:
 * - Icon container in subtle soft background
 * - Label / Title
 * - Prominent bold KPI value (24–28px)
 * - Optional Trend or subtitle comparison
 * - Interactive hover with -2px translateY and smooth sandstone shadow
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-[#92400E] dark:text-[#D97706]',
  iconBg = 'bg-[#FAF7F2] dark:bg-[#221E1A] border border-[#E5D8C6] dark:border-[#382F26]',
  trend, // e.g. { value: '+12%', isPositive: true, label: 'vs yesterday' }
  className = '',
  onClick,
  badge,
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
          : undefined
      }
      className={`
        group bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-5 shadow-sandstone
        card-hover flex flex-col justify-between transition-all duration-200
        hover:border-[#92400E]/30 dark:hover:border-[#D97706]/40
        ${onClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] dark:focus-visible:ring-[#D97706] select-none' : ''}
        ${className}
      `}
    >
      {/* Top Header: Icon + Title + optional badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${iconBg} ${iconColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <span className="text-xs sm:text-sm font-semibold text-[#5B6470] dark:text-[#A89B8C] truncate tracking-wide">
            {title}
          </span>
        </div>
        {badge && <div>{badge}</div>}
      </div>

      {/* Main KPI Value */}
      <div className="my-1">
        <div className="kpi-value text-[#1F2937] dark:text-[#F7F3EC] tracking-tight tabular-nums font-mono">{value}</div>
      </div>

      {/* Subtitle or Trend Comparison */}
      {(trend || subtitle) && (
        <div className="mt-2.5 pt-2.5 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 flex items-center justify-between text-xs text-[#5B6470] dark:text-[#A89B8C]">
          {trend ? (
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={`inline-flex items-center gap-0.5 font-bold ${
                  trend.isPositive ? 'text-[#16A34A] dark:text-[#34D399]' : 'text-[#EF4444] dark:text-[#F87171]'
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {trend.value}
              </span>
              {trend.label && <span className="text-[#8C7E72] dark:text-[#998C7F]">{trend.label}</span>}
            </div>
          ) : (
            <span className="text-[#8C7E72] dark:text-[#998C7F] truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default StatCard;
