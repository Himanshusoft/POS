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

import { useKitchenOrders, usePosMutations } from '../hooks/usePosQueries';

export default function KitchenOrdersView() {
  const { restaurant, addToast } = useAuth();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const queryParams = useMemo(() => {
    const params = {};
    if (statusFilter === 'COMPLETED') params.status = 'COMPLETED';
    if (searchQuery.trim()) params.search = searchQuery.trim();
    return params;
  }, [statusFilter, searchQuery]);

  const {
    data: orders = [],
    isLoading,
    isRefetching: refreshing,
    refetch,
  } = useKitchenOrders(restaurant?.id, queryParams);

  const { invalidateOrders, invalidateInventory } = usePosMutations(restaurant?.id);
  const initialLoading = isLoading && orders.length === 0;

  const fetchOrders = () => refetch();

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
        return 'bg-[#F7EFE4] dark:bg-[#1A2622] border-[#E4DCD0] dark:border-[#233630] text-[#17251F] dark:text-[#F7EFE4]';
      case 'ACCEPTED':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-[#B45309] dark:text-amber-400';
      case 'IN_PREPARATION':
      case 'COOKING':
        return 'bg-[#173F36]/10 dark:bg-[#173F36]/20 border-[#173F36]/20 dark:border-[#4EBA87]/30 text-[#173F36] dark:text-[#4EBA87]';
      case 'READY':
        return 'bg-[#E8F3ED] dark:bg-[#1A2E26] border-[#C5DED0] dark:border-[#244237] text-[#1E4D38] dark:text-[#88D4A8]';
      case 'SERVED':
        return 'bg-[#E8F3ED] dark:bg-[#1A2E26] border-[#C5DED0] dark:border-[#244237] text-[#2D6A4F] dark:text-[#88D4A8]';
      case 'COMPLETED':
        return 'bg-[#F7EFE4] dark:bg-[#1A2622] border-[#E4DCD0] dark:border-[#233630] text-[#657168] dark:text-[#9FB29E]';
      default:
        return 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-[#C53030] dark:text-rose-400';
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#F7EFE4] dark:bg-[#101A18] min-h-screen text-[#17251F] dark:text-[#F7EFE4] transition-colors duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/20 border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center text-[#173F36] dark:text-[#4EBA87] shrink-0 shadow-xs">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight">
                Kitchen Orders
              </h1>
              <span className="text-xs font-bold text-[#173F36] dark:text-[#4EBA87] font-mono tabular-nums">
                ({filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
              Manage incoming food orders, recipe requirements, and prep status transitions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => fetchOrders(false)}
            title="Refresh Orders"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${
                refreshing || initialLoading
                  ? 'animate-spin text-[#173F36] dark:text-[#4EBA87]'
                  : 'text-[#657168] dark:text-[#9FB29E]'
              }`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-4 shadow-editorial">
        {/* Status Filters */}
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
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] shrink-0 ${
                  isSelected
                    ? 'bg-[#173F36] text-[#FFFDF9] border-[#173F36] font-bold shadow-xs'
                    : 'bg-[#F7EFE4]/60 dark:bg-[#1A2622] text-[#657168] dark:text-[#9FB29E] border-[#E4DCD0] dark:border-[#1E362E] hover:bg-[#F7EFE4] hover:text-[#17251F] dark:hover:text-[#F7EFE4]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`tabular-nums font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-white/20 text-[#FFFDF9]'
                      : 'bg-[#173F36]/10 dark:bg-[#173F36]/20 text-[#173F36] dark:text-[#4EBA87]'
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
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#657168] dark:text-[#9FB29E] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Order # or Table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F7EFE4]/60 dark:bg-[#1A2622] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-9 pr-4 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#8D9890] dark:placeholder-[#657168] focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36] transition-all"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
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
              <thead className="sticky top-0 z-10 bg-[#F7EFE4] dark:bg-[#1A2622] text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-bold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider">
                <tr>
                  <th className="px-5 py-4">Table / Order</th>
                  <th className="px-5 py-4">Waiter</th>
                  <th className="px-5 py-4">Ordered Items</th>
                  <th className="px-5 py-4">Order Time</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DCD0] dark:divide-[#1E362E] text-[#17251F] dark:text-[#F7EFE4]">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#F7EFE4]/60 dark:hover:bg-[#1A2622]/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-serif font-bold text-[#173F36] dark:text-[#F7EFE4] text-sm">
                        Table #{ord.table?.tableNumber || ord.tableNumber || 'N/A'}
                      </div>
                      <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-mono mt-0.5">
                        #{ord.orderNumber || ord.id.slice(0, 8)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-[#17251F] dark:text-[#F7EFE4] font-medium">
                      {ord.waiter?.name || 'Staff'}
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-0.5 max-w-xs">
                        {ord.items?.map((it, idx) => (
                          <div key={idx} className="text-[#17251F] dark:text-[#F7EFE4] text-xs flex items-center gap-1.5">
                            <span className="font-bold text-[#173F36] dark:text-[#4EBA87] tabular-nums">{it.quantity}x</span>
                            <span>{it.menuItem?.name || it.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-[#657168] dark:text-[#9FB29E] tabular-nums">
                      <div>{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[10px] text-[#8D9890] dark:text-[#657168] mt-0.5">
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
                          className="min-h-[36px] min-w-[36px] p-2 bg-[#F7EFE4] dark:bg-[#1A2622] hover:bg-[#EAE0D2] dark:hover:bg-[#213830] text-[#17251F] dark:text-[#F7EFE4] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
                          title="View Order & Recipe Details"
                          aria-label={`Inspect ticket #${ord.orderNumber}`}
                        >
                          <Eye className="w-4 h-4 text-[#657168] dark:text-[#9FB29E]" />
                        </button>

                        {ord.status === 'PENDING' && (
                          <Button
                            variant="primary"
                            onClick={() => handleAccept(ord.id)}
                            disabled={actionLoading === ord.id}
                            className="min-h-[36px] text-xs font-bold"
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
              <span className="font-serif">Table #{selectedOrderForDetail.table?.tableNumber || 'N/A'}</span>
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
              <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-950 dark:text-amber-300 text-xs p-3 rounded-xl font-medium">
                <strong>Kitchen Note:</strong> {selectedOrderForDetail.notes}
              </div>
            )}

            {/* Ordered Dishes Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] uppercase tracking-wider">Ordered Dishes</h4>
              <div className="space-y-2">
                {selectedOrderForDetail.items?.map((item, idx) => (
                  <div key={idx} className="bg-[#F7EFE4]/60 dark:bg-[#1A2622]/60 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#173F36]/10 dark:bg-[#173F36]/20 text-[#173F36] dark:text-[#4EBA87] border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center font-bold text-xs tabular-nums">
                          {item.quantity}
                        </span>
                        <span>{item.menuItem?.name || item.name}</span>
                      </span>
                      <span className="text-xs text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums">
                        {item.menuItem?.recipe?.prepTime ? `Prep: ~${item.menuItem.recipe.prepTime}m` : 'Standard'}
                      </span>
                    </div>

                    {/* Dish Recipe Ingredients */}
                    {item.menuItem?.recipe?.ingredients && item.menuItem.recipe.ingredients.length > 0 ? (
                      <div className="mt-3 pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E] text-[11px] text-[#657168] dark:text-[#9FB29E]">
                        <div className="text-[10px] font-semibold text-[#657168] dark:text-[#9FB29E] uppercase mb-1">
                          Recipe Requirement per unit:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {item.menuItem.recipe.ingredients.map((ing, iIdx) => (
                            <div key={iIdx} className="bg-[#FFFDF9] dark:bg-[#152320] px-2.5 py-1.5 rounded-lg border border-[#E4DCD0] dark:border-[#1E362E] flex justify-between">
                              <span className="truncate max-w-[120px] text-[#17251F] dark:text-[#F7EFE4]">{ing.inventoryItem?.name || 'Ingredient'}</span>
                              <span className="font-mono text-[#173F36] dark:text-[#4EBA87] font-semibold tabular-nums">
                                {Number(ing.quantityRequired) * item.quantity} {ing.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-[#C53030] dark:text-rose-400 italic">
                        No recipe configured for this menu item.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Recipe Ingredient BOM Check */}
              {selectedOrderForDetail.calculatedIngredients && selectedOrderForDetail.calculatedIngredients.length > 0 && (
                <div className="bg-[#F7EFE4]/60 dark:bg-[#1A2622]/60 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl p-4 mt-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#173F36] dark:text-[#4EBA87] uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5 font-serif">
                      Total Order Ingredient Requirements
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedOrderForDetail.calculatedIngredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border ${
                          ing.isSufficient
                            ? 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4]'
                            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-[#C53030] dark:text-rose-400 font-bold'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ing.isSufficient ? 'bg-[#2D6A4F]' : 'bg-red-600 animate-ping'}`} />
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
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E]">
              <Button
                variant="secondary"
                onClick={() => setSelectedOrderForDetail(null)}
              >
                Close
              </Button>

              {selectedOrderForDetail.status === 'PENDING' && (
                <Button
                  variant="primary"
                  onClick={() => handleAccept(selectedOrderForDetail.id)}
                  disabled={actionLoading === selectedOrderForDetail.id}
                >
                  Accept Order
                </Button>
              )}

              {selectedOrderForDetail.status === 'ACCEPTED' && (
                <Button
                  variant="primary"
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
