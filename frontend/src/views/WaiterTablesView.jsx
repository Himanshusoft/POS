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

/**
 * TableVisual helper: renders table image if provided in data,
 * with graceful fallback to a clean Sandstone graphic if missing/broken.
 */
function TableVisual({ image, tableNumber, capacity }) {
  const [imgError, setImgError] = useState(false);

  if (image && !imgError) {
    return (
      <div className="relative w-full h-28 rounded-xl overflow-hidden mb-3 border border-[#E5D8C6] bg-[#FAF7F2] group">
        <img
          src={image}
          alt={`Table ${tableNumber}`}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
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
    <div className="relative w-full h-24 rounded-xl mb-3 border border-[#E5D8C6] bg-gradient-to-br from-[#F7F3EC] to-[#FAF7F2] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#92400E_1px,transparent_1px)] [background-size:12px_12px]" />
      <div className="relative flex flex-col items-center justify-center text-[#92400E]">
        <div className="w-9 h-9 rounded-xl bg-white border border-[#E5D8C6] shadow-xs flex items-center justify-center text-[#92400E]">
          <LayoutGrid className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-bold text-[#5B6470] mt-1.5 flex items-center gap-1">
          <Users className="w-3 h-3 text-[#92400E]" /> {capacity} Guests Capacity
        </span>
      </div>
    </div>
  );
}

export default function WaiterTablesView({ onSelectTableForOrder }) {
  const { restaurant, addToast } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [viewingBill, setViewingBill] = useState(null);

  const currency = restaurant?.currency || '₹';

  const fetchTables = async () => {
    try {
      const res = await posService.tables.getAll();
      if (res.success && res.data) {
        setTables(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch restaurant tables', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 6000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] text-[#1F2937]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5D8C6] shadow-sandstone">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl text-[#92400E] shrink-0">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1F2937] flex items-center gap-2">
                Floor Tables Management
              </h1>
              <p className="text-xs text-[#5B6470] mt-0.5">
                Operational table assignments, seating, and live order states
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#5B6470] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F2937] placeholder-[#5B6470] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] transition-all min-h-[38px]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E5D8C6] text-xs overflow-x-auto">
            {['ALL', 'AVAILABLE', 'PREPARING', 'READY', 'SERVED', 'BILL_REQUESTED', 'BILL_READY'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap min-h-[32px] ${
                  filterStatus === st
                    ? 'bg-[#92400E] text-white shadow-sandstone font-bold'
                    : 'text-[#5B6470] hover:text-[#1F2937] hover:bg-[#F1E8DB]'
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
            <div key={i} className="bg-white border border-[#E5D8C6] rounded-2xl p-5 space-y-3 shadow-sandstone">
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
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5D8C6] text-[#5B6470] text-sm shadow-sandstone">
          <Utensils className="w-10 h-10 mx-auto text-[#9CA3AF] mb-2 stroke-1" />
          <div className="font-bold text-[#1F2937]">No tables found matching your search and filter criteria.</div>
          <p className="text-xs text-[#5B6470] mt-1">Try clearing search filters or changing the active status tab.</p>
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
                className={`flex flex-col justify-between p-5 rounded-2xl border transition shadow-sandstone hover:shadow-sandstone-md hover:-translate-y-0.5 ${
                  isBillReady
                    ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-400/40'
                    : isBillRequested
                    ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/40'
                    : isReady
                    ? 'bg-rose-50/40 border-rose-300'
                    : isCooking
                    ? 'bg-amber-50/40 border-amber-300'
                    : isServed
                    ? 'bg-emerald-50/30 border-emerald-200'
                    : isAvailable
                    ? 'bg-white border-[#E5D8C6] hover:border-[#92400E]'
                    : 'bg-white border-[#E5D8C6]'
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
                      <h3 className="text-lg font-bold text-[#1F2937] flex items-center gap-1.5 font-mono">
                        Table {t.tableNumber}
                      </h3>
                      <span className="text-xs text-[#5B6470] flex items-center gap-1 mt-0.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-[#92400E]" /> {t.capacity} Guests
                      </span>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                        isBillReady
                          ? 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold animate-pulse'
                          : isBillRequested
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold animate-pulse'
                          : isBillDelivered
                          ? 'bg-slate-100 text-slate-800 border-slate-300'
                          : isReady
                          ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse font-extrabold'
                          : isCooking
                          ? 'bg-amber-100 text-amber-900 border-amber-200'
                          : isPending
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : isServed
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
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
                    <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E5D8C6] space-y-2 text-xs my-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#1F2937] font-mono">#{activeOrder.orderNumber}</span>
                        <span className="text-[#5B6470] font-medium tabular-nums">
                          {activeOrder.items?.length || 0} Item
                          {(activeOrder.items?.length || 0) > 1 ? 's' : ''}
                        </span>
                      </div>

                      {activeOrder.items && activeOrder.items.length > 0 && (
                        <div className="text-[11px] text-[#5B6470] space-y-1 max-h-24 overflow-y-auto pr-1">
                          {activeOrder.items.map((i, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="truncate pr-2 font-medium">
                                <span className="font-bold text-[#1F2937]">{i.quantity}x</span> {i.menuItem?.name || i.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] uppercase px-1 rounded font-bold border border-slate-200 bg-white text-slate-600">
                                  {i.status}
                                </span>
                                <span className="text-[#92400E] font-mono font-bold tabular-nums">
                                  {currency}{Number(i.subtotal || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Authoritative Order Total */}
                      <div className="pt-2 border-t border-[#E5D8C6] flex justify-between items-center text-xs">
                        <span className="font-bold text-[#1F2937]">Total:</span>
                        <span className="text-[#92400E] font-mono text-sm font-extrabold tabular-nums">
                          {currency}{orderTotal.toFixed(2)}
                        </span>
                      </div>

                      {/* Bill Requested Status Callout */}
                      {isBillRequested && (
                        <div className="bg-amber-100/70 border border-amber-300 rounded-lg p-2 text-[11px] text-amber-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                          <span>Bill requested from reception</span>
                        </div>
                      )}

                      {/* Bill Ready Status Callout */}
                      {isBillReady && (
                        <div className="bg-blue-100/70 border border-blue-300 rounded-lg p-2 text-[11px] text-blue-900 flex items-center justify-between">
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
                        <div className="bg-emerald-100/70 border border-emerald-300 rounded-lg p-2 text-[11px] text-emerald-900 flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            Paid & Settled
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="my-8 text-center text-[#9CA3AF] text-xs italic">
                      Ready for next seated party
                    </div>
                  )}
                </div>

                {/* Contextual Action Buttons (Min 44px Touch Targets) */}
                <div className="pt-3 border-t border-[#E5D8C6]">
                  {isReady ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleServeOrder(activeOrder.id, t.tableNumber)}
                        disabled={actionLoading === `serve-${activeOrder.id}`}
                        className="w-full min-h-[44px] py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-95 text-white font-bold rounded-xl text-xs shadow-sandstone flex items-center justify-center gap-1.5 transition cursor-pointer"
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
                          className="min-h-[40px] py-2 bg-[#FAF7F2] hover:bg-[#F1E8DB] active:scale-95 text-[#1F2937] font-semibold rounded-lg text-[11px] border border-[#E5D8C6] flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-[#92400E]" />
                          <span>+ Add Items</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestBill(activeOrder.id, t.tableNumber)}
                          disabled={actionLoading === `bill-req-${activeOrder.id}`}
                          className="min-h-[40px] py-2 bg-[#92400E] hover:bg-[#78350F] active:scale-95 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
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
                        className="min-h-[44px] py-2.5 bg-white hover:bg-[#F1E8DB] active:scale-95 text-[#1F2937] border border-[#E5D8C6] font-bold rounded-xl text-xs shadow-sandstone flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-[#92400E]" />
                        <span>VIEW BILL</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeliverBill(activeOrder.bill.id, t.tableNumber)}
                        disabled={actionLoading === `deliver-${activeOrder.bill.id}`}
                        className="min-h-[44px] py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white font-bold rounded-xl text-xs shadow-sandstone flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
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
                        className="w-full min-h-[44px] py-2.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-95"
                      >
                        <Clock className="w-4 h-4 text-[#D97706] animate-spin" />
                        <span>BILL REQUESTED</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelBillRequest(activeOrder.id, t.tableNumber)}
                        disabled={actionLoading === `bill-cancel-${activeOrder.id}`}
                        className="w-full py-1.5 text-[11px] text-[#5B6470] hover:text-[#92400E] font-medium transition cursor-pointer text-center underline"
                      >
                        Reopen Order (Add More Items)
                      </button>
                    </div>
                  ) : isBillDelivered ? (
                    <div className="text-center min-h-[44px] flex items-center justify-center py-2 px-3 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-xl">
                      Bill delivered • Receptionist settling payment
                    </div>
                  ) : isAvailable ? (
                    <button
                      type="button"
                      onClick={() => onSelectTableForOrder && onSelectTableForOrder(t)}
                      className="w-full min-h-[44px] py-2.5 bg-[#92400E] hover:bg-[#78350F] active:scale-95 text-white font-bold rounded-xl text-xs shadow-sandstone flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>NEW ORDER</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectTableForOrder && onSelectTableForOrder(t)}
                        className="min-h-[44px] py-2.5 bg-[#FAF7F2] hover:bg-[#F1E8DB] active:scale-95 text-[#1F2937] font-semibold rounded-xl text-xs border border-[#E5D8C6] shadow-sandstone flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4 text-[#92400E]" />
                        <span>ADD ITEMS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestBill(activeOrder.id, t.tableNumber)}
                        disabled={actionLoading === `bill-req-${activeOrder.id}`}
                        className="min-h-[44px] py-2.5 bg-[#92400E] hover:bg-[#78350F] active:scale-95 text-white font-bold rounded-xl text-xs shadow-sandstone flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
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
