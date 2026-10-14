import React, { useState, useEffect, useMemo } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { Button, Badge, Skeleton, StatCard, ChartCard, DonutChart, StatusDistributionBar, VerticalBarChart, HorizontalBarChart } from '../components/ui';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Flame,
  ArrowRight,
  AlertCircle,
  LayoutGrid,
  CheckCheck,
} from 'lucide-react';

import { useKitchenDashboard, usePosMutations } from '../hooks/usePosQueries';

export default function KitchenDashboardView({ setActiveTab }) {
  const { restaurant, addToast } = useAuth();
  const [actionLoading, setActionLoading] = useState(null);

  const {
    data: dashboardData = null,
    isLoading,
    refetch,
  } = useKitchenDashboard(restaurant?.id);

  const { invalidateOrders, invalidateInventory } = usePosMutations(restaurant?.id);
  const loading = isLoading && !dashboardData;

  const fetchDashboard = () => refetch();

  const handleAccept = async (orderId) => {
    setActionLoading(orderId);
    try {
      await posService.kitchen.acceptOrder(orderId);
      addToast('Ticket accepted by Kitchen Admin', 'info');
      invalidateOrders();
    } catch (err) {
      addToast(err.message || 'Failed to accept order', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartPrep = async (orderId) => {
    setActionLoading(orderId);
    try {
      await posService.kitchen.startPreparation(orderId);
      addToast('Order moved to Cooking / IN_PREPARATION', 'info');
      invalidateOrders();
    } catch (err) {
      addToast(err.message || 'Failed to start preparation', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReady = async (orderId) => {
    setActionLoading(orderId);
    try {
      await posService.kitchen.markReady(orderId);
      addToast('Order marked READY! Recipe ingredients automatically deducted from inventory.', 'success');
      invalidateOrders();
      invalidateInventory();
    } catch (err) {
      addToast(err.message || 'Failed to mark ready. Check ingredient stock.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const kpis = dashboardData?.kpis || {
    newOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    completedOrders: 0,
    lowStockIngredients: 0,
    outOfStockIngredients: 0,
    averagePrepTimeMinutes: 0,
  };

  const tableOrders = dashboardData?.tableOrders || [];
  const lowStockList = dashboardData?.lowStockList || [];
  const outOfStockList = dashboardData?.outOfStockList || [];

  const queueSegments = useMemo(() => [
    { label: 'New', count: kpis.newOrders, color: '#657168' },
    { label: 'Cooking', count: kpis.preparingOrders, color: '#2D6A4F' },
    { label: 'Ready', count: kpis.readyOrders, color: '#173F36' },
    { label: 'Completed', count: kpis.completedOrders, color: '#8D9890' },
  ], [kpis]);

  const queueDonutData = useMemo(() => [
    { label: 'New', value: kpis.newOrders, color: '#657168' },
    { label: 'Cooking', value: kpis.preparingOrders, color: '#2D6A4F' },
    { label: 'Ready', value: kpis.readyOrders, color: '#173F36' },
    { label: 'Completed', value: kpis.completedOrders, color: '#8D9890' },
  ], [kpis]);

  const workloadBarData = useMemo(() => [
    { label: 'New', value: kpis.newOrders, color: '#657168', sublabel: 'Awaiting Kitchen' },
    { label: 'Cooking', value: kpis.preparingOrders, color: '#2D6A4F', sublabel: 'On Stoves' },
    { label: 'Ready', value: kpis.readyOrders, color: '#173F36', sublabel: 'Pass Counter' },
    { label: 'Completed', value: kpis.completedOrders, color: '#8D9890', sublabel: 'Dispatched' },
  ], [kpis]);

  const lowStockChartData = useMemo(() => {
    return (lowStockList || []).slice(0, 5).map((item) => ({
      label: item.name,
      value: Number(item.currentStock) || 0,
      sublabel: `Min: ${item.minStockThreshold} ${item.unit || ''}`,
      color: Number(item.currentStock) <= 0 ? '#C53030' : '#B45309',
    }));
  }, [lowStockList]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#F7EFE4] dark:bg-[#101A18] min-h-screen text-[#17251F] dark:text-[#F7EFE4]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/20 border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center text-[#173F36] dark:text-[#4EBA87] shrink-0 shadow-xs">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight">
                Kitchen Admin Dashboard
              </h1>
              <Badge variant="warning" size="sm">
                KDS Live
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
              Real-time kitchen metrics, table-wise active orders, and automated recipe inventory depletion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="secondary"
            onClick={fetchDashboard}
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#173F36] dark:text-[#9FB29E]' : 'text-[#657168] dark:text-[#9FB29E]'}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 7 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        <StatCard
          title="New Orders"
          value={kpis.newOrders}
          subtitle="Awaiting kitchen"
          icon={AlertCircle}
          iconColor="text-[#657168] dark:text-[#9FB29E]"
          iconBg="bg-[#F7EFE4] dark:bg-[#1A2622] border border-[#E4DCD0] dark:border-[#233630]"
        />

        <StatCard
          title="Cooking"
          value={kpis.preparingOrders}
          subtitle="At prep station"
          icon={Flame}
          iconColor="text-[#B45309] dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
        />

        <StatCard
          title="Ready"
          value={kpis.readyOrders}
          subtitle="Waiter pickup"
          icon={CheckCircle2}
          iconColor="text-[#173F36] dark:text-[#4EBA87]"
          iconBg="bg-[#E8F3ED] dark:bg-[#1A2E26] border border-[#C5DED0] dark:border-[#244237]"
        />

        <StatCard
          title="Completed"
          value={kpis.completedOrders}
          subtitle="Served today"
          icon={CheckCheck}
          iconColor="text-[#2D6A4F] dark:text-[#88D4A8]"
          iconBg="bg-[#E8F3ED] dark:bg-[#1A2E26] border border-[#C5DED0] dark:border-[#244237]"
        />

        <StatCard
          title="Low Stock"
          value={kpis.lowStockIngredients}
          subtitle="Below threshold"
          icon={AlertTriangle}
          iconColor="text-[#B45309] dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
        />

        <StatCard
          title="Out of Stock"
          value={kpis.outOfStockIngredients}
          subtitle="Depleted stock"
          icon={AlertCircle}
          iconColor="text-[#C53030] dark:text-rose-400"
          iconBg="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900"
        />

        <StatCard
          title="Avg Prep"
          value={`${kpis.averagePrepTimeMinutes}m`}
          subtitle="Order to ready"
          icon={Clock}
          iconColor="text-[#173F36] dark:text-[#4EBA87]"
          iconBg="bg-[#173F36]/10 dark:bg-[#173F36]/20 border border-[#173F36]/20 dark:border-[#4EBA87]/30"
        />
      </div>

      {/* Kitchen Operations & Workload Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Kitchen Workload by Stage (Vertical Bar / Column Chart) */}
        <ChartCard
          title="Kitchen Workload by Station"
          subtitle="Real-time ticket volume across preparation and dispatch queues"
          badge="Live Capacity"
          empty={kpis.newOrders + kpis.preparingOrders + kpis.readyOrders + kpis.completedOrders === 0}
          emptyMessage="Kitchen stations are currently idle. Inbound dining tickets will appear here."
        >
          <div className="pt-2">
            <VerticalBarChart
              data={workloadBarData}
              height={195}
              valueLabel="tickets"
            />
            <div className="flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E] pt-3 border-t border-[#E4DCD0]/60 dark:border-[#1E362E]/60 font-medium">
              <span>Cooking Capacity: <strong className="text-[#17251F] dark:text-[#F7EFE4]">{kpis.preparingOrders > 0 ? `${kpis.preparingOrders} active pans` : 'Idle'}</strong></span>
              <span>Avg Turnaround: <strong className="font-mono text-[#17251F] dark:text-[#F7EFE4]">{kpis.averagePrepTimeMinutes} mins</strong></span>
            </div>
          </div>
        </ChartCard>

        {/* Order Stage Distribution (Donut Chart) */}
        <ChartCard
          title="Order Stage Ratio & Telemetry"
          subtitle="Proportional split of tickets in service today"
          badge="Queue Ratio"
        >
          <DonutChart
            data={queueDonutData}
            centerLabel="Total Tickets"
            centerValue={kpis.newOrders + kpis.preparingOrders + kpis.readyOrders + kpis.completedOrders}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Kitchen Pipeline Progress (Segmented Pipeline Bar) */}
        <ChartCard
          title="Kitchen Dispatch Pipeline"
          subtitle="Sequential flow of food orders from receipt to guest dispatch"
          badge="Flow Tracker"
        >
          <div className="space-y-4 pt-1">
            <StatusDistributionBar segments={queueSegments} />
            <div className="flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E] pt-2 border-t border-[#E4DCD0]/60 dark:border-[#1E362E]/60 font-medium">
              <span>Ready for Waiter Pickup: <strong className="text-[#173F36] dark:text-[#4EBA87] font-bold">{kpis.readyOrders} dishes</strong></span>
              <span>Total Dispatched: <strong className="font-mono text-[#17251F] dark:text-[#F7EFE4]">{kpis.completedOrders}</strong></span>
            </div>
          </div>
        </ChartCard>

        {/* Low-Stock Ingredient Alert Ranking (Horizontal Bar Chart) */}
        <ChartCard
          title="Ingredient Depletion Ranking"
          subtitle="Raw inventory safety levels tracked for recipe depletion"
          badge="Stock Monitor"
          action={
            setActiveTab && (
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-bold text-[#173F36] dark:text-[#4EBA87] hover:text-[#12332C] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-[#F7EFE4] dark:hover:bg-[#1A2622]"
              >
                <span>Inventory Room</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )
          }
          empty={lowStockChartData.length === 0}
          emptyMessage="Kitchen ingredient levels are optimal. Automated recipe deduction will monitor raw items."
        >
          <div className="space-y-4">
            <HorizontalBarChart
              data={lowStockChartData}
              valueLabel="in stock"
            />
            <div className="flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E] pt-2 border-t border-[#E4DCD0]/60 dark:border-[#1E362E]/60 font-medium">
              <span>Low-stock items: <strong className="text-[#B45309] dark:text-amber-400">{lowStockList.length}</strong></span>
              <span>Out of stock: <strong className="text-[#C53030] dark:text-rose-400 font-bold">{outOfStockList.length}</strong></span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Critical Stock Alerts Bar (if any out of stock or low stock) */}
      {(lowStockList.length > 0 || outOfStockList.length > 0) && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-editorial" role="alert">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#B45309]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#17251F] dark:text-[#F7EFE4]">Kitchen Inventory Attention Required</h4>
              <p className="text-[11px] sm:text-xs text-[#657168] dark:text-[#9FB29E] font-medium mt-0.5">
                {outOfStockList.length > 0
                  ? `${outOfStockList.map((i) => i.name).join(', ')} is completely OUT OF STOCK.`
                  : `${lowStockList.map((i) => `${i.name} (${i.currentStock} ${i.unit})`).join(', ')} are running low.`}
              </p>
            </div>
          </div>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs font-bold text-[#173F36] dark:text-[#4EBA87] hover:text-[#12332C] px-4 py-2 rounded-xl bg-[#F7EFE4] dark:bg-[#1A2622] border border-[#E4DCD0] dark:border-[#1E362E] shadow-xs hover:shadow-sm active:scale-95 transition-all whitespace-nowrap cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
            >
              Check Inventory &rarr;
            </button>
          )}
        </div>
      )}

      {/* Table-Wise Orders Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#173F36]/10 dark:bg-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#4EBA87]">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight">Active Table Orders</h2>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFFDF9] dark:bg-[#152320] text-[#17251F] dark:text-[#F7EFE4] border border-[#E4DCD0] dark:border-[#1E362E] shadow-xs tabular-nums">
            {tableOrders.length}
          </span>
        </div>
        {setActiveTab && (
          <button
            onClick={() => setActiveTab('orders')}
            className="text-xs font-bold text-[#173F36] dark:text-[#4EBA87] hover:text-[#12332C] transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] rounded-lg p-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table-Wise Orders Grid */}
      {loading && !dashboardData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 space-y-4 shadow-editorial">
              <div className="flex justify-between items-center">
                <Skeleton className="w-24 h-6 rounded-md" />
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>
              <Skeleton className="w-full h-16 rounded-xl" />
              <Skeleton className="w-full h-10 rounded-xl" />
            </div>
          ))}
        </div>
      ) : tableOrders.length === 0 ? (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-16 text-center shadow-editorial">
          <div className="w-16 h-16 rounded-2xl bg-[#F7EFE4] dark:bg-[#1A2622] border border-[#E4DCD0] dark:border-[#1E362E] flex items-center justify-center mx-auto mb-4 text-[#8D9890]">
            <ChefHat className="w-8 h-8 text-[#173F36] dark:text-[#4EBA87]" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#173F36] dark:text-[#F7EFE4]">Kitchen is All Clear!</h3>
          <p className="text-sm text-[#657168] dark:text-[#9FB29E] mt-1 font-medium">No active food orders currently pending or preparing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tableOrders.map((order) => {
            const isCritical = order.elapsedMinutes > 20 && order.status !== 'READY';
            const isWarning = order.elapsedMinutes > 10 && order.status !== 'READY';

            return (
              <div
                key={order.id}
                className={`bg-[#FFFDF9] dark:bg-[#152320] border rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-editorial transition-all hover:shadow-md ${
                  order.status === 'READY'
                    ? 'border-[#2D6A4F]/40 bg-[#E8F3ED]/30 dark:bg-[#1A2E26]/40'
                    : isCritical
                    ? 'border-rose-300 bg-rose-50/30 dark:bg-rose-950/20'
                    : isWarning
                    ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/20'
                    : 'border-[#E4DCD0] dark:border-[#1E362E]'
                }`}
              >
                <div>
                  {/* ORDER HEADER */}
                  <div className="flex items-start justify-between mb-3.5">
                    <div>
                      {/* TABLE / ORDER INFO */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif text-xl font-bold text-[#173F36] dark:text-[#F7EFE4]">
                          Table #{order.tableNumber}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                            order.status === 'PENDING'
                              ? 'bg-[#F7EFE4] border-[#E4DCD0] text-[#17251F] dark:bg-[#1A2622] dark:text-[#F7EFE4]'
                              : order.status === 'ACCEPTED'
                              ? 'bg-amber-50 border-amber-200 text-[#B45309] dark:bg-amber-950/40 dark:text-amber-400'
                              : order.status === 'IN_PREPARATION'
                              ? 'bg-[#173F36]/10 border-[#173F36]/20 text-[#173F36] dark:bg-[#173F36]/20 dark:text-[#4EBA87]'
                              : 'bg-[#E8F3ED] border-[#C5DED0] text-[#1E4D38] dark:bg-[#1A2E26] dark:text-[#88D4A8]'
                          }`}
                        >
                          {order.status === 'IN_PREPARATION' ? 'COOKING' : order.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-1 font-medium">
                        Ticket: <span className="font-mono text-[#17251F] dark:text-[#F7EFE4] font-bold">{order.orderNumber}</span> • Waiter:{' '}
                        <span className="text-[#17251F] dark:text-[#F7EFE4] font-semibold">{order.waiter}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-xl bg-[#F7EFE4] dark:bg-[#1A2622] border border-[#E4DCD0] dark:border-[#1E362E] shadow-2xs">
                      <Clock className={`w-3.5 h-3.5 ${isCritical ? 'text-[#C53030] animate-pulse' : 'text-[#173F36] dark:text-[#4EBA87]'}`} />
                      <span className={`tabular-nums ${isCritical ? 'text-[#C53030] font-bold' : 'text-[#17251F] dark:text-[#F7EFE4] font-semibold'}`}>
                        {order.elapsedMinutes}m
                      </span>
                    </div>
                  </div>

                  {/* SPECIAL NOTES */}
                  {order.notes && (
                    <div className="text-xs text-[#B45309] dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 mb-3 font-medium">
                      <strong>Kitchen Note:</strong> {order.notes}
                    </div>
                  )}

                  {/* ORDER ITEMS */}
                  <div className="space-y-2 border-t border-[#E4DCD0] dark:border-[#1E362E] pt-3.5">
                    {order.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs bg-[#F7EFE4]/60 dark:bg-[#1A2622]/60 hover:bg-[#F7EFE4] dark:hover:bg-[#1A2622] rounded-xl px-3 py-2 border border-[#E4DCD0] dark:border-[#1E362E] transition-colors"
                      >
                        <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-[#173F36]/10 dark:bg-[#173F36]/20 text-[#173F36] dark:text-[#4EBA87] border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center font-bold text-xs shrink-0 tabular-nums">
                            {item.quantity}
                          </span>
                          <span className="truncate max-w-[170px]">{item.name}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          {item.prepTime && (
                            <span className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums">
                              ~{item.prepTime}m
                            </span>
                          )}
                          {!item.hasRecipe && (
                            <span className="text-[9px] uppercase font-bold text-[#C53030] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-1.5 py-0.5 rounded">
                              No Recipe
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <div className="pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E] mt-4">
                  {order.status === 'PENDING' && (
                    <Button
                      variant="primary"
                      onClick={() => handleAccept(order.id)}
                      disabled={actionLoading === order.id}
                      className="w-full min-h-[44px] font-bold text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      <span>{actionLoading === order.id ? 'Accepting...' : 'Accept Order'}</span>
                    </Button>
                  )}

                  {order.status === 'ACCEPTED' && (
                    <Button
                      variant="primary"
                      onClick={() => handleStartPrep(order.id)}
                      disabled={actionLoading === order.id}
                      className="w-full min-h-[44px] font-bold text-xs"
                    >
                      <Flame className="w-4 h-4 mr-2" />
                      <span>{actionLoading === order.id ? 'Starting...' : 'Start Cooking'}</span>
                    </Button>
                  )}

                  {order.status === 'IN_PREPARATION' && (
                    <Button
                      variant="success"
                      onClick={() => handleMarkReady(order.id)}
                      disabled={actionLoading === order.id}
                      className="w-full min-h-[44px] font-bold text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      <span>{actionLoading === order.id ? 'Marking...' : 'Mark Food Ready (Deduct Stock)'}</span>
                    </Button>
                  )}

                  {order.status === 'READY' && (
                    <div className="w-full min-h-[44px] bg-[#E8F3ED] dark:bg-[#1A2E26] border border-[#C5DED0] dark:border-[#244237] rounded-xl py-2.5 px-3 text-center flex items-center justify-center">
                      <span className="text-xs font-bold text-[#1E4D38] dark:text-[#88D4A8] flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#88D4A8]" />
                        <span>Ready for Waiter Delivery</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
