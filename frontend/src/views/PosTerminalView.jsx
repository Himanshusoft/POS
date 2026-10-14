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
import { useMenuCategories, useMenuItems, useTables, usePosMutations } from '../hooks/usePosQueries';

/**
 * MenuItemImage helper:
 * Displays real image URL if provided in API/database.
 * If missing or fails to load, gracefully displays an editorial dish placeholder.
 */
function MenuItemImage({ image, name, categoryName }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [image]);

  const resolvedUrl = image && !imgError ? getImageUrl(image) : null;

  if (resolvedUrl) {
    return (
      <div className="relative w-full h-32 sm:h-36 rounded-xl overflow-hidden mb-2.5 border border-[#E4DCD0] dark:border-[#1E362E] bg-[#F7EFE4]/40 dark:bg-[#101A18] group">
        <img
          src={resolvedUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-28 sm:h-32 rounded-xl mb-2.5 border border-[#E4DCD0] dark:border-[#1E362E] bg-gradient-to-br from-[#F7EFE4] to-[#FFFDF9] dark:from-[#152320] dark:to-[#101A18] flex flex-col items-center justify-center text-[#657168] dark:text-[#9FB29E] overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#173F36_1px,transparent_1px)] [background-size:10px_10px]" />
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] shadow-xs flex items-center justify-center text-[#173F36] dark:text-[#9FB29E]">
        <UtensilsCrossed className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-semibold text-[#657168] dark:text-[#9FB29E] mt-1.5 flex items-center gap-1 font-sans">
        {categoryName || 'Menu Dish'}
      </span>
    </div>
  );
}

export default function PosTerminalView({ preSelectedTable, onOrderPlaced }) {
  const { restaurant, addToast } = useAuth();
  const { invalidateOrders } = usePosMutations(restaurant?.id);

  const { data: categories = [], isLoading: loadingCategories } = useMenuCategories(restaurant?.id);
  const { data: menuItems = [], isLoading: loadingMenuItems } = useMenuItems(restaurant?.id);
  const { data: tables = [], isLoading: loadingTables } = useTables(restaurant?.id);

  const [selectedTableId, setSelectedTableId] = useState(preSelectedTable?.id || '');
  const [activeCategoryId, setActiveCategoryId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('DINE_IN');
  const [specialNotes, setSpecialNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loading = (loadingCategories && categories.length === 0) ||
    (loadingMenuItems && menuItems.length === 0) ||
    (loadingTables && tables.length === 0);

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

  useEffect(() => {
    if (!selectedTableId && tables.length > 0) {
      const avail = tables.find((t) => t.status === 'AVAILABLE') || tables[0];
      setSelectedTableId(avail.id);
    }
  }, [tables, selectedTableId]);

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
        invalidateOrders();
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
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden text-[#17251F] dark:text-[#F7EFE4]">
      {/* LEFT: Menu Catalog & Categories */}
      <div className="flex-1 flex flex-col min-w-0 p-5 sm:p-6 overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#657168] dark:text-[#9FB29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes, drinks, starters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E]/60 focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] shadow-editorial transition-all min-h-[42px]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                fetchActiveOrders();
                setShowHistory(true);
              }}
              className="flex items-center gap-2 bg-[#FFFDF9] dark:bg-[#152320] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] active:scale-95 text-[#17251F] dark:text-[#F7EFE4] text-xs font-bold px-4 py-2.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial hover:shadow-md transition-all cursor-pointer min-h-[42px]"
            >
              <History className="w-4 h-4 text-[#173F36] dark:text-[#9FB29E]" />
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
                ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial font-bold'
                : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial'
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
                  ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial font-bold'
                  : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial'
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
                <div key={i} className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-4 space-y-3 shadow-editorial">
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
            <div className="h-64 flex flex-col items-center justify-center text-[#657168] dark:text-[#9FB29E] bg-[#FFFDF9] dark:bg-[#152320] rounded-2xl border border-dashed border-[#E4DCD0] dark:border-[#1E362E]">
              <ShoppingBag className="w-10 h-10 mb-2 stroke-1 text-[#657168] dark:text-[#9FB29E]" />
              <p className="font-serif font-bold text-sm text-[#17251F] dark:text-[#F7EFE4]">No dishes match your selection.</p>
              <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5">Try searching with a different keyword or category.</p>
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
                    className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 select-none group shadow-editorial ${
                      !isOrderable
                        ? 'opacity-80 border-[#E4DCD0] dark:border-[#1E362E] bg-slate-50/80 dark:bg-slate-900/40 cursor-not-allowed hover:border-amber-400/60'
                        : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-[#173F36] dark:hover:border-[#9FB29E] hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
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
                        <span className={`font-serif font-bold text-sm line-clamp-1 transition-colors ${
                          !isOrderable ? 'text-[#657168] dark:text-[#9FB29E]' : 'text-[#17251F] dark:text-[#F7EFE4] group-hover:text-[#173F36] dark:group-hover:text-[#9FB29E]'
                        }`}>
                          {item.name}
                        </h3>
                        {(item.dietary || item.isVeg !== undefined) && (
                          <span
                            className={`w-3.5 h-3.5 rounded-xs border p-0.5 flex items-center justify-center shrink-0 mt-0.5 ${
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
                        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-1.5 mb-2 text-[11px] text-amber-900 dark:text-amber-300 leading-snug flex items-start gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 font-medium">
                            {availability.reasonMessage}
                          </span>
                        </div>
                      )}

                      {item.description && (
                        <p className="text-xs text-[#657168] dark:text-[#9FB29E] line-clamp-2 mb-3 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[#E4DCD0] dark:border-[#1E362E] mt-2">
                      <span className="font-extrabold text-[#173F36] dark:text-[#9FB29E] text-sm font-mono tabular-nums">
                        {currency}{Number(item.price).toFixed(2)}
                      </span>
                      {!isOrderable ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${
                              !item.isAvailable
                                ? 'text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                                : 'text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {!item.isAvailable
                              ? '86 Out'
                              : availability.reasonCode === 'NO_RECIPE'
                              ? 'No Recipe'
                              : 'Low Stock'}
                          </span>
                          <span className="text-[10px] font-bold text-[#657168] dark:text-[#9FB29E] bg-[#F7EFE4] dark:bg-[#101A18] px-2 py-0.5 rounded-md border border-[#E4DCD0] dark:border-[#1E362E]">
                            Unavailable
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          {availability.maxOrderableQuantity <= 5 && availability.maxOrderableQuantity > 0 && (
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              {availability.maxOrderableQuantity} left
                            </span>
                          )}
                          <span className="w-8 h-8 rounded-xl bg-[#173F36]/10 group-hover:bg-[#173F36] text-[#173F36] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs">
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
      <div className="w-96 bg-[#FFFDF9] dark:bg-[#152320] border-l border-[#E4DCD0] dark:border-[#1E362E] flex flex-col shrink-0 shadow-editorial">
        {/* Cart Header */}
        <div className="p-4 border-b border-[#E4DCD0] dark:border-[#1E362E]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <h2 className="font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] text-base">Current Ticket</h2>
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
              <label className="text-[10px] font-bold text-[#657168] dark:text-[#9FB29E] uppercase tracking-wider block mb-1 font-sans">
                Table
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] transition-all"
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
              <label className="text-[10px] font-bold text-[#657168] dark:text-[#9FB29E] uppercase tracking-wider block mb-1 font-sans">
                Type
              </label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] transition-all"
              >
                <option value="DINE_IN">Dine-In</option>
                <option value="TAKEAWAY">Takeaway</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
          </div>

          {/* Active Table Session Banner */}
          {activeOrderOnTable && (
            <div className="mt-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
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
            <div className="bg-[#F7EFE4]/40 dark:bg-[#101A18]/60 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl p-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E4DCD0] dark:border-[#1E362E]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#657168] dark:text-[#9FB29E] flex items-center gap-1.5 font-sans">
                  <Clock className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                  Already In Order ({activeOrderOnTable.items.length})
                </span>
                <span className="text-[11px] font-mono font-bold text-[#17251F] dark:text-[#F7EFE4] tabular-nums">
                  {currency}{existingSubtotal.toFixed(2)}
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {activeOrderOnTable.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="font-bold text-[#17251F] dark:text-[#F7EFE4]">{it.quantity}x</span>
                      <span className="truncate text-[#657168] dark:text-[#9FB29E] font-medium">{it.menuItem?.name || it.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        it.status === 'SERVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        it.status === 'READY' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        it.status === 'COOKING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {it.status}
                      </span>
                      <span className="text-[#17251F] dark:text-[#F7EFE4] font-mono text-[11px] tabular-nums">
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
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#173F36] dark:text-[#9FB29E] px-1 flex items-center gap-1 font-sans">
              <Plus className="w-3 h-3" />
              <span>New Items to Add ({cart.length})</span>
            </div>
          )}

          {cart.length === 0 ? (
            <div className={`flex flex-col items-center justify-center text-center p-6 text-[#657168] dark:text-[#9FB29E] ${activeOrderOnTable ? 'py-4' : 'h-full'}`}>
              <ShoppingBag className="w-10 h-10 stroke-1 mb-2 text-[#657168] dark:text-[#9FB29E]" />
              <p className="font-serif font-bold text-xs text-[#17251F] dark:text-[#F7EFE4]">
                {activeOrderOnTable ? 'No new items selected yet' : 'Ticket is Empty'}
              </p>
              <p className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-0.5">
                Click dish items on the left to add them to this table's order.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.menuItemId}
                className="bg-[#F7EFE4]/40 dark:bg-[#101A18]/60 border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-[#17251F] dark:text-[#F7EFE4] text-xs leading-tight font-serif">{item.name}</div>
                    <div className="text-[11px] text-[#173F36] dark:text-[#9FB29E] font-mono mt-0.5 font-bold tabular-nums">
                      {currency}{item.price.toFixed(2)} each
                    </div>
                  </div>

                  {/* Quantity Controls (Accessible Touch Targets) */}
                  <div className="flex items-center gap-1 bg-white dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] active:scale-95 transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold font-mono text-[#17251F] dark:text-[#F7EFE4] tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] active:scale-95 transition-colors cursor-pointer"
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
                  className="w-full bg-white dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-lg px-2.5 py-1 text-[11px] text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E]/60 focus:outline-none focus:border-[#173F36]"
                />
              </div>
            ))
          )}
        </div>

        {/* Cart Bottom Summary & Action */}
        <div className="p-4 border-t border-[#E4DCD0] dark:border-[#1E362E] bg-[#FFFDF9] dark:bg-[#152320] space-y-3">
          <div>
            <input
              type="text"
              placeholder="Kitchen Order Note (optional)"
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E]/60 focus:outline-none focus:border-[#173F36] min-h-[38px]"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            {activeOrderOnTable && existingSubtotal > 0 && (
              <div className="flex justify-between text-[#657168] dark:text-[#9FB29E]">
                <span>Already Ordered</span>
                <span className="font-mono text-[#17251F] dark:text-[#F7EFE4] font-semibold tabular-nums">{currency}{existingSubtotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#657168] dark:text-[#9FB29E]">
              <span>{activeOrderOnTable ? 'New Items Subtotal' : 'Subtotal'}</span>
              <span className="font-mono text-[#17251F] dark:text-[#F7EFE4] font-semibold tabular-nums">{currency}{newSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#657168] dark:text-[#9FB29E]">
              <span>Estimated Tax ({taxRate}%)</span>
              <span className="font-mono text-[#17251F] dark:text-[#F7EFE4] font-semibold tabular-nums">{currency}{estimatedTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#17251F] dark:text-[#F7EFE4] pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E]">
              <span className="font-serif">Grand Total</span>
              <span className="text-[#173F36] dark:text-[#9FB29E] font-mono text-base font-extrabold tabular-nums">{currency}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Fire To Kitchen Button (Min 48px Prominent Touch Target) */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={submitting || cart.length === 0}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-[#173F36] hover:bg-[#12332C] active:scale-95 disabled:opacity-50 text-[#FFFDF9] font-bold text-sm py-3 rounded-xl transition-all shadow-editorial hover:shadow-md cursor-pointer"
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
          <div className="w-full max-w-xl bg-[#FFFDF9] dark:bg-[#152320] border-l border-[#E4DCD0] dark:border-[#1E362E] h-full flex flex-col shadow-2xl animate-slide-left">
            <div className="p-5 border-b border-[#E4DCD0] dark:border-[#1E362E] flex items-center justify-between">
              <div className="flex items-center gap-2 font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] text-base">
                <History className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
                <span>Active Kitchen & Service Orders</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] p-1.5 rounded-lg hover:bg-[#F7EFE4] dark:hover:bg-[#101A18] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingOrders ? (
                <div className="text-center py-12 text-[#657168] dark:text-[#9FB29E] text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#173F36] dark:text-[#9FB29E]" />
                  <span>Loading orders...</span>
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="text-center py-12 text-[#657168] dark:text-[#9FB29E] text-sm">No active orders found.</div>
              ) : (
                activeOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-[#F7EFE4]/40 dark:bg-[#101A18]/60 border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] text-sm font-mono">
                          Table #{ord.table?.tableNumber || ord.tableNumber || 'N/A'}
                        </span>
                        <span className="text-xs text-[#657168] dark:text-[#9FB29E] ml-2 font-mono">
                          #{ord.orderNumber || ord.id.slice(0, 8)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border-emerald-200 dark:border-emerald-800 font-sans">
                        {ord.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#17251F] dark:text-[#F7EFE4] space-y-1">
                      {ord.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="font-medium">
                            {it.quantity}x {it.menuItem?.name || it.name}
                          </span>
                          <span className="text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums">
                            {currency}{Number(it.unitPrice || it.price || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {['PENDING', 'IN_PREPARATION'].includes(ord.status) && (
                      <div className="pt-2 border-t border-[#E4DCD0] dark:border-[#1E362E] flex justify-end">
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
