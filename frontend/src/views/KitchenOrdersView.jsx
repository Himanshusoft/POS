import React, { useState, useEffect, useMemo, useCallback } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { Modal, SkeletonTable, EmptyState, Badge, Button } from '../components/ui';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Eye,
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'PENDING', label: 'New' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'IN_PREPARATION', label: 'Cooking' },
  { id: 'READY', label: 'Ready' },
  { id: 'SERVED', label: 'Served' },
  { id: 'COMPLETED', label: 'Completed' },
];

export default function KitchenOrdersView() {
  const { addToast } = useAuth();
  const [orders, setOrders] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent && orders.length === 0) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const params = {};
      if (statusFilter === 'COMPLETED') {
        params.status = 'COMPLETED';
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const res = await posService.kitchen.getOrders(params);
      if (res.success && res.data) {
        const orderList = Array.isArray(res.data) ? res.data : res.data.items || [];
        setOrders(orderList);
      }
    } catch (err) {
      if (!isSilent) {
        addToast(err.message || 'Failed to fetch kitchen orders', 'error');
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchQuery, orders.length, addToast]);

  useEffect(() => {
    fetchOrders(orders.length > 0);
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders, orders.length]);

  const handleAccept = async (orderId) => {
    setActionLoading(orderId);
    try {
      await posService.kitchen.acceptOrder(orderId);
      addToast('Order accepted into preparation', 'info');
      fetchOrders(true);
      if (selectedOrderForDetail?.id === orderId) {
        const updated = await posService.kitchen.getOrderById(orderId);
        if (updated.success) setSelectedOrderForDetail(updated.data);
      }
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
      addToast('Order preparation started', 'info');
      fetchOrders(true);
      if (selectedOrderForDetail?.id === orderId) {
        const updated = await posService.kitchen.getOrderById(orderId);
        if (updated.success) setSelectedOrderForDetail(updated.data);
      }
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
      addToast('Order marked READY! Inventory ingredients automatically deducted.', 'success');
      fetchOrders(true);
      if (selectedOrderForDetail?.id === orderId) {
        const updated = await posService.kitchen.getOrderById(orderId);
        if (updated.success) setSelectedOrderForDetail(updated.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to mark ready. Check inventory stock.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openOrderDetail = async (order) => {
    setSelectedOrderForDetail(order);
    try {
      const res = await posService.kitchen.getOrderById(order.id);
      if (res.success && res.data) {
        setSelectedOrderForDetail(res.data);
      }
    } catch (e) {
      // Fallback to existing order state
    }
  };

  // Compute live stable counts for each tab
  const counts = useMemo(() => {
    const map = {
      ALL: orders.length,
      PENDING: 0,
      ACCEPTED: 0,
      IN_PREPARATION: 0,
      READY: 0,
      SERVED: 0,
      COMPLETED: 0,
    };
    orders.forEach((o) => {
      const s = o.status;
      if (s === 'COOKING' || s === 'IN_PREPARATION') {
        map.IN_PREPARATION += 1;
      } else if (map[s] !== undefined) {
        map[s] += 1;
      }
    });
    return map;
  }, [orders]);

  // Instant local filtering without network latency or UI blinking
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'IN_PREPARATION') {
          if (o.status !== 'IN_PREPARATION' && o.status !== 'COOKING') return false;
        } else if (o.status !== statusFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = o.orderNumber && o.orderNumber.toLowerCase().includes(q);
        const matchTable =
          (o.table?.tableNumber || o.tableNumber) &&
          String(o.table?.tableNumber || o.tableNumber).toLowerCase().includes(q);
        const matchWaiter = o.waiter?.name && o.waiter.name.toLowerCase().includes(q);
        const matchItem =
          o.items && o.items.some((it) => (it.menuItem?.name || it.name || '').toLowerCase().includes(q));
        if (!matchNum && !matchTable && !matchWaiter && !matchItem) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
      case 'ACCEPTED':
        return 'bg-[#92400E]/10 dark:bg-[#92400E]/20 border-[#92400E]/30 dark:border-[#92400E]/40 text-[#92400E] dark:text-[#D97706]';
      case 'IN_PREPARATION':
      case 'COOKING':
        return 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-[#B45309] dark:text-[#FBBF24]';
      case 'READY':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300';
      case 'SERVED':
        return 'bg-[#FAF7F2] dark:bg-[#201C18] border-[#E5D8C6] dark:border-[#382F26] text-[#92400E] dark:text-[#D97706]';
      case 'COMPLETED':
        return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
      default:
        return 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300';
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] dark:bg-[#141210] min-h-screen text-[#1F2937] dark:text-[#F7F3EC] transition-colors duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/40 flex items-center justify-center text-[#92400E] dark:text-[#D97706] shrink-0 shadow-xs">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] dark:text-[#F7F3EC] tracking-tight">
                Kitchen Orders
              </h1>
              <span className="text-xs font-bold text-[#92400E] dark:text-[#D97706] font-mono tabular-nums">
                ({filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">
              Manage incoming food orders, recipe requirements, and prep status transitions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => fetchOrders(false)}
            title="Refresh Orders"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${
                refreshing || initialLoading
                  ? 'animate-spin text-[#92400E] dark:text-[#D97706]'
                  : 'text-[#5B6470] dark:text-[#A89B8C]'
              }`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-4 shadow-sm">
        {/* Status Filters - Stable non-blinking pills with counts */}
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0" role="tablist">
          {STATUS_TABS.map((tab) => {
            const isSelected = statusFilter === tab.id;
            const count = counts[tab.id] ?? 0;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] shrink-0 ${
                  isSelected
                    ? 'bg-[#92400E] text-white border-[#92400E] font-bold shadow-xs'
                    : 'bg-[#FAF7F2] dark:bg-[#201C18] text-[#5B6470] dark:text-[#A89B8C] border-[#E5D8C6] dark:border-[#382F26] hover:bg-[#F1E8DB] dark:hover:bg-[#2A241F] hover:text-[#1F2937] dark:hover:text-[#F7F3EC]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`tabular-nums font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-[#92400E]/10 dark:bg-[#92400E]/20 text-[#92400E] dark:text-[#D97706]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470] dark:text-[#A89B8C] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Order # or Table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FAF7F2] dark:bg-[#201C18] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl pl-9 pr-4 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] transition-all"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl overflow-hidden shadow-sm">
        {initialLoading && orders.length === 0 ? (
          <div className="p-4">
            <SkeletonTable rows={5} columns={6} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={searchQuery ? 'No matching orders' : 'No Orders Found'}
            description={searchQuery ? `No orders matching "${searchQuery}". Clear search to view active queue.` : 'There are no active orders matching the selected status.'}
            actionLabel={searchQuery ? 'Clear Search' : undefined}
            onAction={searchQuery ? () => setSearchQuery('') : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#FAF7F2] dark:bg-[#201C18] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] tracking-wider">
                <tr>
                  <th className="px-5 py-4">Table / Order</th>
                  <th className="px-5 py-4">Waiter</th>
                  <th className="px-5 py-4">Ordered Items</th>
                  <th className="px-5 py-4">Order Time</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D8C6] dark:divide-[#382F26] text-[#1F2937] dark:text-[#F7F3EC]">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#FAF7F2]/60 dark:hover:bg-[#201C18]/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-[#1F2937] dark:text-[#F7F3EC] text-sm">
                        Table #{ord.table?.tableNumber || ord.tableNumber || 'N/A'}
                      </div>
                      <div className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] font-mono mt-0.5">
                        #{ord.orderNumber || ord.id.slice(0, 8)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-[#1F2937] dark:text-[#F7F3EC] font-medium">
                      {ord.waiter?.name || 'Staff'}
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-0.5 max-w-xs">
                        {ord.items?.map((it, idx) => (
                          <div key={idx} className="text-[#1F2937] dark:text-[#F7F3EC] text-xs flex items-center gap-1.5">
                            <span className="font-bold text-[#B45309] dark:text-[#FBBF24] tabular-nums">{it.quantity}x</span>
                            <span>{it.menuItem?.name || it.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-[#5B6470] dark:text-[#A89B8C] tabular-nums">
                      <div>{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] mt-0.5">
                        {Math.floor((Date.now() - new Date(ord.createdAt).getTime()) / 60000)}m ago
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(ord.status)}`}>
                        {ord.status === 'IN_PREPARATION' ? 'COOKING' : ord.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openOrderDetail(ord)}
                          className="min-h-[36px] min-w-[36px] p-2 bg-[#FAF7F2] dark:bg-[#201C18] hover:bg-[#F1E8DB] dark:hover:bg-[#2A241F] text-[#1F2937] dark:text-[#F7F3EC] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
                          title="View Order & Recipe Details"
                          aria-label={`Inspect ticket #${ord.orderNumber}`}
                        >
                          <Eye className="w-4 h-4 text-[#5B6470] dark:text-[#A89B8C]" />
                        </button>

                        {ord.status === 'PENDING' && (
                          <Button
                            variant="primary"
                            onClick={() => handleAccept(ord.id)}
                            disabled={actionLoading === ord.id}
                            className="bg-blue-600 hover:bg-blue-700 min-h-[36px] text-xs"
                          >
                            Accept
                          </Button>
                        )}

                        {ord.status === 'ACCEPTED' && (
                          <Button
                            variant="primary"
                            onClick={() => handleStartPrep(ord.id)}
                            disabled={actionLoading === ord.id}
                            className="min-h-[36px] text-xs font-bold"
                          >
                            Start Cooking
                          </Button>
                        )}

                        {ord.status === 'IN_PREPARATION' && (
                          <Button
                            variant="success"
                            onClick={() => handleMarkReady(ord.id)}
                            disabled={actionLoading === ord.id}
                            className="min-h-[36px] text-xs"
                          >
                            Mark Ready
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={Boolean(selectedOrderForDetail)}
        onClose={() => setSelectedOrderForDetail(null)}
        title={
          selectedOrderForDetail ? (
            <div className="flex items-center gap-2">
              <span>Table #{selectedOrderForDetail.table?.tableNumber || 'N/A'}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(selectedOrderForDetail.status)}`}>
                {selectedOrderForDetail.status}
              </span>
            </div>
          ) : 'Order Details'
        }
        subtitle={
          selectedOrderForDetail ? (
            <span>
              Ticket #{selectedOrderForDetail.orderNumber} • Waiter: {selectedOrderForDetail.waiter?.name || 'Staff'} • Ordered:{' '}
              {new Date(selectedOrderForDetail.createdAt).toLocaleTimeString()}
            </span>
          ) : undefined
        }
        maxWidth="max-w-2xl"
      >
        {selectedOrderForDetail && (
          <div className="space-y-4">
            {/* Note */}
            {selectedOrderForDetail.notes && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-xl font-medium">
                <strong>Kitchen Note:</strong> {selectedOrderForDetail.notes}
              </div>
            )}

            {/* Ordered Dishes Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">Ordered Dishes</h4>
              <div className="space-y-2">
                {selectedOrderForDetail.items?.map((item, idx) => (
                  <div key={idx} className="bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1F2937] text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-amber-100 text-[#B45309] border border-amber-200 flex items-center justify-center font-bold text-xs tabular-nums">
                          {item.quantity}
                        </span>
                        <span>{item.menuItem?.name || item.name}</span>
                      </span>
                      <span className="text-xs text-[#5B6470] font-mono tabular-nums">
                        {item.menuItem?.recipe?.prepTime ? `Prep: ~${item.menuItem.recipe.prepTime}m` : 'Standard'}
                      </span>
                    </div>

                    {/* Dish Recipe Ingredients */}
                    {item.menuItem?.recipe?.ingredients && item.menuItem.recipe.ingredients.length > 0 ? (
                      <div className="mt-3 pt-2 border-t border-[#E5D8C6] text-[11px] text-[#5B6470]">
                        <div className="text-[10px] font-semibold text-[#5B6470] uppercase mb-1">
                          Recipe Requirement per unit:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {item.menuItem.recipe.ingredients.map((ing, iIdx) => (
                            <div key={iIdx} className="bg-white px-2.5 py-1.5 rounded-lg border border-[#E5D8C6] flex justify-between">
                              <span className="truncate max-w-[120px]">{ing.inventoryItem?.name || 'Ingredient'}</span>
                              <span className="font-mono text-[#1F2937] font-semibold tabular-nums">
                                {Number(ing.quantityRequired) * item.quantity} {ing.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-red-600 italic">
                        No recipe configured for this menu item.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Recipe Ingredient BOM Check */}
              {selectedOrderForDetail.calculatedIngredients && selectedOrderForDetail.calculatedIngredients.length > 0 && (
                <div className="bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl p-4 mt-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#92400E] uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4" /> Total Order Ingredient Requirements
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedOrderForDetail.calculatedIngredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border ${
                          ing.isSufficient
                            ? 'bg-white border-[#E5D8C6] text-[#1F2937]'
                            : 'bg-red-50 border-red-200 text-red-700 font-bold'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ing.isSufficient ? 'bg-[#16A34A]' : 'bg-red-600 animate-ping'}`} />
                          <span>{ing.name}</span>
                        </span>
                        <span className="font-mono text-xs tabular-nums">
                          Required: {ing.requiredQuantity} {ing.unit} | In Stock: {ing.currentStock} {ing.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5D8C6]">
              <Button
                variant="outline"
                onClick={() => setSelectedOrderForDetail(null)}
              >
                Close
              </Button>

              {selectedOrderForDetail.status === 'PENDING' && (
                <Button
                  variant="primary"
                  onClick={() => handleAccept(selectedOrderForDetail.id)}
                  disabled={actionLoading === selectedOrderForDetail.id}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Accept Order
                </Button>
              )}

              {selectedOrderForDetail.status === 'ACCEPTED' && (
                <Button
                  variant="secondary"
                  onClick={() => handleStartPrep(selectedOrderForDetail.id)}
                  disabled={actionLoading === selectedOrderForDetail.id}
                >
                  Start Cooking
                </Button>
              )}

              {selectedOrderForDetail.status === 'IN_PREPARATION' && (
                <Button
                  variant="success"
                  onClick={() => handleMarkReady(selectedOrderForDetail.id)}
                  disabled={actionLoading === selectedOrderForDetail.id}
                >
                  Mark Food Ready (Deduct Inventory)
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
