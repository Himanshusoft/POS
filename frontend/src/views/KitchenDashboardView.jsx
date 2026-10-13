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
  PackageCheck,
  AlertCircle,
  LayoutGrid,
  CheckCheck,
} from 'lucide-react';

export default function KitchenDashboardView({ setActiveTab }) {
  const { addToast } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDashboard = async () => {
    try {
      const res = await posService.kitchen.getDashboard();
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load kitchen dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 8000); // Polling every 8 seconds for live dashboard
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (orderId) => {
    setActionLoading(orderId);
    try {
      await posService.kitchen.acceptOrder(orderId);
      addToast('Ticket accepted by Kitchen Admin', 'info');
      fetchDashboard();
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
      fetchDashboard();
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
      fetchDashboard();
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
    { label: 'New', count: kpis.newOrders, color: '#2563EB' },
    { label: 'Cooking', count: kpis.preparingOrders, color: '#D97706' },
    { label: 'Ready', count: kpis.readyOrders, color: '#16A34A' },
    { label: 'Completed', count: kpis.completedOrders, color: '#92400E' },
  ], [kpis]);

  const queueDonutData = useMemo(() => [
    { label: 'New', value: kpis.newOrders, color: '#2563EB' },
    { label: 'Cooking', value: kpis.preparingOrders, color: '#D97706' },
    { label: 'Ready', value: kpis.readyOrders, color: '#16A34A' },
    { label: 'Completed', value: kpis.completedOrders, color: '#92400E' },
  ], [kpis]);

  const workloadBarData = useMemo(() => [
    { label: 'New', value: kpis.newOrders, color: '#2563EB', sublabel: 'Awaiting Kitchen' },
    { label: 'Cooking', value: kpis.preparingOrders, color: '#D97706', sublabel: 'On Stoves' },
    { label: 'Ready', value: kpis.readyOrders, color: '#16A34A', sublabel: 'Pass Counter' },
    { label: 'Completed', value: kpis.completedOrders, color: '#92400E', sublabel: 'Dispatched' },
  ], [kpis]);

  const lowStockChartData = useMemo(() => {
    return (lowStockList || []).slice(0, 5).map((item) => ({
      label: item.name,
      value: Number(item.currentStock) || 0,
      sublabel: `Min: ${item.minStockThreshold} ${item.unit || ''}`,
      color: Number(item.currentStock) <= 0 ? '#EF4444' : '#D97706',
    }));
  }, [lowStockList]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] dark:bg-[#141210] min-h-screen text-[#1F2937] dark:text-[#F7F3EC]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] p-5 sm:p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/40 flex items-center justify-center text-[#92400E] dark:text-[#D97706] shrink-0 shadow-xs">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] dark:text-[#F7F3EC] tracking-tight">
                Kitchen Admin Dashboard
              </h1>
              <Badge variant="warning" size="sm">
                KDS Live
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">
              Real-time kitchen metrics, table-wise active orders, and automated recipe inventory depletion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="outline"
            onClick={fetchDashboard}
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#92400E] dark:text-[#D97706]' : 'text-[#5B6470] dark:text-[#A89B8C]'}`} />
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
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
        />

        <StatCard
          title="Cooking"
          value={kpis.preparingOrders}
          subtitle="At prep station"
          icon={Flame}
          iconColor="text-[#D97706] dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
        />

        <StatCard
          title="Ready"
          value={kpis.readyOrders}
          subtitle="Waiter pickup"
          icon={CheckCircle2}
          iconColor="text-[#16A34A] dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
        />

        <StatCard
          title="Completed"
          value={kpis.completedOrders}
          subtitle="Served today"
          icon={CheckCheck}
          iconColor="text-[#92400E] dark:text-[#D97706]"
          iconBg="bg-[#FAF7F2] dark:bg-[#201C18] border border-[#E5D8C6] dark:border-[#382F26]"
        />

        <StatCard
          title="Low Stock"
          value={kpis.lowStockIngredients}
          subtitle="Below threshold"
          icon={AlertTriangle}
          iconColor="text-[#D97706] dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
        />

        <StatCard
          title="Out of Stock"
          value={kpis.outOfStockIngredients}
          subtitle="Depleted stock"
          icon={AlertCircle}
          iconColor="text-red-600 dark:text-rose-400"
          iconBg="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
        />

        <StatCard
          title="Avg Prep"
          value={`${kpis.averagePrepTimeMinutes}m`}
          subtitle="Order to ready"
          icon={Clock}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
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
            <div className="flex items-center justify-between text-xs text-[#5B6470] dark:text-[#A89B8C] pt-3 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 font-medium">
              <span>Cooking Capacity: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{kpis.preparingOrders > 0 ? `${kpis.preparingOrders} active pans` : 'Idle'}</strong></span>
              <span>Avg Turnaround: <strong className="font-mono text-[#1F2937] dark:text-[#F7F3EC]">{kpis.averagePrepTimeMinutes} mins</strong></span>
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
            <div className="flex items-center justify-between text-xs text-[#5B6470] dark:text-[#A89B8C] pt-2 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 font-medium">
              <span>Ready for Waiter Pickup: <strong className="text-[#16A34A] dark:text-emerald-400 font-bold">{kpis.readyOrders} dishes</strong></span>
              <span>Total Dispatched: <strong className="font-mono text-[#1F2937] dark:text-[#F7F3EC]">{kpis.completedOrders}</strong></span>
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
                className="text-xs font-bold text-[#D97706] hover:text-[#B45309] flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30"
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
            <div className="flex items-center justify-between text-xs text-[#5B6470] dark:text-[#A89B8C] pt-2 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 font-medium">
              <span>Low-stock items: <strong className="text-amber-800 dark:text-amber-400">{lowStockList.length}</strong></span>
              <span>Out of stock: <strong className="text-rose-700 dark:text-rose-400 font-bold">{outOfStockList.length}</strong></span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Critical Stock Alerts Bar (if any out of stock or low stock) */}
      {(lowStockList.length > 0 || outOfStockList.length > 0) && (
        <div className="bg-gradient-to-r from-amber-50/90 to-amber-100/50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm" role="alert">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D97706]/15 border border-[#D97706]/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#B45309]">Kitchen Inventory Attention Required</h4>
              <p className="text-[11px] sm:text-xs text-[#5B6470] font-medium mt-0.5">
                {outOfStockList.length > 0
                  ? `${outOfStockList.map((i) => i.name).join(', ')} is completely OUT OF STOCK.`
                  : `${lowStockList.map((i) => `${i.name} (${i.currentStock} ${i.unit})`).join(', ')} are running low.`}
              </p>
            </div>
          </div>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs font-bold text-[#92400E] hover:text-[#78350F] px-4 py-2 rounded-xl bg-white border border-[#E5D8C6] shadow-xs hover:shadow-sm active:scale-95 transition-all whitespace-nowrap cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
            >
              Check Inventory &rarr;
            </button>
          )}
        </div>
      )}

      {/* Table-Wise Orders Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#92400E]/10 flex items-center justify-center text-[#92400E]">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1F2937] tracking-tight">Active Table Orders</h2>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-[#1F2937] border border-[#E5D8C6] shadow-xs tabular-nums">
            {tableOrders.length}
          </span>
        </div>
        {setActiveTab && (
          <button
            onClick={() => setActiveTab('orders')}
            className="text-xs font-bold text-[#92400E] hover:text-[#78350F] transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] rounded-lg p-1"
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
            <div key={n} className="bg-white border border-[#E5D8C6] rounded-2xl p-5 space-y-4">
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
        <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF7F2] dark:bg-[#201C18] border border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-center mx-auto mb-4 text-[#9CA3AF]">
            <ChefHat className="w-8 h-8 text-[#92400E] dark:text-[#D97706]" />
          </div>
          <h3 className="text-lg font-bold text-[#1F2937] dark:text-[#F7F3EC]">Kitchen is All Clear!</h3>
          <p className="text-sm text-[#5B6470] dark:text-[#A89B8C] mt-1 font-medium">No active food orders currently pending or preparing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tableOrders.map((order) => {
            const isCritical = order.elapsedMinutes > 20 && order.status !== 'READY';
            const isWarning = order.elapsedMinutes > 10 && order.status !== 'READY';

            return (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-sm transition-all hover:shadow-md ${
                  order.status === 'READY'
                    ? 'border-emerald-300 bg-emerald-50/15'
                    : isCritical
                    ? 'border-red-300 bg-red-50/20'
                    : isWarning
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-[#E5D8C6]'
                }`}
              >
                <div>
                  {/* ORDER HEADER */}
                  <div className="flex items-start justify-between mb-3.5">
                    <div>
                      {/* TABLE / ORDER INFO */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl font-extrabold text-[#1F2937]">
                          Table #{order.tableNumber}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                            order.status === 'PENDING'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : order.status === 'ACCEPTED'
                              ? 'bg-amber-50 border-amber-200 text-[#92400E]'
                              : order.status === 'IN_PREPARATION'
                              ? 'bg-amber-100 border-amber-300 text-[#B45309]'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}
                        >
                          {order.status === 'IN_PREPARATION' ? 'COOKING' : order.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#5B6470] mt-1 font-medium">
                        Ticket: <span className="font-mono text-[#1F2937] font-bold">{order.orderNumber}</span> • Waiter:{' '}
                        <span className="text-[#1F2937] font-semibold">{order.waiter}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-xl bg-[#FAF7F2] border border-[#E5D8C6] shadow-xs">
                      <Clock className={`w-3.5 h-3.5 ${isCritical ? 'text-red-600 animate-pulse' : 'text-[#D97706]'}`} />
                      <span className={`tabular-nums ${isCritical ? 'text-red-600 font-bold' : 'text-[#1F2937] font-semibold'}`}>
                        {order.elapsedMinutes}m
                      </span>
                    </div>
                  </div>

                  {/* SPECIAL NOTES */}
                  {order.notes && (
                    <div className="text-xs text-[#B45309] bg-amber-50 p-2.5 rounded-xl border border-amber-200 mb-3 font-medium">
                      <strong>Kitchen Note:</strong> {order.notes}
                    </div>
                  )}

                  {/* ORDER ITEMS */}
                  <div className="space-y-2 border-t border-[#E5D8C6] pt-3.5">
                    {order.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs bg-[#FAF7F2] hover:bg-[#F1E8DB] rounded-xl px-3 py-2 border border-[#E5D8C6] transition-colors"
                      >
                        <span className="font-bold text-[#1F2937] flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-amber-100 text-[#B45309] border border-amber-200 flex items-center justify-center font-bold text-xs shrink-0 tabular-nums">
                            {item.quantity}
                          </span>
                          <span className="truncate max-w-[170px]">{item.name}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          {item.prepTime && (
                            <span className="text-[10px] text-[#5B6470] font-mono tabular-nums">
                              ~{item.prepTime}m
                            </span>
                          )}
                          {!item.hasRecipe && (
                            <span className="text-[9px] uppercase font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                              No Recipe
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recipe Ingredient Stock BOM Check */}
                  {order.calculatedIngredients && order.calculatedIngredients.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-[#E5D8C6]">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#5B6470] uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1.5 text-[#92400E]">
                          <PackageCheck className="w-3.5 h-3.5" /> Recipe Ingredients
                        </span>
                        <span className="font-mono text-[#5B6470] tabular-nums">
                          {order.calculatedIngredients.filter((i) => i.isSufficient).length}/
                          {order.calculatedIngredients.length} Stock OK
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {order.calculatedIngredients.map((ing, iIdx) => (
                          <div
                            key={iIdx}
                            className={`flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg border ${
                              ing.isSufficient
                                ? 'bg-[#FAF7F2] border-[#E5D8C6] text-[#1F2937]'
                                : 'bg-red-50 border-red-200 text-red-700 font-semibold'
                            }`}
                          >
                            <span className="truncate max-w-[130px] flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  ing.isSufficient ? 'bg-[#16A34A]' : 'bg-red-600 animate-ping'
                                }`}
                              ></span>
                              {ing.name}
                            </span>
                            <span className="font-mono text-[10px] text-right tabular-nums">
                              <span>Req: {ing.requiredQuantity} {ing.unit}</span>
                              <span className={`ml-1.5 ${ing.isSufficient ? 'text-[#5B6470]' : 'text-red-600 font-bold'}`}>
                                (Stock: {ing.currentStock})
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* EXISTING ACTION BUTTON */}
                <div className="pt-4 border-t border-[#E5D8C6] mt-4">
                  {order.status === 'PENDING' && (
                    <Button
                      variant="primary"
                      onClick={() => handleAccept(order.id)}
                      disabled={actionLoading === order.id}
                      className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
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
                    <div className="w-full min-h-[44px] bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 px-3 text-center flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
