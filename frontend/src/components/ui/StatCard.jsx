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
  iconColor = 'text-[#173F36] dark:text-[#E4EFE9]',
  iconBg = 'bg-[#E8EFEA] dark:bg-[#1A2B26] border border-[#173F36]/15 dark:border-[#233630]',
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
        group bg-[#FFFDF9] dark:bg-[#14221E] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl p-5 shadow-editorial
        card-hover flex flex-col justify-between transition-all duration-200
        hover:border-[#173F36]/30 dark:hover:border-[#4EBA87]/40
        ${onClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] dark:focus-visible:ring-[#4EBA87] select-none' : ''}
        ${className}
      `}
    >
      {/* Top Header: Icon + Title + optional badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${iconBg} ${iconColor}`}
            >
              <Icon className="w-4.5 h-4.5" />
            </div>
          )}
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#657168] dark:text-[#9FB29E] truncate">
            {title}
          </span>
        </div>
        {badge && <div>{badge}</div>}
      </div>

      {/* Main KPI Value */}
      <div className="my-1">
        <div className="kpi-value text-[#173F36] dark:text-[#F7EFE4] tracking-tight tabular-nums font-mono text-2xl sm:text-3xl font-extrabold">{value}</div>
      </div>

      {/* Subtitle or Trend Comparison */}
      {(trend || subtitle) && (
        <div className="mt-2.5 pt-2.5 border-t border-[#E4DCD0]/70 dark:border-[#233630]/70 flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E]">
          {trend ? (
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={`inline-flex items-center gap-0.5 font-bold ${
                  trend.isPositive ? 'text-[#2D6A4F] dark:text-[#4EBA87]' : 'text-[#C53030] dark:text-[#F87171]'
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {trend.value}
              </span>
              {trend.label && <span className="text-[#8D9890] dark:text-[#7A8C82]">{trend.label}</span>}
            </div>
          ) : (
            <span className="text-[#8D9890] dark:text-[#7A8C82] truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default StatCard;
