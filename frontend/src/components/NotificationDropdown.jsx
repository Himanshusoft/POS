import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import posService from '../services/pos.service';
import { queryKeys } from '../config/queryKeys';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  UtensilsCrossed,
  ChefHat,
  ShoppingBag,
  Building2,
  RefreshCw,
  CheckCheck,
  Clock
} from 'lucide-react';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Just now';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Safely extract array items from responses (both paginated { items: [] }, query client cache, and raw [])
function extractItems(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (response?.success && response?.data) {
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data.items)) return response.data.items;
  }
  return [];
}

export default function NotificationDropdown() {
  const { user, role, restaurant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`pos_read_notifications_${user?.id || 'default'}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const dropdownRef = useRef(null);
  const currency = restaurant?.currency || '₹';

  // Keep read IDs synced per user session
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`pos_read_notifications_${user?.id || 'default'}`);
      setReadIds(stored ? JSON.parse(stored) : []);
    } catch {
      setReadIds([]);
    }
  }, [user?.id]);

  const markAsRead = (id) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem(`pos_read_notifications_${user?.id || 'default'}`, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save read state', e);
      }
      return updated;
    });
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    try {
      localStorage.setItem(`pos_read_notifications_${user?.id || 'default'}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save read state', e);
    }
  };

  const queryClient = useQueryClient();
  const restId = restaurant?.id || 'current';

  // Helper to read from React Query cache first, or fetch with deduplicating queryKey if dropdown is opened
  const getOrFetchQuery = useCallback(async (queryKey, fetcherFn, shouldFetch = false) => {
    const cached = queryClient.getQueryData(queryKey);
    if (cached !== undefined && cached !== null) {
      return cached;
    }
    if (shouldFetch) {
      return await queryClient.fetchQuery({
        queryKey,
        queryFn: fetcherFn,
        staleTime: 30 * 1000,
      }).catch(() => null);
    }
    return null;
  }, [queryClient]);

  // Fetch live notifications by reusing React Query cache or performing deduplicated fetch
  const fetchDynamicNotifications = useCallback(async (isSilent = false, forceFetch = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    const allowNetwork = forceFetch || isOpen;

    try {
      let list = [];

      if (role === 'WAITER') {
        const [dashRes, ordersRes] = await Promise.all([
          getOrFetchQuery(
            queryKeys.waiter.dashboard(restId),
            async () => {
              const res = await posService.waiter.getDashboard();
              return res.success && res.data ? res.data : null;
            },
            allowNetwork
          ),
          getOrFetchQuery(
            queryKeys.orders.all(restId, { limit: 15 }),
            async () => {
              const res = await posService.orders.getAll({ limit: 15 });
              return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
            },
            allowNetwork
          ),
        ]);

        // 1. Ready Order Notifications from Kitchen
        const readyItems = (dashRes?.readyNotifications || dashRes?.data?.readyNotifications) || [];
        readyItems.forEach((n) => {
          list.push({
            id: `waiter-ready-${n.orderId || n.id}`,
            title: 'Order Ready to Serve',
            description: `Table ${n.tableNumber} • ${n.itemsCount} item(s) ready from kitchen`,
            timestamp: n.readyAt || new Date().toISOString(),
            icon: CheckCircle2,
            iconColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          });
        });

        // 2. Bills ready for delivery
        const billItems = (dashRes?.billNotifications || dashRes?.data?.billNotifications) || [];
        billItems.forEach((b) => {
          list.push({
            id: `waiter-bill-${b.billId || b.id}`,
            title: 'Bill Ready for Guest',
            description: `Table ${b.tableNumber} • Bill #${b.billNumber} (${currency}${Number(b.totalAmount || 0).toFixed(2)}) ready`,
            timestamp: b.createdAt || new Date().toISOString(),
            icon: Receipt,
            iconColor: 'text-[#92400E] bg-[#FAF7F2] border-[#E5D8C6]',
          });
        });

        // 3. Active order updates
        const rawOrders = extractItems(ordersRes);
        rawOrders.forEach((o) => {
          const tableName = o.table?.tableNumber || 'Guest';
          if (o.billRequested) {
            list.push({
              id: `waiter-billreq-${o.id}`,
              title: `Table ${tableName} Requested Bill`,
              description: `Order #${o.orderNumber} • Guest requested bill settlement`,
              timestamp: o.billRequestedAt || o.updatedAt,
              icon: Receipt,
              iconColor: 'text-[#92400E] bg-[#FAF7F2] border-[#E5D8C6]',
            });
          } else if (o.status === 'IN_PREPARATION') {
            list.push({
              id: `waiter-prep-${o.id}`,
              title: `Kitchen Preparing Order #${o.orderNumber}`,
              description: `Table ${tableName} • Dishes are currently being prepared`,
              timestamp: o.updatedAt || o.createdAt,
              icon: Clock,
              iconColor: 'text-amber-700 bg-amber-50 border-amber-200',
            });
          }
        });
      } else if (role === 'KITCHEN_ADMIN') {
        const [ordersRes, lowStockRes] = await Promise.all([
          getOrFetchQuery(
            queryKeys.kitchen.orders(restId, { limit: 15 }),
            async () => {
              const res = await posService.kitchen.getOrders({ limit: 15 });
              return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
            },
            allowNetwork
          ),
          getOrFetchQuery(
            queryKeys.inventory.lowStock(restId),
            async () => {
              const res = await posService.inventory.getLowStockAlerts();
              return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
            },
            allowNetwork
          ),
        ]);

        const rawOrders = extractItems(ordersRes);
        rawOrders.forEach((o) => {
          const tableName = o.table?.tableNumber || 'Takeaway';
          const itemsCount = o.items?.length || 1;

          if (o.status === 'PENDING') {
            list.push({
              id: `kitchen-pending-${o.id}`,
              title: 'New Order Received',
              description: `Table ${tableName} • Order #${o.orderNumber} (${itemsCount} item${itemsCount === 1 ? '' : 's'} waiting to start)`,
              timestamp: o.createdAt,
              icon: ShoppingBag,
              iconColor: 'text-amber-700 bg-amber-50 border-amber-200',
            });
          } else if (o.status === 'ACCEPTED' || o.status === 'IN_PREPARATION') {
            list.push({
              id: `kitchen-cooking-${o.id}`,
              title: 'Order in Preparation',
              description: `Table ${tableName} • Order #${o.orderNumber} in active cooking`,
              timestamp: o.updatedAt || o.createdAt,
              icon: ChefHat,
              iconColor: 'text-[#92400E] bg-[#FAF7F2] border-[#E5D8C6]',
            });
          } else if (o.status === 'READY') {
            list.push({
              id: `kitchen-ready-${o.id}`,
              title: 'Order Marked Ready',
              description: `Table ${tableName} • Order #${o.orderNumber} waiting for waiter pickup`,
              timestamp: o.readyAt || o.updatedAt,
              icon: CheckCircle2,
              iconColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            });
          }
        });

        // Low stock ingredients alert
        const lowItems = extractItems(lowStockRes);
        lowItems.forEach((inv) => {
          list.push({
            id: `kitchen-lowstock-${inv.id}-${Math.floor(Number(inv.currentStock || 0))}`,
            title: 'Low Stock Ingredient',
            description: `${inv.name} is down to ${Number(inv.currentStock)} ${inv.unit} (Min: ${Number(inv.minStockThreshold)})`,
            timestamp: inv.updatedAt || new Date().toISOString(),
            icon: AlertTriangle,
            iconColor: 'text-rose-700 bg-rose-50 border-rose-200',
          });
        });
      } else if (role === 'RESTAURANT_OWNER') {
        const [ordersRes, lowStockRes, billsRes] = await Promise.all([
          getOrFetchQuery(
            queryKeys.orders.all(restId, { limit: 15 }),
            async () => {
              const res = await posService.orders.getAll({ limit: 15 });
              return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
            },
            allowNetwork
          ),
          getOrFetchQuery(
            queryKeys.inventory.lowStock(restId),
            async () => {
              const res = await posService.inventory.getLowStockAlerts();
              return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
            },
            allowNetwork
          ),
          getOrFetchQuery(
            queryKeys.billing.bills(restId, { limit: 100 }),
            async () => {
              const res = await posService.billing.getBills({ limit: 100 });
              return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
            },
            allowNetwork
          ),
        ]);

        // Real-time Order Events
        const rawOrders = extractItems(ordersRes);
        rawOrders.forEach((o) => {
          const tableName = o.table?.tableNumber || 'Takeaway';
          const total = Number(o.totalAmount || o.bill?.totalAmount || 0);

          if (o.status === 'PENDING') {
            list.push({
              id: `admin-order-new-${o.id}`,
              title: `New Order #${o.orderNumber}`,
              description: `Table ${tableName} • ${currency}${total.toFixed(2)} sent to kitchen`,
              timestamp: o.createdAt,
              icon: ShoppingBag,
              iconColor: 'text-amber-700 bg-amber-50 border-amber-200',
            });
          } else if (o.billRequested) {
            list.push({
              id: `admin-order-billreq-${o.id}`,
              title: `Bill Requested — Table ${tableName}`,
              description: `Order #${o.orderNumber} • Guest requested check`,
              timestamp: o.billRequestedAt || o.updatedAt,
              icon: Receipt,
              iconColor: 'text-[#92400E] bg-[#FAF7F2] border-[#E5D8C6]',
            });
          } else if (o.status === 'READY') {
            list.push({
              id: `admin-order-ready-${o.id}`,
              title: `Order Ready — Table ${tableName}`,
              description: `Order #${o.orderNumber} is prepared and ready for service`,
              timestamp: o.readyAt || o.updatedAt,
              icon: CheckCircle2,
              iconColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            });
          } else if (o.status === 'SERVED' || o.status === 'COMPLETED') {
            list.push({
              id: `admin-order-served-${o.id}`,
              title: `Order Served — Table ${tableName}`,
              description: `Order #${o.orderNumber} served to guests`,
              timestamp: o.servedAt || o.updatedAt,
              icon: UtensilsCrossed,
              iconColor: 'text-[#92400E] bg-[#FAF7F2] border-[#E5D8C6]',
            });
          }
        });

        // Inventory Alerts
        const lowItems = extractItems(lowStockRes);
        lowItems.forEach((item) => {
          list.push({
            id: `admin-lowstock-${item.id}-${Math.floor(Number(item.currentStock || 0))}`,
            title: 'Low Stock Inventory Alert',
            description: `${item.name} current stock: ${Number(item.currentStock)} ${item.unit} (Min: ${Number(item.minStockThreshold)})`,
            timestamp: item.updatedAt || new Date().toISOString(),
            icon: AlertTriangle,
            iconColor: 'text-rose-700 bg-rose-50 border-rose-200',
          });
        });

        // Paid & Pending Bills
        const rawBills = extractItems(billsRes);
        rawBills.forEach((b) => {
          const isPaid = b.status === 'PAID';
          list.push({
            id: `admin-bill-${b.id}-${b.status}`,
            title: isPaid ? 'Payment Settled' : 'Pending Invoice Settlement',
            description: `Bill #${b.billNumber} • ${currency}${Number(b.totalAmount || 0).toFixed(2)} (${isPaid ? 'Paid' : 'Unpaid'})`,
            timestamp: b.updatedAt || b.createdAt,
            icon: isPaid ? CheckCircle2 : Receipt,
            iconColor: isPaid
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-amber-700 bg-amber-50 border-amber-200',
          });
        });
      } else if (role === 'RECEPTIONIST') {
        const [pendingOrdersRes, billsRes] = await Promise.all([
          getOrFetchQuery(
            queryKeys.billing.pendingOrders(restId),
            async () => {
              const res = await posService.billing.getPendingOrders();
              return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
            },
            allowNetwork
          ),
          getOrFetchQuery(
            queryKeys.billing.bills(restId, { limit: 100 }),
            async () => {
              const res = await posService.billing.getBills({ limit: 100 });
              return res.success && res.data ? (Array.isArray(res.data) ? res.data : res.data.items || []) : [];
            },
            allowNetwork
          ),
        ]);

        const rawPending = extractItems(pendingOrdersRes);
        rawPending.forEach((o) => {
          list.push({
            id: `reception-billreq-${o.id}`,
            title: 'Bill Settlement Request',
            description: `Table ${o.table?.tableNumber || 'Guest'} #${o.orderNumber} requested final invoice checkout`,
            timestamp: o.billRequestedAt || o.updatedAt || o.createdAt,
            icon: Receipt,
            iconColor: 'text-[#92400E] bg-[#FAF7F2] border-[#E5D8C6]',
          });
        });

        const rawBills = extractItems(billsRes);
        rawBills.forEach((b) => {
          const isPaid = b.status === 'PAID';
          list.push({
            id: `reception-bill-${b.id}-${b.status}`,
            title: isPaid ? 'Payment Verified & Completed' : 'Pending Bill Collection',
            description: `Bill #${b.billNumber} • ${currency}${Number(b.totalAmount || 0).toFixed(2)} (${isPaid ? 'Settled' : 'Awaiting Payment'})`,
            timestamp: b.updatedAt || b.createdAt,
            icon: isPaid ? CheckCircle2 : Clock,
            iconColor: isPaid
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-amber-700 bg-amber-50 border-amber-200',
          });
        });
      } else if (role === 'RESTAURANT_REGISTRATION_ADMIN') {
        const res = await getOrFetchQuery(
          queryKeys.superAdmin.restaurants({ limit: 10 }),
          async () => {
            const r = await posService.registrationAdmin.getRestaurants({ limit: 10 });
            return r.success && r.data ? r.data : [];
          },
          allowNetwork
        );
        const restaurants = extractItems(res);
        restaurants.forEach((r) => {
          list.push({
            id: `superadmin-rest-${r.id}-${r.isActive ? 'active' : 'suspended'}`,
            title: `Tenant: ${r.name}`,
            description: `Plan: ${r.subscription?.plan?.name || 'Active'} • Status: ${r.isActive ? 'Active' : 'Inactive'}`,
            timestamp: r.updatedAt || r.createdAt || new Date().toISOString(),
            icon: Building2,
            iconColor: 'text-[#92400E] bg-[#FAF7F2] border-[#E5D8C6]',
          });
        });
      }

      // Sort strictly chronologically by newest dynamic timestamp first
      list.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        return timeB - timeA;
      });

      // Deduplicate by ID
      const seen = new Set();
      const uniqueList = list.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      setNotifications(uniqueList);
    } catch (err) {
      console.error('Failed to load dynamic notifications:', err);
      setError('Unable to load real-time notifications');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [role, currency, restId, isOpen, getOrFetchQuery]);

  // Initial load and instant refresh on window focus / custom events
  useEffect(() => {
    fetchDynamicNotifications(true, false);

    const handleFocus = () => {
      if (isOpen) fetchDynamicNotifications(true, true);
    };
    const handleCustomRefresh = () => fetchDynamicNotifications(true, true);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('pos:refresh_notifications', handleCustomRefresh);
    window.addEventListener('pos:order_created', handleCustomRefresh);
    window.addEventListener('pos:order_updated', handleCustomRefresh);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pos:refresh_notifications', handleCustomRefresh);
      window.removeEventListener('pos:order_created', handleCustomRefresh);
      window.removeEventListener('pos:order_updated', handleCustomRefresh);
    };
  }, [fetchDynamicNotifications, isOpen]);

  // Refresh immediately whenever user opens the notifications dropdown
  useEffect(() => {
    if (isOpen) {
      fetchDynamicNotifications(false, true);
    }
  }, [isOpen, fetchDynamicNotifications]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="View notifications"
        title="Notifications"
        className={`relative p-2 rounded-xl transition-all duration-200 border cursor-pointer ${isOpen
            ? 'bg-[#92400E] text-white border-[#92400E] shadow-sm'
            : 'text-[#4B5563] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201A] border-[#E5D8C6] dark:border-[#382F26] bg-white dark:bg-[#1C1815]'
          }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#EF4444] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white dark:border-[#1C1815] shadow-xs animate-in zoom-in-75">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-[#E5D8C6] dark:border-[#382F26] bg-white dark:bg-[#1C1815] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#1F2937] dark:text-[#F7F3EC] text-sm tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#92400E]/10 dark:bg-[#92400E]/20 text-[#92400E] dark:text-[#D97706] border border-[#92400E]/25 dark:border-[#92400E]/40">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-semibold text-[#92400E] dark:text-[#D97706] hover:text-[#78350F] dark:hover:text-[#F59E0B] transition-colors cursor-pointer flex items-center gap-1"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Filter Bar: EXACTLY ONE FILTER "All" as required */}
          <div className="px-4 py-2 bg-[#FAF7F2]/80 dark:bg-[#181512]/80 border-b border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-between">
            <div className="inline-flex items-center">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#92400E] text-white shadow-2xs">
                All
              </span>
            </div>
            <button
              type="button"
              onClick={() => fetchDynamicNotifications(false)}
              disabled={loading}
              className="text-[#6B6258] dark:text-[#8C7E72] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] p-1 rounded-md transition-colors cursor-pointer"
              title="Refresh notifications"
              aria-label="Refresh notifications"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#92400E] dark:text-[#D97706]' : ''}`} />
            </button>
          </div>

          {/* Notifications List Container */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E5D8C6]/50 dark:divide-[#382F26]/50 scrollbar-thin">
            {loading && notifications.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="flex gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] dark:bg-[#201C18] border border-[#E5D8C6] dark:border-[#382F26] shrink-0" />
                    <div className="flex-1 space-y-2 py-0.5">
                      <div className="h-3.5 bg-[#FAF7F2] dark:bg-[#201C18] rounded w-2/3" />
                      <div className="h-2.5 bg-[#FAF7F2] dark:bg-[#201C18] rounded w-5/6" />
                      <div className="h-2 bg-[#FAF7F2] dark:bg-[#201C18] rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <AlertTriangle className="w-7 h-7 mx-auto text-amber-500 mb-2 stroke-1" />
                <p className="text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC]">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchDynamicNotifications(false)}
                  className="mt-3 px-3 py-1.5 text-xs font-bold text-[#92400E] dark:text-[#D97706] bg-[#FAF7F2] dark:bg-[#201C18] hover:bg-[#F1E8DB] dark:hover:bg-[#2A241F] rounded-xl border border-[#E5D8C6] dark:border-[#382F26] transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] dark:bg-[#201C18] border border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-center text-[#92400E] dark:text-[#D97706] mx-auto mb-2.5 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 opacity-80" />
                </div>
                <h4 className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC]">You're all caught up</h4>
                <p className="text-[11px] text-[#6B6258] dark:text-[#8C7E72] mt-0.5">No new notifications</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !readIds.includes(notif.id);
                const IconComponent = notif.icon || Bell;

                return (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${isUnread
                        ? 'bg-[#FAF7F2]/80 dark:bg-[#221E1A]/80 hover:bg-[#FAF7F2] dark:hover:bg-[#26221D] border-l-2 border-l-[#92400E] dark:border-l-[#D97706]'
                        : 'bg-white dark:bg-[#1C1815] hover:bg-[#FAF7F2]/40 dark:hover:bg-[#201C18]/40'
                      }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${notif.iconColor || 'text-[#92400E] dark:text-[#D97706] bg-[#FAF7F2] dark:bg-[#201C18] border-[#E5D8C6] dark:border-[#382F26]'
                        }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4
                          className={`text-xs font-bold truncate ${isUnread ? 'text-[#1F2937] dark:text-[#F7F3EC]' : 'text-[#4B5563] dark:text-[#A89B8C]'
                            }`}
                        >
                          {notif.title}
                        </h4>
                        {isUnread && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#92400E] dark:bg-[#D97706] shrink-0"
                            title="Unread notification"
                          />
                        )}
                      </div>

                      <p className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] line-clamp-2 leading-relaxed">
                        {notif.description}
                      </p>

                      <span className="text-[10px] text-[#8C7E72] dark:text-[#786C5E] mt-1.5 block font-medium">
                        {formatRelativeTime(notif.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
