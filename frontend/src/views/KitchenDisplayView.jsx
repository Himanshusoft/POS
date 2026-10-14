import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { Button, Badge, Skeleton } from '../components/ui';
import { useKitchenOrders, usePosMutations } from '../hooks/usePosQueries';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  RefreshCw,
  Flame,
  ArrowRight,
  PackageCheck,
  AlertTriangle
} from 'lucide-react';

export default function KitchenDisplayView() {
  const { restaurant, addToast } = useAuth();
  const { data: orders = [], isLoading: loading, refetch: fetchOrders } = useKitchenOrders(restaurant?.id);
  const { invalidateOrders } = usePosMutations(restaurant?.id);
  const [filterStage, setFilterStage] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);

  const handleAccept = async (orderId) => {
    setActionLoading(orderId);
    try {
      await posService.kitchen.acceptOrder(orderId);
      addToast('Ticket accepted for preparation', 'info');
      invalidateOrders();
      fetchOrders();
    } catch (err) {
      addToast(err.message || 'Failed to accept order', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReady = async (orderId) => {
    setActionLoading(orderId);
    try {
      await posService.kitchen.markReady(orderId);
      addToast('Order marked READY for food runner / waiter', 'success');
      invalidateOrders();
      fetchOrders();
    } catch (err) {
      addToast(err.message || 'Failed to mark ready', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkServed = async (orderId) => {
    setActionLoading(orderId);
    try {
      await posService.kitchen.markServed(orderId);
      addToast('Order marked SERVED to dining table', 'info');
      invalidateOrders();
      fetchOrders();
    } catch (err) {
      addToast(err.message || 'Failed to mark served', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    setActionLoading(orderId);
    try {
      await posService.kitchen.completeOrder(orderId);
      addToast('Order completed & recipe inventory stock deducted!', 'success');
      invalidateOrders();
      fetchOrders();
    } catch (err) {
      addToast(err.message || 'Failed to complete order. Check stock availability.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getElapsedMinutes = (dateStr) => {
    if (!dateStr) return 0;
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diffMs / 60000);
  };

  const filteredOrders = orders.filter((o) => {
    if (filterStage === 'ALL') return true;
    return o.status === filterStage;
  });

  const getStatusColor = (status, mins) => {
    if (status === 'READY') return 'border-[#2D6A4F]/40 bg-[#E8F3ED]/40 dark:bg-[#1A2E26]/40';
    if (status === 'SERVED') return 'border-[#173F36]/30 bg-[#F7EFE4] dark:bg-[#1A2622]';
    if (mins > 20) return 'border-rose-300 bg-rose-50/30 dark:bg-rose-950/20';
    if (mins > 10) return 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/20';
    return 'border-[#E4DCD0] dark:border-[#1E362E] bg-[#FFFDF9] dark:bg-[#152320]';
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#F7EFE4] dark:bg-[#101A18] min-h-screen text-[#17251F] dark:text-[#F7EFE4]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/20 border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center text-[#173F36] dark:text-[#4EBA87] shrink-0 shadow-xs">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight">
                Kitchen Display System (KDS)
              </h1>
              <Badge variant="warning" size="sm">
                Station Active
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
              Real-time kitchen order tickets, prep stations, and automated inventory depletion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="secondary"
            onClick={fetchOrders}
            title="Refresh Tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#173F36] dark:text-[#4EBA87]' : 'text-[#657168] dark:text-[#9FB29E]'}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stage Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {[
          { id: 'ALL', label: 'All Tickets', count: orders.length },
          { id: 'PENDING', label: 'New', count: orders.filter((o) => o.status === 'PENDING').length },
          { id: 'IN_PREPARATION', label: 'Cooking', count: orders.filter((o) => o.status === 'IN_PREPARATION').length },
          { id: 'READY', label: 'Ready', count: orders.filter((o) => o.status === 'READY').length },
          { id: 'SERVED', label: 'Served', count: orders.filter((o) => o.status === 'SERVED').length },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={filterStage === tab.id}
            onClick={() => setFilterStage(tab.id)}
            className={`text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
              filterStage === tab.id
                ? 'bg-[#173F36] text-[#FFFDF9] border-[#173F36] font-bold shadow-xs'
                : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] border-[#E4DCD0] dark:border-[#1E362E] hover:bg-[#F7EFE4] hover:text-[#17251F] dark:hover:text-[#F7EFE4]'
            }`}
          >
            <span>{tab.label}</span> <span className="tabular-nums">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Tickets Grid */}
      {loading && orders.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-4 space-y-4 shadow-editorial">
              <div className="flex justify-between items-center">
                <Skeleton className="w-24 h-6 rounded-md" />
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>
              <Skeleton className="w-full h-24 rounded-xl" />
              <Skeleton className="w-full h-11 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-16 text-center shadow-editorial">
          <div className="w-16 h-16 rounded-2xl bg-[#F7EFE4] dark:bg-[#1A2622] border border-[#E4DCD0] dark:border-[#1E362E] flex items-center justify-center mx-auto mb-4 text-[#8D9890]">
            <ChefHat className="w-8 h-8 text-[#173F36] dark:text-[#4EBA87]" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#173F36] dark:text-[#F7EFE4]">All Clear, Chef!</h3>
          <p className="text-sm text-[#657168] dark:text-[#9FB29E] mt-1 font-medium">No active food orders in this stage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map((order) => {
            const mins = getElapsedMinutes(order.createdAt);
            const isCritical = mins > 20 && order.status !== 'READY' && order.status !== 'SERVED';
            const isWarning = mins > 10 && order.status !== 'READY' && order.status !== 'SERVED';
            const cardBg = getStatusColor(order.status, mins);

            return (
              <div
                key={order.id}
                className={`border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-editorial hover:shadow-md ${cardBg}`}
              >
                <div>
                  {/* Card Header: Table Number & Timer */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-serif text-xl font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight">
                        Table #{order.table?.tableNumber || order.tableNumber || 'Takeaway'}
                      </span>
                      <div className="text-[11px] text-[#5B6470] font-medium mt-0.5">
                        Ticket <span className="font-mono font-bold text-[#1F2937]">#{order.orderNumber || order.id.slice(0, 6)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-xl bg-[#F7EFE4] dark:bg-[#1A2622] border border-[#E4DCD0] dark:border-[#1E362E] shadow-2xs">
                      <Clock className={`w-3.5 h-3.5 ${isCritical ? 'text-[#C53030] animate-pulse' : isWarning ? 'text-[#B45309]' : 'text-[#173F36] dark:text-[#4EBA87]'}`} />
                      <span className={`tabular-nums ${isCritical ? 'text-[#C53030] font-bold' : 'text-[#17251F] dark:text-[#F7EFE4] font-semibold'}`}>
                        {mins}m
                      </span>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="mb-3">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                      order.status === 'PENDING'
                        ? 'bg-[#F7EFE4] border-[#E4DCD0] text-[#17251F] dark:bg-[#1A2622] dark:text-[#F7EFE4]'
                        : order.status === 'IN_PREPARATION'
                        ? 'bg-[#173F36]/10 border-[#173F36]/20 text-[#173F36] dark:bg-[#173F36]/20 dark:text-[#4EBA87]'
                        : order.status === 'READY'
                        ? 'bg-[#E8F3ED] border-[#C5DED0] text-[#1E4D38] dark:bg-[#1A2E26] dark:text-[#88D4A8]'
                        : 'bg-[#FFFDF9] border-[#E4DCD0] text-[#17251F] dark:bg-[#152320] dark:text-[#F7EFE4]'
                    }`}>
                      {order.status === 'IN_PREPARATION' ? 'COOKING' : order.status}
                    </span>
                    {order.notes && (
                      <div className="text-[11px] text-[#B45309] dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 mt-2 font-medium">
                        <strong>Note:</strong> {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Item List */}
                  <div className="space-y-2 border-t border-[#E4DCD0] dark:border-[#1E362E] pt-3">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="bg-[#F7EFE4]/60 dark:bg-[#1A2622]/60 hover:bg-[#F7EFE4] dark:hover:bg-[#1A2622] rounded-xl p-2.5 border border-[#E4DCD0] dark:border-[#1E362E] transition-colors">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-[#173F36]/10 dark:bg-[#173F36]/20 text-[#173F36] dark:text-[#4EBA87] border border-[#173F36]/20 dark:border-[#4EBA87]/30 flex items-center justify-center font-bold text-xs shrink-0 tabular-nums">
                              {item.quantity}
                            </span>
                            <span className="truncate max-w-[170px]">{item.menuItem?.name || item.name}</span>
                          </span>
                        </div>
                        {item.specialInstructions && (
                          <div className="text-[11px] text-[#C53030] dark:text-rose-400 mt-1 pl-7 italic">
                            • {item.specialInstructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Recipe Ingredients Checkpoint (Auto-Calculated BOM) */}
                  {order.calculatedIngredients && order.calculatedIngredients.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#E4DCD0] dark:border-[#1E362E]">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#173F36] dark:text-[#4EBA87] uppercase tracking-wider mb-1.5">
                        <span className="flex items-center gap-1 font-serif">
                          <PackageCheck className="w-3.5 h-3.5" /> Recipe BOM Check
                        </span>
                        <span className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums">
                          {order.calculatedIngredients.filter((i) => i.isSufficient).length}/{order.calculatedIngredients.length} Stock OK
                        </span>
                      </div>
                      <div className="space-y-1">
                        {order.calculatedIngredients.map((ing, iIdx) => (
                          <div
                            key={iIdx}
                            className={`flex items-center justify-between text-[11px] px-2 py-1 rounded-lg border ${
                              ing.isSufficient
                                ? 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4]'
                                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-[#C53030] dark:text-rose-400 font-semibold'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  ing.isSufficient ? 'bg-[#2D6A4F]' : 'bg-red-600 animate-ping'
                                }`}
                              ></span>
                              <span className="truncate max-w-[120px] font-medium">{ing.name}</span>
                            </div>
                            <div className="font-mono text-[10px] text-right tabular-nums">
                              <span>Req: {ing.requiredQuantity} {ing.unit}</span>
                              <span className={`ml-1.5 ${ing.isSufficient ? 'text-[#657168] dark:text-[#9FB29E]' : 'text-[#C53030] dark:text-rose-400 font-bold'}`}>
                                (Stock: {ing.currentStock})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Progressive Action Button (Minimum 44px target) */}
                <div className="pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E] mt-4">
                  {order.status === 'PENDING' && (
                    <Button
                      variant="primary"
                      onClick={() => handleAccept(order.id)}
                      disabled={actionLoading === order.id}
                      className="w-full min-h-[44px] font-bold text-xs"
                    >
                      <Flame className="w-4 h-4 mr-2" />
                      <span>{actionLoading === order.id ? 'Accepting...' : 'Start Cooking'}</span>
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
                      <span>{actionLoading === order.id ? 'Marking...' : 'Mark Food Ready'}</span>
                    </Button>
                  )}

                  {order.status === 'READY' && (
                    <Button
                      variant="secondary"
                      onClick={() => handleMarkServed(order.id)}
                      disabled={actionLoading === order.id}
                      className="w-full min-h-[44px] font-bold text-xs"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      <span>{actionLoading === order.id ? 'Updating...' : 'Mark Served to Table'}</span>
                    </Button>
                  )}

                  {order.status === 'SERVED' && (
                    <Button
                      variant="primary"
                      onClick={() => handleCompleteOrder(order.id)}
                      disabled={actionLoading === order.id}
                      className="w-full min-h-[44px] font-bold text-xs"
                    >
                      <PackageCheck className="w-4 h-4 mr-2" />
                      <span>{actionLoading === order.id ? 'Completing...' : 'Complete & Deduct Stock'}</span>
                    </Button>
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
