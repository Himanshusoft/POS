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

export default function RestaurantAdminDashboardView({ setActiveTab }) {
  const { restaurant, user, addToast } = useAuth();
  const [data, setData] = useState(null);
  const [tables, setTables] = useState([]);
  const [payments, setPayments] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const currency = restaurant?.currency || '₹';

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [res, tblRes, payRes, menuRes] = await Promise.all([
        posService.reports.getDashboard(),
        posService.tables.getAll().catch(() => ({ data: [] })),
        posService.payments.getAll({ limit: 100 }).catch(() => ({ data: [] })),
        posService.menu.getItems().catch(() => ({ data: [] })),
      ]);
      if (res.success && res.data) {
        setData(res.data);
      }
      if (tblRes?.data) {
        setTables(Array.isArray(tblRes.data) ? tblRes.data : tblRes.data.tables || []);
      }
      if (payRes?.data) {
        setPayments(Array.isArray(payRes.data) ? payRes.data : payRes.data.items || []);
      }
      if (menuRes?.data) {
        setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load restaurant analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const getMethodIcon = (method) => {
    switch (method?.toUpperCase()) {
      case 'CASH':
        return <Banknote className="w-3.5 h-3.5 text-[#16A34A]" />;
      case 'UPI':
        return <Smartphone className="w-3.5 h-3.5 text-[#92400E]" />;
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
      CASH: '#16A34A',
      UPI: '#92400E',
      CARD: '#2563EB',
      RAZORPAY: '#D97706',
    };
    return data.paymentInsights.map((p) => ({
      label: p.method,
      value: Number(p.amount) || 0,
      count: p.count,
      percentage: p.percentage,
      color: colorMap[p.method] || '#D97706',
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
        color: '#92400E',
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] dark:bg-[#141210] text-[#1F2937] dark:text-[#F7F3EC]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] p-5 sm:p-6 rounded-2xl shadow-sandstone">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/30 flex items-center justify-center text-[#92400E] dark:text-[#D97706] shrink-0 shadow-sm">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] dark:text-[#F7F3EC] tracking-tight">
                {restaurant?.name || 'Restaurant'} Dashboard
              </h1>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#92400E]/10 dark:bg-[#92400E]/20 text-[#92400E] dark:text-[#D97706] border border-[#92400E]/20 dark:border-[#92400E]/30 flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3 h-3" />
                <span>Executive Overview</span>
              </span>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#D97706]/15 text-[#B45309] dark:text-[#D97706] border border-[#D97706]/30 flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-[#D97706]" />
                <span>Standard Annual Plan</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">
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
              <div key={i} className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-5 shadow-sandstone space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-9 rounded-xl" />
                </div>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-6 shadow-sandstone space-y-4">
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
          <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-5 sm:p-6 shadow-sandstone card-hover">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#E5D8C6] dark:border-[#382F26]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/30 flex items-center justify-center text-[#92400E] dark:text-[#D97706]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#1F2937] dark:text-[#F7F3EC]">Staff Roster & Subscription Role Limits</h3>
                  <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] font-medium">
                    Enforced capacities under Standard Annual Plan (₹5,000/year)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab && setActiveTab('staff')}
                className="text-xs font-bold text-[#92400E] dark:text-[#D97706] hover:text-[#78350F] dark:hover:text-[#F59E0B] flex items-center gap-1.5 cursor-pointer transition-colors px-3 py-1.5 rounded-lg bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] hover:bg-[#F1E8DB] dark:hover:bg-[#2E2721] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
              >
                <span>Manage Staff Roster</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {/* Waiters */}
              <div className="bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl p-4 hover:border-[#92400E]/40 transition-colors">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC]">Waiters</span>
                  <span className="font-mono tabular-nums text-[#16A34A] dark:text-emerald-400 font-extrabold text-xs">
                    {data?.staff?.waiters || 0} / {data?.staff?.planLimits?.maxWaiters || 10}
                  </span>
                </div>
                <div
                  className="w-full bg-[#E7DCCB] dark:bg-[#332A22] rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-label="Waiters quota"
                  aria-valuenow={data?.staff?.waiters || 0}
                  aria-valuemin="0"
                  aria-valuemax={data?.staff?.planLimits?.maxWaiters || 10}
                >
                  <div
                    className="bg-[#16A34A] dark:bg-emerald-400 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((data?.staff?.waiters || 0) / (data?.staff?.planLimits?.maxWaiters || 10)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] mt-2 flex justify-between font-medium">
                  <span>Dining & table orders</span>
                  <span className="font-semibold tabular-nums">{Math.max(0, (data?.staff?.planLimits?.maxWaiters || 10) - (data?.staff?.waiters || 0))} open</span>
                </div>
              </div>

              {/* Kitchen Admins */}
              <div className="bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl p-4 hover:border-[#92400E]/40 transition-colors">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC]">Kitchen Admins</span>
                  <span className="font-mono tabular-nums text-[#D97706] dark:text-amber-400 font-extrabold text-xs">
                    {data?.staff?.kitchenAdmins || 0} / {data?.staff?.planLimits?.maxKitchenAdmins || 2}
                  </span>
                </div>
                <div
                  className="w-full bg-[#E7DCCB] dark:bg-[#332A22] rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-label="Kitchen admins quota"
                  aria-valuenow={data?.staff?.kitchenAdmins || 0}
                  aria-valuemin="0"
                  aria-valuemax={data?.staff?.planLimits?.maxKitchenAdmins || 2}
                >
                  <div
                    className="bg-[#D97706] dark:bg-amber-400 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((data?.staff?.kitchenAdmins || 0) / (data?.staff?.planLimits?.maxKitchenAdmins || 2)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] mt-2 flex justify-between font-medium">
                  <span>KDS & recipe depletion</span>
                  <span className="font-semibold tabular-nums">{Math.max(0, (data?.staff?.planLimits?.maxKitchenAdmins || 2) - (data?.staff?.kitchenAdmins || 0))} open</span>
                </div>
              </div>

              {/* Receptionists */}
              <div className="bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl p-4 hover:border-[#92400E]/40 transition-colors">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC]">Receptionists</span>
                  <span className="font-mono tabular-nums text-[#2563EB] dark:text-blue-400 font-extrabold text-xs">
                    {data?.staff?.receptionists || 0} / {data?.staff?.planLimits?.maxReceptionists || 2}
                  </span>
                </div>
                <div
                  className="w-full bg-[#E7DCCB] dark:bg-[#332A22] rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-label="Receptionists quota"
                  aria-valuenow={data?.staff?.receptionists || 0}
                  aria-valuemin="0"
                  aria-valuemax={data?.staff?.planLimits?.maxReceptionists || 2}
                >
                  <div
                    className="bg-[#2563EB] dark:bg-blue-400 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((data?.staff?.receptionists || 0) / (data?.staff?.planLimits?.maxReceptionists || 2)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] mt-2 flex justify-between font-medium">
                  <span>Billing & cashier</span>
                  <span className="font-semibold tabular-nums">{Math.max(0, (data?.staff?.planLimits?.maxReceptionists || 2) - (data?.staff?.receptionists || 0))} open</span>
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
                    className="text-xs font-bold text-[#92400E] dark:text-[#D97706] hover:text-[#78350F] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-[#FAF7F2] dark:hover:bg-[#201C18]"
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
                    barColor="#92400E"
                    lineColor="#2563EB"
                  />
                  <div className="pt-3 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5B6470] dark:text-[#A89B8C]">
                    <span className="font-medium">
                      Total Invoiced Revenue: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{currency}{Number(data?.sales?.totalRevenue || 0).toLocaleString()}</strong>
                    </span>
                    <span className="font-mono text-[#16A34A] dark:text-emerald-400 font-bold">
                      Today: {currency}{Number(data?.sales?.todayRevenue || 0).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#8C7E72] dark:text-[#998C7F] font-semibold">
                      Settled Bills: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{data?.sales?.totalPaidBills || 0}</strong>
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
                    className="text-xs font-bold text-[#D97706] hover:text-[#B45309] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30"
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
                    className="text-xs font-bold text-[#D97706] hover:text-[#B45309] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/35"
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

                  <div className="pt-3 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 flex items-center justify-between text-xs text-[#5B6470] dark:text-[#A89B8C]">
                    <span className="font-medium">
                      Total Dishes Sold: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{data?.popularDishes?.reduce((s, d) => s + d.quantitySold, 0) || 0}</strong>
                    </span>
                    <span className="text-[11px] text-[#8C7E72] font-semibold">
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
                    className="text-xs font-bold text-[#92400E] dark:text-[#D97706] hover:text-[#78350F] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-[#FAF7F2] dark:hover:bg-[#201C18]"
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

                  <div className="pt-3 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 flex items-center justify-between text-xs text-[#5B6470] dark:text-[#A89B8C]">
                    <span className="font-medium">
                      Settled Bills: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{data?.sales?.totalPaidBills || 0}</strong>
                    </span>
                    <span className="font-mono text-[#1F2937] dark:text-[#F7F3EC] font-bold">
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
            <div className="lg:col-span-2 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-5 sm:p-6 shadow-sandstone card-hover flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-[#E5D8C6] dark:border-[#382F26]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-[#EF4444] dark:text-rose-400">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#1F2937] dark:text-[#F7F3EC]">Inventory Stock Warnings</h3>
                      <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] font-medium">
                        Raw ingredients at or below their defined minimum safety threshold
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab && setActiveTab('inventory')}
                    className="text-xs font-bold text-[#EF4444] dark:text-rose-400 hover:text-[#DC2626] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <span>Inventory Room</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {data?.inventoryAlerts?.items?.length === 0 ? (
                  <div className="py-10 text-center text-[#5B6470] dark:text-[#A89B8C]">
                    <CheckCircle2 className="w-9 h-9 text-[#16A34A] dark:text-emerald-400 mx-auto mb-2" />
                    <div className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC]">Stock Health Optimal</div>
                    <div className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] mt-0.5">
                      All ingredients are currently above minimum safety thresholds.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {data?.inventoryAlerts?.items?.map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#FAF7F2] dark:bg-[#25201C] border border-[#EF4444]/30 rounded-xl p-3.5 flex items-center justify-between hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC]">{item.name}</div>
                          <div className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-mono mt-0.5">
                            Min Threshold: {item.minStockThreshold} {item.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-extrabold text-[#EF4444] dark:text-rose-400 block">
                            {Number(item.currentStock).toFixed(1)} {item.unit}
                          </span>
                          <span className="text-[10px] font-bold text-[#EF4444] dark:text-rose-400 bg-[#EF4444]/10 dark:bg-[#EF4444]/20 px-2 py-0.5 rounded-full border border-[#EF4444]/20 dark:border-[#EF4444]/30 mt-1 inline-block">
                            Low Stock
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#E5D8C6] dark:border-[#382F26] text-xs text-[#5B6470] dark:text-[#A89B8C] flex items-center justify-between">
                <span>Active supplier purchase orders auto-adjust inventory on receipt</span>
                <span className="font-semibold text-[#1F2937] dark:text-[#F7F3EC]">{data?.inventoryAlerts?.items?.length || 0} alerts</span>
              </div>
            </div>

            {/* Quick Operational Shortcuts */}
            <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-5 sm:p-6 shadow-sandstone card-hover flex flex-col justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1F2937] dark:text-[#F7F3EC] flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[#92400E]/10 dark:bg-[#92400E]/20 flex items-center justify-center text-[#92400E] dark:text-[#D97706]">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <span>Administrative Control</span>
                </h3>
                <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mb-4 font-medium">Quick navigation to restaurant management modules</p>

                <div className="space-y-2.5">
                  <button
                    onClick={() => setActiveTab && setActiveTab('staff')}
                    className="w-full flex items-center justify-between p-3 bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2E2721] active:scale-95 border border-[#E5D8C6] dark:border-[#382F26] rounded-xl text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC] transition-all cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#16A34A] dark:text-emerald-400">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span>Manage Staff Roster</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#5B6470] dark:text-[#A89B8C]">{data?.staff?.total || 0} users</span>
                  </button>

                  <button
                    onClick={() => setActiveTab && setActiveTab('menu')}
                    className="w-full flex items-center justify-between p-3 bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2E2721] active:scale-95 border border-[#E5D8C6] dark:border-[#382F26] rounded-xl text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC] transition-all cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-[#D97706] dark:text-amber-400">
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                      </div>
                      <span>Menu Selection</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#5B6470] dark:text-[#A89B8C]">Manage Dishes</span>
                  </button>

                  <button
                    onClick={() => setActiveTab && setActiveTab('inventory')}
                    className="w-full flex items-center justify-between p-3 bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2E2721] active:scale-95 border border-[#E5D8C6] dark:border-[#382F26] rounded-xl text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC] transition-all cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/30 flex items-center justify-center text-[#92400E] dark:text-[#D97706]">
                        <Boxes className="w-3.5 h-3.5" />
                      </div>
                      <span>Inventory & Spoilage</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#5B6470] dark:text-[#A89B8C]">Raw Ingredients</span>
                  </button>

                  <button
                    onClick={() => setActiveTab && setActiveTab('billing')}
                    className="w-full flex items-center justify-between p-3 bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2E2721] active:scale-95 border border-[#E5D8C6] dark:border-[#382F26] rounded-xl text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC] transition-all cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#2563EB] dark:text-blue-400">
                        <Receipt className="w-3.5 h-3.5" />
                      </div>
                      <span>Billing & Payments</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#5B6470] dark:text-[#A89B8C]">Cash/UPI/Card</span>
                  </button>
                </div>
              </div>

              <div className="pt-3.5 border-t border-[#E5D8C6] dark:border-[#382F26] text-xs text-[#5B6470] dark:text-[#A89B8C] flex items-center justify-between">
                <span>Restaurant Admin: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{user?.name || 'Administrator'}</strong></span>
                <span className="text-[#16A34A] dark:text-emerald-400 font-bold text-[11px]">Online</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
