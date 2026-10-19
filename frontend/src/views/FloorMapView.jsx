import React, { useState } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui';
import {
  LayoutGrid,
  Users,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ShoppingBag,
  Receipt
} from 'lucide-react';

import { useTables, usePosMutations } from '../hooks/usePosQueries';

export default function FloorMapView({ onSelectTableForOrder, onNavigateToBilling }) {
  const { role, restaurant, addToast } = useAuth();
  const {
    data: tables = [],
    isLoading: loading,
    refetch: fetchTables,
  } = useTables(restaurant?.id, { refetchInterval: 8000 });
  const { invalidateTables, invalidateOrders } = usePosMutations(restaurant?.id);

  const [filterFloor, setFilterFloor] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTable, setNewTable] = useState({ tableNumber: '', capacity: 4, floor: 'Ground Floor' });
  const [submitting, setSubmitting] = useState(false);

  const isReceptionist = role === 'RECEPTIONIST' || role === 'CASHIER';

  const handleServeOrder = async (orderId) => {
    try {
      await posService.orders.updateStatus(orderId, 'SERVED');
      addToast('Order marked SERVED to customer!', 'success');
      fetchTables();
      invalidateOrders();
    } catch (err) {
      addToast(err.message || 'Failed to mark order as served', 'error');
    }
  };

  const handleStatusChange = async (tableId, nextStatus) => {
    try {
      await posService.tables.updateStatus(tableId, nextStatus);
      addToast(`Table status updated to ${nextStatus}`, 'success');
      fetchTables();
      invalidateTables();
    } catch (err) {
      addToast(err.message || 'Failed to update table status', 'error');
    }
  };

  const handleDeleteTable = async (tableId, tableNum) => {
    if (!window.confirm(`Are you sure you want to remove Table #${tableNum}?`)) return;
    try {
      await posService.tables.delete(tableId);
      addToast(`Table #${tableNum} deleted`, 'success');
      fetchTables();
      invalidateTables();
    } catch (err) {
      addToast(err.message || 'Cannot delete table with active orders', 'error');
    }
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    if (!newTable.tableNumber) {
      addToast('Table number is required', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await posService.tables.create({
        tableNumber: newTable.tableNumber.trim(),
        capacity: Number(newTable.capacity),
        floor: newTable.floor,
        status: 'AVAILABLE',
      });
      addToast(`Table ${newTable.tableNumber} added successfully`, 'success');
      setShowAddModal(false);
      setNewTable({ tableNumber: '', capacity: 4, floor: 'Ground Floor' });
      fetchTables();
      invalidateTables();
    } catch (err) {
      addToast(err.message || 'Failed to create table', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const floors = ['ALL', ...new Set(tables.map((t) => t.floor || 'Main Hall'))];

  const filteredTables = tables.filter((t) => {
    const matchFloor = filterFloor === 'ALL' || (t.floor || 'Main Hall') === filterFloor;
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchFloor && matchStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
          label: 'Available',
          dot: 'bg-emerald-500'
        };
      case 'OCCUPIED':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/40',
          label: 'Occupied',
          dot: 'bg-rose-500'
        };
      case 'RESERVED':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
          label: 'Reserved',
          dot: 'bg-amber-500'
        };
      default:
        return {
          bg: 'bg-[#F7EFE4] dark:bg-[#1E362E] text-[#657168] dark:text-[#9FB29E] border-[#E4DCD0] dark:border-[#254238]',
          label: 'Out of Order',
          dot: 'bg-[#657168]'
        };
    }
  };

  const summary = {
    total: tables.length,
    available: tables.filter((t) => t.status === 'AVAILABLE').length,
    occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
    reserved: tables.filter((t) => t.status === 'RESERVED').length,
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#173F36]/10 dark:bg-[#173F36]/30 text-[#173F36] dark:text-[#9FB29E]">
              <LayoutGrid className="w-6 h-6" />
            </span>
            <span>Floor Plan & Dining Tables</span>
          </h1>
          <p className="text-sm text-[#657168] dark:text-[#9FB29E] mt-1 font-sans">
            Real-time table availability, active dining sessions, and seating management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTables()}
            disabled={loading}
            className="p-2.5 bg-[#FFFDF9] dark:bg-[#152320] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial transition-colors cursor-pointer"
            title="Refresh Floor"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#173F36] dark:text-[#9FB29E]' : 'text-[#657168] dark:text-[#9FB29E]'}`} />
          </button>
          {['RESTAURANT_OWNER'].includes(role) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-[#173F36] hover:bg-[#12332C] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-editorial hover:shadow-editorial-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterStatus('ALL')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'ALL'
              ? 'bg-[#FFFDF9] dark:bg-[#152320] border-[#173F36] dark:border-[#9FB29E] ring-1 ring-[#173F36] dark:ring-[#9FB29E] shadow-editorial-md'
              : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-[#173F36]/50 shadow-editorial'
          }`}
        >
          <div className="text-xs font-semibold text-[#657168] dark:text-[#9FB29E] uppercase tracking-wider">Total Tables</div>
          <div className="text-2xl font-bold font-serif text-[#17251F] dark:text-[#F7EFE4] mt-1">{summary.total}</div>
        </div>

        <div
          onClick={() => setFilterStatus('AVAILABLE')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'AVAILABLE'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500 shadow-editorial-md'
              : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-emerald-400 shadow-editorial'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Available
          </div>
          <div className="text-2xl font-bold font-serif text-emerald-800 dark:text-emerald-200 mt-1">{summary.available}</div>
        </div>

        <div
          onClick={() => setFilterStatus('OCCUPIED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'OCCUPIED'
              ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 ring-1 ring-rose-500 shadow-editorial-md'
              : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-rose-400 shadow-editorial'
          }`}
        >
          <div className="text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Occupied
          </div>
          <div className="text-2xl font-bold font-serif text-rose-800 dark:text-rose-200 mt-1">{summary.occupied}</div>
        </div>

        <div
          onClick={() => setFilterStatus('RESERVED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'RESERVED'
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500 shadow-editorial-md'
              : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-amber-400 shadow-editorial'
          }`}
        >
          <div className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Reserved
          </div>
          <div className="text-2xl font-bold font-serif text-amber-900 dark:text-amber-200 mt-1">{summary.reserved}</div>
        </div>
      </div>

      {/* Floor Filter Tabs */}
      {floors.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => setFilterFloor(floor)}
              className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                filterFloor === floor
                  ? 'bg-[#173F36] text-white border-[#173F36] shadow-editorial font-bold'
                  : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] border-[#E4DCD0] dark:border-[#1E362E] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] hover:text-[#17251F] dark:hover:text-[#F7EFE4]'
              }`}
            >
              {floor === 'ALL' ? 'All Floors' : floor}
            </button>
          ))}
        </div>
      )}

      {/* Floor Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#173F36] dark:text-[#9FB29E] animate-spin" />
          <span className="text-sm text-[#657168] dark:text-[#9FB29E]">Loading dining floor layout...</span>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-12 text-center shadow-editorial">
          <LayoutGrid className="w-12 h-12 text-[#9FB29E] mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">No Tables Found</h3>
          <p className="text-sm text-[#657168] dark:text-[#9FB29E] mt-1 max-w-sm mx-auto">
            {tables.length === 0
              ? 'No tables created yet. Add your dining tables to start taking orders.'
              : 'No tables match the current filter selection.'}
          </p>
          {['RESTAURANT_OWNER'].includes(role) && tables.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 bg-[#173F36] hover:bg-[#12332C] text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-editorial transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add First Table
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const badge = getStatusBadge(table.status);
            return (
              <div
                key={table.id}
                className={`bg-[#FFFDF9] dark:bg-[#152320] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-editorial hover:shadow-editorial-md hover:-translate-y-0.5 group ${
                  table.status === 'OCCUPIED'
                    ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20'
                    : table.status === 'AVAILABLE'
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-[#E4DCD0] dark:border-[#1E362E] hover:border-[#173F36] dark:hover:border-[#9FB29E]'
                }`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] text-lg group-hover:text-[#173F36] dark:group-hover:text-[#9FB29E] transition-colors">
                      Table #{table.tableNumber}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${badge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#657168] dark:text-[#9FB29E] mb-4 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 opacity-70" />
                      <span>{table.capacity} Guests</span>
                    </span>
                    <span className="text-[#E4DCD0] dark:text-[#1E362E]">•</span>
                    <span>{table.floor || 'Main Hall'}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E]">
                  {/* Ready Order Alert Banner */}
                  {table.orders?.some((o) => o.status === 'READY') && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Food Ready</span>
                      </div>
                      {!isReceptionist && (
                        <button
                          onClick={() => {
                            const readyOrd = table.orders.find((o) => o.status === 'READY');
                            if (readyOrd) handleServeOrder(readyOrd.id);
                          }}
                          className="bg-[#173F36] hover:bg-[#12332C] text-white font-semibold text-[11px] px-3 py-1 rounded-lg transition-all shadow-editorial cursor-pointer"
                        >
                          Serve Food
                        </button>
                      )}
                    </div>
                  )}

                  {table.status === 'AVAILABLE' ? (
                    isReceptionist ? (
                      <div className="w-full py-2.5 px-3 rounded-xl bg-[#F7EFE4]/40 dark:bg-[#101A18]/40 border border-dashed border-[#E4DCD0] dark:border-[#1E362E] text-center text-xs text-[#657168] dark:text-[#9FB29E] font-medium font-sans">
                        Table Available
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectTableForOrder && onSelectTableForOrder(table)}
                        className="w-full flex items-center justify-center gap-2 bg-[#173F36] hover:bg-[#12332C] text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors shadow-editorial hover:shadow-editorial-md cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>New Order</span>
                      </button>
                    )
                  ) : table.status === 'OCCUPIED' ? (
                    isReceptionist ? (
                      <div className="space-y-2">
                        {table.orders?.[0] && (
                          <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] flex items-center justify-between px-1">
                            <span className="font-medium">
                              Order #{table.orders[0].orderNumber || table.orders[0].id?.slice(0, 6)}
                              {table.orders[0].items?.length ? ` • ${table.orders[0].items.length} items` : ''}
                            </span>
                            <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums">
                              {restaurant?.currency || '₹'}
                              {Number(table.orders[0].items?.reduce((s, it) => s + Number(it.subtotal || 0), 0) || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => onNavigateToBilling && onNavigateToBilling(table)}
                          className="w-full flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-all shadow-editorial cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Checkout / Billing</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onSelectTableForOrder && onSelectTableForOrder(table)}
                          className="flex items-center justify-center gap-1.5 bg-[#F7EFE4] dark:bg-[#1E362E] hover:bg-[#E4DCD0] dark:hover:bg-[#254238] text-[#17251F] dark:text-[#F7EFE4] border border-[#E4DCD0] dark:border-[#254238] text-xs font-semibold py-2 px-2 rounded-xl transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                          <span>Add Items</span>
                        </button>
                        <button
                          onClick={() => onNavigateToBilling && onNavigateToBilling(table)}
                          className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2 px-2 rounded-xl transition-colors shadow-editorial cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Checkout</span>
                        </button>
                      </div>
                    )
                  ) : null}

                  {/* Status Dropdown & Delete Option (Restricted from Receptionist) */}
                  {!isReceptionist && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <select
                        value={table.status}
                        onChange={(e) => handleStatusChange(table.id, e.target.value)}
                        className="text-[11px] bg-[#F7EFE4] dark:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#254238] text-[#17251F] dark:text-[#F7EFE4] rounded-lg px-2 py-1 focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E]"
                      >
                        <option value="AVAILABLE">Mark Available</option>
                        <option value="OCCUPIED">Mark Occupied</option>
                        <option value="RESERVED">Mark Reserved</option>
                        <option value="OUT_OF_SERVICE">Out of Service</option>
                      </select>

                      {role === 'RESTAURANT_OWNER' && (
                        <button
                          onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                          className="text-[#657168] dark:text-[#9FB29E] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Delete Table"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Dining Table"
        subtitle="Create a new table for dining service"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateTable} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">
              Table Number / Identifier *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 101, T-5, Patio-1"
              value={newTable.tableNumber}
              onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">
              Guest Seating Capacity
            </label>
            <input
              type="number"
              min="1"
              max="50"
              required
              value={newTable.capacity}
              onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">
              Floor / Dining Section
            </label>
            <select
              value={newTable.floor}
              onChange={(e) => setNewTable({ ...newTable, floor: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] transition-colors"
            >
              <option value="Ground Floor">Ground Floor</option>
              <option value="First Floor">First Floor</option>
              <option value="Rooftop Terrace">Rooftop Terrace</option>
              <option value="Outdoor Patio">Outdoor Patio</option>
              <option value="VIP Lounge">VIP Lounge</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#173F36] hover:bg-[#12332C] text-white text-xs font-semibold px-5 py-2 rounded-xl transition-all shadow-editorial hover:shadow-editorial-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Create Table'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
