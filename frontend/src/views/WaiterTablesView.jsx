import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';
import { Skeleton } from '../components/ui/Skeleton';
import {
  LayoutGrid,
  Users,
  RefreshCw,
  PlusCircle,
  Clock,
  CheckCircle2,
  Receipt,
  Check,
  Search,
  Eye,
  Utensils
} from 'lucide-react';
import { useTables, usePosMutations } from '../hooks/usePosQueries';

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
          <Users className="w-3 h-3 text-[#173F36] dark:text-[#9FB29E]" /> {capacity} Guests Capacity
        </span>
      </div>
    </div>
  );
}

export default function WaiterTablesView({ onSelectTableForOrder }) {
  const { restaurant, addToast } = useAuth();
  const {
    data: tables = [],
    isLoading: loading,
    refetch: fetchTables,
  } = useTables(restaurant?.id, { refetchInterval: 8000 });
  const { invalidateOrders, invalidateBilling } = usePosMutations(restaurant?.id);

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [viewingBill, setViewingBill] = useState(null);

  const currency = restaurant?.currency || '₹';

  const handleServeOrder = async (orderId, tableNumber) => {
    setActionLoading(`serve-${orderId}`);
    try {
      await posService.waiter.serveOrder(orderId);
      addToast(`Order for Table #${tableNumber} marked SERVED to customer!`, 'success');
      fetchTables();
    } catch (err) {
      addToast(err.message || 'Failed to mark order as served', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestBill = async (orderId, tableNumber) => {
    setActionLoading(`bill-req-${orderId}`);
    try {
      await posService.orders.requestBill(orderId);
      addToast(`Bill requested from Reception for Table #${tableNumber}!`, 'success');
      fetchTables();
    } catch (err) {
      addToast(err.message || 'Failed to request bill', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBillRequest = async (orderId, tableNumber) => {
    setActionLoading(`bill-cancel-${orderId}`);
    try {
      await posService.orders.cancelBillRequest(orderId);
      addToast(`Bill request cancelled for Table #${tableNumber}. You can now add more items.`, 'info');
      fetchTables();
    } catch (err) {
      addToast(err.message || 'Failed to cancel bill request', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeliverBill = async (billId, tableNumber) => {
    setActionLoading(`deliver-${billId}`);
    try {
      await posService.waiter.deliverBill(billId);
      addToast(`Bill delivered to Table #${tableNumber}!`, 'success');
      fetchTables();
    } catch (err) {
      addToast(err.message || 'Failed to deliver bill', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewBill = async (billId, fallbackBill = null) => {
    try {
      const res = await posService.billing.getBillById(billId);
      if (res.success && res.data) {
        setViewingBill(res.data);
      } else if (fallbackBill) {
        setViewingBill(fallbackBill);
      }
    } catch (err) {
      if (fallbackBill) {
        setViewingBill(fallbackBill);
      } else {
        addToast(err.message || 'Failed to retrieve bill invoice', 'error');
      }
    }
  };

  const filteredTables = tables.filter((t) => {
    const matchSearch = String(t.tableNumber).toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'AVAILABLE') return t.status === 'AVAILABLE';
    if (filterStatus === 'OCCUPIED') return t.status === 'OCCUPIED';

    const order = t.orders?.[0];
    const hasBill = Boolean(order?.bill);
    const isBillReady = hasBill && !order.bill.isDelivered && order.bill.status !== 'PAID';
    const isBillRequested = Boolean(order?.billRequested) && !hasBill;

    if (filterStatus === 'BILL_READY') return isBillReady;
    if (filterStatus === 'BILL_REQUESTED') return isBillRequested;
    if (filterStatus === 'READY') return order?.status === 'READY';
    if (filterStatus === 'PREPARING') return ['ACCEPTED', 'IN_PREPARATION'].includes(order?.status);
    if (filterStatus === 'SERVED') return order?.status === 'SERVED';

    return true;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 text-[#17251F] dark:text-[#F7EFE4]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] p-5 rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#173F36]/10 dark:bg-[#9FB29E]/10 border border-[#173F36]/20 rounded-xl text-[#173F36] dark:text-[#9FB29E] shrink-0">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
                Floor Tables Management
              </h1>
              <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5">
                Operational table assignments, seating, and live order states
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#657168] dark:text-[#9FB29E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-9 pr-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E]/60 focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all min-h-[38px]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F7EFE4]/50 dark:bg-[#101A18] p-1 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] text-xs overflow-x-auto">
            {['ALL', 'AVAILABLE', 'PREPARING', 'READY', 'SERVED', 'BILL_REQUESTED', 'BILL_READY'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap min-h-[32px] ${
                  filterStatus === st
                    ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial font-bold'
                    : 'text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E4DCD0]/40 dark:hover:bg-[#1E362E]'
                }`}
              >
                {st === 'BILL_REQUESTED' ? 'BILL REQ' : st === 'BILL_READY' ? 'BILL READY' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 space-y-3 shadow-editorial">
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="text-center py-16 bg-[#FFFDF9] dark:bg-[#152320] rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] text-[#657168] dark:text-[#9FB29E] text-sm shadow-editorial">
          <Utensils className="w-10 h-10 mx-auto text-[#657168] dark:text-[#9FB29E] mb-2 stroke-1" />
          <div className="font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">No tables found matching your search and filter criteria.</div>
          <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">Try clearing search filters or changing the active status tab.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredTables.map((t) => {
            const activeOrder = t.orders?.[0];
            const hasBill = Boolean(activeOrder?.bill);
            const isBillPaid = activeOrder?.bill?.status === 'PAID';
            const isBillReady = hasBill && !activeOrder.bill.isDelivered && !isBillPaid;
            const isBillDelivered = hasBill && activeOrder.bill.isDelivered && !isBillPaid;
            const isBillRequested = Boolean(activeOrder?.billRequested) && !hasBill;
            const isReady = activeOrder?.status === 'READY';
            const isCooking = ['ACCEPTED', 'IN_PREPARATION'].includes(activeOrder?.status);
            const isPending = activeOrder?.status === 'PENDING';
            const isServed = activeOrder?.status === 'SERVED';
            const isAvailable = t.status === 'AVAILABLE';

            const orderTotal = activeOrder?.items?.reduce((sum, it) => sum + Number(it.subtotal || 0), 0) || 0;

            return (
              <div
                key={t.id}
                className={`flex flex-col justify-between p-5 rounded-2xl border transition shadow-editorial hover:shadow-md hover:-translate-y-0.5 ${
                  isBillReady
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 ring-2 ring-blue-400/40'
                    : isBillRequested
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 ring-2 ring-amber-400/40'
                    : isReady
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                    : isCooking
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    : isServed
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                    : isAvailable
                    ? 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-[#173F36] dark:hover:border-[#9FB29E]'
                    : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]'
                }`}
              >
                {/* Header & Visual */}
                <div>
                  <TableVisual
                    image={t.imageUrl || t.image}
                    tableNumber={t.tableNumber}
                    capacity={t.capacity}
                  />

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-1.5 font-mono">
                        Table {t.tableNumber}
                      </h3>
                      <span className="text-xs text-[#657168] dark:text-[#9FB29E] flex items-center gap-1 mt-0.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" /> {t.capacity} Guests
                      </span>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                        isBillReady
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-extrabold animate-pulse'
                          : isBillRequested
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-extrabold animate-pulse'
                          : isBillDelivered
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          : isReady
                          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse font-extrabold'
                          : isCooking
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : isPending
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          : isServed
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-[#173F36] dark:text-[#9FB29E] border-emerald-200 dark:border-emerald-800'
                          : 'bg-emerald-100 dark:bg-emerald-900/40 text-[#173F36] dark:text-[#9FB29E] border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {isBillReady
                        ? 'BILL READY'
                        : isBillRequested
                        ? 'BILL REQUESTED'
                        : isBillDelivered
                        ? 'BILL DELIVERED'
                        : activeOrder
                        ? activeOrder.status
                        : t.status}
                    </span>
                  </div>

                  {/* Active Order Details */}
                  {activeOrder ? (
                    <div className="bg-[#F7EFE4]/50 dark:bg-[#101A18]/60 p-3 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] space-y-2 text-xs my-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] font-mono">#{activeOrder.orderNumber}</span>
                        <span className="text-[#657168] dark:text-[#9FB29E] font-medium tabular-nums">
                          {activeOrder.items?.length || 0} Item
                          {(activeOrder.items?.length || 0) > 1 ? 's' : ''}
                        </span>
                      </div>

                      {activeOrder.items && activeOrder.items.length > 0 && (
                        <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] space-y-1 max-h-24 overflow-y-auto pr-1">
                          {activeOrder.items.map((i, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="truncate pr-2 font-medium text-[#17251F] dark:text-[#F7EFE4]">
                                <span className="font-bold text-[#173F36] dark:text-[#9FB29E]">{i.quantity}x</span> {i.menuItem?.name || i.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] uppercase px-1 rounded font-bold border border-[#E4DCD0] dark:border-[#1E362E] bg-white dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E]">
                                  {i.status}
                                </span>
                                <span className="text-[#173F36] dark:text-[#9FB29E] font-mono font-bold tabular-nums">
                                  {currency}{Number(i.subtotal || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Authoritative Order Total */}
                      <div className="pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E] flex justify-between items-center text-xs">
                        <span className="font-bold text-[#17251F] dark:text-[#F7EFE4]">Total:</span>
                        <span className="text-[#173F36] dark:text-[#9FB29E] font-mono text-sm font-extrabold tabular-nums">
                          {currency}{orderTotal.toFixed(2)}
                        </span>
                      </div>

                      {/* Bill Requested Status Callout */}
                      {isBillRequested && (
                        <div className="bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg p-2 text-[11px] text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Bill requested from reception</span>
                        </div>
                      )}

                      {/* Bill Ready Status Callout */}
                      {isBillReady && (
                        <div className="bg-blue-100/70 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-lg p-2 text-[11px] text-blue-900 dark:text-blue-300 flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5 text-blue-700" />
                            Bill ready for customer!
                          </span>
                          <span className="font-mono font-bold tabular-nums">
                            {currency}{Number(activeOrder.bill.totalAmount).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Bill Paid Callout */}
                      {isBillPaid && (
                        <div className="bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-lg p-2 text-[11px] text-[#173F36] dark:text-emerald-300 flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            Paid & Settled
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="my-8 text-center text-[#657168] dark:text-[#9FB29E] text-xs italic">
                      Ready for next seated party
                    </div>
                  )}
                </div>

                {/* Contextual Action Buttons (Min 44px Touch Targets) */}
                <div className="pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E]">
                  {isReady ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleServeOrder(activeOrder.id, t.tableNumber)}
                        disabled={actionLoading === `serve-${activeOrder.id}`}
                        className="w-full min-h-[44px] py-2.5 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-bold rounded-xl text-xs shadow-editorial flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        {actionLoading === `serve-${activeOrder.id}` ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[3]" />
                        )}
                        <span>SERVE FOOD</span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectTableForOrder && onSelectTableForOrder(t)}
                          className="min-h-[40px] py-2 bg-[#F7EFE4]/80 dark:bg-[#101A18] hover:bg-[#F7EFE4] text-[#17251F] dark:text-[#F7EFE4] font-semibold rounded-lg text-[11px] border border-[#E4DCD0] dark:border-[#1E362E] flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                          <span>+ Add Items</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestBill(activeOrder.id, t.tableNumber)}
                          disabled={actionLoading === `bill-req-${activeOrder.id}`}
                          className="min-h-[40px] py-2 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === `bill-req-${activeOrder.id}` ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Receipt className="w-3.5 h-3.5" />
                          )}
                          <span>Request Bill</span>
                        </button>
                      </div>
                    </div>
                  ) : isBillReady ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewBill(activeOrder.bill.id, { ...activeOrder.bill, order: activeOrder })}
                        className="min-h-[44px] py-2.5 bg-white dark:bg-[#152320] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] active:scale-95 text-[#17251F] dark:text-[#F7EFE4] border border-[#E4DCD0] dark:border-[#1E362E] font-bold rounded-xl text-xs shadow-editorial flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-[#173F36] dark:text-[#9FB29E]" />
                        <span>VIEW BILL</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeliverBill(activeOrder.bill.id, t.tableNumber)}
                        disabled={actionLoading === `deliver-${activeOrder.bill.id}`}
                        className="min-h-[44px] py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white font-bold rounded-xl text-xs shadow-editorial flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === `deliver-${activeOrder.bill.id}` ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Receipt className="w-4 h-4" />
                        )}
                        <span>SERVE BILL</span>
                      </button>
                    </div>
                  ) : isBillRequested ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        disabled
                        className="w-full min-h-[44px] py-2.5 bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-95"
                      >
                        <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                        <span>BILL REQUESTED</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelBillRequest(activeOrder.id, t.tableNumber)}
                        disabled={actionLoading === `bill-cancel-${activeOrder.id}`}
                        className="w-full py-1.5 text-[11px] text-[#657168] dark:text-[#9FB29E] hover:text-[#173F36] dark:hover:text-[#FFFDF9] font-medium transition cursor-pointer text-center underline"
                      >
                        Reopen Order (Add More Items)
                      </button>
                    </div>
                  ) : isBillDelivered ? (
                    <div className="text-center min-h-[44px] flex items-center justify-center py-2 px-3 text-xs font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                      Bill delivered • Receptionist settling payment
                    </div>
                  ) : isAvailable ? (
                    <button
                      type="button"
                      onClick={() => onSelectTableForOrder && onSelectTableForOrder(t)}
                      className="w-full min-h-[44px] py-2.5 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-bold rounded-xl text-xs shadow-editorial flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>NEW ORDER</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectTableForOrder && onSelectTableForOrder(t)}
                        className="min-h-[44px] py-2.5 bg-[#F7EFE4]/80 dark:bg-[#101A18] hover:bg-[#F7EFE4] text-[#17251F] dark:text-[#F7EFE4] font-semibold rounded-xl text-xs border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                        <span>ADD ITEMS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestBill(activeOrder.id, t.tableNumber)}
                        disabled={actionLoading === `bill-req-${activeOrder.id}`}
                        className="min-h-[44px] py-2.5 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-bold rounded-xl text-xs shadow-editorial flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === `bill-req-${activeOrder.id}` ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Receipt className="w-4 h-4" />
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

      {/* Bill Inspection Modal for Waiter */}
      {viewingBill && (
        <ReceiptModal bill={viewingBill} onClose={() => setViewingBill(null)} />
      )}
    </div>
  );
}
