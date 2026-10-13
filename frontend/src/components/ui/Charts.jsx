import React, { useState, useRef } from 'react';

/**
 * Standard Dashboard Card Container for Charts & Visualizations
 */
export function ChartCard({
  title,
  subtitle,
  badge,
  action,
  children,
  className = '',
  empty = false,
  emptyMessage = 'No analytical data available yet',
}) {
  return (
    <div
      className={`
        bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-5 sm:p-6
        shadow-sandstone card-hover flex flex-col justify-between transition-all duration-200
        hover:border-[#92400E]/30 dark:hover:border-[#D97706]/40
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 mb-4 border-b border-[#E5D8C6]/50 dark:border-[#382F26]/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-[#1F2937] dark:text-[#F7F3EC] tracking-tight">
              {title}
            </h3>
            {badge && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#92400E]/10 dark:bg-[#92400E]/20 text-[#92400E] dark:text-[#D97706] border border-[#92400E]/20 dark:border-[#92400E]/40">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="self-end sm:self-auto">{action}</div>}
      </div>

      {/* Body */}
      <div className="flex-1 w-full min-w-0">
        {empty ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] font-medium max-w-xs">
              {emptyMessage}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * Premium SVG Smooth Area Chart with Gradient, Crosshair & Tooltip
 */
export function AreaChart({
  data = [], // [{ label: string, value: number, secondaryValue?: number }]
  color = '#92400E',
  gradientColor,
  height = 200,
  currency = '',
  formatValue,
  valueLabel = '',
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const containerRef = useRef(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-center text-xs text-[#5B6470] dark:text-[#A89B8C]">
        No trend data recorded for this period
      </div>
    );
  }

  const gradColor = gradientColor || color;
  const gradId = `area-grad-${Math.random().toString(36).substr(2, 9)}`;

  const width = 600;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 35;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;

  const rawValues = data.map((d) => Number(d.value) || 0);
  const maxVal = Math.max(...rawValues, 10);
  const minVal = 0;
  const valRange = maxVal - minVal || 1;

  // Calculate coordinates
  const points = data.map((item, idx) => {
    const x = paddingX + (idx / Math.max(data.length - 1, 1)) * chartWidth;
    const norm = (Number(item.value || 0) - minVal) / valRange;
    const y = paddingTop + chartHeight - norm * chartHeight;
    return { x, y, ...item };
  });

  // Construct smooth bezier spline path
  let linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }

  const areaBottom = paddingTop + chartHeight;
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${areaBottom} L ${points[0].x.toFixed(1)} ${areaBottom} Z`;

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const closestIdx = Math.round(ratio * (data.length - 1));
    setHoveredIdx(closestIdx);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradColor} stopOpacity="0.32" />
            <stop offset="60%" stopColor={gradColor} stopOpacity="0.10" />
            <stop offset="100%" stopColor={gradColor} stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((ratio, i) => {
          const y = paddingTop + chartHeight * (1 - ratio);
          const gridVal = Math.round(minVal + ratio * valRange);
          return (
            <g key={i}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                strokeDasharray="4 4"
                className="text-[#E5D8C6]/60 dark:text-[#382F26]/70"
                strokeWidth="1"
              />
              <text
                x={paddingX - 8}
                y={y + 3.5}
                textAnchor="end"
                className="text-[9.5px] fill-[#8C7E72] dark:fill-[#998C7F] font-mono"
              >
                {currency}
                {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal}
              </text>
            </g>
          );
        })}

        {/* Gradient fill area */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Main curve line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bottom X-axis labels */}
        {points.map((pt, idx) => {
          // If many items, only show every few labels
          const step = Math.ceil(points.length / 7);
          if (idx % step !== 0 && idx !== points.length - 1) return null;
          return (
            <text
              key={idx}
              x={pt.x}
              y={height - 10}
              textAnchor="middle"
              className="text-[10px] fill-[#8C7E72] dark:fill-[#998C7F] font-medium"
            >
              {pt.label}
            </text>
          );
        })}

        {/* Active hovered indicator */}
        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={areaBottom}
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.75"
            />
            {/* Halo */}
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="7"
              fill={color}
              opacity="0.2"
            />
            {/* Dot */}
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="4.5"
              fill="#FFFFFF"
              stroke={color}
              strokeWidth="2.5"
            />
          </g>
        )}
      </svg>

      {/* Floating Tooltip */}
      {activePoint && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] px-3 py-1.5 rounded-xl shadow-sandstone-md text-xs z-20 min-w-[100px] text-center"
          style={{
            left: `${(activePoint.x / width) * 100}%`,
            top: `${(activePoint.y / height) * 100}%`,
            marginTop: '-10px',
          }}
        >
          <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-semibold block uppercase tracking-wider">
            {activePoint.label}
          </span>
          <span className="font-mono font-bold text-[#1F2937] dark:text-[#F7F3EC] text-sm tabular-nums block">
            {formatValue ? formatValue(activePoint.value) : `${currency}${Number(activePoint.value).toLocaleString()}`}
            {valueLabel ? ` ${valueLabel}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Professional Combo Bar + Line Chart (Revenue Velocity & Order Trends)
 * Features:
 * - Revenue rendered as stylish rounded vertical bars
 * - Order volume rendered as smooth bezier curve with data points
 * - Dual coordinated axes (Currency Y-axis left, Count Y-axis right)
 * - Metric toggle (Combo / Revenue / Orders)
 * - Interactive crosshair & floating sandstone tooltip
 * - Responsive SVG layout filling 100% of card width with balanced height
 */
export function ComboChart({
  data = [], // [{ label: string, revenue?: number, orders?: number, value?: number }]
  currency = '₹',
  height = 220,
  barColor = '#92400E',
  lineColor = '#2563EB',
  revenueLabel = 'Revenue',
  ordersLabel = 'Orders',
  emptyMessage = 'No revenue velocity recorded yet',
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [activeMetric, setActiveMetric] = useState('combo'); // 'combo' | 'revenue' | 'orders'
  const containerRef = useRef(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-52 flex flex-col items-center justify-center text-center p-4">
        <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] font-medium max-w-xs">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const width = 720;
  const paddingLeft = 60;
  const paddingRight = 45;
  const paddingTop = 24;
  const paddingBottom = 38;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;

  const rawRevenues = data.map((d) => Number(d.revenue ?? d.value ?? 0));
  const rawOrders = data.map((d) => Number(d.orders ?? 0));

  const maxRevenue = Math.max(...rawRevenues, 100);
  const maxOrders = Math.max(...rawOrders, 5);

  const slotWidth = chartWidth / data.length;
  const barWidth = Math.min(44, Math.max(16, slotWidth * 0.52));

  // Coordinates
  const points = data.map((item, idx) => {
    const rev = Number(item.revenue ?? item.value ?? 0);
    const ord = Number(item.orders ?? 0);
    const x = paddingLeft + idx * slotWidth + slotWidth / 2;
    const revNorm = Math.min(1, Math.max(0, rev / maxRevenue));
    const ordNorm = Math.min(1, Math.max(0, ord / maxOrders));
    const barY = paddingTop + chartHeight - revNorm * chartHeight;
    const barH = Math.max(4, revNorm * chartHeight);
    const lineY = paddingTop + chartHeight - ordNorm * chartHeight;

    return {
      x,
      barX: x - barWidth / 2,
      barY,
      barH,
      lineY,
      rev,
      ord,
      label: item.label,
      idx,
    };
  });

  // Bezier path for orders line
  let linePath = '';
  let lineAreaPath = '';
  if (points.length === 1) {
    linePath = `M ${points[0].x - 24} ${points[0].lineY} L ${points[0].x + 24} ${points[0].lineY}`;
  } else if (points.length > 1) {
    linePath = `M ${points[0].x.toFixed(1)} ${points[0].lineY.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.lineY;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.lineY;
      linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.lineY.toFixed(1)}`;
    }
    const areaBottom = paddingTop + chartHeight;
    lineAreaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${areaBottom} L ${points[0].x.toFixed(1)} ${areaBottom} Z`;
  }

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {/* Chart Top Controls & Legends */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
        {/* Legends */}
        <div className="flex items-center gap-4 text-xs">
          {(activeMetric === 'combo' || activeMetric === 'revenue') && (
            <div className="flex items-center gap-1.5 font-medium text-[#1F2937] dark:text-[#F7F3EC]">
              <span className="w-3 h-3 rounded-sm bg-[#92400E] shadow-2xs shrink-0" />
              <span className="text-[11px] font-bold text-[#8C7E72] dark:text-[#A89B8C] uppercase tracking-wider">{revenueLabel}</span>
              <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C]">(Bars)</span>
            </div>
          )}
          {(activeMetric === 'combo' || activeMetric === 'orders') && (
            <div className="flex items-center gap-1.5 font-medium text-[#1F2937] dark:text-[#F7F3EC]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] ring-2 ring-[#2563EB]/20 shrink-0" />
              <span className="text-[11px] font-bold text-[#8C7E72] dark:text-[#A89B8C] uppercase tracking-wider">{ordersLabel}</span>
              <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C]">(Line)</span>
            </div>
          )}
        </div>

        {/* View Toggle */}
        <div className="inline-flex items-center p-0.5 rounded-xl bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveMetric('combo')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeMetric === 'combo'
                ? 'bg-white dark:bg-[#1C1815] text-[#92400E] dark:text-[#D97706] shadow-xs'
                : 'text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC]'
            }`}
          >
            Combo
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('revenue')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeMetric === 'revenue'
                ? 'bg-white dark:bg-[#1C1815] text-[#92400E] dark:text-[#D97706] shadow-xs'
                : 'text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC]'
            }`}
          >
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('orders')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              activeMetric === 'orders'
                ? 'bg-white dark:bg-[#1C1815] text-[#2563EB] dark:text-blue-400 shadow-xs'
                : 'text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC]'
            }`}
          >
            Orders
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          style={{ maxHeight: height }}
        >
          <defs>
            <linearGradient id="combo-bar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B45309" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#78350F" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="combo-bar-grad-hover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
              <stop offset="100%" stopColor="#92400E" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="combo-line-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Left Y-Axis (Revenue) */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const gridVal = Math.round(ratio * maxRevenue);
            const orderVal = Math.round(ratio * maxOrders);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="text-[#E5D8C6]/50 dark:text-[#382F26]/60"
                  strokeWidth="1"
                />
                {/* Left Axis: Revenue */}
                {(activeMetric === 'combo' || activeMetric === 'revenue') && (
                  <text
                    x={paddingLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[9.5px] fill-[#8C7E72] dark:fill-[#998C7F] font-mono font-medium"
                  >
                    {currency}
                    {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal}
                  </text>
                )}
                {/* Right Axis: Orders */}
                {(activeMetric === 'combo' || activeMetric === 'orders') && (
                  <text
                    x={width - paddingRight + 8}
                    y={y + 3.5}
                    textAnchor="start"
                    className="text-[9.5px] fill-[#2563EB] dark:fill-blue-400 font-mono font-bold"
                  >
                    {orderVal}
                  </text>
                )}
              </g>
            );
          })}

          {/* Vertical Columns / Hover Hitboxes & Bars */}
          {points.map((pt) => {
            const isHovered = hoveredIdx === pt.idx;
            const slotX = paddingLeft + pt.idx * slotWidth;

            return (
              <g key={pt.idx} className="cursor-pointer">
                {/* Invisible hover hitbox covering entire slot height */}
                <rect
                  x={slotX}
                  y={paddingTop}
                  width={slotWidth}
                  height={chartHeight + paddingBottom}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(pt.idx)}
                />

                {/* Vertical Column Highlight when hovered */}
                {isHovered && (
                  <rect
                    x={slotX + 4}
                    y={paddingTop}
                    width={slotWidth - 8}
                    height={chartHeight}
                    fill="currentColor"
                    className="text-[#92400E]/5 dark:text-[#D97706]/10"
                    rx="6"
                  />
                )}

                {/* Revenue Bar */}
                {(activeMetric === 'combo' || activeMetric === 'revenue') && (
                  <rect
                    x={pt.barX}
                    y={pt.barY}
                    width={barWidth}
                    height={pt.barH}
                    rx="5"
                    ry="5"
                    fill={isHovered ? 'url(#combo-bar-grad-hover)' : 'url(#combo-bar-grad)'}
                    className="transition-all duration-150"
                  />
                )}

                {/* X-axis date label */}
                <text
                  x={pt.x}
                  y={height - 12}
                  textAnchor="middle"
                  className={`text-[10px] transition-colors ${
                    isHovered
                      ? 'fill-[#1F2937] dark:fill-[#F7F3EC] font-bold'
                      : 'fill-[#8C7E72] dark:fill-[#998C7F] font-medium'
                  }`}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}

          {/* Orders Smooth Line Overlay */}
          {(activeMetric === 'combo' || activeMetric === 'orders') && linePath && (
            <g className="pointer-events-none">
              {lineAreaPath && (
                <path
                  d={lineAreaPath}
                  fill="url(#combo-line-glow)"
                />
              )}
              <path
                d={linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((pt) => {
                const isHovered = hoveredIdx === pt.idx;
                return (
                  <g key={pt.idx}>
                    {isHovered && (
                      <circle
                        cx={pt.x}
                        cy={pt.lineY}
                        r="8"
                        fill={lineColor}
                        opacity="0.2"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.lineY}
                      r={isHovered ? '5' : '3.5'}
                      fill="#FFFFFF"
                      stroke={lineColor}
                      strokeWidth="2.5"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Active Hover Crosshair Line */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={paddingTop + chartHeight}
              stroke="currentColor"
              strokeDasharray="3 3"
              strokeWidth="1.5"
              className="text-[#92400E]/40 dark:text-[#D97706]/40 pointer-events-none"
            />
          )}
        </svg>

        {/* Floating Enterprise Tooltip */}
        {activePoint && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] px-3.5 py-2.5 rounded-xl shadow-sandstone-lg text-xs z-30 min-w-[140px]"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${Math.min(activePoint.barY, activePoint.lineY) * (100 / height)}%`,
              marginTop: '-12px',
            }}
          >
            <div className="text-[10.5px] font-bold text-[#8C7E72] dark:text-[#A89B8C] uppercase tracking-wider pb-1.5 border-b border-[#E5D8C6]/50 dark:border-[#382F26]/50">
              {activePoint.label}
            </div>
            <div className="pt-1.5 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[#5B6470] dark:text-[#A89B8C]">
                  <span className="w-2 h-2 rounded-xs bg-[#92400E]" />
                  <span>Revenue:</span>
                </span>
                <span className="font-mono font-bold text-[#1F2937] dark:text-[#F7F3EC] tabular-nums">
                  {currency}{activePoint.rev.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[#5B6470] dark:text-[#A89B8C]">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                  <span>Orders:</span>
                </span>
                <span className="font-mono font-bold text-[#2563EB] dark:text-blue-400 tabular-nums">
                  {activePoint.ord}
                </span>
              </div>
              {activePoint.ord > 0 && (
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#E5D8C6]/40 dark:border-[#382F26]/40 text-[10px] text-[#8C7E72]">
                  <span>Avg Order Value:</span>
                  <span className="font-mono font-semibold">
                    {currency}{Math.round(activePoint.rev / activePoint.ord).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Premium SVG Smooth Line Chart (e.g. Order Trends, Platform Growth)
 */
export function LineChart({
  data = [], // [{ label: string, value: number }]
  color = '#2563EB',
  height = 200,
  currency = '',
  formatValue,
  valueLabel = '',
}) {
  return (
    <AreaChart
      data={data}
      color={color}
      gradientColor={color}
      height={height}
      currency={currency}
      formatValue={formatValue}
      valueLabel={valueLabel}
    />
  );
}

/**
 * Premium SVG Vertical Column / Bar Chart (e.g. Kitchen Workload, Preparation Trends)
 */
export function VerticalBarChart({
  data = [], // [{ label: string, value: number, color?: string, sublabel?: string }]
  height = 200,
  color = '#92400E',
  currency = '',
  valueLabel = '',
  formatValue,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-center text-xs text-[#5B6470] dark:text-[#A89B8C]">
        No comparative metrics recorded for this period
      </div>
    );
  }

  const width = 600;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 35;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingX * 2;

  const rawValues = data.map((d) => Number(d.value) || 0);
  const maxVal = Math.max(...rawValues, 5);
  const valRange = maxVal || 1;

  const barWidth = Math.min(38, Math.max(16, (chartWidth / data.length) * 0.55));
  const spacing = chartWidth / data.length;

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
      >
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((ratio, i) => {
          const y = paddingTop + chartHeight * (1 - ratio);
          const gridVal = Math.round(ratio * maxVal);
          return (
            <g key={i}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                strokeDasharray="4 4"
                className="text-[#E5D8C6]/60 dark:text-[#382F26]/70"
                strokeWidth="1"
              />
              <text
                x={paddingX - 8}
                y={y + 3.5}
                textAnchor="end"
                className="text-[9.5px] fill-[#8C7E72] dark:fill-[#998C7F] font-mono"
              >
                {currency}
                {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const val = Number(item.value) || 0;
          const barHeight = Math.max(3, (val / valRange) * chartHeight);
          const x = paddingX + idx * spacing + (spacing - barWidth) / 2;
          const y = paddingTop + chartHeight - barHeight;
          const barColor = item.color || color;
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={idx}
              className="cursor-pointer transition-opacity duration-150"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                ry="4"
                fill={barColor}
                opacity={isHovered ? 1 : 0.88}
                className="transition-all duration-200"
              />
              {/* Category label */}
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                className={`text-[10px] font-medium transition-colors ${
                  isHovered
                    ? 'fill-[#1F2937] dark:fill-[#F7F3EC] font-bold'
                    : 'fill-[#8C7E72] dark:fill-[#998C7F]'
                }`}
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] px-3 py-1.5 rounded-xl shadow-sandstone-md text-xs z-20 min-w-[90px] text-center"
          style={{
            left: `${
              ((paddingX + hoveredIdx * spacing + spacing / 2) / width) * 100
            }%`,
            top: `${
              ((paddingTop +
                chartHeight -
                (Number(data[hoveredIdx].value || 0) / valRange) * chartHeight) /
                height) *
              100
            }%`,
            marginTop: '-8px',
          }}
        >
          <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-semibold block uppercase">
            {data[hoveredIdx].label}
          </span>
          <span className="font-mono font-bold text-[#1F2937] dark:text-[#F7F3EC] text-sm tabular-nums block">
            {formatValue
              ? formatValue(data[hoveredIdx].value)
              : `${currency}${Number(data[hoveredIdx].value).toLocaleString()}`}
            {valueLabel ? ` ${valueLabel}` : ''}
          </span>
          {data[hoveredIdx].sublabel && (
            <span className="text-[9.5px] text-[#8C7E72] font-mono block mt-0.5">
              {data[hoveredIdx].sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Circular Radial Gauge Chart (e.g. Table occupancy % or quota usage)
 */
export function RadialGauge({
  value = 0,
  total = 100,
  label = 'Occupancy',
  sublabel = '',
  size = 140,
  strokeWidth = 14,
  color = '#92400E',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, total > 0 ? Math.round((value / total) * 100) : 0));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-[#FAF7F2] dark:text-[#25201A]"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-black text-[#1F2937] dark:text-[#F7F3EC] font-mono tabular-nums leading-none">
            {percentage}%
          </span>
          <span className="text-[10px] font-bold text-[#5B6470] dark:text-[#A89B8C] uppercase tracking-wider mt-1">
            {label}
          </span>
        </div>
      </div>

      {sublabel && (
        <span className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-2 font-medium">
          {sublabel}
        </span>
      )}
    </div>
  );
}

/**
 * Segmented Dining Floor Occupancy Visualizer
/**
 * Professional Dining Floor Occupancy Visualizer
 * Features:
 * - Compact SVG Ring Gauge showing Occupancy Percentage with center label
 * - Side-by-side aligned status cards (Available, Occupied, Reserved) with table & seat counts
 * - Dining Tables Telemetry compact chip grid with status color coding
 * - Strict Sandstone theme tokens
 */
export function DiningFloorOccupancyVisualizer({
  stats = {
    total: 0,
    occupied: 0,
    available: 0,
    reserved: 0,
    occupancyRate: 0,
    totalSeats: 0,
    occupiedSeats: 0,
    availableSeats: 0,
  },
  tables = [],
}) {
  const {
    total = 0,
    occupied = 0,
    available = 0,
    reserved = 0,
    occupancyRate = 0,
    totalSeats = 0,
    occupiedSeats = 0,
    availableSeats = 0,
  } = stats;

  const reservedSeats = Math.max(0, totalSeats - occupiedSeats - availableSeats);

  // SVG Ring Gauge parameters
  const size = 120;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const occupiedPct = total > 0 ? (occupied / total) * 100 : 0;
  const reservedPct = total > 0 ? (reserved / total) * 100 : 0;
  const availablePct = total > 0 ? (available / total) * 100 : 100;

  const occupiedDash = (occupiedPct / 100) * circumference;
  const reservedDash = (reservedPct / 100) * circumference;
  const availableDash = (availablePct / 100) * circumference;

  return (
    <div className="w-full flex flex-col justify-between h-full space-y-4">
      {/* Top Section: Ring Gauge + Status Cards */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Ring Gauge */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 origin-center">
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-[#FAF7F2] dark:text-[#25201A]"
            />
            {/* Available segment */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#16A34A"
              strokeWidth={strokeWidth}
              strokeDasharray={`${availableDash} ${circumference}`}
              strokeDashoffset={0}
              className="transition-all duration-500 opacity-20"
            />
            {/* Reserved segment */}
            {reserved > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#2563EB"
                strokeWidth={strokeWidth}
                strokeDasharray={`${reservedDash} ${circumference}`}
                strokeDashoffset={-occupiedDash}
                className="transition-all duration-500"
              />
            )}
            {/* Occupied segment */}
            {occupied > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#92400E"
                strokeWidth={strokeWidth}
                strokeDasharray={`${occupiedDash} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}
          </svg>

          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-xl font-black font-mono text-[#1F2937] dark:text-[#F7F3EC] tabular-nums leading-none">
              {occupancyRate}%
            </span>
            <span className="text-[9.5px] font-bold text-[#8C7E72] dark:text-[#998C7F] uppercase tracking-wider mt-0.5">
              Occupied
            </span>
          </div>
        </div>

        {/* Status Metric Cards / Legend */}
        <div className="flex-1 w-full grid grid-cols-3 sm:grid-cols-1 gap-2">
          {/* Available */}
          <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
              <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300">Available</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300 tabular-nums">
                {available} <span className="text-[10px] font-normal opacity-80">tbls</span>
              </span>
              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 block sm:hidden font-mono">
                {availableSeats} seats
              </span>
            </div>
          </div>

          {/* Occupied */}
          <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#92400E] shrink-0" />
              <span className="text-[11px] font-bold text-amber-950 dark:text-amber-300">Occupied</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-xs text-amber-900 dark:text-amber-300 tabular-nums">
                {occupied} <span className="text-[10px] font-normal opacity-80">tbls</span>
              </span>
              <span className="text-[10px] text-amber-800/80 dark:text-amber-400 block sm:hidden font-mono">
                {occupiedSeats} seated
              </span>
            </div>
          </div>

          {/* Reserved */}
          <div className="p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
              <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300">Reserved</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-xs text-blue-800 dark:text-blue-300 tabular-nums">
                {reserved} <span className="text-[10px] font-normal opacity-80">tbls</span>
              </span>
              <span className="text-[10px] text-blue-700/80 dark:text-blue-400 block sm:hidden font-mono">
                {reservedSeats} booked
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dining Tables Telemetry */}
      {tables && tables.length > 0 && (
        <div className="pt-2 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 space-y-1.5">
          <div className="text-[11px] font-bold text-[#5B6470] dark:text-[#A89B8C] uppercase tracking-wider flex items-center justify-between">
            <span>Dining Tables Telemetry</span>
            <span className="font-mono text-[10px] text-[#8C7E72]">{tables.length} Total</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-24 overflow-y-auto pr-1">
            {tables.map((t) => {
              const st = (t.status || 'AVAILABLE').toUpperCase();
              const isOcc = st === 'OCCUPIED';
              const isRes = st === 'RESERVED';
              return (
                <div
                  key={t.id || t.tableNumber}
                  title={`Table ${t.tableNumber} • ${t.capacity || 2} Seats • ${st}`}
                  className={`p-1.5 rounded-lg border text-center transition-all ${
                    isOcc
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-[#92400E] dark:text-[#D97706]'
                      : isRes
                      ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800/60 text-[#2563EB] dark:text-blue-400'
                      : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-[#16A34A] dark:text-emerald-400'
                  }`}
                >
                  <div className="text-[11px] font-bold font-mono leading-tight">
                    T{String(t.tableNumber).replace(/^T/i, '')}
                  </div>
                  <div className="text-[9px] opacity-75 font-medium tabular-nums">
                    {t.capacity || 2}p
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seat Utilization Summary Footer */}
      <div className="pt-2 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 flex items-center justify-between text-[11px] text-[#5B6470] dark:text-[#A89B8C]">
        <span>Seated Guests: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{occupiedSeats} / {totalSeats}</strong></span>
        <span className="font-semibold text-[#16A34A] dark:text-emerald-400">{availableSeats} seats open</span>
      </div>
    </div>
  );
}

// Backward-compatible alias
export const SegmentedOccupancyVisualizer = DiningFloorOccupancyVisualizer;

/**
 * Premium SVG Donut Chart with Interactive Segments & Centered Totals
 */
export function DonutChart({
  data = [], // [{ label: string, value: number, color: string }]
  centerLabel = 'Total',
  centerValue,
  size = 180,
  strokeWidth = 24,
  currency = '',
  formatValue,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  if (total <= 0 || data.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-center p-4">
        <p className="text-xs text-[#5B6470] dark:text-[#A89B8C]">No recorded distribution data available</p>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const val = Math.max(0, Number(item.value) || 0);
    const strokeDasharray = `${(val / total) * circumference} ${circumference}`;
    const strokeDashoffset = -currentAngle;
    currentAngle += (val / total) * circumference;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      percentage: Number(((val / total) * 100).toFixed(1)),
      index,
    };
  });

  const activeItem = hoveredIndex !== null ? segments[hoveredIndex] : null;

  const displayVal = activeItem
    ? (formatValue ? formatValue(activeItem.value) : `${currency}${activeItem.value.toLocaleString()}`)
    : centerValue !== undefined
    ? centerValue
    : formatValue
    ? formatValue(total)
    : `${currency}${total.toLocaleString()}`;

  const displayLbl = activeItem ? activeItem.label : centerLabel;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
      {/* SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 origin-center"
        >
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-[#FAF7F2] dark:text-[#25201A]"
          />

          {/* Segments */}
          {segments.map((seg) => (
            <circle
              key={seg.index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={hoveredIndex === seg.index ? strokeWidth + 3 : strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredIndex(seg.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470] dark:text-[#A89B8C] truncate max-w-[110px]">
            {displayLbl}
          </span>
          <span className="text-base sm:text-lg font-black text-[#1F2937] dark:text-[#F7F3EC] tabular-nums font-mono truncate max-w-[120px]">
            {displayVal}
          </span>
          {activeItem && (
            <span className="text-[10.5px] font-bold text-[#92400E] dark:text-[#D97706] tabular-nums">
              {activeItem.percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Legend List */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {segments.map((seg) => {
          const isHovered = hoveredIndex === seg.index;
          return (
            <div
              key={seg.index}
              onMouseEnter={() => setHoveredIndex(seg.index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                isHovered
                  ? 'bg-[#FAF7F2] dark:bg-[#25201A] font-bold text-[#1F2937] dark:text-[#F7F3EC]'
                  : 'text-[#5B6470] dark:text-[#A89B8C] hover:bg-[#FAF7F2]/50 dark:hover:bg-[#201C18]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums shrink-0 font-mono text-[11px]">
                <span className="font-semibold text-[#1F2937] dark:text-[#F7F3EC]">
                  {formatValue ? formatValue(seg.value) : `${currency}${Number(seg.value).toLocaleString()}`}
                </span>
                <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] w-9 text-right font-bold">
                  {seg.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Professional Payment Method Distribution Visualizer
 * Features:
 * - Compact SVG Donut on left showing distribution and Total Collected center label
 * - Structured breakdown list on right with method icon, amount, share %, and mini-progress bar
 * - High-density enterprise layout filling card width without awkward blank space
 * - Distinct visual hierarchy from Dining Floor Occupancy
 */
export function PaymentDistributionVisualizer({
  data = [], // [{ label: string, value: number, color: string, count?: number, percentage?: number }]
  currency = '₹',
  getMethodIcon,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  if (total <= 0 || data.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-center p-4">
        <p className="text-xs text-[#5B6470] dark:text-[#A89B8C]">No recorded payment transactions available</p>
      </div>
    );
  }

  const size = 136;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const val = Math.max(0, Number(item.value) || 0);
    const strokeDasharray = `${(val / total) * circumference} ${circumference}`;
    const strokeDashoffset = -currentAngle;
    currentAngle += (val / total) * circumference;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      percentage: item.percentage !== undefined ? item.percentage : Number(((val / total) * 100).toFixed(1)),
      index,
    };
  });

  const activeItem = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <div className="w-full flex flex-col justify-between h-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Left Column: Compact Donut (sm:col-span-5) */}
        <div className="sm:col-span-5 flex justify-center">
          <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90 origin-center"
            >
              {/* Background circle track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-[#FAF7F2] dark:text-[#25201A]"
              />

              {/* Segments */}
              {segments.map((seg) => (
                <circle
                  key={seg.index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={hoveredIndex === seg.index ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(seg.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#5B6470] dark:text-[#A89B8C] truncate max-w-[100px]">
                {activeItem ? activeItem.label : 'Total Collected'}
              </span>
              <span className="text-sm font-black text-[#1F2937] dark:text-[#F7F3EC] tabular-nums font-mono truncate max-w-[110px] mt-0.5">
                {activeItem ? `${currency}${Number(activeItem.value).toLocaleString()}` : `${currency}${total.toLocaleString()}`}
              </span>
              {activeItem && (
                <span className="text-[10px] font-bold text-[#92400E] dark:text-[#D97706] tabular-nums">
                  {activeItem.percentage}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Structured Payment Methods List (sm:col-span-7) */}
        <div className="sm:col-span-7 space-y-2">
          {segments.map((seg) => {
            const isHovered = hoveredIndex === seg.index;
            return (
              <div
                key={seg.index}
                onMouseEnter={() => setHoveredIndex(seg.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isHovered
                    ? 'bg-white dark:bg-[#201C18] border-[#92400E]/40 dark:border-[#D97706]/40 shadow-xs'
                    : 'bg-[#FAF7F2]/80 dark:bg-[#201C18]/60 border-[#E5D8C6]/70 dark:border-[#382F26]/70 hover:border-[#92400E]/20'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    {getMethodIcon && (
                      <span className="shrink-0">{getMethodIcon(seg.label)}</span>
                    )}
                    <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC] uppercase tracking-wide truncate">
                      {seg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 tabular-nums shrink-0 font-mono text-xs">
                    <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                      {currency}{Number(seg.value).toLocaleString()}
                    </span>
                    <span
                      className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: seg.color }}
                    >
                      {seg.percentage}%
                    </span>
                  </div>
                </div>

                {/* Mini Progress Bar */}
                <div className="h-1.5 w-full bg-[#E7DCCB] dark:bg-[#332A22] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${seg.percentage}%`,
                      backgroundColor: seg.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Premium Horizontal Progress Bar Ranking Chart (e.g. Top Dishes, Popular Categories)
 */
export function HorizontalBarChart({
  data = [], // [{ label: string, value: number, sublabel?: string, color?: string, image?: string, category?: string }]
  valueLabel = '',
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-center p-4">
        <p className="text-xs text-[#5B6470] dark:text-[#A89B8C]">No performance ranking data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Number(d.value) || 0), 1);

  return (
    <div className="space-y-3 py-1">
      {data.map((item, idx) => {
        const val = Number(item.value) || 0;
        const pct = Math.min(100, Math.round((val / maxValue) * 100));
        const color = item.color || '#92400E';

        // Metallic accented rank styling for top 3
        const rankStyles = [
          'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
        ];
        const rankBadge = rankStyles[idx] || 'bg-[#FAF7F2] text-[#8C7E72] border-[#E5D8C6] dark:bg-[#201C18] dark:text-[#A89B8C] dark:border-[#382F26]';

        return (
          <div
            key={idx}
            className="space-y-1.5 p-2 rounded-xl hover:bg-[#FAF7F2]/70 dark:hover:bg-[#201C18]/60 transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* When image exists: [Dish Image] -> Dish Name */}
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.label}
                    className="w-8 h-8 rounded-lg object-cover border border-[#E5D8C6] dark:border-[#382F26] shrink-0 shadow-2xs"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono border shrink-0 ${rankBadge}`}>
                    #{idx + 1}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <span className="truncate block font-bold text-[#1F2937] dark:text-[#F7F3EC] leading-tight group-hover:text-[#92400E] dark:group-hover:text-[#D97706] transition-colors">
                    {item.label}
                  </span>
                  {item.category && (
                    <span className="text-[10px] text-[#8C7E72] dark:text-[#998C7F] font-medium block truncate">
                      {item.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side: Orders -> Revenue -> Ranking (if image was on left) */}
              <div className="flex items-center gap-2 shrink-0 font-mono text-xs tabular-nums text-right">
                <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                  {val.toLocaleString()} {valueLabel}
                </span>
                {item.sublabel && (
                  <span className="text-[11px] font-bold text-[#92400E] dark:text-[#D97706] bg-[#92400E]/10 dark:bg-[#92400E]/20 px-2 py-0.5 rounded-md border border-[#92400E]/20 dark:border-[#92400E]/30">
                    {item.sublabel}
                  </span>
                )}
                {item.image && (
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono border shrink-0 ${rankBadge}`}>
                    #{idx + 1}
                  </span>
                )}
              </div>
            </div>

            {/* Bar Track */}
            <div className="h-2 w-full bg-[#FAF7F2] dark:bg-[#25201A] border border-[#E5D8C6]/60 dark:border-[#382F26]/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Standard Status Distribution Bar (e.g. Kitchen queue stages, Table state telemetry)
 */
export function StatusDistributionBar({
  segments = [], // [{ label: string, count: number, color: string, textColor: string }]
}) {
  const total = segments.reduce((sum, s) => sum + (Number(s.count) || 0), 0);

  if (total <= 0) {
    return (
      <div className="py-2 text-center text-xs text-[#5B6470] dark:text-[#A89B8C]">
        Queue is currently idle
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Multi-segment stacked bar */}
      <div className="h-3 w-full bg-[#FAF7F2] dark:bg-[#25201A] rounded-full overflow-hidden flex border border-[#E5D8C6]/60 dark:border-[#382F26]/60">
        {segments.map((seg, idx) => {
          const val = Number(seg.count) || 0;
          if (val <= 0) return null;
          const pct = (val / total) * 100;
          return (
            <div
              key={idx}
              title={`${seg.label}: ${val} (${pct.toFixed(0)}%)`}
              className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${pct}%`,
                backgroundColor: seg.color,
              }}
            />
          );
        })}
      </div>

      {/* Segment Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {segments.map((seg, idx) => {
          const val = Number(seg.count) || 0;
          const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
          return (
            <div
              key={idx}
              className="bg-[#FAF7F2] dark:bg-[#201C18] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl p-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-[11px] font-semibold text-[#5B6470] dark:text-[#A89B8C] truncate">
                  {seg.label}
                </span>
              </div>
              <div className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC] tabular-nums font-mono pl-1">
                {val} <span className="text-[9.5px] text-[#8C7E72] font-normal">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default {
  ChartCard,
  ComboChart,
  DiningFloorOccupancyVisualizer,
  SegmentedOccupancyVisualizer,
  PaymentDistributionVisualizer,
  AreaChart,
  LineChart,
  VerticalBarChart,
  RadialGauge,
  DonutChart,
  HorizontalBarChart,
  StatusDistributionBar,
};
