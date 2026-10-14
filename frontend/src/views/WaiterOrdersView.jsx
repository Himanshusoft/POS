import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import { SkeletonTable } from '../components/ui/Skeleton';
import { useOrders, usePosMutations } from '../hooks/usePosQueries';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Eye,
  Check,
  PlusCircle
} from 'lucide-react';

export default function WaiterOrdersView({ onSelectTableForOrder }) {
  const { restaurant, addToast } = useAuth();
  const { data: orders = [], isLoading: loading, refetch: fetchOrders } = useOrders(restaurant?.id);
  const { invalidateOrders } = usePosMutations(restaurant?.id);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const handleServe = async (orderId, tableNumber) => {
    setActionLoading(`serve-${orderId}`);
    try {
      await posService.waiter.serveOrder(orderId);
      addToast(`Order for Table #${tableNumber} marked SERVED!`, 'success');
      invalidateOrders();
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: 'SERVED' }));
      }
    } catch (err) {
      addToast(err.message || 'Failed to serve order', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const reason = prompt('Please enter reason for order cancellation:');
    if (!reason || !reason.trim()) return;

    setActionLoading(`cancel-${orderId}`);
    try {
      await posService.orders.cancel(orderId, reason.trim());
      addToast('Order cancelled successfully', 'info');
      invalidateOrders();
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      addToast(err.message || 'Failed to cancel order', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const currency = restaurant?.currency || '₹';

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.table?.tableNumber && String(o.table.tableNumber).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return !['COMPLETED', 'CANCELLED'].includes(o.status);
    return o.status === statusFilter;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] text-[#1F2937]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5D8C6] shadow-sandstone">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl text-[#92400E] shrink-0">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1F2937] flex items-center gap-2">
                Waiter Orders & Tickets
              </h1>
              <p className="text-xs text-[#5B6470] mt-0.5">
                Track active orders, kitchen preparation status, and customer service delivery
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#5B6470] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table or order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F2937] placeholder-[#5B6470] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] min-h-[38px] transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E5D8C6] text-xs overflow-x-auto">
            {['ALL', 'READY', 'IN_PREPARATION', 'ACCEPTED', 'PENDING', 'SERVED', 'COMPLETED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer min-h-[32px] ${
                  statusFilter === st
                    ? 'bg-[#92400E] text-white shadow-sandstone font-bold'
                    : 'text-[#5B6470] hover:text-[#1F2937] hover:bg-[#F1E8DB]'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E5D8C6] rounded-2xl overflow-hidden shadow-sandstone">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={7} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-[#9CA3AF] text-sm">
            <ClipboardList className="w-10 h-10 mx-auto text-[#9CA3AF] mb-2 stroke-1" />
            <div className="font-bold text-[#1F2937]">No orders found matching the selected filter.</div>
            <p className="text-xs text-[#5B6470] mt-1">Try switching to "ALL" to inspect historic orders.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#5B6470] uppercase tracking-wider text-[11px] border-b border-[#E5D8C6]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Order #</th>
                  <th className="py-3.5 px-4 font-semibold">Table</th>
                  <th className="py-3.5 px-4 font-semibold">Dishes & Quantity</th>
                  <th className="py-3.5 px-4 font-semibold">Kitchen Status</th>
                  <th className="py-3.5 px-4 font-semibold">Billing Status</th>
                  <th className="py-3.5 px-4 font-semibold">Created</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D8C6] text-[#1F2937]">
                {filteredOrders.map((o) => {
                  const isReady = o.status === 'READY';
                  const isCooking = ['ACCEPTED', 'IN_PREPARATION'].includes(o.status);
                  const isPending = o.status === 'PENDING';
                  const isServed = o.status === 'SERVED';
                  const isCompleted = o.status === 'COMPLETED';

                  const totalItems = o.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                  const dishesSummary = o.items?.map((i) => `${i.quantity}x ${i.menuItem?.name || i.name}`).join(', ') || '';

                  return (
                    <tr
                      key={o.id}
                      className={`hover:bg-[#F1E8DB]/40 transition ${
                        isReady ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1F2937] tabular-nums">
                        #{o.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#1F2937] font-mono">
                          {o.table ? `Table #${o.table.tableNumber}` : 'Takeaway'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-medium text-[#1F2937] block truncate" title={dishesSummary}>
                          {dishesSummary || 'No items'}
                        </span>
                        <span className="text-[11px] text-[#5B6470] tabular-nums">{totalItems} Total items</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isReady
                              ? 'bg-rose-100 text-rose-800 border-rose-200 font-extrabold animate-pulse'
                              : isCooking
                              ? 'bg-amber-100 text-amber-900 border-amber-200'
                              : isPending
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : isServed
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {o.bill ? (
                          <span
                            className={`font-bold tabular-nums ${
                              o.bill.status === 'PAID'
                                ? 'text-emerald-800'
                                : o.bill.isDelivered
                                ? 'text-blue-800'
                                : 'text-[#92400E]'
                            }`}
                          >
                            {o.bill.status} ({currency}
                            {Number(o.bill.totalAmount).toFixed(2)})
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF] text-[11px]">Unbilled</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#5B6470] text-[11px] whitespace-nowrap font-mono tabular-nums">
                        {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isReady && (
                            <button
                              type="button"
                              onClick={() => handleServe(o.id, o.table?.tableNumber || 'Takeaway')}
                              disabled={actionLoading === `serve-${o.id}`}
                              className="px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-95 text-white font-bold rounded-xl text-xs shadow-sandstone flex items-center gap-1 cursor-pointer min-h-[36px]"
                            >
                              {actionLoading === `serve-${o.id}` ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                              <span>Serve</span>
                            </button>
                          )}

                          {!['COMPLETED', 'CANCELLED'].includes(o.status) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectTableForOrder && o.table) {
                                  onSelectTableForOrder(o.table);
                                }
                              }}
                              className="px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#F1E8DB] active:scale-95 text-[#1F2937] rounded-xl text-xs border border-[#E5D8C6] shadow-sandstone transition cursor-pointer min-h-[36px] flex items-center justify-center"
                              title="Add more dishes"
                            >
                              <PlusCircle className="w-4 h-4 text-[#92400E]" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedOrder(o)}
                            className="p-2 bg-[#FAF7F2] hover:bg-[#F1E8DB] active:scale-95 text-[#5B6470] hover:text-[#1F2937] rounded-xl border border-[#E5D8C6] shadow-sandstone transition cursor-pointer min-h-[36px] flex items-center justify-center"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Accessible Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Order #${selectedOrder.orderNumber}`}
          description={`Created at ${new Date(selectedOrder.createdAt).toLocaleTimeString()} • ${
            selectedOrder.table ? `Table #${selectedOrder.table.tableNumber}` : 'Takeaway'
          }`}
          size="md"
        >
          <div className="space-y-4">
            {/* Items Breakdown */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedOrder.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-xl border border-[#E5D8C6] text-xs"
                >
                  <div>
                    <span className="font-bold text-[#1F2937]">
                      {item.quantity}x {item.menuItem?.name || item.name}
                    </span>
                    {item.notes && <p className="text-[11px] text-amber-800 mt-0.5 font-medium">Note: {item.notes}</p>}
                  </div>
                  <span className="font-mono text-[#92400E] font-bold tabular-nums">
                    {currency}
                    {Number(item.subtotal || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Summary details */}
            <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E5D8C6] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5B6470]">Order Status:</span>
                <span className="font-bold text-[#1F2937] uppercase">{selectedOrder.status}</span>
              </div>
              {selectedOrder.readyAt && (
                <div className="flex justify-between">
                  <span className="text-[#5B6470]">Kitchen Ready At:</span>
                  <span className="text-emerald-800 font-semibold font-mono tabular-nums">
                    {new Date(selectedOrder.readyAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {selectedOrder.servedAt && (
                <div className="flex justify-between">
                  <span className="text-[#5B6470]">Customer Served At:</span>
                  <span className="text-teal-800 font-semibold font-mono tabular-nums">
                    {new Date(selectedOrder.servedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {selectedOrder.notes && (
                <div className="pt-2 border-t border-[#E5D8C6]">
                  <span className="text-[#5B6470] block text-[11px]">Special Instructions:</span>
                  <p className="text-[#1F2937] text-xs italic">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            {/* Actions in modal (min 44px) */}
            <div className="flex gap-2.5 pt-2">
              {selectedOrder.status === 'READY' && (
                <button
                  type="button"
                  onClick={() => handleServe(selectedOrder.id, selectedOrder.table?.tableNumber || 'Takeaway')}
                  className="flex-1 min-h-[44px] py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-sandstone flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Mark Served</span>
                </button>
              )}
              {selectedOrder.status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  className="min-h-[44px] py-2.5 px-4 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-800 border border-rose-200 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel Order
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="flex-1 min-h-[44px] py-2.5 bg-[#FAF7F2] hover:bg-[#F1E8DB] active:scale-95 text-[#1F2937] font-semibold rounded-xl text-xs border border-[#E5D8C6] shadow-sandstone transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
