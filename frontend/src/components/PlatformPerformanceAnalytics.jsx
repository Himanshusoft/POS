import React from 'react';
import { ChartCard, AreaChart } from './ui';
import {
  Building2,
  ShieldCheck,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
} from 'lucide-react';

const METRIC_CONFIGS = {
  tenants: {
    id: 'tenants',
    label: 'Tenants',
    title: 'Platform Performance — Tenant Scale',
    subtitle: 'Cumulative restaurant tenants onboarded to the platform over time',
    icon: Building2,
    color: '#92400E',
    gradientColor: '#B45309',
    unit: 'tenants',
    currency: '',
  },
  subscriptions: {
    id: 'subscriptions',
    label: 'Subscriptions',
    title: 'Platform Performance — Subscription Licenses',
    subtitle: 'Active commercial subscription licenses across platform',
    icon: ShieldCheck,
    color: '#16A34A',
    gradientColor: '#10B981',
    unit: 'active',
    currency: '',
  },
  users: {
    id: 'users',
    label: 'Users',
    title: 'Platform Performance — Platform Users',
    subtitle: 'Platform user accounts across all restaurant tenants',
    icon: Users,
    color: '#2563EB',
    gradientColor: '#3B82F6',
    unit: 'users',
    currency: '',
  },
  revenue: {
    id: 'revenue',
    label: 'Revenue',
    title: 'Platform Performance — Subscription Revenue (ARR)',
    subtitle: 'Cumulative platform licensing contract value across active tenant tiers',
    icon: DollarSign,
    color: '#D97706',
    gradientColor: '#F59E0B',
    unit: 'ARR',
    currency: '₹',
  },
};

const TIME_RANGES = [
  { id: '30D', label: '30D' },
  { id: '3M', label: '3M' },
  { id: '6M', label: '6M' },
  { id: '1Y', label: '1Y' },
];

export default function PlatformPerformanceAnalytics({
  analyticsData,
  loading = false,
  timeRange = '30D',
  onTimeRangeChange,
  activeMetric = 'tenants',
  onMetricChange,
}) {
  const metricCfg = METRIC_CONFIGS[activeMetric] || METRIC_CONFIGS.tenants;
  const metricResult = analyticsData?.metrics?.[activeMetric];
  const chartData = metricResult?.data || [];
  const currentValue = metricResult?.current ?? 0;
  const changePct = metricResult?.changePct;

  // Determine if there is real historical data (not all zeros or empty)
  const hasData = chartData.length > 0 && chartData.some((pt) => Number(pt.value) > 0);

  return (
    <div className="w-full">
      <ChartCard
        title="Platform Performance"
        subtitle={metricCfg.subtitle}
        badge="Platform Telemetry"
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Metric Switcher Controls */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] text-xs font-bold overflow-x-auto">
              {Object.values(METRIC_CONFIGS).map((cfg) => {
                const Icon = cfg.icon;
                const isSelected = activeMetric === cfg.id;
                return (
                  <button
                    key={cfg.id}
                    type="button"
                    onClick={() => onMetricChange(cfg.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#92400E] text-white shadow-xs'
                        : 'text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Time-Range Selector */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] text-xs font-bold">
              {TIME_RANGES.map((rng) => {
                const isSelected = timeRange === rng.id;
                return (
                  <button
                    key={rng.id}
                    type="button"
                    onClick={() => onTimeRangeChange && onTimeRangeChange(rng.id)}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-[#1C1815] text-[#92400E] dark:text-[#D97706] shadow-xs'
                        : 'text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC]'
                    }`}
                  >
                    {rng.label}
                  </button>
                );
              })}
            </div>
          </div>
        }
      >
        {/* Metric Highlight Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 mb-4 rounded-xl bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6]/80 dark:border-[#382F26]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs"
              style={{
                backgroundColor: `${metricCfg.color}15`,
                borderColor: `${metricCfg.color}35`,
                color: metricCfg.color,
              }}
            >
              <metricCfg.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#5B6470] dark:text-[#A89B8C] uppercase tracking-wider">
                {metricCfg.label} • Last {timeRange}
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#1F2937] dark:text-[#F7F3EC] font-mono tracking-tight">
                {loading ? (
                  <span className="text-sm font-normal text-[#5B6470]">Loading...</span>
                ) : (
                  <>
                    {metricCfg.currency}
                    {Number(currentValue).toLocaleString()}
                    <span className="text-xs sm:text-sm font-normal text-[#5B6470] dark:text-[#A89B8C] ml-1.5">
                      {metricCfg.unit}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {changePct !== null && changePct !== undefined ? (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                  changePct >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                }`}
              >
                {changePct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {changePct >= 0 ? `+${changePct}%` : `${changePct}%`} vs prev period
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] font-medium bg-white dark:bg-[#1C1815] px-3 py-1.5 rounded-xl border border-[#E5D8C6] dark:border-[#382F26]">
                Current Operational Baseline
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Chart Body */}
        {loading ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2.5">
            <RefreshCw className="w-6 h-6 text-[#92400E] animate-spin" />
            <span className="text-xs text-[#5B6470] font-medium">Loading platform analytics...</span>
          </div>
        ) : !hasData ? (
          <div className="h-52 flex flex-col items-center justify-center text-center p-6 bg-[#FAF7F2]/50 dark:bg-[#25201C]/50 rounded-xl border border-dashed border-[#E5D8C6] dark:border-[#382F26]">
            <Activity className="w-8 h-8 text-[#9CA3AF] dark:text-[#6B7280] mb-2" />
            <h4 className="text-sm font-bold text-[#1F2937] dark:text-[#F7F3EC]">
              No historical platform data available yet
            </h4>
            <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-1 max-w-sm">
              Historical analytics will appear as platform activity grows across tenant onboarding and subscriptions.
            </p>
          </div>
        ) : (
          <div>
            <AreaChart
              data={chartData}
              color={metricCfg.color}
              gradientColor={metricCfg.gradientColor}
              height={205}
              currency={metricCfg.currency}
              valueLabel={metricCfg.unit}
              formatValue={(val) =>
                metricCfg.currency
                  ? `${metricCfg.currency}${Number(val).toLocaleString()}`
                  : `${Number(val).toLocaleString()}`
              }
            />

            {/* Bottom Meta Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-[#5B6470] dark:text-[#A89B8C] pt-3 mt-1 border-t border-[#E5D8C6]/60 dark:border-[#382F26]/60 font-medium">
              <span>
                Metric: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{metricCfg.label}</strong> (Intervals: {timeRange})
              </span>
              <span>
                Latest Recorded:{' '}
                <strong className="font-mono text-[#1F2937] dark:text-[#F7F3EC]">
                  {metricCfg.currency}
                  {Number(currentValue).toLocaleString()} {metricCfg.unit}
                </strong>
              </span>
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
