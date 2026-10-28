import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  useAdminDashboardSummary,
  useReportsSales,
  useReportsInventory,
  useReportsWastage,
  useReportsFinancials,
} from '../hooks/usePosQueries';
import {
  BarChart3,
  TrendingUp,
  Boxes,
  Trash2,
  DollarSign,
  PieChart,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ReceiptText,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui';

export default function ReportsView() {
  const { restaurant, addToast } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'financials'

  const { data: dashboard = null, isLoading: loadingDash, refetch: refetchDash } = useAdminDashboardSummary(restaurant?.id);
  const { data: salesReport = null, isLoading: loadingSales, refetch: refetchSales } = useReportsSales(restaurant?.id);
  const { data: inventoryReport = null, isLoading: loadingInv, refetch: refetchInv } = useReportsInventory(restaurant?.id);
  const { data: wastageReport = null, isLoading: loadingWst, refetch: refetchWst } = useReportsWastage(restaurant?.id);
  const { data: financials = null, isLoading: loadingFin, refetch: refetchFin } = useReportsFinancials(restaurant?.id);

  const loading = (loadingDash && !dashboard) || (loadingSales && !salesReport);

  // Financial Ledger Filter
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('ALL');

  const currency = restaurant?.currency || '₹';

  const loadReports = async () => {
    try {
      await Promise.all([refetchDash(), refetchSales(), refetchInv(), refetchWst(), refetchFin()]);
      addToast('Analytical reports refreshed', 'success', 5000, { silent: true });
    } catch (err) {
      addToast(err.message || 'Failed to compile analytical reports', 'error');
    }
  };

  const filteredLedger = financials?.ledger?.filter((entry) => {
    const matchSearch =
      entry.description?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      entry.category?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      entry.method?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (entry.ref && entry.ref.toLowerCase().includes(ledgerSearch.toLowerCase()));

    const matchType =
      ledgerTypeFilter === 'ALL' ||
      (ledgerTypeFilter === 'SALE' && entry.type === 'SALE') ||
      (ledgerTypeFilter === 'EXPENSE' && entry.type === 'EXPENSE');

    return matchSearch && matchType;
  }) || [];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/30 border border-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0 shadow-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight">
              Executive Intelligence & Financial Command
            </h1>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-sans">
              Real-time financial performance, sales velocity, warehouse valuation, and Money In vs Money Out ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={loadReports}
            disabled={loading}
            icon={RefreshCw}
            loading={loading}
            title="Refresh Analytical Reports"
          >
            Refresh
          </Button>

          {/* View Switcher Tabs */}
          <div className="flex bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] p-1 rounded-xl shadow-editorial">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#173F36] text-white shadow-editorial font-bold'
                  : 'text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4]'
              }`}
            >
              Operational Overview
            </button>
            <button
              onClick={() => setActiveTab('financials')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'financials'
                  ? 'bg-[#173F36] text-white shadow-editorial font-bold'
                  : 'text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4]'
              }`}
            >
              Financial Ledger
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        /* TAB 1: OPERATIONAL OVERVIEW */
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 rounded-2xl shadow-editorial">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#657168] dark:text-[#9FB29E] uppercase tracking-wider">Gross Sales Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] mt-2 font-mono tabular-nums">
                {currency}{Number(dashboard?.totalRevenue || salesReport?.totalSales || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>Completed orders & settlements</span>
              </div>
            </div>

            <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 rounded-2xl shadow-editorial">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#657168] dark:text-[#9FB29E] uppercase tracking-wider">Total Orders Handled</span>
                <div className="w-8 h-8 rounded-xl bg-[#173F36]/10 dark:bg-[#173F36]/30 text-[#173F36] dark:text-[#9FB29E] border border-[#173F36]/20 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] mt-2 font-mono tabular-nums">
                {dashboard?.totalOrders || salesReport?.orderCount || 0}
              </div>
              <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-1 font-medium">
                Dine-In, Takeaway & Delivery
              </div>
            </div>

            <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 rounded-2xl shadow-editorial">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#657168] dark:text-[#9FB29E] uppercase tracking-wider">Warehouse Valuation</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] mt-2 font-mono tabular-nums">
                {currency}{Number(inventoryReport?.totalValuation || inventoryReport?.totalValue || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-1 font-medium">
                {inventoryReport?.totalItems || 0} ingredient SKUs on hand
              </div>
            </div>

            <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 rounded-2xl shadow-editorial">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#657168] dark:text-[#9FB29E] uppercase tracking-wider">Recorded Wastage Loss</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-serif font-bold text-rose-600 dark:text-rose-400 mt-2 font-mono tabular-nums">
                {currency}{Number(wastageReport?.totalWastageCost || wastageReport?.totalCost || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                {wastageReport?.incidentCount || 0} spoilage/prep incidents
              </div>
            </div>
          </div>

          {/* Sales Breakdown & Top Selling Dishes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Items */}
            <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 shadow-editorial">
              <h3 className="text-sm font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#173F36] dark:text-[#9FB29E]" />
                <span>Top Performing Menu Items</span>
              </h3>

              {salesReport?.topSellingItems?.length > 0 ? (
                <div className="space-y-3">
                  {salesReport.topSellingItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E]">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-[#173F36]/10 dark:bg-[#173F36]/30 text-[#173F36] dark:text-[#9FB29E] font-bold text-xs flex items-center justify-center font-mono">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                          {currency}{Number(item.totalRevenue || item.revenue || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] tabular-nums">{item.totalQuantity || item.quantity} sold</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[#657168] dark:text-[#9FB29E] text-xs">
                  Place and complete food orders to populate velocity stats.
                </div>
              )}
            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 shadow-editorial">
              <h3 className="text-sm font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#173F36] dark:text-[#9FB29E]" />
                <span>Payment Method Distribution</span>
              </h3>

              {salesReport?.paymentMethodBreakdown?.length > 0 ? (
                <div className="space-y-3">
                  {salesReport.paymentMethodBreakdown.map((pm, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E]">
                      <span className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] uppercase tracking-wider">{pm.method}</span>
                      <div className="text-right">
                        <div className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums">
                          {currency}{Number(pm.total || pm.amount || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] tabular-nums">{pm.count} transactions</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[#657168] dark:text-[#9FB29E] text-xs">
                  Settled payments will display method breakdown here.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* TAB 2: FINANCIAL STATEMENT & CASHFLOW LEDGER */
        <div className="space-y-6">
          {/* Financial KPI Cards: Money In vs Money Out */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-emerald-200 dark:border-emerald-800/40 p-5 rounded-2xl shadow-editorial">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Money In (Total Revenue)</span>
                </span>
                <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  {financials?.counts?.salesTransactions || 0} Sales
                </span>
              </div>
              <div className="text-3xl font-serif font-bold text-emerald-700 dark:text-emerald-300 mt-3 font-mono tabular-nums">
                +{currency}{Number(financials?.totalRevenue || 0).toFixed(2)}
              </div>
              <div className="mt-3 pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E] text-[11px] text-[#17251F] dark:text-[#F7EFE4] space-y-1">
                {financials?.breakdown?.revenueByMethod &&
                  Object.entries(financials.breakdown.revenueByMethod).map(([m, amt]) => (
                    <div key={m} className="flex justify-between font-mono">
                      <span className="text-[#657168] dark:text-[#9FB29E]">{m}:</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{currency}{Number(amt).toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-rose-200 dark:border-rose-800/40 p-5 rounded-2xl shadow-editorial">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Money Out (Total Expenses)</span>
                </span>
                <span className="text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-mono px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/40">
                  Purchases + Waste
                </span>
              </div>
              <div className="text-3xl font-serif font-bold text-rose-600 dark:text-rose-400 mt-3 font-mono tabular-nums">
                -{currency}{Number(financials?.totalExpenses || 0).toFixed(2)}
              </div>
              <div className="mt-3 pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E] text-[11px] text-[#17251F] dark:text-[#F7EFE4] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#657168] dark:text-[#9FB29E]">Supplier Purchases:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    -{currency}{Number(financials?.breakdown?.purchasesExpense || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#657168] dark:text-[#9FB29E]">Wastage / Spoilage Losses:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    -{currency}{Number(financials?.breakdown?.wastageExpense || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 rounded-2xl shadow-editorial">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#657168] dark:text-[#9FB29E] uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#173F36] dark:text-[#9FB29E]" />
                  <span>Net Revenue / Profit</span>
                </span>
                <span className="text-xs bg-[#173F36]/10 text-[#173F36] dark:text-[#9FB29E] font-semibold px-2 py-0.5 rounded-full border border-[#173F36]/20">
                  Cashflow
                </span>
              </div>
              <div className={`text-3xl font-serif font-bold mt-3 font-mono tabular-nums ${
                (financials?.netAmount || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {(financials?.netAmount || 0) >= 0 ? '+' : ''}
                {currency}{Number(financials?.netAmount || 0).toFixed(2)}
              </div>
              <p className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-3 pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E]">
                Calculated as: Total Settlements - (Supplier Invoices + Wastage Deductions)
              </p>
            </div>
          </div>

          {/* Ledger Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-4 rounded-2xl shadow-editorial">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#657168] dark:text-[#9FB29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ledger by description, vendor, or invoice #..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-10 pr-4 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
              />
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: 'ALL', label: 'All Transactions' },
                { id: 'SALE', label: 'Money In (Sales)' },
                { id: 'EXPENSE', label: 'Money Out (Expenses)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setLedgerTypeFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    ledgerTypeFilter === f.id
                      ? 'bg-[#173F36] text-white border-[#173F36] shadow-editorial font-bold'
                      : 'bg-[#F7EFE4] dark:bg-[#1E362E] text-[#657168] dark:text-[#9FB29E] border-[#E4DCD0] dark:border-[#254238] hover:bg-[#E4DCD0] dark:hover:bg-[#254238]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chronological Ledger Table */}
          <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
            <div className="p-4 border-b border-[#E4DCD0] dark:border-[#1E362E] flex items-center justify-between">
              <h3 className="text-sm font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-[#173F36] dark:text-[#9FB29E]" />
                <span>Chronological Financial Ledger ({filteredLedger.length} Records)</span>
              </h3>
              <span className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-mono">
                Showing newest to oldest activity
              </span>
            </div>

            {filteredLedger.length === 0 ? (
              <div className="py-16 text-center text-[#657168] dark:text-[#9FB29E] text-sm">
                No financial transactions found matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7EFE4] dark:bg-[#101A18] border-b border-[#E4DCD0] dark:border-[#1E362E] text-[#657168] dark:text-[#9FB29E] uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Date / Time</th>
                      <th className="py-3.5 px-4">Flow Type</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Description & Reference</th>
                      <th className="py-3.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DCD0]/60 dark:divide-[#1E362E]">
                    {filteredLedger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/40 transition-colors">
                        <td className="py-3 px-4 text-[#657168] dark:text-[#9FB29E] font-mono whitespace-nowrap tabular-nums">
                          {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold text-[10px] uppercase px-2.5 py-0.5 rounded-full border ${
                              tx.type === 'SALE'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
                            }`}
                          >
                            {tx.type === 'SALE' ? (
                              <>
                                <ArrowUpRight className="w-3 h-3" /> Money In
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className="w-3 h-3" /> Money Out
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#17251F] dark:text-[#F7EFE4] font-semibold uppercase text-[10px]">
                          {tx.category} ({tx.method})
                        </td>
                        <td className="py-3 px-4 text-[#17251F] dark:text-[#F7EFE4]">
                          <div>{tx.description}</div>
                          {tx.ref && <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-mono">Ref: {tx.ref}</div>}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums ${
                          tx.type === 'SALE' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {tx.type === 'SALE' ? '+' : ''}{currency}{Math.abs(tx.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
