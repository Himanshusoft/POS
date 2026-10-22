import React, { useState, useEffect, useMemo } from 'react';
import posService from '../services/pos.service';
import { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  StatCard,
  Button,
  Badge,
  Skeleton,
  ChartCard,
  ComboChart,
  DiningFloorOccupancyVisualizer,
  SegmentedOccupancyVisualizer,
  PaymentDistributionVisualizer,
  AreaChart,
  RadialGauge,
  DonutChart,
  HorizontalBarChart,
  StatusDistributionBar,
} from '../components/ui';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Boxes,
  Users,
  UtensilsCrossed,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  Sliders,
  DollarSign,
  LayoutGrid
} from 'lucide-react';

import { useAdminDashboardSummary, useTables, usePayments, useMenuItems } from '../hooks/usePosQueries';

export default function RestaurantAdminDashboardView({ setActiveTab }) {
  const { restaurant, user, addToast } = useAuth();
  const currency = restaurant?.currency || '₹';

  const {
    data = null,
    isLoading: loadingDashboard,
    isRefetching: refetchingDashboard,
    refetch: refetchDashboard,
  } = useAdminDashboardSummary(restaurant?.id);

  const {
    data: tables = [],
    isLoading: loadingTables,
    refetch: refetchTables,
  } = useTables(restaurant?.id);

  const {
    data: payments = [],
    isLoading: loadingPayments,
    refetch: refetchPayments,
  } = usePayments(restaurant?.id, { limit: 100 });

  const {
    data: menuItems = [],
    isLoading: loadingMenu,
    refetch: refetchMenu,
  } = useMenuItems(restaurant?.id);

  const loading = (loadingDashboard && !data) || refetchingDashboard;

  const loadDashboard = async () => {
    try {
      await Promise.all([
        refetchDashboard(),
        refetchTables(),
        refetchPayments(),
        refetchMenu(),
      ]);
      addToast('Dashboard analytics refreshed', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to refresh analytics', 'error');
    }
  };

  const getMethodIcon = (method) => {
    switch (method?.toUpperCase()) {
      case 'CASH':
        return <Banknote className="w-3.5 h-3.5 text-[#16A34A]" />;
      case 'UPI':
        return <Smartphone className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />;
      case 'CARD':
        return <CreditCard className="w-3.5 h-3.5 text-[#2563EB]" />;
      default:
        return <Receipt className="w-3.5 h-3.5 text-[#D97706]" />;
    }
  };

  const menuImageMap = useMemo(() => {
    const map = {};
    if (Array.isArray(menuItems)) {
      menuItems.forEach((m) => {
        if (m.imageUrl) {
          if (m.id) map[m.id] = m.imageUrl;
          if (m.name) map[m.name.toLowerCase().trim()] = m.imageUrl;
        }
      });
    }
    return map;
  }, [menuItems]);

  const paymentChartData = useMemo(() => {
    if (!data?.paymentInsights) return [];
    const colorMap = {
      CASH: '#2D6A4F',
      UPI: '#173F36',
      CARD: '#4EBA87',
      RAZORPAY: '#657168',
    };
    return data.paymentInsights.map((p) => ({
      label: p.method,
      value: Number(p.amount) || 0,
      count: p.count,
      percentage: p.percentage,
      color: colorMap[p.method] || '#173F36',
    }));
  }, [data]);

  const popularDishesChartData = useMemo(() => {
    if (!data?.popularDishes) return [];
    return data.popularDishes.slice(0, 5).map((d) => {
      const rawImg = d.imageUrl || (d.id && menuImageMap[d.id]) || (d.name && menuImageMap[d.name.toLowerCase().trim()]);
      const image = rawImg ? getImageUrl(rawImg) : null;
      return {
        label: d.name,
        value: d.quantitySold,
        sublabel: `${currency}${Number(d.revenueGenerated).toLocaleString()}`,
        color: '#173F36',
        image,
        category: d.category,
      };
    });
  }, [data, menuImageMap, currency]);

  const revenueTrendData = useMemo(() => {
    if (!payments || payments.length === 0) {
      if (data?.sales?.todayRevenue > 0) {
        return [
          {
            label: 'Today',
            revenue: Number(data.sales.todayRevenue),
            orders: Number(data.sales.totalPaidBills || data?.orders?.completedOrders || 1),
            value: Number(data.sales.todayRevenue),
          },
        ];
      }
      return [];
    }
    const dayMap = {};
    payments.forEach((p) => {
      if (p.createdAt && (p.status || 'COMPLETED') === 'COMPLETED') {
        const d = new Date(p.createdAt);
        const dateKey = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        if (!dayMap[dateKey]) {
          dayMap[dateKey] = {
            dateKey,
            label: dayLabel,
            revenue: 0,
            orders: 0,
          };
        }
        dayMap[dateKey].revenue += Number(p.amountPaid || p.amount || 0);
        dayMap[dateKey].orders += 1;
      }
    });
    const points = Object.values(dayMap)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map(({ label, revenue, orders }) => ({
        label,
        value: Math.round(revenue),
        revenue: Math.round(revenue),
        orders,
      }));
    return points.length > 0 ? points : [];
  }, [payments, data]);

  const tableStats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter((t) => (t.status || '').toUpperCase() === 'OCCUPIED').length;
    const available = tables.filter((t) => (t.status || '').toUpperCase() === 'AVAILABLE').length;
    const reserved = tables.filter((t) => (t.status || '').toUpperCase() === 'RESERVED').length;
    const totalSeats = tables.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);
    const occupiedSeats = tables
      .filter((t) => (t.status || '').toUpperCase() === 'OCCUPIED')
      .reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);
    const availableSeats = tables
      .filter((t) => (t.status || '').toUpperCase() === 'AVAILABLE')
      .reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);
    return {
      total,
      occupied,
      available,
      reserved,
      totalSeats,
      occupiedSeats,
      availableSeats,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  }, [tables]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#F7EFE4] dark:bg-[#101A18] text-[#17251F] dark:text-[#F7EFE4]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/20 border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center text-[#173F36] dark:text-[#4EBA87] shrink-0 shadow-xs">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight">
                {restaurant?.name || 'Restaurant'} Dashboard
              </h1>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#E8F3ED] dark:bg-[#1A2E26] text-[#1E4D38] dark:text-[#88D4A8] border border-[#C5DED0] dark:border-[#244237] flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3 h-3" />
                <span>Executive Overview</span>
              </span>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#173F36]/10 dark:bg-[#173F36]/20 text-[#173F36] dark:text-[#4EBA87] border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-[#173F36] dark:text-[#4EBA87]" />
                <span>{restaurant?.subscription?.plan?.name || 'Basic Plan'}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
              Real-time analytical command center for restaurant operations, sales velocity, inventory, staff quotas, and payments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={loadDashboard}
            disabled={loading}
            icon={RefreshCw}
            loading={loading}
            title="Refresh Analytics"
          >
            Refresh
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 shadow-editorial space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-9 rounded-xl" />
                </div>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
          <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top Analytical KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard
              title="Total Revenue"
              value={`${currency}${Number(data?.sales?.totalRevenue || 0).toLocaleString()}`}
              subtitle={`Today's Sales: ${currency}${Number(data?.sales?.todayRevenue || 0).toLocaleString()}`}
              icon={TrendingUp}
              iconColor="text-[#16A34A] dark:text-emerald-400"
              iconBg="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
            />

            <StatCard
              title="Total Orders"
              value={data?.orders?.totalOrders || 0}
              subtitle={`${data?.orders?.activeOrders || 0} active in kitchen queue`}
              icon={ShoppingBag}
              iconColor="text-[#D97706] dark:text-amber-400"
              iconBg="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
            />

            <StatCard
              title="Expenses & Net"
              value={`${currency}${Number(data?.expenses?.totalExpenses || 0).toLocaleString()}`}
              subtitle={`Net Est. Profit: ${currency}${Number(data?.expenses?.netProfit || 0).toLocaleString()}`}
              icon={Receipt}
              iconColor="text-[#2563EB] dark:text-blue-400"
              iconBg="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
            />

            <StatCard
              title="Inventory Alerts"
              value={`${data?.inventoryAlerts?.lowStockCount || 0} items low`}
              subtitle={`Tracked Raw Stock: ${data?.inventoryAlerts?.totalItems || 0} items`}
              icon={AlertTriangle}
              iconColor={(data?.inventoryAlerts?.lowStockCount || 0) > 0 ? 'text-[#EF4444] dark:text-rose-400' : 'text-[#16A34A] dark:text-emerald-400'}
              iconBg={(data?.inventoryAlerts?.lowStockCount || 0) > 0 ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'}
            />
          </div>

          {/* Staff Quota & Capacity Status Box */}
          <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 sm:p-6 shadow-editorial card-hover">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#E4DCD0] dark:border-[#1E362E]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#173F36]/10 dark:bg-[#173F36]/20 border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center text-[#173F36] dark:text-[#4EBA87]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#173F36] dark:text-[#F7EFE4]">Staff Roster & Subscription Role Limits</h3>
                  <p className="text-xs text-[#657168] dark:text-[#9FB29E] font-medium">
                    Enforced capacities under {restaurant?.subscription?.plan?.name || 'Basic Plan'} (₹5,000/year)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab && setActiveTab('staff')}
                className="text-xs font-bold text-[#173F36] dark:text-[#4EBA87] hover:text-[#12332C] flex items-center gap-1.5 cursor-pointer transition-colors px-3 py-1.5 rounded-lg bg-[#F7EFE4] dark:bg-[#1A2622] border border-[#E4DCD0] dark:border-[#1E362E] hover:bg-[#EAE0D2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
              >
                <span>Manage Staff Roster</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {/* Waiters */}
              <div className="bg-[#F7EFE4]/60 dark:bg-[#1A2622]/60 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl p-4 hover:border-[#173F36]/40 transition-colors">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#17251F] dark:text-[#F7EFE4]">Waiters</span>
                  <span className="font-mono tabular-nums text-[#2D6A4F] dark:text-[#88D4A8] font-extrabold text-xs">
                    {data?.staff?.waiters || 0} / {data?.staff?.planLimits?.maxWaiters || 10}
                  </span>
                </div>
                <div
                  className="w-full bg-[#E4DCD0] dark:bg-[#233630] rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-label="Waiters quota"
                  aria-valuenow={data?.staff?.waiters || 0}
                  aria-valuemin="0"
                  aria-valuemax={data?.staff?.planLimits?.maxWaiters || 10}
                >
                  <div
                    className="bg-[#2D6A4F] dark:bg-[#4EBA87] h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((data?.staff?.waiters || 0) / (data?.staff?.planLimits?.maxWaiters || 10)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-2 flex justify-between font-medium">
                  <span>Dining & table orders</span>
                  {(data?.staff?.waiters || 0) > (data?.staff?.planLimits?.maxWaiters || 10) ? (
                    <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      Over limit by {(data?.staff?.waiters || 0) - (data?.staff?.planLimits?.maxWaiters || 10)}
                    </span>
                  ) : (
                    <span className="font-semibold tabular-nums">
                      {Math.max(0, (data?.staff?.planLimits?.maxWaiters || 10) - (data?.staff?.waiters || 0))} open
                    </span>
                  )}
                </div>
              </div>

              {/* Kitchen Admins */}
              <div className="bg-[#F7EFE4]/60 dark:bg-[#1A2622]/60 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl p-4 hover:border-[#173F36]/40 transition-colors">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#17251F] dark:text-[#F7EFE4]">Kitchen Admins</span>
                  <span className="font-mono tabular-nums text-[#173F36] dark:text-[#4EBA87] font-extrabold text-xs">
                    {data?.staff?.kitchenAdmins || 0} / {data?.staff?.planLimits?.maxKitchenAdmins || 2}
                  </span>
                </div>
                <div
                  className="w-full bg-[#E4DCD0] dark:bg-[#233630] rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-label="Kitchen admins quota"
                  aria-valuenow={data?.staff?.kitchenAdmins || 0}
                  aria-valuemin="0"
                  aria-valuemax={data?.staff?.planLimits?.maxKitchenAdmins || 2}
                >
                  <div
                    className="bg-[#173F36] dark:bg-[#4EBA87] h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((data?.staff?.kitchenAdmins || 0) / (data?.staff?.planLimits?.maxKitchenAdmins || 2)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-2 flex justify-between font-medium">
                  <span>KDS & recipe depletion</span>
                  {(data?.staff?.kitchenAdmins || 0) > (data?.staff?.planLimits?.maxKitchenAdmins || 2) ? (
                    <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      Over limit by {(data?.staff?.kitchenAdmins || 0) - (data?.staff?.planLimits?.maxKitchenAdmins || 2)}
                    </span>
                  ) : (
                    <span className="font-semibold tabular-nums">
                      {Math.max(0, (data?.staff?.planLimits?.maxKitchenAdmins || 2) - (data?.staff?.kitchenAdmins || 0))} open
                    </span>
                  )}
                </div>
              </div>

              {/* Receptionists */}
              <div className="bg-[#F7EFE4]/60 dark:bg-[#1A2622]/60 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl p-4 hover:border-[#173F36]/40 transition-colors">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#17251F] dark:text-[#F7EFE4]">Receptionists</span>
                  <span className="font-mono tabular-nums text-[#2D6A4F] dark:text-[#88D4A8] font-extrabold text-xs">
                    {data?.staff?.receptionists || 0} / {data?.staff?.planLimits?.maxReceptionists || 2}
                  </span>
                </div>
                <div
                  className="w-full bg-[#E4DCD0] dark:bg-[#233630] rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-label="Receptionists quota"
                  aria-valuenow={data?.staff?.receptionists || 0}
                  aria-valuemin="0"
                  aria-valuemax={data?.staff?.planLimits?.maxReceptionists || 2}
                >
                  <div
                    className="bg-[#2D6A4F] dark:bg-[#4EBA87] h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((data?.staff?.receptionists || 0) / (data?.staff?.planLimits?.maxReceptionists || 2)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-2 flex justify-between font-medium">
                  <span>Billing & cashier</span>
                  {(data?.staff?.receptionists || 0) > (data?.staff?.planLimits?.maxReceptionists || 2) ? (
                    <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      Over limit by {(data?.staff?.receptionists || 0) - (data?.staff?.planLimits?.maxReceptionists || 2)}
                    </span>
                  ) : (
                    <span className="font-semibold tabular-nums">
                      {Math.max(0, (data?.staff?.planLimits?.maxReceptionists || 2) - (data?.staff?.receptionists || 0))} open
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Analytical Grid Row 1: Revenue Velocity Trend & Floor Occupancy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Revenue Velocity Trend (Dual-axis Combo Chart: Bars for Revenue + Line for Orders) */}
            <div className="lg:col-span-8 flex flex-col">
              <ChartCard
                title="Revenue Velocity & Trend"
                subtitle="Dual-axis transaction trajectory comparing revenue collection and order volume"
                badge="Revenue Velocity"
                className="h-full flex flex-col justify-between"
                action={
                  <button
                    onClick={() => setActiveTab && setActiveTab('billing')}
                    className="text-xs font-bold text-[#173F36] dark:text-[#4EBA87] hover:text-[#12332C] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-[#F7EFE4] dark:hover:bg-[#1A2622]"
                  >
                    <span>Billing Ledger</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                }
                empty={revenueTrendData.length === 0}
                emptyMessage="No revenue velocity recorded yet. Settle customer orders to plot real collection trajectories."
              >
                <div className="flex flex-col justify-between h-full pt-1 space-y-3">
                  <ComboChart
                    data={revenueTrendData}
                    currency={currency}
                    height={240}
                    revenueLabel="Revenue"
                    ordersLabel="Orders"
                    barColor="#173F36"
                    lineColor="#2D6A4F"
                  />
                  <div className="pt-3 border-t border-[#E4DCD0]/60 dark:border-[#1E362E]/60 flex flex-wrap items-center justify-between gap-2 text-xs text-[#657168] dark:text-[#9FB29E]">
                    <span className="font-medium">
                      Total Invoiced Revenue: <strong className="text-[#17251F] dark:text-[#F7EFE4]">{currency}{Number(data?.sales?.totalRevenue || 0).toLocaleString()}</strong>
                    </span>
                    <span className="font-mono text-[#2D6A4F] dark:text-[#88D4A8] font-bold">
                      Today: {currency}{Number(data?.sales?.todayRevenue || 0).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-semibold">
                      Settled Bills: <strong className="text-[#17251F] dark:text-[#F7EFE4]">{data?.sales?.totalPaidBills || 0}</strong>
                    </span>
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* Dining Floor Occupancy (Compact Donut/Ring + Status Cards + Telemetry) */}
            <div className="lg:col-span-4 flex flex-col">
              <ChartCard
                title="Dining Floor Occupancy"
                subtitle="Live table utilization, seated guest telemetry, and seating availability"
                badge="Floor Capacity"
                className="h-full flex flex-col justify-between"
                action={
                  <button
                    onClick={() => setActiveTab && setActiveTab('tables')}
                    className="text-xs font-bold text-[#173F36] dark:text-[#4EBA87] hover:text-[#12332C] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-[#F7EFE4] dark:hover:bg-[#1A2622]"
                  >
                    <span>Tables</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                }
              >
                <DiningFloorOccupancyVisualizer
                  stats={tableStats}
                  tables={tables}
                />
              </ChartCard>
            </div>
          </div>

          {/* Analytical Grid Row 2: Top-Selling Dishes + Payment Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Top-Selling Dishes Leaderboard (Horizontal Bar Chart with Real Food Thumbnails) */}
            <div className="lg:col-span-6 flex flex-col">
              <ChartCard
                title="Top-Selling Dishes"
                subtitle="Highest ordered menu selections ranked by quantity and revenue"
                badge="Menu Velocity"
                className="h-full flex flex-col justify-between"
                action={
                  <button
                    onClick={() => setActiveTab && setActiveTab('menu')}
                    className="text-xs font-bold text-[#173F36] dark:text-[#4EBA87] hover:text-[#12332C] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-[#F7EFE4] dark:hover:bg-[#1A2622]"
                  >
                    <span>Menu Catalog</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                }
                empty={!data?.popularDishes || data.popularDishes.length === 0}
                emptyMessage="No dish orders recorded yet. As orders are placed in the POS Terminal, top sellers will rank here."
              >
                <div className="flex flex-col justify-between h-full space-y-4">
                  <HorizontalBarChart
                    data={popularDishesChartData}
                    valueLabel="orders"
                  />

                  <div className="pt-3 border-t border-[#E4DCD0]/60 dark:border-[#1E362E]/60 flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E]">
                    <span className="font-medium">
                      Total Dishes Sold: <strong className="text-[#17251F] dark:text-[#F7EFE4]">{data?.popularDishes?.reduce((s, d) => s + d.quantitySold, 0) || 0}</strong>
                    </span>
                    <span className="text-[11px] text-[#657168] font-semibold">
                      Real-time Menu Analytics
                    </span>
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* Payment Method Distribution (Compact Donut + Structured Breakdown with Progress Bars) */}
            <div className="lg:col-span-6 flex flex-col">
              <ChartCard
                title="Payment Method Distribution"
                subtitle="Revenue breakdown across Cash, UPI, and Card transactions"
                badge="Financials"
                className="h-full flex flex-col justify-between"
                action={
                  <button
                    onClick={() => setActiveTab && setActiveTab('billing')}
                    className="text-xs font-bold text-[#173F36] dark:text-[#4EBA87] hover:text-[#12332C] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-[#F7EFE4] dark:hover:bg-[#1A2622]"
                  >
                    <span>View Invoices</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                }
                empty={!data?.paymentInsights || data.paymentInsights.length === 0}
                emptyMessage="No payment transactions recorded yet. Settle bills at the Cashier to view payment mode distributions."
              >
                <div className="flex flex-col justify-between h-full space-y-4">
                  <PaymentDistributionVisualizer
                    data={paymentChartData}
                    currency={currency}
                    getMethodIcon={getMethodIcon}
                  />

                  <div className="pt-3 border-t border-[#E4DCD0]/60 dark:border-[#1E362E]/60 flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E]">
                    <span className="font-medium">
                      Settled Bills: <strong className="text-[#17251F] dark:text-[#F7EFE4]">{data?.sales?.totalPaidBills || 0}</strong>
                    </span>
                    <span className="font-mono text-[#17251F] dark:text-[#F7EFE4] font-bold">
                      Net Collected: {currency}{Number(data?.sales?.totalRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </ChartCard>
            </div>
          </div>

          {/* Bottom Row: Inventory Alerts & Quick Operations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Low-Stock Inventory Alerts */}
            <div className="lg:col-span-2 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 sm:p-6 shadow-editorial card-hover flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-[#E4DCD0] dark:border-[#1E362E]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-[#EF4444] dark:text-rose-400">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-[#17251F] dark:text-[#F7EFE4]">Inventory Stock Warnings</h3>
                      <p className="text-xs text-[#657168] dark:text-[#9FB29E] font-medium">
                        Raw ingredients at or below their defined minimum safety threshold
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab && setActiveTab('inventory')}
                    className="text-xs font-bold text-[#C53030] dark:text-rose-400 hover:text-[#9B2C2C] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <span>Inventory Room</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {data?.inventoryAlerts?.items?.length === 0 ? (
                  <div className="py-10 text-center text-[#657168] dark:text-[#9FB29E]">
                    <CheckCircle2 className="w-9 h-9 text-[#2D6A4F] dark:text-[#88D4A8] mx-auto mb-2" />
                    <div className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4]">Stock Health Optimal</div>
                    <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-0.5">
                      All ingredients are currently above minimum safety thresholds.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {data?.inventoryAlerts?.items?.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#F7EFE4]/60 dark:bg-[#1A2622]/60 border border-[#EF4444]/30 rounded-xl p-3.5 flex items-center justify-between hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4]">{item.name}</div>
                          <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-mono mt-0.5">
                            Min Threshold: {item.minStockThreshold} {item.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-extrabold text-[#C53030] dark:text-rose-400 block">
                            {Number(item.currentStock).toFixed(1)} {item.unit}
                          </span>
                          <span className="text-[10px] font-bold text-[#C53030] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900 mt-1 inline-block">
                            Low Stock
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#E4DCD0] dark:border-[#1E362E] text-xs text-[#657168] dark:text-[#9FB29E] flex items-center justify-between">
                <span>Active supplier purchase orders auto-adjust inventory on receipt</span>
                <span className="font-semibold text-[#17251F] dark:text-[#F7EFE4]">{data?.inventoryAlerts?.items?.length || 0} alerts</span>
              </div>
            </div>

            {/* Quick Operational Shortcuts */}
            <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 sm:p-6 shadow-editorial card-hover flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[#173F36]/10 dark:bg-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#4EBA87]">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <span>Administrative Control</span>
                </h3>
                <p className="text-xs text-[#657168] dark:text-[#9FB29E] mb-4 font-medium">Quick navigation to restaurant management modules</p>

                <div className="space-y-2.5">
                  <button
                    onClick={() => setActiveTab && setActiveTab('staff')}
                    className="w-full flex items-center justify-between p-3 bg-[#F7EFE4]/60 dark:bg-[#1A2622] hover:bg-[#F7EFE4] dark:hover:bg-[#213830] active:scale-95 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] transition-all cursor-pointer shadow-xs hover:shadow"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#E8F3ED] dark:bg-[#1A2E26] border border-[#C5DED0] dark:border-[#244237] flex items-center justify-center text-[#2D6A4F] dark:text-[#88D4A8]">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span>Manage Staff Roster</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#657168] dark:text-[#9FB29E]">{data?.staff?.total || 0} users</span>
                  </button>

                  <button
                    onClick={() => setActiveTab && setActiveTab('menu')}
                    className="w-full flex items-center justify-between p-3 bg-[#F7EFE4]/60 dark:bg-[#1A2622] hover:bg-[#F7EFE4] dark:hover:bg-[#213830] active:scale-95 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] transition-all cursor-pointer shadow-xs hover:shadow"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#173F36]/10 dark:bg-[#173F36]/20 border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center text-[#173F36] dark:text-[#4EBA87]">
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                      </div>
                      <span>Menu Selection</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#657168] dark:text-[#9FB29E]">Manage Dishes</span>
                  </button>

                  <button
                    onClick={() => setActiveTab && setActiveTab('inventory')}
                    className="w-full flex items-center justify-between p-3 bg-[#F7EFE4]/60 dark:bg-[#1A2622] hover:bg-[#F7EFE4] dark:hover:bg-[#213830] active:scale-95 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] transition-all cursor-pointer shadow-xs hover:shadow"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#173F36]/10 dark:bg-[#173F36]/20 border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center text-[#173F36] dark:text-[#4EBA87]">
                        <Boxes className="w-3.5 h-3.5" />
                      </div>
                      <span>Inventory & Spoilage</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#657168] dark:text-[#9FB29E]">Raw Ingredients</span>
                  </button>

                  <button
                    onClick={() => setActiveTab && setActiveTab('billing')}
                    className="w-full flex items-center justify-between p-3 bg-[#F7EFE4]/60 dark:bg-[#1A2622] hover:bg-[#F7EFE4] dark:hover:bg-[#213830] active:scale-95 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] transition-all cursor-pointer shadow-xs hover:shadow"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#E8F3ED] dark:bg-[#1A2E26] border border-[#C5DED0] dark:border-[#244237] flex items-center justify-center text-[#2D6A4F] dark:text-[#88D4A8]">
                        <Receipt className="w-3.5 h-3.5" />
                      </div>
                      <span>Billing & Payments</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#657168] dark:text-[#9FB29E]">Cash/UPI/Card</span>
                  </button>
                </div>
              </div>

              <div className="pt-3.5 border-t border-[#E4DCD0] dark:border-[#1E362E] text-xs text-[#657168] dark:text-[#9FB29E] flex items-center justify-between">
                <span>Restaurant Admin: <strong className="text-[#17251F] dark:text-[#F7EFE4]">{user?.name || 'Administrator'}</strong></span>
                <span className="text-[#2D6A4F] dark:text-[#88D4A8] font-bold text-[11px]">Online</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
