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
import { usePendingBillingOrders, useBills, usePayments, usePosMutations } from '../hooks/usePosQueries';

export default function ReceptionistDashboardView({ setActiveTab }) {
  const { restaurant, user, addToast } = useAuth();
  const currency = restaurant?.currency || '₹';

  const {
    data: pendingOrders = [],
    isLoading: loadingPending,
    isRefetching: refetchingPending,
    refetch: refetchPending,
  } = usePendingBillingOrders(restaurant?.id);

  const {
    data: bills = [],
    isLoading: loadingBills,
    isRefetching: refetchingBills,
    refetch: refetchBills,
  } = useBills(restaurant?.id, { limit: 100 });

  const {
    data: payments = [],
    isLoading: loadingPayments,
    isRefetching: refetchingPayments,
    refetch: refetchPayments,
  } = usePayments(restaurant?.id, { limit: 100 });

  const loading = (loadingPending && pendingOrders.length === 0) ||
    (loadingBills && bills.length === 0) ||
    (loadingPayments && payments.length === 0);
  const refreshing = refetchingPending || refetchingBills || refetchingPayments;
  const error = null;

  const fetchDashboardData = async () => {
    try {
      await Promise.all([refetchPending(), refetchBills(), refetchPayments()]);
    } catch (err) {
      addToast(err.message || 'Failed to refresh billing metrics', 'error');
    }
  };

  // Safe helper to extract payment info from bill
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800">
            <Banknote className="w-3 h-3 text-[#173F36] dark:text-[#9FB29E]" />
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Globe className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Razorpay</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] border border-[#E4DCD0] dark:border-[#1E362E]">
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
      CASH: { label: 'Cash', count: 0, amount: 0, color: '#173F36' },
      UPI: { label: 'UPI / QR', count: 0, amount: 0, color: '#2563EB' },
      CARD: { label: 'Card (POS)', count: 0, amount: 0, color: '#6366F1' },
      RAZORPAY: { label: 'Razorpay Online', count: 0, amount: 0, color: '#9FB29E' },
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 text-[#17251F] dark:text-[#F7EFE4] transition-colors duration-200">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#9FB29E]/10 border border-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0 shadow-sm">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight">
                Billing & Cashier Dashboard
              </h1>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-2xs font-sans">
                <CheckCircle2 className="w-3 h-3 text-[#173F36] dark:text-[#9FB29E]" />
                <span>Receptionist Live</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
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
                refreshing || loading ? 'animate-spin text-[#173F36] dark:text-[#9FB29E]' : 'text-[#657168] dark:text-[#9FB29E]'
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
        <div className="bg-gradient-to-br from-amber-50/90 to-[#F7EFE4]/80 dark:from-amber-950/30 dark:to-[#152320] border border-amber-300 dark:border-amber-700 rounded-2xl p-4 sm:p-5 shadow-editorial flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-200 block font-sans">
                {billRequestsCount} Bill {billRequestsCount === 1 ? 'Request' : 'Requests'} Pending from Waiters
              </span>
              <span className="text-xs text-[#657168] dark:text-[#9FB29E] font-medium">
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
              className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 shadow-editorial space-y-3"
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
            {/* KPI 1: Generated Invoices */}
            <StatCard
              title="Generated Invoices"
              value={totalInvoices}
              subtitle="Invoices generated"
              icon={Receipt}
              iconColor="text-[#173F36] dark:text-[#9FB29E]"
              iconBg="bg-[#173F36]/10 dark:bg-[#9FB29E]/10 border border-[#173F36]/20"
              onClick={() => navigateToBillingTab('bills')}
              badge={
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800">
                  {paidBillsCount} Paid
                </span>
              }
            />

            {/* KPI 2: Payment Transactions */}
            <StatCard
              title="Payment Transactions"
              value={totalPayments}
              subtitle="Transactions processed"
              icon={CreditCard}
              iconColor="text-[#2563EB] dark:text-[#60A5FA]"
              iconBg="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800"
              onClick={() => navigateToBillingTab('payments')}
              badge={
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Settled
                </span>
              }
            />

            {/* KPI 3: Unbilled Orders */}
            <StatCard
              title="Unbilled Orders"
              value={unbilledOrdersCount}
              subtitle="Orders awaiting billing"
              icon={Clock}
              iconColor="text-[#173F36] dark:text-[#9FB29E]"
              iconBg="bg-[#173F36]/10 dark:bg-[#9FB29E]/10 border border-[#173F36]/20"
              onClick={() => navigateToBillingTab('pending')}
              badge={
                billRequestsCount > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                    {billRequestsCount} Req
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] border border-[#E4DCD0] dark:border-[#1E362E]">
                    Live
                  </span>
                )
              }
            />

            {/* KPI 4: Paid / Unpaid Bills */}
            <StatCard
              title="Unpaid Bills"
              value={unpaidBillsCount}
              subtitle="Payments pending"
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
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800">
                    All Settled
                  </span>
                )
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
              className="text-xs font-bold text-[#173F36] dark:text-[#9FB29E] hover:underline flex items-center gap-1 cursor-pointer font-sans"
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
              color="#173F36"
              gradientColor="#9FB29E"
              currency={currency}
              height={195}
            />
            <div className="flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E] pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E] font-medium font-sans">
              <span>Settled Volume: <strong className="text-[#17251F] dark:text-[#F7EFE4]">{payments.length} transactions</strong></span>
              <span>Net Collected: <strong className="font-mono text-[#173F36] dark:text-[#9FB29E] font-bold">{currency}{paymentBreakdown.totalAmount.toFixed(2)}</strong></span>
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
            <div className="py-10 text-center text-xs text-[#657168] dark:text-[#9FB29E]">
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
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 border border-[#E4DCD0] dark:border-[#1E362E]"
                  >
                    <span className="flex items-center gap-2 font-medium text-[#17251F] dark:text-[#F7EFE4]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#173F36] dark:text-[#9FB29E] block">
                        {currency}{item.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#657168] dark:text-[#9FB29E]">
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
            <div className="flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E] pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E] font-medium font-sans">
              <span>Primary Gateway: <strong className="text-[#17251F] dark:text-[#F7EFE4]">{paymentBreakdown.items[0]?.label || 'None'}</strong></span>
              <span>Paid Bills: <strong className="font-mono text-[#173F36] dark:text-[#9FB29E]">{paidBillsCount} of {bills.length}</strong></span>
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
                <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] font-sans">Invoice Settlement Ratio</span>
                <span className="text-[#657168] dark:text-[#9FB29E] font-mono">
                  {bills.length} Invoices ({bills.length > 0 ? Math.round((paidBillsCount / bills.length) * 100) : 0}% settled)
                </span>
              </div>
              <StatusDistributionBar
                segments={[
                  { label: 'Paid Bills', count: paidBillsCount, color: '#173F36' },
                  { label: 'Unpaid Bills', count: unpaidBillsCount, color: '#EF4444' },
                ]}
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] font-sans">Guest Dining & Billing Pipeline</span>
                <span className="text-[#657168] dark:text-[#9FB29E] font-mono">
                  {bills.length + pendingOrders.length} Total Operations
                </span>
              </div>
              <StatusDistributionBar
                segments={[
                  { label: 'Paid Invoices', count: paidBillsCount, color: '#173F36' },
                  { label: 'Awaiting Payment', count: unpaidBillsCount, color: '#EF4444' },
                  { label: 'Unbilled Dining', count: unbilledOrdersCount, color: '#9FB29E' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                <span className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-medium block font-sans">Total Collected</span>
                <span className="text-base font-extrabold font-mono text-[#173F36] dark:text-[#9FB29E] mt-0.5 block">
                  {currency}{paymentBreakdown.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-center">
                <span className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-medium block font-sans">Waiter Bill Requests</span>
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
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl shadow-editorial overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#E4DCD0] dark:border-[#1E362E] flex items-center justify-between gap-3 bg-[#F7EFE4]/40 dark:bg-[#101A18]/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-800 dark:text-amber-300">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">Unbilled Orders</h2>
                <p className="text-[11px] text-[#657168] dark:text-[#9FB29E]">
                  {pendingOrders.length} order{pendingOrders.length === 1 ? '' : 's'} awaiting invoice generation
                </p>
              </div>
            </div>

            <button
              onClick={() => navigateToBillingTab('pending')}
              className="text-xs font-bold text-[#173F36] dark:text-[#9FB29E] hover:underline flex items-center gap-1 cursor-pointer font-sans"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 p-0 overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-[#E4DCD0]/50 dark:border-[#1E362E]/50 last:border-0">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : recentPendingOrders.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[#173F36] dark:text-[#9FB29E] flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">No unbilled orders</p>
                <p className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-0.5">
                  All served orders have invoices created or are in kitchen preparation.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-bold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider font-sans">
                  <tr>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Order No.</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DCD0] dark:divide-[#1E362E] text-[#17251F] dark:text-[#F7EFE4]">
                  {recentPendingOrders.map((ord) => {
                    const ordTotal = ord.items?.reduce((sum, i) => sum + Number(i.subtotal || 0), 0) || 0;
                    return (
                      <tr
                        key={ord.id}
                        className={`hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/30 transition-colors ${
                          ord.billRequested ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-[#17251F] dark:text-[#F7EFE4]">
                          Table #{ord.table?.tableNumber || ord.tableNumber || 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[#657168] dark:text-[#9FB29E]">
                          #{ord.orderNumber || ord.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-[#173F36] dark:text-[#9FB29E] tabular-nums">
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] transition-colors cursor-pointer shadow-editorial"
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
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl shadow-editorial overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#E4DCD0] dark:border-[#1E362E] flex items-center justify-between gap-3 bg-[#F7EFE4]/40 dark:bg-[#101A18]/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA]">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">Recent Payment Transactions</h2>
                <p className="text-[11px] text-[#657168] dark:text-[#9FB29E]">
                  {payments.length} total transaction{payments.length === 1 ? '' : 's'} recorded
                </p>
              </div>
            </div>

            <button
              onClick={() => navigateToBillingTab('payments')}
              className="text-xs font-bold text-[#173F36] dark:text-[#9FB29E] hover:underline flex items-center gap-1 cursor-pointer font-sans"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 p-0 overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-[#E4DCD0]/50 dark:border-[#1E362E]/50 last:border-0">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] flex items-center justify-center mx-auto mb-2">
                  <Banknote className="w-5 h-5" />
                </div>
                <p className="text-xs font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">No payment transactions yet</p>
                <p className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-0.5">
                  Payments settled via Cash, UPI, Card, or Razorpay will appear here.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-bold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider font-sans">
                  <tr>
                    <th className="px-4 py-3">Bill No.</th>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Paid At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DCD0] dark:divide-[#1E362E] text-[#17251F] dark:text-[#F7EFE4]">
                  {recentPayments.map((p) => {
                    const mode = p.paymentMethod || p.method || 'CASH';
                    return (
                      <tr key={p.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#17251F] dark:text-[#F7EFE4]">
                          {p.bill?.billNumber || `Bill #${p.billId?.slice(0, 6)}`}
                        </td>
                        <td className="px-4 py-3 text-[#657168] dark:text-[#9FB29E]">
                          Table #{p.bill?.order?.table?.tableNumber || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-[#173F36] dark:text-[#9FB29E] tabular-nums">
                          {currency}{Number(p.amountPaid || p.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {getMethodBadge(mode)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800">
                            {p.status || 'COMPLETED'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11px] text-[#657168] dark:text-[#9FB29E] tabular-nums">
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
      <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl shadow-editorial overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E4DCD0] dark:border-[#1E362E] flex items-center justify-between gap-3 bg-[#F7EFE4]/40 dark:bg-[#101A18]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#173F36]/10 dark:bg-[#9FB29E]/10 border border-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E]">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">Recent Generated Invoices</h2>
              <p className="text-[11px] text-[#657168] dark:text-[#9FB29E]">
                Compact ledger of guest bills, grand totals, and settlement statuses
              </p>
            </div>
          </div>

          <button
            onClick={() => navigateToBillingTab('bills')}
            className="text-xs font-bold text-[#173F36] dark:text-[#9FB29E] hover:underline flex items-center gap-1 cursor-pointer font-sans"
          >
            <span>View All Invoices</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#E4DCD0]/50 dark:border-[#1E362E]/50 last:border-0">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : recentBills.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-5 h-5" />
              </div>
              <p className="text-xs font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">No invoices generated yet</p>
              <p className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-0.5">
                Generate guest invoices from completed orders in the Billing terminal.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-bold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider font-sans">
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
              <tbody className="divide-y divide-[#E4DCD0] dark:divide-[#1E362E] text-[#17251F] dark:text-[#F7EFE4]">
                {recentBills.map((bill) => {
                  const info = getBillPaymentInfo(bill);
                  return (
                    <tr key={bill.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#17251F] dark:text-[#F7EFE4]">
                        {bill.billNumber || `BILL-${bill.id.slice(0, 8)}`}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#17251F] dark:text-[#F7EFE4]">
                        Table #{bill.order?.table?.tableNumber || bill.tableNumber || 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-extrabold text-[#173F36] dark:text-[#9FB29E] text-sm tabular-nums">
                        {currency}{Number(bill.totalAmount || bill.grandTotal || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5">
                        {info.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-[#173F36] dark:text-[#9FB29E]" />
                            <span>PAID</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <span>UNPAID</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {info.isPaid ? getMethodBadge(info.mode) : <span className="text-[10px] text-[#657168] dark:text-[#9FB29E]">Unsettled</span>}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-[#657168] dark:text-[#9FB29E] tabular-nums">
                        {formatDateTime(bill.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => navigateToBillingTab('bills')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#F7EFE4]/80 dark:bg-[#101A18] hover:bg-[#F7EFE4] text-[#17251F] dark:text-[#F7EFE4] border border-[#E4DCD0] dark:border-[#1E362E] transition-colors cursor-pointer shadow-editorial"
                          title="Inspect Invoice Details"
                        >
                          <Eye className="w-3 h-3 text-[#173F36] dark:text-[#9FB29E]" />
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
