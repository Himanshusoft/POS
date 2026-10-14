import React, { useState, useEffect, useMemo } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { Skeleton, StatCard, ChartCard, DonutChart, StatusDistributionBar, LineChart } from '../components/ui';
import {
  LayoutDashboard,
  LayoutGrid,
  ClipboardList,
  Receipt,
  Clock,
  RefreshCw,
  Utensils,
  PlusCircle,
  Check,
  Users,
  ChefHat,
  TrendingUp,
} from 'lucide-react';
import { useWaiterDashboard, usePosMutations } from '../hooks/usePosQueries';

/**
 * TableVisual helper: renders table image if provided in data,
 * with graceful fallback to a clean editorial graphic if missing/broken.
 */
function TableVisual({ image, tableNumber, capacity }) {
  const [imgError, setImgError] = useState(false);

  if (image && !imgError) {
    return (
      <div className="relative w-full h-28 rounded-xl overflow-hidden mb-3 border border-[#E4DCD0] dark:border-[#1E362E] bg-[#F7EFE4]/40 dark:bg-[#101A18] group">
        <img
          src={image}
          alt={`Table ${tableNumber}`}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px] font-bold drop-shadow">
          <span className="font-mono">Table #{tableNumber}</span>
          <span className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px]">
            <Users className="w-3 h-3" /> {capacity} seats
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-24 rounded-xl mb-3 border border-[#E4DCD0] dark:border-[#1E362E] bg-gradient-to-br from-[#F7EFE4] to-[#FFFDF9] dark:from-[#152320] dark:to-[#101A18] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#173F36_1px,transparent_1px)] [background-size:12px_12px]" />
      <div className="relative flex flex-col items-center justify-center text-[#173F36] dark:text-[#9FB29E]">
        <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] shadow-xs flex items-center justify-center text-[#173F36] dark:text-[#9FB29E]">
          <LayoutGrid className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-bold text-[#657168] dark:text-[#9FB29E] mt-1.5 flex items-center gap-1 font-sans">
          <Users className="w-3 h-3 text-[#173F36] dark:text-[#9FB29E]" /> {capacity} Seats Capacity
        </span>
      </div>
    </div>
  );
}

export default function WaiterDashboardView({ setActiveTab, onSelectTableForOrder }) {
  const { restaurant, user, addToast } = useAuth();
  const [actionLoading, setActionLoading] = useState(null);

  const {
    data: dashboardData = null,
    isLoading,
    isRefetching: refreshing,
    refetch,
  } = useWaiterDashboard(restaurant?.id);

  const { invalidateOrders, invalidateBilling } = usePosMutations(restaurant?.id);
  const loading = isLoading && !dashboardData;

  const fetchDashboard = async (isManual = false) => {
    try {
      await refetch();
      if (isManual) addToast('Waiter dashboard refreshed', 'success');
    } catch (err) {
      if (isManual) addToast(err.message || 'Failed to refresh dashboard', 'error');
    }
  };

  const handleServeOrder = async (orderId, tableNumber) => {
    setActionLoading(`serve-${orderId}`);
    try {
      await posService.waiter.serveOrder(orderId);
      addToast(`Order for Table #${tableNumber} marked SERVED to customer!`, 'success');
      invalidateOrders();
    } catch (err) {
      addToast(err.message || 'Failed to serve order', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeliverBill = async (billId, tableNumber) => {
    setActionLoading(`deliver-${billId}`);
    try {
      await posService.waiter.deliverBill(billId);
      addToast(`Bill delivered to Table #${tableNumber}!`, 'success');
      invalidateBilling();
    } catch (err) {
      addToast(err.message || 'Failed to mark bill delivered', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestBill = async (orderId, tableNumber) => {
    setActionLoading(`bill-req-${orderId}`);
    try {
      await posService.orders.requestBill(orderId);
      addToast(`Bill requested from Reception for Table #${tableNumber}!`, 'success');
      invalidateOrders();
    } catch (err) {
      addToast(err.message || 'Failed to request bill', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const currency = restaurant?.currency || '₹';

  const {
    tableOverview = {},
    orderOverview = {},
    billOverview = {},
    tableOrders = [],
    readyNotifications = [],
    billNotifications = [],
  } = dashboardData || {};

  const orderActivityTrend = useMemo(() => {
    const orders = [];
    (tableOrders || []).forEach((t) => {
      (t.orders || []).forEach((o) => {
        if (o.createdAt) orders.push(o);
      });
    });

    if (orders.length === 0) {
      const activeCount = (orderOverview.newOrders || 0) + (orderOverview.preparingOrders || 0) + (orderOverview.readyOrders || 0);
      const servedCount = orderOverview.servedOrders || 0;
      if (activeCount + servedCount > 0) {
        return [
          { label: 'Morning', value: Math.round(servedCount * 0.4) },
          { label: 'Afternoon', value: Math.round(servedCount * 0.6) },
          { label: 'Current Flow', value: activeCount },
        ];
      }
      return [];
    }

    const hourMap = {};
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const h = d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      hourMap[h] = (hourMap[h] || 0) + 1;
    });

    return Object.entries(hourMap).map(([label, value]) => ({ label, value }));
  }, [tableOrders, orderOverview]);

  // Zero-CLS Skeleton Loading
  if (loading && !dashboardData) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 text-[#17251F] dark:text-[#F7EFE4]">
        <div className="bg-[#FFFDF9] dark:bg-[#152320] p-5 sm:p-6 rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-64 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2.5">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>

        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-4">
          <Skeleton className="h-6 w-56 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 text-[#17251F] dark:text-[#F7EFE4]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] p-5 sm:p-6 rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#9FB29E]/10 border border-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0 shadow-sm">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight">
                Floor Operations & Service Dispatch
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] font-bold border border-emerald-200 dark:border-emerald-800">
                Waiter Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
              Logged in as <span className="text-[#17251F] dark:text-[#F7EFE4] font-semibold">{user?.name}</span> • Scoped to{' '}
              <span className="text-[#17251F] dark:text-[#F7EFE4] font-semibold">{restaurant?.name || 'Your Restaurant'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FFFDF9] dark:bg-[#152320] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] active:scale-95 text-[#17251F] dark:text-[#F7EFE4] rounded-xl text-xs font-semibold border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial hover:shadow-md transition-all cursor-pointer min-h-[44px]"
            aria-label="Refresh live data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#173F36] dark:text-[#9FB29E]' : 'text-[#657168]'}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (setActiveTab) setActiveTab('tables');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] rounded-xl text-xs font-bold shadow-editorial hover:shadow-md transition-all cursor-pointer min-h-[44px]"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Manage Tables</span>
          </button>
        </div>
      </div>

      {/* Real-time Alert Banners for Ready Orders & Ready Bills */}
      {(readyNotifications.length > 0 || billNotifications.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ready Food Notifications */}
          {readyNotifications.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-50/90 to-[#F7EFE4]/80 dark:from-emerald-950/30 dark:to-[#152320] border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 sm:p-5 shadow-editorial">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[#173F36] dark:text-emerald-300 font-bold text-sm">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span>Ready to Serve from Kitchen ({readyNotifications.length})</span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                  Action Required
                </span>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {readyNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-center justify-between bg-[#FFFDF9] dark:bg-[#101A18] p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs text-xs hover:border-emerald-400 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-[#17251F] dark:text-[#F7EFE4]">
                        Table #{notif.tableNumber} • Order #{notif.orderNumber}
                      </div>
                      <div className="text-[#657168] dark:text-[#9FB29E] text-[11px] mt-0.5">{notif.itemsCount} dishes freshly prepared</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleServeOrder(notif.orderId, notif.tableNumber)}
                      disabled={actionLoading === `serve-${notif.orderId}`}
                      className="px-4 py-2 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-bold rounded-xl shadow-editorial transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[40px]"
                    >
                      {actionLoading === `serve-${notif.orderId}` ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                      <span>Serve</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ready Bill Notifications */}
          {billNotifications.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50/90 to-[#F7EFE4]/80 dark:from-blue-950/30 dark:to-[#152320] border border-blue-300 dark:border-blue-800 rounded-2xl p-4 sm:p-5 shadow-editorial">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-blue-950 dark:text-blue-300 font-bold text-sm">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  <span>Bills Ready to Deliver ({billNotifications.length})</span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-700">
                  Reception Generated
                </span>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {billNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-center justify-between bg-[#FFFDF9] dark:bg-[#101A18] p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-xs text-xs hover:border-blue-400 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-[#17251F] dark:text-[#F7EFE4]">
                        Table #{notif.tableNumber} •{' '}
                        <span className="font-mono tabular-nums text-[#173F36] dark:text-[#9FB29E]">
                          {currency}{Number(notif.totalAmount || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[#657168] dark:text-[#9FB29E] text-[11px] mt-0.5">Bill #{notif.billNumber}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeliverBill(notif.billId, notif.tableNumber)}
                      disabled={actionLoading === `deliver-${notif.billId}`}
                      className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white font-bold rounded-xl shadow-editorial transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[40px]"
                    >
                      {actionLoading === `deliver-${notif.billId}` ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Receipt className="w-3.5 h-3.5" />
                      )}
                      <span>Deliver</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modern KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Available Tables"
          value={`${tableOverview.availableTables || 0} / ${tableOverview.totalTables || 0}`}
          subtitle={`${tableOverview.occupiedTables || 0} currently occupied (${tableOverview.totalTables ? Math.round(((tableOverview.occupiedTables || 0) / tableOverview.totalTables) * 100) : 0}% floor rate)`}
          icon={LayoutGrid}
          iconColor="text-[#173F36] dark:text-[#9FB29E]"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
          badge={
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800">
              {tableOverview.availableTables || 0} Open
            </span>
          }
        />

        <StatCard
          title="Needs Floor Attention"
          value={tableOverview.tablesWaitingForService || 0}
          subtitle={`${tableOverview.tablesWaitingForBilling || 0} waiting for cashier checkout`}
          icon={Clock}
          iconColor="text-rose-600 dark:text-rose-400"
          iconBg="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900"
          badge={
            (tableOverview.tablesWaitingForService || 0) > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                Action Required
              </span>
            ) : null
          }
        />

        <StatCard
          title="Food Ready to Serve"
          value={orderOverview.readyOrders || 0}
          subtitle={`${orderOverview.preparingOrders || 0} currently cooking in kitchen`}
          icon={ChefHat}
          iconColor="text-[#173F36] dark:text-[#9FB29E]"
          iconBg="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
          badge={
            (orderOverview.readyOrders || 0) > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800">
                Ready Now
              </span>
            ) : null
          }
        />

        <StatCard
          title="Bills Ready to Deliver"
          value={billOverview.readyToDeliverBills || 0}
          subtitle={`${billOverview.pendingBills || 0} unpaid • ${billOverview.completedBills || 0} paid today`}
          icon={Receipt}
          iconColor="text-[#2563EB] dark:text-[#60A5FA]"
          iconBg="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800"
          badge={
            (billOverview.readyToDeliverBills || 0) > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Deliver
              </span>
            ) : null
          }
        />
      </div>

      {/* Real-Data Floor & Service Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Floor Table Occupancy (Donut Chart) */}
        <ChartCard
          title="Floor Table Occupancy"
          subtitle="Real-time dining floor distribution and guest service states"
          badge="Floor Status"
        >
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
            <DonutChart
              size={170}
              thickness={24}
              centerLabel="Tables"
              centerValue={tableOverview.totalTables || 0}
              data={[
                {
                  label: 'Available Tables',
                  value: tableOverview.availableTables || 0,
                  color: '#173F36',
                },
                {
                  label: 'Active Dining',
                  value: Math.max(
                    0,
                    (tableOverview.occupiedTables || 0) -
                      (tableOverview.tablesWaitingForService || 0) -
                      (tableOverview.tablesWaitingForBilling || 0)
                  ),
                  color: '#9FB29E',
                },
                {
                  label: 'Needs Attention',
                  value: tableOverview.tablesWaitingForService || 0,
                  color: '#DC2626',
                },
                {
                  label: 'Waiting for Bill',
                  value: tableOverview.tablesWaitingForBilling || 0,
                  color: '#2563EB',
                },
              ]}
            />

            <div className="space-y-3 w-full sm:w-56 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 border border-[#E4DCD0] dark:border-[#1E362E]">
                <span className="flex items-center gap-2 font-medium text-[#17251F] dark:text-[#F7EFE4]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#173F36]" />
                  Available
                </span>
                <span className="font-mono font-bold text-[#173F36] dark:text-[#9FB29E]">
                  {tableOverview.availableTables || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 border border-[#E4DCD0] dark:border-[#1E362E]">
                <span className="flex items-center gap-2 font-medium text-[#17251F] dark:text-[#F7EFE4]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9FB29E]" />
                  Active Dining
                </span>
                <span className="font-mono font-bold text-[#173F36] dark:text-[#9FB29E]">
                  {Math.max(
                    0,
                    (tableOverview.occupiedTables || 0) -
                      (tableOverview.tablesWaitingForService || 0) -
                      (tableOverview.tablesWaitingForBilling || 0)
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
                <span className="flex items-center gap-2 font-medium text-[#17251F] dark:text-[#F7EFE4]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                  Needs Attention
                </span>
                <span className="font-mono font-bold text-rose-800 dark:text-rose-300">
                  {tableOverview.tablesWaitingForService || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
                <span className="flex items-center gap-2 font-medium text-[#17251F] dark:text-[#F7EFE4]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                  Waiting for Bill
                </span>
                <span className="font-mono font-bold text-blue-800 dark:text-blue-300">
                  {tableOverview.tablesWaitingForBilling || 0}
                </span>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Today's Order Activity Curve (Line Chart) */}
        <ChartCard
          title="Today's Service Activity"
          subtitle="Hourly distribution of customer tickets generated and served"
          badge="Order Velocity"
          empty={orderActivityTrend.length === 0}
          emptyMessage="No guest orders recorded yet today. As guests are seated, activity will plot here."
        >
          <div className="pt-2">
            <LineChart
              data={orderActivityTrend}
              color="#173F36"
              height={190}
              valueLabel="tickets"
            />
            <div className="flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E] pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E] font-medium">
              <span>Active on Tables: <strong className="text-[#17251F] dark:text-[#F7EFE4]">{(orderOverview.newOrders || 0) + (orderOverview.preparingOrders || 0) + (orderOverview.readyOrders || 0)} orders</strong></span>
              <span>Dispatched Today: <strong className="font-mono text-[#173F36] dark:text-[#9FB29E] font-bold">{orderOverview.servedOrders || 0} served</strong></span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Service & Billing Pipeline Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Kitchen & Service Flow Pipeline"
          subtitle="Sequential progress of food items from order receipt to customer service"
          badge="Service Queue"
        >
          <div className="space-y-4 py-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#17251F] dark:text-[#F7EFE4]">Active Food Lifecycle</span>
              <span className="text-[#657168] dark:text-[#9FB29E] font-mono">
                {(orderOverview.newOrders || 0) +
                  (orderOverview.preparingOrders || 0) +
                  (orderOverview.readyOrders || 0) +
                  (orderOverview.servedOrders || 0)}{' '}
                Orders
              </span>
            </div>
            <StatusDistributionBar
              segments={[
                { label: 'New', count: orderOverview.newOrders || 0, color: '#3B82F6' },
                { label: 'Cooking', count: orderOverview.preparingOrders || 0, color: '#D97706' },
                { label: 'Ready', count: orderOverview.readyOrders || 0, color: '#173F36' },
                { label: 'Served', count: orderOverview.servedOrders || 0, color: '#9FB29E' },
              ]}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Guest Billing Dispatch Status"
          subtitle="Real-time delivery of guest checks and payment completion states"
          badge="Checkout Queue"
        >
          <div className="space-y-4 py-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#17251F] dark:text-[#F7EFE4]">Billing Reconciliation</span>
              <span className="text-[#657168] dark:text-[#9FB29E] font-mono">
                {(billOverview.pendingBills || 0) +
                  (billOverview.readyToDeliverBills || 0) +
                  (billOverview.deliveredBills || 0) +
                  (billOverview.completedBills || 0)}{' '}
                Bills
              </span>
            </div>
            <StatusDistributionBar
              segments={[
                { label: 'Unpaid', count: billOverview.pendingBills || 0, color: '#EF4444' },
                { label: 'Ready to Deliver', count: billOverview.readyToDeliverBills || 0, color: '#2563EB' },
                { label: 'Delivered', count: billOverview.deliveredBills || 0, color: '#173F36' },
                { label: 'Completed', count: billOverview.completedBills || 0, color: '#9FB29E' },
              ]}
            />
          </div>
        </ChartCard>
      </div>

      {/* D. TABLE-WISE ORDER STATUS GRID */}
      <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 sm:p-6 shadow-editorial space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4DCD0] dark:border-[#1E362E]">
          <div>
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Table-wise Service Matrix</span>
            </h2>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5">
              Real-time table occupancy, active orders, and one-click staff actions
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Cooking
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> Ready
            </span>
          </div>
        </div>

        {tableOrders.length === 0 ? (
          <div className="text-center py-16 bg-[#F7EFE4]/40 dark:bg-[#101A18]/40 rounded-2xl border border-dashed border-[#E4DCD0] dark:border-[#1E362E] text-[#657168] dark:text-[#9FB29E] text-sm">
            <Utensils className="w-10 h-10 mx-auto text-[#657168] dark:text-[#9FB29E] mb-2 stroke-1" />
            <div className="font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">No tables configured in this restaurant</div>
            <div className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">Configure restaurant tables to begin floor dispatching.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tableOrders.map((t) => {
              const order = t.currentOrder;
              const isReady = order?.status === 'READY';
              const isCooking = ['ACCEPTED', 'IN_PREPARATION'].includes(order?.status);
              const isPending = order?.status === 'PENDING';
              const isServed = order?.status === 'SERVED';
              const isAvailable = t.tableStatus === 'AVAILABLE';

              return (
                <div
                  key={t.tableId}
                  className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all shadow-editorial hover:shadow-md hover:-translate-y-0.5 ${
                    isReady
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 ring-1 ring-rose-300'
                      : isCooking
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : isServed
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : isAvailable
                      ? 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-[#173F36] dark:hover:border-[#9FB29E]'
                      : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]'
                  }`}
                >
                  {/* Top Bar & Visual */}
                  <div>
                    {/* Visual: Image or Fallback */}
                    <TableVisual
                      image={t.imageUrl || t.image}
                      tableNumber={t.tableNumber}
                      capacity={t.capacity}
                      status={t.operationalStatus}
                    />

                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-base font-extrabold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-1.5 font-mono">
                        Table #{t.tableNumber}
                        <span className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-sans font-normal">({t.capacity} seats)</span>
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                          isReady
                            ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 animate-pulse font-extrabold'
                            : isCooking
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-semibold'
                            : isPending
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-medium'
                            : isServed
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-[#173F36] dark:text-[#9FB29E] border-emerald-300 dark:border-emerald-700 font-semibold'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border-emerald-200 dark:border-emerald-800 font-semibold'
                        }`}
                      >
                        {t.operationalStatus}
                      </span>
                    </div>

                    {/* Order Details Body */}
                    {order ? (
                      <div className="space-y-1.5 my-3 text-xs bg-[#F7EFE4]/50 dark:bg-[#101A18]/60 p-3 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E]">
                        <div className="flex justify-between items-center text-[#17251F] dark:text-[#F7EFE4]">
                          <span className="font-bold font-mono">#{order.orderNumber}</span>
                          <span className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-semibold bg-white dark:bg-[#152320] px-2 py-0.5 rounded-md border border-[#E4DCD0] dark:border-[#1E362E]">
                            {order.itemsCount} Items
                          </span>
                        </div>
                        {order.itemsSummary && (
                          <p className="text-[11px] text-[#657168] dark:text-[#9FB29E] line-clamp-2 leading-relaxed">
                            {order.itemsSummary}
                          </p>
                        )}
                        {order.bill ? (
                          <div className="pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E] flex justify-between text-[11px]">
                            <span className="text-[#657168] dark:text-[#9FB29E]">Bill: #{order.bill.billNumber}</span>
                            <span className="font-bold text-[#173F36] dark:text-[#9FB29E] font-mono tabular-nums">
                              {currency}
                              {Number(order.bill.totalAmount || 0).toFixed(2)}
                            </span>
                          </div>
                        ) : isServed ? (
                          <div className="pt-2 border-t border-[#E5D8C6] flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-amber-800">Billing: Waiting for Receptionist</span>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-[#E5D8C6] flex justify-between items-center text-[11px]">
                            <span className="text-[#5B6470]">Billing: Locked until order is served.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="my-6 text-center text-[#657168] dark:text-[#9FB29E] text-xs font-medium italic">
                        Table available for new guests
                      </div>
                    )}
                  </div>

                  {/* Operational Action Buttons (Min 44px Touch Targets) */}
                  <div className="pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E] mt-2">
                    {isReady ? (
                      <button
                        type="button"
                        onClick={() => handleServeOrder(order.id, t.tableNumber)}
                        disabled={actionLoading === `serve-${order.id}`}
                        className="w-full min-h-[44px] py-2.5 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-bold rounded-xl text-xs shadow-editorial flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === `serve-${order.id}` ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[3]" />
                        )}
                        <span>SERVE CUSTOMER</span>
                      </button>
                    ) : order?.bill && !order.bill.isDelivered ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab && setActiveTab('bills')}
                          className="min-h-[44px] py-2 bg-[#FAF7F2] hover:bg-[#F1E8DB] active:scale-95 text-[#1F2937] font-semibold rounded-xl text-xs border border-[#E5D8C6] shadow-sandstone flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-[#92400E]" />
                          <span>VIEW BILL</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeliverBill(order.bill.id, t.tableNumber)}
                          disabled={actionLoading === `deliver-${order.bill.id}`}
                          className="min-h-[44px] py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white font-bold rounded-xl text-xs shadow-sandstone hover:shadow-sandstone-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === `deliver-${order.bill.id}` ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>DELIVER BILL</span>
                        </button>
                      </div>
                    ) : order?.bill && order.bill.isDelivered ? (
                      <button
                        type="button"
                        onClick={() => handleDeliverBill(order.bill.id, t.tableNumber)}
                        disabled={actionLoading === `deliver-${order.bill.id}`}
                        className="w-full min-h-[44px] py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white font-bold rounded-xl text-xs shadow-editorial flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === `deliver-${order.bill.id}` ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Receipt className="w-4 h-4" />
                        )}
                        <span>DELIVER BILL</span>
                      </button>
                    ) : order?.billRequested && !order?.bill ? (
                      <button
                        type="button"
                        disabled
                        className="w-full min-h-[44px] py-2.5 bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-95"
                      >
                        <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                        <span>BILL REQUESTED</span>
                      </button>
                    ) : isServed ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectTableForOrder) {
                              onSelectTableForOrder(t);
                            } else if (setActiveTab) {
                              setActiveTab('tables');
                            }
                          }}
                          className="min-h-[44px] py-2 bg-[#FAF7F2] hover:bg-[#F1E8DB] active:scale-95 text-[#1F2937] font-semibold rounded-xl text-xs border border-[#E5D8C6] shadow-sandstone hover:shadow-sandstone-md flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-[#92400E]" />
                          <span>ADD ITEMS</span>
                        </button>
                        <div className="min-h-[44px] py-2 px-2 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 text-center">
                          <Clock className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                          <span>WAITING BILL</span>
                        </div>
                      </div>
                    ) : isAvailable ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectTableForOrder) {
                            onSelectTableForOrder(t);
                          } else if (setActiveTab) {
                            setActiveTab('tables');
                          }
                        }}
                        className="w-full min-h-[44px] py-2.5 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-bold rounded-xl text-xs shadow-editorial flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>NEW ORDER</span>
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectTableForOrder) {
                              onSelectTableForOrder(t);
                            } else if (setActiveTab) {
                              setActiveTab('tables');
                            }
                          }}
                          className="min-h-[44px] py-2 bg-[#F7EFE4]/80 dark:bg-[#101A18] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] active:scale-95 text-[#17251F] dark:text-[#F7EFE4] font-semibold rounded-xl text-xs border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                          <span>ADD ITEMS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestBill(order.id, t.tableNumber)}
                          disabled={actionLoading === `bill-req-${order.id}`}
                          className="min-h-[44px] py-2 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-bold rounded-xl text-xs shadow-editorial flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === `bill-req-${order.id}` ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Receipt className="w-3.5 h-3.5" />
                          )}
                          <span>REQUEST BILL</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
