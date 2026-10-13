import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../services/api';
import { Skeleton } from '../components/ui/Skeleton';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Send,
  Clock,
  Sparkles,
  X,
  History,
  UtensilsCrossed,
  RefreshCw,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { getItemAvailability, validateCumulativeCartInventory } from '../utils/inventoryValidation';

/**
 * MenuItemImage helper:
 * Displays real image URL if provided in API/database.
 * If missing or fails to load, gracefully displays a neutral Sandstone dish placeholder.
 */
function MenuItemImage({ image, name, categoryName }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [image]);

  const resolvedUrl = image && !imgError ? getImageUrl(image) : null;

  if (resolvedUrl) {
    return (
      <div className="relative w-full h-32 sm:h-36 rounded-xl overflow-hidden mb-2.5 border border-[#E5D8C6] bg-[#FAF7F2] group">
        <img
          src={resolvedUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-28 sm:h-32 rounded-xl mb-2.5 border border-[#E5D8C6] bg-gradient-to-br from-[#F7F3EC] to-[#FAF7F2] flex flex-col items-center justify-center text-[#5B6470] overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#92400E_1px,transparent_1px)] [background-size:10px_10px]" />
      <div className="w-9 h-9 rounded-xl bg-white border border-[#E5D8C6] shadow-xs flex items-center justify-center text-[#92400E]">
        <UtensilsCrossed className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-semibold text-[#5B6470] mt-1.5 flex items-center gap-1">
        {categoryName || 'Menu Dish'}
      </span>
    </div>
  );
}

export default function PosTerminalView({ preSelectedTable, onOrderPlaced }) {
  const { restaurant, addToast } = useAuth();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(preSelectedTable?.id || '');
  const [activeCategoryId, setActiveCategoryId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('DINE_IN');
  const [specialNotes, setSpecialNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Orders History Drawer
  const [showHistory, setShowHistory] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const currency = restaurant?.currency || '₹';

  useEffect(() => {
    if (preSelectedTable) {
      setSelectedTableId(preSelectedTable.id);
    }
  }, [preSelectedTable]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, itemRes, tblRes] = await Promise.all([
        posService.menu.getCategories(),
        posService.menu.getItems(),
        posService.tables.getAll(),
      ]);
      if (catRes.success) setCategories(catRes.data || []);
      if (itemRes.success) setMenuItems(itemRes.data || []);
      if (tblRes.success) {
        setTables(tblRes.data || []);
        if (!selectedTableId && tblRes.data?.length > 0) {
          const avail = tblRes.data.find((t) => t.status === 'AVAILABLE') || tblRes.data[0];
          setSelectedTableId(avail.id);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to load POS catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchActiveOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await posService.orders.getAll();
      if (res.success && res.data) {
        setActiveOrders(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load active orders', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;
    try {
      await posService.orders.cancel(orderId, reason);
      addToast('Order cancelled successfully', 'success');
      fetchActiveOrders();
    } catch (err) {
      addToast(err.message || 'Failed to cancel order', 'error');
    }
  };

  // Cart operations with inventory availability validation
  const addToCart = (item) => {
    const availability = getItemAvailability(item, 1);
    if (!availability.isOrderable) {
      addToast(`⚠ ${availability.reasonTitle}: ${availability.reasonMessage}`, 'warning');
      return;
    }

    const existing = cart.find((c) => c.menuItemId === item.id);
    const targetQty = existing ? existing.quantity + 1 : 1;

    // Multi-quantity check for this specific dish
    const multiAvail = getItemAvailability(item, targetQty);
    if (!multiAvail.isOrderable) {
      addToast(`⚠ ${multiAvail.reasonTitle}: ${multiAvail.reasonMessage}`, 'warning');
      return;
    }

    // Cumulative inventory check across all cart items
    const proposedCart = existing
      ? cart.map((c) => (c.menuItemId === item.id ? { ...c, quantity: targetQty } : c))
      : [...cart, { menuItemId: item.id, quantity: 1 }];

    const cumulativeCheck = validateCumulativeCartInventory(proposedCart, menuItems);
    if (!cumulativeCheck.isValid) {
      addToast(`⚠ ${cumulativeCheck.errorTitle}: ${cumulativeCheck.errorMessage}`, 'warning');
      return;
    }

    setCart((prev) => {
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1,
          specialInstructions: '',
        },
      ];
    });
  };

  const updateQuantity = (menuItemId, delta) => {
    if (delta > 0) {
      const existing = cart.find((c) => c.menuItemId === menuItemId);
      if (!existing) return;
      const targetQty = existing.quantity + delta;
      const menuItem = menuItems.find((m) => m.id === menuItemId);

      if (menuItem) {
        // Multi-quantity validation for this specific dish
        const multiAvail = getItemAvailability(menuItem, targetQty);
        if (!multiAvail.isOrderable) {
          addToast(`⚠ ${multiAvail.reasonTitle}: ${multiAvail.reasonMessage}`, 'warning');
          return;
        }

        // Cumulative inventory check across all cart items
        const proposedCart = cart.map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: targetQty } : c
        );
        const cumulativeCheck = validateCumulativeCartInventory(proposedCart, menuItems);
        if (!cumulativeCheck.isValid) {
          addToast(`⚠ ${cumulativeCheck.errorTitle}: ${cumulativeCheck.errorMessage}`, 'warning');
          return;
        }
      }
    }

    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuItemId === menuItemId) {
            const nextQty = c.quantity + delta;
            return nextQty > 0 ? { ...c, quantity: nextQty } : null;
          }
          return c;
        })
        .filter(Boolean)
    );
  };

  const updateItemNotes = (menuItemId, notes) => {
    setCart((prev) =>
      prev.map((c) => (c.menuItemId === menuItemId ? { ...c, specialInstructions: notes } : c))
    );
  };

  const clearCart = () => setCart([]);

  // Submit Order with pre-flight check and authoritative backend validation
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      addToast('Your order ticket is empty', 'warning');
      return;
    }
    if (orderType === 'DINE_IN' && !selectedTableId) {
      addToast('Please select a dining table for Dine-In orders', 'warning');
      return;
    }

    // Pre-flight validation against latest client state
    const cartCheck = validateCumulativeCartInventory(cart, menuItems);
    if (!cartCheck.isValid) {
      addToast(`⚠ ${cartCheck.errorTitle}: ${cartCheck.errorMessage}`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        tableId: selectedTableId || null,
        orderType,
        notes: specialNotes.trim() || undefined,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          specialInstructions: c.specialInstructions || undefined,
        })),
      };

      const res = await posService.orders.create(payload);
      if (res.success) {
        addToast(
          activeOrderOnTable
            ? `New items added to active order #${res.data?.orderNumber || activeOrderOnTable.orderNumber}!`
            : 'Order fired to kitchen successfully!',
          'success'
        );
        clearCart();
        setSpecialNotes('');
        if (onOrderPlaced) onOrderPlaced(res.data);
      }
    } catch (err) {
      if (err.data?.code === 'INSUFFICIENT_INVENTORY') {
        const missingList = Array.isArray(err.data.items) && err.data.items.length > 0
          ? '\nMissing ingredients:\n' + err.data.items.map((m) => `• ${m.ingredient} — Required ${m.required} ${m.unit} | Available ${m.available} ${m.unit}`).join('\n')
          : '';
        const mainMsg = err.data.message || 'Inventory is no longer sufficient for this item.';
        addToast(`⚠ Insufficient Inventory: ${mainMsg}${missingList}`, 'error');
        // Refresh catalog immediately to display fresh real-time stock
        loadData();
      } else {
        addToast(err.message || 'Failed to submit order', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTableObj = tables.find((t) => t.id === selectedTableId);
  const activeOrderOnTable = selectedTableObj?.orders?.[0] || selectedTableObj?.activeOrders?.[0];

  const existingSubtotal = activeOrderOnTable?.items?.reduce((acc, it) => acc + Number(it.subtotal || 0), 0) || 0;
  const newSubtotal = cart.reduce((acc, c) => acc + c.price * c.quantity, 0);
  const combinedSubtotal = existingSubtotal + newSubtotal;
  const taxRate = restaurant?.taxRate || 5;
  const estimatedTax = (combinedSubtotal * taxRate) / 100;
  const grandTotal = combinedSubtotal + estimatedTax;

  const filteredItems = menuItems.filter((item) => {
    const matchCat = activeCategoryId === 'ALL' || item.categoryId === activeCategoryId;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-[#FAF7F2] text-[#1F2937]">
      {/* LEFT: Menu Catalog & Categories */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAF7F2] p-5 sm:p-6 overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#5B6470] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes, drinks, starters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E5D8C6] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1F2937] placeholder-[#5B6470] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] shadow-sandstone transition-all min-h-[42px]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                fetchActiveOrders();
                setShowHistory(true);
              }}
              className="flex items-center gap-2 bg-white hover:bg-[#F1E8DB] active:scale-95 text-[#1F2937] text-xs font-bold px-4 py-2.5 rounded-xl border border-[#E5D8C6] shadow-sandstone hover:shadow-sandstone-md transition-all cursor-pointer min-h-[42px]"
            >
              <History className="w-4 h-4 text-[#92400E]" />
              <span>Active Orders</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategoryId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-h-[36px] ${
              activeCategoryId === 'ALL'
                ? 'bg-[#92400E] text-white shadow-sandstone font-bold'
                : 'bg-white text-[#5B6470] hover:bg-[#F1E8DB] hover:text-[#1F2937] border border-[#E5D8C6] shadow-sandstone'
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-h-[36px] ${
                activeCategoryId === cat.id
                  ? 'bg-[#92400E] text-white shadow-sandstone font-bold'
                  : 'bg-white text-[#5B6470] hover:bg-[#F1E8DB] hover:text-[#1F2937] border border-[#E5D8C6] shadow-sandstone'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Food Items Grid */}
        <div className="flex-1 overflow-y-auto pr-1 mt-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="bg-white border border-[#E5D8C6] rounded-2xl p-4 space-y-3 shadow-sandstone">
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4 rounded-lg" />
                  <Skeleton className="h-3 w-1/2 rounded-lg" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-5 w-16 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-[#9CA3AF] bg-white rounded-2xl border border-dashed border-[#E5D8C6]">
              <ShoppingBag className="w-10 h-10 mb-2 stroke-1 text-[#9CA3AF]" />
              <p className="font-semibold text-sm text-[#1F2937]">No dishes match your selection.</p>
              <p className="text-xs text-[#5B6470] mt-0.5">Try searching with a different keyword or category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const categoryObj = categories.find((c) => c.id === item.categoryId);
                const categoryName = categoryObj?.name || 'General';
                const availability = getItemAvailability(item, 1);
                const isOrderable = availability.isOrderable;

                return (
                  <div
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 select-none group shadow-sandstone ${
                      !isOrderable
                        ? 'opacity-75 border-[#E5D8C6] bg-slate-50/90 cursor-not-allowed hover:border-amber-400/60'
                        : 'bg-white border-[#E5D8C6] hover:border-[#92400E] hover:shadow-sandstone-md hover:-translate-y-0.5 cursor-pointer'
                    }`}
                    title={!isOrderable ? availability.reasonMessage : undefined}
                  >
                    <div>
                      {/* Image / Visual */}
                      <MenuItemImage
                        image={item.imageUrl || item.image}
                        name={item.name}
                        categoryName={categoryName}
                      />

                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className={`font-bold text-sm line-clamp-1 transition-colors ${
                          !isOrderable ? 'text-[#5B6470]' : 'text-[#1F2937] group-hover:text-[#92400E]'
                        }`}>
                          {item.name}
                        </span>
                        {(item.dietary || item.isVeg !== undefined) && (
                          <span
                            className={`w-3.5 h-3.5 rounded-xs border p-0.5 flex items-center justify-center shrink-0 ${
                              item.dietary === 'VEG' || item.dietary === 'JAIN' || (item.isVeg === true && !item.dietary)
                                ? 'border-emerald-600'
                                : item.dietary === 'EGG'
                                ? 'border-amber-600'
                                : 'border-rose-600'
                            }`}
                            title={item.dietary || (item.isVeg ? 'VEG' : 'NON-VEG')}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.dietary === 'VEG' || item.dietary === 'JAIN' || (item.isVeg === true && !item.dietary)
                                  ? 'bg-emerald-600'
                                  : item.dietary === 'EGG'
                                  ? 'bg-amber-600'
                                  : 'bg-rose-600'
                              }`}
                            ></span>
                          </span>
                        )}
                      </div>

                      {/* Prominent Warning Callout when not orderable */}
                      {!isOrderable && (
                        <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-1.5 mb-2 text-[11px] text-amber-900 leading-snug flex items-start gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 font-medium">
                            {availability.reasonMessage}
                          </span>
                        </div>
                      )}

                      {item.description && (
                        <p className="text-xs text-[#5B6470] line-clamp-2 mb-3 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[#E5D8C6] mt-2">
                      <span className="font-extrabold text-[#92400E] text-sm font-mono tabular-nums">
                        {currency}{Number(item.price).toFixed(2)}
                      </span>
                      {!isOrderable ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              !item.isAvailable
                                ? 'text-rose-800 bg-rose-50 border-rose-200'
                                : 'text-amber-900 bg-amber-50 border-amber-300'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {!item.isAvailable
                              ? '86 Out'
                              : availability.reasonCode === 'NO_RECIPE'
                              ? 'No Recipe'
                              : 'Insufficient Inventory'}
                          </span>
                          <span className="text-[10px] font-bold text-[#5B6470] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E5D8C6]">
                            Unavailable
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {availability.maxOrderableQuantity <= 5 && availability.maxOrderableQuantity > 0 && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {availability.maxOrderableQuantity} left
                            </span>
                          )}
                          <span className="w-8 h-8 rounded-xl bg-amber-100 group-hover:bg-[#92400E] text-[#92400E] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs">
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Live Order Cart Ticket */}
      <div className="w-96 bg-white border-l border-[#E5D8C6] flex flex-col shrink-0 shadow-sandstone">
        {/* Cart Header */}
        <div className="p-4 border-b border-[#E5D8C6]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#92400E]" />
              <h2 className="font-bold text-[#1F2937] text-base">Current Ticket</h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-700 hover:text-rose-900 font-semibold transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Table & Order Type Selectors */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-[#5B6470] uppercase tracking-wider block mb-1">
                Table
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-2.5 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#92400E] transition-all"
              >
                <option value="">Select Table</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table #{t.tableNumber} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#5B6470] uppercase tracking-wider block mb-1">
                Type
              </label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-2.5 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#92400E] transition-all"
              >
                <option value="DINE_IN">Dine-In</option>
                <option value="TAKEAWAY">Takeaway</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
          </div>

          {/* Active Table Session Banner */}
          {activeOrderOnTable && (
            <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Active Table Order #{activeOrderOnTable.orderNumber}:</span> New items added will merge into this active order without creating a duplicate.
              </div>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Section 1: Previously Ordered Items on this Table */}
          {activeOrderOnTable && activeOrderOnTable.items && activeOrderOnTable.items.length > 0 && (
            <div className="bg-white border border-[#E5D8C6] rounded-xl p-3 shadow-sandstone">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5D8C6]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#92400E]" />
                  Already In Order ({activeOrderOnTable.items.length})
                </span>
                <span className="text-[11px] font-mono font-bold text-[#1F2937] tabular-nums">
                  {currency}{existingSubtotal.toFixed(2)}
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {activeOrderOnTable.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="font-bold text-[#1F2937]">{it.quantity}x</span>
                      <span className="truncate text-[#5B6470] font-medium">{it.menuItem?.name || it.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        it.status === 'SERVED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        it.status === 'READY' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        it.status === 'COOKING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {it.status}
                      </span>
                      <span className="text-[#1F2937] font-mono text-[11px] tabular-nums">
                        {currency}{Number(it.subtotal || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: New Items Being Added */}
          {activeOrderOnTable && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#92400E] px-1 flex items-center gap-1">
              <Plus className="w-3 h-3" />
              <span>New Items to Add ({cart.length})</span>
            </div>
          )}

          {cart.length === 0 ? (
            <div className={`flex flex-col items-center justify-center text-center p-6 text-[#9CA3AF] ${activeOrderOnTable ? 'py-4' : 'h-full'}`}>
              <ShoppingBag className="w-10 h-10 stroke-1 mb-2 text-[#9CA3AF]" />
              <p className="font-semibold text-xs text-[#1F2937]">
                {activeOrderOnTable ? 'No new items selected yet' : 'Ticket is Empty'}
              </p>
              <p className="text-[11px] text-[#5B6470] mt-0.5">
                Click dish items on the left to add them to this table's order.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.menuItemId}
                className="bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-[#1F2937] text-xs leading-tight">{item.name}</div>
                    <div className="text-[11px] text-[#92400E] font-mono mt-0.5 font-bold tabular-nums">
                      {currency}{item.price.toFixed(2)} each
                    </div>
                  </div>

                  {/* Quantity Controls (Accessible Touch Targets) */}
                  <div className="flex items-center gap-1 bg-white border border-[#E5D8C6] rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[#5B6470] hover:text-[#1F2937] hover:bg-[#F1E8DB] active:scale-95 transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold font-mono text-[#1F2937] tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[#5B6470] hover:text-[#1F2937] hover:bg-[#F1E8DB] active:scale-95 transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Special Instructions */}
                <input
                  type="text"
                  placeholder="Notes (e.g. less salt, spicy)"
                  value={item.specialInstructions}
                  onChange={(e) => updateItemNotes(item.menuItemId, e.target.value)}
                  className="w-full bg-white border border-[#E5D8C6] rounded-lg px-2.5 py-1 text-[11px] text-[#1F2937] placeholder-[#5B6470] focus:outline-none focus:border-[#92400E]"
                />
              </div>
            ))
          )}
        </div>

        {/* Cart Bottom Summary & Action */}
        <div className="p-4 border-t border-[#E5D8C6] bg-white space-y-3">
          <div>
            <input
              type="text"
              placeholder="Kitchen Order Note (optional)"
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-3 py-2 text-xs text-[#1F2937] placeholder-[#5B6470] focus:outline-none focus:border-[#92400E] min-h-[38px]"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            {activeOrderOnTable && existingSubtotal > 0 && (
              <div className="flex justify-between text-[#5B6470]">
                <span>Already Ordered</span>
                <span className="font-mono text-[#1F2937] font-semibold tabular-nums">{currency}{existingSubtotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#5B6470]">
              <span>{activeOrderOnTable ? 'New Items Subtotal' : 'Subtotal'}</span>
              <span className="font-mono text-[#1F2937] font-semibold tabular-nums">{currency}{newSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#5B6470]">
              <span>Estimated Tax ({taxRate}%)</span>
              <span className="font-mono text-[#1F2937] font-semibold tabular-nums">{currency}{estimatedTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#1F2937] pt-2 border-t border-[#E5D8C6]">
              <span>Grand Total</span>
              <span className="text-[#92400E] font-mono text-base font-extrabold tabular-nums">{currency}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Fire To Kitchen Button (Min 48px Prominent Touch Target) */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={submitting || cart.length === 0}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-[#92400E] hover:bg-[#78350F] active:scale-95 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-sandstone hover:shadow-sandstone-md cursor-pointer"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {submitting
                ? 'Submitting Ticket...'
                : activeOrderOnTable
                ? `Add ${cart.length} Item(s) to Order #${activeOrderOnTable.orderNumber}`
                : 'Fire to Kitchen'}
            </span>
          </button>
        </div>
      </div>

      {/* ACTIVE ORDERS DRAWER */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white border-l border-[#E5D8C6] h-full flex flex-col shadow-sandstone-lg animate-slide-left">
            <div className="p-5 border-b border-[#E5D8C6] flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#1F2937] text-base">
                <History className="w-5 h-5 text-[#92400E]" />
                <span>Active Kitchen & Service Orders</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-[#5B6470] hover:text-[#1F2937] p-1.5 rounded-lg hover:bg-[#F1E8DB] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingOrders ? (
                <div className="text-center py-12 text-[#5B6470] text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#92400E]" />
                  <span>Loading orders...</span>
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="text-center py-12 text-[#9CA3AF] text-sm">No active orders found.</div>
              ) : (
                activeOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-[#FAF7F2] border border-[#E5D8C6] rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#1F2937] text-sm font-mono">
                          Table #{ord.table?.tableNumber || ord.tableNumber || 'N/A'}
                        </span>
                        <span className="text-xs text-[#5B6470] ml-2 font-mono">
                          #{ord.orderNumber || ord.id.slice(0, 8)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                        {ord.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#1F2937] space-y-1">
                      {ord.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="font-medium">
                            {it.quantity}x {it.menuItem?.name || it.name}
                          </span>
                          <span className="text-[#5B6470] font-mono tabular-nums">
                            {currency}{Number(it.unitPrice || it.price || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {['PENDING', 'IN_PREPARATION'].includes(ord.status) && (
                      <div className="pt-2 border-t border-[#E5D8C6] flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(ord.id)}
                          className="text-xs font-bold text-rose-700 hover:text-rose-900 transition-colors cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
