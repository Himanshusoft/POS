import React, { useState, useEffect, useMemo } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { StatCard, Button, Badge, Skeleton, ChartCard, AreaChart, VerticalBarChart, DonutChart, HorizontalBarChart, StatusDistributionBar } from '../components/ui';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Eye,
  Utensils,
  ChevronRight,
  Banknote,
  Smartphone,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';

export default function ReceptionistDashboardView({ setActiveTab }) {
  const { restaurant, user, addToast } = useAuth();
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const currency = restaurant?.currency || '₹';

  // Load all existing receptionist-authorized billing & transaction data
  const fetchDashboardData = async (isBackground = false) => {
    if (!isBackground) {
      if (bills.length === 0 && payments.length === 0 && pendingOrders.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
    }
    setError(null);
    try {
      const [ordRes, billRes, payRes] = await Promise.all([
        posService.billing.getPendingOrders(),
        posService.billing.getBills({ limit: 100 }),
        posService.payments.getAll({ limit: 100 }),
      ]);

      if (ordRes.success) {
        const rawOrders = ordRes.data?.items || (Array.isArray(ordRes.data) ? ordRes.data : []);
        setPendingOrders(rawOrders.filter((o) => o.status === 'SERVED' && !o.bill));
      }
      if (billRes.success) {
        setBills(billRes.data?.items || (Array.isArray(billRes.data) ? billRes.data : []));
      }
      if (payRes.success) {
        setPayments(payRes.data?.items || (Array.isArray(payRes.data) ? payRes.data : []));
      }
    } catch (err) {
      if (!isBackground) {
        setError(err.message || 'Failed to load billing metrics');
        addToast(err.message || 'Failed to load billing metrics', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
    // Silent polling every 8 seconds for real-time cashier updates
    const interval = setInterval(() => fetchDashboardData(true), 8000);
    return () => clearInterval(interval);
  }, []);

  // Safe helper to extract payment info from bill (reusing the same logic from BillingView)
  const getBillPaymentInfo = (bill) => {
    if (!bill) {
      return {
        isPaid: false,
        isPartiallyPaid: false,
        statusText: 'UNPAID',
        mode: null,
        paidAt: null,
      };
    }

    const completedPayments = (bill.payments || []).filter(
      (p) => (p.status || 'COMPLETED').toUpperCase() === 'COMPLETED'
    );

    const sortedPayments = [...completedPayments].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    const latestPayment = sortedPayments[0];

    const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalBillAmount = Number(bill.totalAmount || bill.grandTotal || 0);

    const rawStatus = (bill.status || bill.paymentStatus || '').toUpperCase();
    const isPaid = rawStatus === 'PAID' || (totalBillAmount > 0 && totalPaid >= totalBillAmount);
    const isPartiallyPaid = !isPaid && (rawStatus === 'PARTIALLY_PAID' || (totalPaid > 0 && totalPaid < totalBillAmount));

    const statusText = isPaid ? 'PAID' : (isPartiallyPaid ? 'PARTIALLY_PAID' : 'UNPAID');

    let rawMode = null;
    if (isPaid || isPartiallyPaid) {
      rawMode =
        latestPayment?.method ||
        latestPayment?.paymentMethod ||
        bill.payments?.[0]?.method ||
        bill.payments?.[0]?.paymentMethod ||
        null;
    }

    const mode = rawMode ? String(rawMode).toUpperCase() : null;
    const paidAt =
      isPaid || isPartiallyPaid
        ? latestPayment?.createdAt || bill.payments?.[0]?.createdAt || bill.updatedAt || null
        : null;

    return {
      isPaid,
      isPartiallyPaid,
      statusText,
      mode,
      paidAt,
    };
  };

  const getMethodBadge = (mode) => {
    switch (mode?.toUpperCase()) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Banknote className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Cash</span>
          </span>
        );
      case 'UPI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Smartphone className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>UPI</span>
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <CreditCard className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>Card</span>
          </span>
        );
      case 'RAZORPAY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-[#92400E] dark:text-[#D97706] border border-amber-200 dark:border-amber-800">
            <Globe className="w-3 h-3 text-[#92400E] dark:text-[#D97706]" />
            <span>Razorpay</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FAF7F2] dark:bg-[#201C18] text-[#5B6470] dark:text-[#A89B8C] border border-[#E5D8C6] dark:border-[#382F26]">
            <span>{mode || 'Unsettled'}</span>
          </span>
        );
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  // Navigates directly to Billing & Cashier station with target tab preset
  const navigateToBillingTab = (targetSubTab = 'bills') => {
    sessionStorage.setItem('pos_billing_subtab', targetSubTab);
    if (setActiveTab) {
      setActiveTab('billing');
    }
  };

  // Derived KPI metrics
  const totalInvoices = bills.length;
  const totalPayments = payments.length;
  const unbilledOrdersCount = pendingOrders.length;
  const billRequestsCount = pendingOrders.filter((o) => o.billRequested).length;
  const unpaidBillsCount = bills.filter((b) => {
    const info = getBillPaymentInfo(b);
    return !info.isPaid;
  }).length;
  const paidBillsCount = bills.filter((b) => {
    const info = getBillPaymentInfo(b);
    return info.isPaid;
  }).length;

  // Real-data analytics breakdown
  const paymentBreakdown = useMemo(() => {
    const methods = {
      CASH: { label: 'Cash', count: 0, amount: 0, color: '#16A34A' },
      UPI: { label: 'UPI / QR', count: 0, amount: 0, color: '#2563EB' },
      CARD: { label: 'Card (POS)', count: 0, amount: 0, color: '#6366F1' },
      RAZORPAY: { label: 'Razorpay Online', count: 0, amount: 0, color: '#D97706' },
      OTHER: { label: 'Other', count: 0, amount: 0, color: '#8B5CF6' },
    };

    let totalAmount = 0;
    (payments || []).forEach((p) => {
      const mode = (p.paymentMethod || p.method || 'CASH').toUpperCase();
      const amt = Number(p.amountPaid || p.amount || 0);
      totalAmount += amt;
      if (methods[mode]) {
        methods[mode].count += 1;
        methods[mode].amount += amt;
      } else {
        methods.OTHER.count += 1;
        methods.OTHER.amount += amt;
      }
    });

    const list = Object.values(methods).filter((m) => m.count > 0);
    return {
      totalAmount,
      totalCount: payments.length,
      items: list.map((m) => ({
        label: m.label,
        value: m.count,
        amount: m.amount,
        color: m.color,
      })),
    };
  }, [payments]);

  const paymentTrendData = useMemo(() => {
    if (!payments || payments.length === 0) return [];
    const dateMap = {};
    payments.forEach((p) => {
      if (p.createdAt && (p.status || 'COMPLETED').toUpperCase() === 'COMPLETED') {
        const d = new Date(p.createdAt);
        const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        dateMap[key] = (dateMap[key] || 0) + Number(p.amountPaid || p.amount || 0);
      }
    });
    return Object.entries(dateMap).map(([label, value]) => ({
      label,
      value: Math.round(value),
    }));
  }, [payments]);

  const paymentPerformanceBarData = useMemo(() => {
    return (paymentBreakdown.items || []).map((item) => ({
      label: item.label,
      value: Math.round(item.amount),
      sublabel: `${item.value} txns`,
      color: item.color,
    }));
  }, [paymentBreakdown]);

  const recentBills = useMemo(() => bills.slice(0, 5), [bills]);
  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);
  const recentPendingOrders = useMemo(() => pendingOrders.slice(0, 5), [pendingOrders]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] dark:bg-[#141210] min-h-screen text-[#1F2937] dark:text-[#F7F3EC] transition-colors duration-200">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] p-5 sm:p-6 rounded-2xl shadow-sandstone">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/30 flex items-center justify-center text-[#92400E] dark:text-[#D97706] shrink-0 shadow-sm">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] dark:text-[#F7F3EC] tracking-tight">
                Billing & Cashier Dashboard
              </h1>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#16A34A]/10 dark:bg-[#16A34A]/20 text-[#16A34A] dark:text-[#34D399] border border-[#16A34A]/20 dark:border-[#16A34A]/30 flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3 h-3 text-[#16A34A] dark:text-[#34D399]" />
                <span>Receptionist Live</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">
              Monitor payments, invoices, billing activity and unbilled orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="md"
            onClick={() => fetchDashboardData(false)}
            disabled={refreshing || loading}
            title="Refresh Live Billing Data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${
                refreshing || loading ? 'animate-spin text-[#92400E] dark:text-[#D97706]' : 'text-[#5B6470] dark:text-[#A89B8C]'
              }`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigateToBillingTab('bills')}
            title="Open Billing & Cashier Dispatch"
          >
            <Receipt className="w-3.5 h-3.5 mr-1.5" />
            <span>Open Billing & Cashier</span>
          </Button>
        </div>
      </div>

      {/* ERROR ALERT IF INITIAL LOAD FAILED */}
      {error && !loading && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchDashboardData(false)}
            className="font-bold underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* LIVE BILL REQUEST NOTIFICATION BANNER */}
      {billRequestsCount > 0 && (
        <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-950 dark:text-amber-200 block">
                {billRequestsCount} Bill {billRequestsCount === 1 ? 'Request' : 'Requests'} Pending from Waiters
              </span>
              <span className="text-xs text-amber-900/80 dark:text-amber-300/80 font-medium">
                Dine-in guests finished meals and requested billing. Process invoice in Billing Dispatch.
              </span>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigateToBillingTab('pending')}
            className="shrink-0"
          >
            <span>Review Unbilled Orders</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      )}

      {/* KPI STATISTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-5 shadow-sandstone space-y-3"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))
        ) : (
          <>
            {/* KPI 1: Pending Billing */}
            <StatCard
              title="Pending Billing"
              value={unbilledOrdersCount}
              subtitle="SERVED orders without bills"
              icon={Clock}
              iconColor="text-[#D97706] dark:text-[#F59E0B]"
              iconBg="bg-[#D97706]/10 dark:bg-[#D97706]/20 border border-[#D97706]/20 dark:border-[#D97706]/30"
              onClick={() => navigateToBillingTab('pending')}
              badge={
                billRequestsCount > 0 ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                    {billRequestsCount} Req
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Eligible
                  </span>
                )
              }
            />

            {/* KPI 2: Bills Ready for Payment */}
            <StatCard
              title="Bills Ready for Payment"
              value={unpaidBillsCount}
              subtitle="Generated but unpaid bills"
              icon={AlertCircle}
              iconColor="text-rose-600 dark:text-rose-400"
              iconBg="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900"
              onClick={() => navigateToBillingTab('bills')}
              badge={
                unpaidBillsCount > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    Pending
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    All Settled
                  </span>
                )
              }
            />

            {/* KPI 3: Paid Bills */}
            <StatCard
              title="Paid Bills"
              value={paidBillsCount}
              subtitle="Successfully paid bills"
              icon={Receipt}
              iconColor="text-[#16A34A] dark:text-[#34D399]"
              iconBg="bg-[#16A34A]/10 dark:bg-[#16A34A]/20 border border-[#16A34A]/20 dark:border-[#16A34A]/30"
              onClick={() => navigateToBillingTab('bills')}
              badge={
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {totalInvoices} Total
                </span>
              }
            />

            {/* KPI 4: Payment Transactions */}
            <StatCard
              title="Payment Transactions"
              value={totalPayments}
              subtitle="Transactions processed"
              icon={CreditCard}
              iconColor="text-[#2563EB] dark:text-[#60A5FA]"
              iconBg="bg-[#2563EB]/10 dark:bg-[#2563EB]/20 border border-[#2563EB]/20 dark:border-[#2563EB]/30"
              onClick={() => navigateToBillingTab('payments')}
              badge={
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Settled
                </span>
              }
            />
          </>
        )}
      </div>

      {/* REAL-DATA VISUAL ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Payment Collection Velocity Trend (Area Chart) */}
        <ChartCard
          title="Payment Collection Velocity"
          subtitle="Daily settlement trajectory and total transaction revenue collected"
          badge="Revenue Curve"
          action={
            <button
              onClick={() => navigateToBillingTab('payments')}
              className="text-xs font-bold text-[#92400E] dark:text-[#D97706] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Transactions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
          empty={paymentTrendData.length === 0}
          emptyMessage="No payment transactions recorded yet. Settle bills to plot real collection curves."
        >
          <div className="pt-2">
            <AreaChart
              data={paymentTrendData}
              color="#16A34A"
              gradientColor="#10B981"
              currency={currency}
              height={195}
            />
            <div className="flex items-center justify-between text-xs text-[#5B6470] dark:text-[#A89B8C] pt-3 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 font-medium">
              <span>Settled Volume: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{payments.length} transactions</strong></span>
              <span>Net Collected: <strong className="font-mono text-[#16A34A] dark:text-emerald-400 font-bold">{currency}{paymentBreakdown.totalAmount.toFixed(2)}</strong></span>
            </div>
          </div>
        </ChartCard>

        {/* Chart 2: Payment Settlement Mix (Donut Chart) */}
        <ChartCard
          title="Payment Method Distribution"
          subtitle="Proportional split across Cash, UPI, Card, and Online Gateways"
          badge="Settlement Mix"
        >
          {paymentBreakdown.items.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#5B6470] dark:text-[#A89B8C]">
              No payment transactions recorded yet today.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
              <DonutChart
                size={170}
                thickness={24}
                centerLabel="Payments"
                centerValue={paymentBreakdown.totalCount}
                data={paymentBreakdown.items}
              />

              <div className="space-y-2.5 w-full sm:w-56 text-xs">
                {paymentBreakdown.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#201C18] border border-[#E5D8C6]/70 dark:border-[#382F26]"
                  >
                    <span className="flex items-center gap-2 font-medium text-[#1F2937] dark:text-[#F7F3EC]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#1F2937] dark:text-[#F7F3EC] block">
                        {currency}{item.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C]">
                        {item.value} txns
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 3: Payment Performance by Channel (Vertical Bar Chart) */}
        <ChartCard
          title="Channel Revenue Performance"
          subtitle="Total currency settled comparing Cash, UPI, and Card channels"
          badge="Channel Volume"
          empty={paymentPerformanceBarData.length === 0}
          emptyMessage="No gateway performance recorded yet."
        >
          <div className="pt-2">
            <VerticalBarChart
              data={paymentPerformanceBarData}
              height={195}
              currency={currency}
            />
            <div className="flex items-center justify-between text-xs text-[#5B6470] dark:text-[#A89B8C] pt-3 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50 font-medium">
              <span>Primary Gateway: <strong className="text-[#1F2937] dark:text-[#F7F3EC]">{paymentBreakdown.items[0]?.label || 'None'}</strong></span>
              <span>Paid Bills: <strong className="font-mono text-[#1F2937] dark:text-[#F7F3EC]">{paidBillsCount} of {bills.length}</strong></span>
            </div>
          </div>
        </ChartCard>

        {/* Chart 4: Invoice Settlement Health (Status Distribution Bar) */}
        <ChartCard
          title="Invoice Settlement & Dining Flow"
          subtitle="Comparison of completed payments, unpaid invoices, and open dining tables"
          badge="Billing Health"
        >
          <div className="space-y-6 py-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC]">Invoice Settlement Ratio</span>
                <span className="text-[#5B6470] dark:text-[#A89B8C] font-mono">
                  {bills.length} Invoices ({bills.length > 0 ? Math.round((paidBillsCount / bills.length) * 100) : 0}% settled)
                </span>
              </div>
              <StatusDistributionBar
                segments={[
                  { label: 'Paid Bills', count: paidBillsCount, color: '#16A34A' },
                  { label: 'Unpaid Bills', count: unpaidBillsCount, color: '#EF4444' },
                ]}
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E5D8C6]/50 dark:border-[#382F26]/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC]">Guest Dining & Billing Pipeline</span>
                <span className="text-[#5B6470] dark:text-[#A89B8C] font-mono">
                  {bills.length + pendingOrders.length} Total Operations
                </span>
              </div>
              <StatusDistributionBar
                segments={[
                  { label: 'Paid Invoices', count: paidBillsCount, color: '#16A34A' },
                  { label: 'Awaiting Payment', count: unpaidBillsCount, color: '#EF4444' },
                  { label: 'Unbilled Dining', count: unbilledOrdersCount, color: '#D97706' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                <span className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] font-medium block">Total Collected</span>
                <span className="text-base font-extrabold font-mono text-emerald-800 dark:text-emerald-300 mt-0.5 block">
                  {currency}{paymentBreakdown.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-center">
                <span className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] font-medium block">Waiter Bill Requests</span>
                <span className="text-base font-extrabold font-mono text-amber-900 dark:text-amber-300 mt-0.5 block">
                  {billRequestsCount} Pending
                </span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* TWO COLUMN GRID: UNBILLED ORDERS & RECENT PAYMENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION: UNBILLED ORDERS */}
        <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl shadow-sandstone overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-between gap-3 bg-[#FAF7F2]/50 dark:bg-[#201C18]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-[#92400E] dark:text-[#D97706]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1F2937] dark:text-[#F7F3EC]">Unbilled Orders</h2>
                <p className="text-[11px] text-[#5B6470] dark:text-[#A89B8C]">
                  {pendingOrders.length} order{pendingOrders.length === 1 ? '' : 's'} awaiting invoice generation
                </p>
              </div>
            </div>

            <button
              onClick={() => navigateToBillingTab('pending')}
              className="text-xs font-bold text-[#92400E] dark:text-[#D97706] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 p-0 overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-[#E5D8C6]/50 dark:border-[#382F26]/50 last:border-0">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : recentPendingOrders.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC]">No unbilled orders</p>
                <p className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] mt-0.5">
                  All served orders have invoices created or are in kitchen preparation.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Order No.</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D8C6] dark:divide-[#382F26] text-[#1F2937] dark:text-[#F7F3EC]">
                  {recentPendingOrders.map((ord) => {
                    const ordTotal = ord.items?.reduce((sum, i) => sum + Number(i.subtotal || 0), 0) || 0;
                    return (
                      <tr
                        key={ord.id}
                        className={`hover:bg-[#FAF7F2]/60 dark:hover:bg-[#25201C]/60 transition-colors ${
                          ord.billRequested ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                          Table #{ord.table?.tableNumber || ord.tableNumber || 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[#5B6470] dark:text-[#A89B8C]">
                          #{ord.orderNumber || ord.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-[#92400E] dark:text-[#D97706] tabular-nums">
                          {currency}{ordTotal.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {ord.billRequested ? (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                              BILL REQ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {ord.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigateToBillingTab('pending')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#92400E] hover:bg-[#78350F] text-white transition-colors cursor-pointer shadow-2xs"
                            title="Generate Bill in Billing Terminal"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Bill</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* SECTION: RECENT PAYMENT TRANSACTIONS */}
        <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl shadow-sandstone overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-between gap-3 bg-[#FAF7F2]/50 dark:bg-[#201C18]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA]">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1F2937] dark:text-[#F7F3EC]">Recent Payment Transactions</h2>
                <p className="text-[11px] text-[#5B6470] dark:text-[#A89B8C]">
                  {payments.length} total transaction{payments.length === 1 ? '' : 's'} recorded
                </p>
              </div>
            </div>

            <button
              onClick={() => navigateToBillingTab('payments')}
              className="text-xs font-bold text-[#92400E] dark:text-[#D97706] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 p-0 overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-[#E5D8C6]/50 dark:border-[#382F26]/50 last:border-0">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Banknote className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC]">No payment transactions yet</p>
                <p className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] mt-0.5">
                  Payments settled via Cash, UPI, Card, or Razorpay will appear here.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Bill No.</th>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Paid At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5D8C6] dark:divide-[#382F26] text-[#1F2937] dark:text-[#F7F3EC]">
                  {recentPayments.map((p) => {
                    const mode = p.paymentMethod || p.method || 'CASH';
                    return (
                      <tr key={p.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#25201C]/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                          {p.bill?.billNumber || `Bill #${p.billId?.slice(0, 6)}`}
                        </td>
                        <td className="px-4 py-3 text-[#5B6470] dark:text-[#A89B8C]">
                          Table #{p.bill?.order?.table?.tableNumber || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-[#92400E] dark:text-[#D97706] tabular-nums">
                          {currency}{Number(p.amountPaid || p.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {getMethodBadge(mode)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {p.status || 'COMPLETED'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11px] text-[#5B6470] dark:text-[#A89B8C] tabular-nums">
                          {formatDateTime(p.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* SECTION: RECENT GENERATED INVOICES */}
      <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl shadow-sandstone overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-between gap-3 bg-[#FAF7F2]/50 dark:bg-[#201C18]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/30 flex items-center justify-center text-[#92400E] dark:text-[#D97706]">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1F2937] dark:text-[#F7F3EC]">Recent Generated Invoices</h2>
              <p className="text-[11px] text-[#5B6470] dark:text-[#A89B8C]">
                Compact ledger of guest bills, grand totals, and settlement statuses
              </p>
            </div>
          </div>

          <button
            onClick={() => navigateToBillingTab('bills')}
            className="text-xs font-bold text-[#92400E] dark:text-[#D97706] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Invoices</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#E5D8C6]/50 dark:border-[#382F26]/50 last:border-0">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : recentBills.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC]">No invoices generated yet</p>
              <p className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] mt-0.5">
                Generate guest invoices from completed orders in the Billing terminal.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Bill No.</th>
                  <th className="px-5 py-3.5">Table</th>
                  <th className="px-5 py-3.5">Grand Total</th>
                  <th className="px-5 py-3.5">Payment Status</th>
                  <th className="px-5 py-3.5">Payment Mode</th>
                  <th className="px-5 py-3.5">Generated At</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D8C6] dark:divide-[#382F26] text-[#1F2937] dark:text-[#F7F3EC]">
                {recentBills.map((bill) => {
                  const info = getBillPaymentInfo(bill);
                  return (
                    <tr key={bill.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#25201C]/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                        {bill.billNumber || `BILL-${bill.id.slice(0, 8)}`}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#1F2937] dark:text-[#F7F3EC]">
                        Table #{bill.order?.table?.tableNumber || bill.tableNumber || 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-extrabold text-[#92400E] dark:text-[#D97706] text-sm tabular-nums">
                        {currency}{Number(bill.totalAmount || bill.grandTotal || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5">
                        {info.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>PAID</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <span>UNPAID</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {info.isPaid ? getMethodBadge(info.mode) : <span className="text-[10px] text-[#9CA3AF] dark:text-[#6B7280]">Unsettled</span>}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-[#5B6470] dark:text-[#A89B8C] tabular-nums">
                        {formatDateTime(bill.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => navigateToBillingTab('bills')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2F2722] text-[#1F2937] dark:text-[#F7F3EC] border border-[#E5D8C6] dark:border-[#382F26] transition-colors cursor-pointer"
                          title="Inspect Invoice Details"
                        >
                          <Eye className="w-3 h-3 text-[#92400E] dark:text-[#D97706]" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
