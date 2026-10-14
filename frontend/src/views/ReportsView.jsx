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
  Receipt,
  Boxes,
  Trash2,
  Calendar,
  DollarSign,
  PieChart,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ReceiptText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

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
      addToast('Analytical reports refreshed', 'success');
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] min-h-screen text-[#1F2937]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#92400E]" />
            <span>Executive Intelligence & Financial Command</span>
          </h1>
          <p className="text-sm text-[#5B6470]">
            Real-time financial performance, sales velocity, warehouse valuation, and Money In vs Money Out ledger
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-white border border-[#E5D8C6] p-1 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-[#92400E] text-white shadow-sm'
                : 'text-[#5B6470] hover:text-[#1F2937]'
            }`}
          >
            Operational Overview
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'financials'
                ? 'bg-[#92400E] text-white shadow-sm'
                : 'text-[#5B6470] hover:text-[#1F2937]'
            }`}
          >
            Financial Ledger (Cashflow)
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        /* TAB 1: OPERATIONAL OVERVIEW */
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E5D8C6] p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5B6470]">Gross Sales Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#1F2937] mt-2 font-mono">
                {currency}{Number(dashboard?.totalRevenue || salesReport?.totalSales || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-[#16A34A] mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Completed orders & settlements</span>
              </div>
            </div>

            <div className="bg-white border border-[#E5D8C6] p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5B6470]">Total Orders Handled</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#1F2937] mt-2">
                {dashboard?.totalOrders || salesReport?.orderCount || 0}
              </div>
              <div className="text-[11px] text-[#5B6470] mt-1">
                Dine-In, Takeaway & Delivery
              </div>
            </div>

            <div className="bg-white border border-[#E5D8C6] p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5B6470]">Warehouse Valuation</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#D97706] border border-amber-200 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#1F2937] mt-2 font-mono">
                {currency}{Number(inventoryReport?.totalValuation || inventoryReport?.totalValue || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-[#5B6470] mt-1">
                {inventoryReport?.totalItems || 0} ingredient SKUs on hand
              </div>
            </div>

            <div className="bg-white border border-[#E5D8C6] p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5B6470]">Recorded Wastage Loss</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#EF4444] border border-rose-200 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#EF4444] mt-2 font-mono">
                {currency}{Number(wastageReport?.totalWastageCost || wastageReport?.totalCost || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-[#EF4444] mt-1">
                {wastageReport?.incidentCount || 0} spoilage/prep incidents
              </div>
            </div>
          </div>

          {/* Sales Breakdown & Top Selling Dishes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Items */}
            <div className="bg-white border border-[#E5D8C6] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#1F2937] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#D97706]" />
                <span>Top Performing Menu Items</span>
              </h3>

              {salesReport?.topSellingItems?.length > 0 ? (
                <div className="space-y-3">
                  {salesReport.topSellingItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#E5D8C6]">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-[#E7DCCB] text-[#92400E] font-bold text-xs flex items-center justify-center font-mono">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-[#1F2937]">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-[#16A34A] font-mono">
                          {currency}{Number(item.totalRevenue || item.revenue || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#5B6470]">{item.totalQuantity || item.quantity} sold</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[#5B6470] text-xs">
                  Place and complete food orders to populate velocity stats.
                </div>
              )}
            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-white border border-[#E5D8C6] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#1F2937] mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#2563EB]" />
                <span>Payment Method Distribution</span>
              </h3>

              {salesReport?.paymentMethodBreakdown?.length > 0 ? (
                <div className="space-y-3">
                  {salesReport.paymentMethodBreakdown.map((pm, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#E5D8C6]">
                      <span className="text-xs font-bold text-[#1F2937] uppercase">{pm.method}</span>
                      <div className="text-right">
                        <div className="text-xs font-bold text-[#1F2937] font-mono">
                          {currency}{Number(pm.total || pm.amount || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#5B6470]">{pm.count} transactions</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[#5B6470] text-xs">
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
            <div className="bg-white border border-emerald-200 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Money In (Total Revenue)</span>
                </span>
                <span className="text-xs bg-emerald-50 text-[#16A34A] font-mono px-2 py-0.5 rounded-full border border-emerald-200">
                  {financials?.counts?.salesTransactions || 0} Sales
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#16A34A] mt-3 font-mono">
                +{currency}{Number(financials?.totalRevenue || 0).toFixed(2)}
              </div>
              <div className="mt-3 pt-2 border-t border-[#E5D8C6] text-[11px] text-[#1F2937] space-y-1">
                {financials?.breakdown?.revenueByMethod &&
                  Object.entries(financials.breakdown.revenueByMethod).map(([m, amt]) => (
                    <div key={m} className="flex justify-between font-mono">
                      <span className="text-[#5B6470]">{m}:</span>
                      <span className="text-[#16A34A] font-semibold">{currency}{Number(amt).toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white border border-rose-200 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#EF4444] uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Money Out (Total Expenses)</span>
                </span>
                <span className="text-xs bg-rose-50 text-[#EF4444] font-mono px-2 py-0.5 rounded-full border border-rose-200">
                  Purchases + Waste
                </span>
              </div>
              <div className="text-3xl font-extrabold text-[#EF4444] mt-3 font-mono">
                -{currency}{Number(financials?.totalExpenses || 0).toFixed(2)}
              </div>
              <div className="mt-3 pt-2 border-t border-[#E5D8C6] text-[11px] text-[#1F2937] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#5B6470]">Supplier Purchases:</span>
                  <span className="text-[#EF4444] font-semibold">
                    -{currency}{Number(financials?.breakdown?.purchasesExpense || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5B6470]">Wastage / Spoilage Losses:</span>
                  <span className="text-[#EF4444] font-semibold">
                    -{currency}{Number(financials?.breakdown?.wastageExpense || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E5D8C6] p-5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5B6470] uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#D97706]" />
                  <span>Net Revenue / Profit</span>
                </span>
                <span className="text-xs bg-amber-50 text-[#D97706] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  Cashflow
                </span>
              </div>
              <div className={`text-3xl font-extrabold mt-3 font-mono ${
                (financials?.netAmount || 0) >= 0 ? 'text-[#16A34A]' : 'text-[#EF4444]'
              }`}>
                {(financials?.netAmount || 0) >= 0 ? '+' : ''}
                {currency}{Number(financials?.netAmount || 0).toFixed(2)}
              </div>
              <p className="text-[11px] text-[#5B6470] mt-3 pt-2 border-t border-[#E5D8C6]">
                Calculated as: Total Settlements - (Supplier Invoices + Wastage Deductions)
              </p>
            </div>
          </div>

          {/* Ledger Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-[#E5D8C6] p-4 rounded-2xl shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#5B6470] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ledger by description, vendor, or invoice #..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl pl-10 pr-4 py-2 text-xs text-[#1F2937] placeholder-[#5B6470] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E]"
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    ledgerTypeFilter === f.id
                      ? 'bg-[#92400E] text-white border-[#92400E] shadow-sm'
                      : 'bg-[#FAF7F2] text-[#5B6470] border-[#E5D8C6] hover:bg-[#F1E8DB]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chronological Ledger Table */}
          <div className="bg-white border border-[#E5D8C6] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E5D8C6] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-[#D97706]" />
                <span>Chronological Financial Ledger ({filteredLedger.length} Records)</span>
              </h3>
              <span className="text-[11px] text-[#5B6470] font-mono">
                Showing newest to oldest activity
              </span>
            </div>

            {filteredLedger.length === 0 ? (
              <div className="py-16 text-center text-[#5B6470] text-sm">
                No financial transactions found matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#E5D8C6] text-[#5B6470] uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Flow Type</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Description & Reference</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5D8C6]/60 font-sans">
                    {filteredLedger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#F1E8DB]/40 transition-colors">
                        <td className="py-3 px-4 text-[#5B6470] font-mono whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full border ${
                              tx.type === 'SALE'
                                ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                                : 'bg-rose-50 text-[#EF4444] border-rose-200'
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
                        <td className="py-3 px-4 text-[#1F2937] font-semibold uppercase text-[10px]">
                          {tx.category} ({tx.method})
                        </td>
                        <td className="py-3 px-4 text-[#1F2937]">
                          <div>{tx.description}</div>
                          {tx.ref && <div className="text-[10px] text-[#5B6470] font-mono">Ref: {tx.ref}</div>}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                          tx.type === 'SALE' ? 'text-[#16A34A]' : 'text-[#EF4444]'
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
