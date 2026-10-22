import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { Button, Badge, Modal, Input, EmptyState, Skeleton } from '../components/ui';
import {
  LayoutGrid,
  Users,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  CheckCircle2,
  Search,
  ShoppingBag,
  Receipt,
  X,
  AlertCircle,
  Eye,
  Clock
} from 'lucide-react';

import { useTables, usePosMutations } from '../hooks/usePosQueries';

export default function TableManagementView({ onSelectTableForOrder, onNavigateToBilling }) {
  const { restaurant, role, addToast } = useAuth();
  const isReadOnly = role === 'RESTAURANT_OWNER';
  const currency = restaurant?.currency || '₹';

  const {
    data: tables = [],
    isLoading: loading,
    refetch: fetchTables,
  } = useTables(restaurant?.id, { refetchInterval: 8000 });
  const { invalidateTables } = usePosMutations(restaurant?.id);

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [viewingTable, setViewingTable] = useState(null);

  // Form states
  const [addForm, setAddForm] = useState({ tableNumber: '', capacity: 4, status: 'AVAILABLE' });
  const [editForm, setEditForm] = useState({ tableNumber: '', capacity: 4, status: 'AVAILABLE' });
  const [submitting, setSubmitting] = useState(false);

  const handleCreateTable = async (e) => {
    e.preventDefault();
    const trimmedNumber = addForm.tableNumber.trim();
    if (!trimmedNumber) {
      addToast('Table number is required', 'warning');
      return;
    }
    const isDuplicate = tables.some(
      (t) => t.tableNumber.trim().toLowerCase() === trimmedNumber.toLowerCase()
    );
    if (isDuplicate) {
      addToast(`Table "${trimmedNumber}" already exists in this restaurant`, 'warning');
      return;
    }
    const rawCap = String(addForm.capacity).trim();
    if (/[eE]/.test(rawCap)) {
      addToast('Scientific notation is not allowed for seating capacity', 'warning');
      return;
    }
    const cap = Number(addForm.capacity);
    if (!Number.isInteger(cap) || cap < 1) {
      addToast('Capacity must be a positive integer (at least 1 guest)', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await posService.tables.create({
        tableNumber: trimmedNumber,
        capacity: cap,
        status: addForm.status || 'AVAILABLE',
      });
      addToast(`Table ${trimmedNumber} created successfully`, 'success');
      setShowAddModal(false);
      setAddForm({ tableNumber: '', capacity: 4, status: 'AVAILABLE' });
      invalidateTables();
      await fetchTables();
    } catch (err) {
      addToast(err.message || 'Failed to create table', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTable = (table) => {
    setEditingTable(table);
    setEditForm({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status,
    });
    setShowEditModal(true);
  };

  const handleUpdateTable = async (e) => {
    e.preventDefault();
    if (!editingTable) return;
    const trimmedNumber = editForm.tableNumber.trim();
    if (!trimmedNumber) {
      addToast('Table number is required', 'warning');
      return;
    }
    const isDuplicate = tables.some(
      (t) => t.id !== editingTable.id && t.tableNumber.trim().toLowerCase() === trimmedNumber.toLowerCase()
    );
    if (isDuplicate) {
      addToast(`Table "${trimmedNumber}" already exists in this restaurant`, 'warning');
      return;
    }
    const rawCap = String(editForm.capacity).trim();
    if (/[eE]/.test(rawCap)) {
      addToast('Scientific notation is not allowed for seating capacity', 'warning');
      return;
    }
    const cap = Number(editForm.capacity);
    if (!Number.isInteger(cap) || cap < 1) {
      addToast('Capacity must be a positive integer', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await posService.tables.update(editingTable.id, {
        tableNumber: trimmedNumber,
        capacity: cap,
        status: editForm.status,
      });
      addToast(`Table ${trimmedNumber} updated successfully`, 'success');
      setShowEditModal(false);
      setEditingTable(null);
      invalidateTables();
      await fetchTables();
    } catch (err) {
      addToast(err.message || 'Failed to update table', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (tableId, nextStatus) => {
    try {
      await posService.tables.updateStatus(tableId, nextStatus);
      addToast(`Table status changed to ${nextStatus}`, 'success');
      fetchTables();
    } catch (err) {
      addToast(err.message || 'Failed to update table status', 'error');
    }
  };

  const handleDeleteTable = async (tableId, tableNum) => {
    if (!window.confirm(`Are you sure you want to remove Table ${tableNum}?`)) return;
    try {
      await posService.tables.delete(tableId);
      addToast(`Table ${tableNum} deleted successfully`, 'success');
      fetchTables();
    } catch (err) {
      addToast(err.message || 'Cannot delete table with active orders', 'error');
    }
  };

  const filteredTables = tables.filter((t) => {
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchSearch =
      !searchQuery.trim() ||
      t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const summary = {
    total: tables.length,
    available: tables.filter((t) => t.status === 'AVAILABLE').length,
    occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
    reserved: tables.filter((t) => t.status === 'RESERVED').length,
    outOfService: tables.filter((t) => t.status === 'OUT_OF_SERVICE').length,
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 text-[#17251F] dark:text-[#F7EFE4]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#9FB29E]/10 border border-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0 shadow-sm">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight">
                Table Management
              </h1>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#173F36] dark:text-[#9FB29E] border border-emerald-200 dark:border-emerald-800 shadow-2xs font-sans">
                Dining Floor Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
              Manage dining tables, seating capacity, real-time occupancy, and cashier dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={fetchTables}
            disabled={loading}
            icon={RefreshCw}
            loading={loading}
            title="Refresh Table Records"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setShowAddModal(true)}
            icon={Plus}
          >
            Add Table
          </Button>
        </div>
      </div>

      {/* Real-time Status KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setFilterStatus('ALL')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFilterStatus('ALL');
            }
          }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
            filterStatus === 'ALL'
              ? 'bg-[#FFFDF9] dark:bg-[#152320] border-[#173F36] ring-2 ring-[#173F36] shadow-editorial'
              : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-[#173F36]/60 shadow-editorial'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-[#657168] dark:text-[#9FB29E] font-sans">Total Tables</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums mt-1">{summary.total}</div>
        </div>

        <div
          onClick={() => setFilterStatus('AVAILABLE')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFilterStatus('AVAILABLE');
            }
          }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
            filterStatus === 'AVAILABLE'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500 shadow-editorial'
              : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-emerald-300 shadow-editorial'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 font-sans">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Available
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#173F36] dark:text-[#9FB29E] font-mono tabular-nums mt-1">{summary.available}</div>
        </div>

        <div
          onClick={() => setFilterStatus('OCCUPIED')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFilterStatus('OCCUPIED');
            }
          }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            filterStatus === 'OCCUPIED'
              ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500 shadow-editorial'
              : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-rose-300 shadow-editorial'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5 font-sans">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Occupied
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-800 dark:text-rose-300 font-mono tabular-nums mt-1">{summary.occupied}</div>
        </div>

        <div
          onClick={() => setFilterStatus('RESERVED')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFilterStatus('RESERVED');
            }
          }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            filterStatus === 'RESERVED'
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500 shadow-editorial'
              : 'bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E] hover:border-amber-300 shadow-editorial'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5 font-sans">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Reserved
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-900 dark:text-amber-300 font-mono tabular-nums mt-1">{summary.reserved}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 bg-[#FFFDF9] dark:bg-[#152320] p-3.5 sm:p-4 rounded-2xl border border-[#E4DCD0] dark:border-[#1E362E] shadow-editorial">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
                filterStatus === status
                  ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial'
                  : 'bg-[#F7EFE4]/60 dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] border border-[#E4DCD0] dark:border-[#1E362E]'
              }`}
            >
              {status === 'ALL'
                ? `All (${summary.total})`
                : status === 'AVAILABLE'
                ? `Available (${summary.available})`
                : status === 'OCCUPIED'
                ? `Occupied (${summary.occupied})`
                : status === 'RESERVED'
                ? `Reserved (${summary.reserved})`
                : `Out of Service (${summary.outOfService})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 text-[#657168] dark:text-[#9FB29E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by table number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E]/60 focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36] transition-all"
          />
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-5 shadow-editorial space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20" />
              <div className="pt-3 border-t border-[#E4DCD0]/50 dark:border-[#1E362E]/50">
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No Tables Found"
          description={
            tables.length === 0
              ? 'No dining tables created yet. Click "Add Table" to configure your restaurant layout.'
              : 'No tables match the current search or status filter.'
          }
          actionLabel={tables.length === 0 ? 'Add First Table' : undefined}
          onAction={tables.length === 0 ? () => setShowAddModal(true) : undefined}
          actionIcon={Plus}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const activeOrder = table.activeOrders?.[0] || table.orders?.[0];

            return (
              <div
                key={table.id}
                className={`bg-[#FFFDF9] dark:bg-[#152320] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-editorial group ${
                  table.status === 'OCCUPIED'
                    ? 'border-rose-200 dark:border-rose-900 bg-rose-50/15 dark:bg-rose-950/10'
                    : table.status === 'AVAILABLE'
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/15 dark:bg-emerald-950/10'
                    : 'border-[#E4DCD0] dark:border-[#1E362E]'
                }`}
              >
                {/* Table Header & Seating Info */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] text-lg tracking-tight group-hover:text-[#173F36] dark:group-hover:text-[#9FB29E] transition-colors">
                      {table.tableNumber.toLowerCase().startsWith('table')
                        ? table.tableNumber
                        : `Table ${table.tableNumber}`}
                    </span>
                    <Badge
                      variant={table.status}
                      status={table.status.replace('_', ' ')}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#657168] dark:text-[#9FB29E] mb-4 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                      <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] tabular-nums font-mono">{table.capacity} Seats</span>
                    </span>
                    {activeOrder && (
                      <>
                        <span className="text-[#E4DCD0] dark:text-[#1E362E]">•</span>
                        <span className="text-rose-700 dark:text-rose-400 font-semibold truncate max-w-[120px] font-mono">
                          {activeOrder.orderNumber}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Workflow Actions / Read-Only View */}
                <div className="space-y-2 pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E]">
                  {isReadOnly ? (
                    <>
                      {/* Read-Only Status & Active Order Info */}
                      {table.status === 'AVAILABLE' ? (
                        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium font-sans">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Available for Guests
                          </span>
                          <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 font-mono">Ready to seat</span>
                        </div>
                      ) : table.status === 'OCCUPIED' ? (
                        <div className="space-y-2">
                          <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl p-2.5 text-xs">
                            <div className="flex items-center justify-between text-rose-800 dark:text-rose-300 font-semibold mb-1">
                              <span className="font-mono">{activeOrder?.orderNumber || 'Active Order'}</span>
                              <Badge variant={activeOrder?.status || 'OCCUPIED'} size="xs">
                                {(activeOrder?.status || 'OCCUPIED').replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#657168] dark:text-[#9FB29E]">
                              <span>{activeOrder?.waiter?.name ? `Server: ${activeOrder.waiter.name}` : `${activeOrder?.items?.length || 0} order items`}</span>
                              <span className="font-mono font-bold text-[#17251F] dark:text-[#F7EFE4]">
                                {currency}{Number(activeOrder?.totalAmount || activeOrder?.items?.reduce((s, it) => s + (Number(it.unitPrice || it.menuItem?.price || 0) * it.quantity), 0) || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {activeOrder && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewingOrder(activeOrder);
                                setViewingTable(table);
                              }}
                              className="w-full text-xs font-semibold"
                              icon={Eye}
                            >
                              View Order Details
                            </Button>
                          )}
                        </div>
                      ) : table.status === 'RESERVED' ? (
                        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 text-xs font-medium font-sans">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            Reserved for Booking
                          </span>
                          <span className="text-[10px] text-amber-800/70 dark:text-amber-400/70 font-mono">Reserved</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-medium font-sans">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 text-neutral-500" />
                            Out of Service
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">Maintenance</span>
                        </div>
                      )}

                      {/* Read-Only Table Footer */}
                      <div className="flex items-center justify-between pt-1 text-xs text-[#657168] dark:text-[#9FB29E]">
                        <span className="text-[11px] font-sans font-medium text-[#657168] dark:text-[#9FB29E]">
                          Dining Table
                        </span>
                        <span className="text-[11px] font-mono text-[#657168] dark:text-[#9FB29E]">
                          Capacity: {table.capacity} Guests
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Order Workflow Buttons (Waiters / Other Roles) */}
                      {table.status === 'AVAILABLE' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onSelectTableForOrder && onSelectTableForOrder(table)}
                          className="w-full"
                          icon={ShoppingBag}
                        >
                          Take Order
                        </Button>
                      ) : table.status === 'OCCUPIED' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onSelectTableForOrder && onSelectTableForOrder(table)}
                            icon={ShoppingBag}
                            title="Add items to existing order"
                          >
                            Add Items
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => onNavigateToBilling && onNavigateToBilling(table)}
                            icon={Receipt}
                            title="Go to billing & payment"
                          >
                            Checkout
                          </Button>
                        </div>
                      ) : null}

                      {/* Status Dropdown, Edit & Delete */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <select
                          value={table.status}
                          onChange={(e) => handleStatusChange(table.id, e.target.value)}
                          aria-label={`Status for ${table.tableNumber}`}
                          className="text-xs bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#173F36] cursor-pointer"
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="OCCUPIED">Occupied</option>
                          <option value="RESERVED">Reserved</option>
                          <option value="OUT_OF_SERVICE">Out of Service</option>
                        </select>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditTable(table)}
                            aria-label={`Edit ${table.tableNumber}`}
                            className="p-1.5 rounded-lg text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#101A18] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
                            title="Edit Table"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                            aria-label={`Delete ${table.tableNumber}`}
                            className="p-1.5 rounded-lg text-[#657168] dark:text-[#9FB29E] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                            title="Delete Table"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD TABLE MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Table"
        subtitle="Create a dining table for your restaurant layout"
      >
        <form onSubmit={handleCreateTable} className="space-y-4">
          <Input
            label="Table Number / Name"
            required
            placeholder="e.g. Table 1, T2, 101"
            value={addForm.tableNumber}
            onChange={(e) => setAddForm({ ...addForm, tableNumber: e.target.value })}
          />

          <Input
            label="Seating Capacity (Guests)"
            type="number"
            min="1"
            max="100"
            required
            value={addForm.capacity}
            onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] font-sans">Initial Status</label>
            <select
              value={addForm.status}
              onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
              className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36] font-semibold"
            >
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              loading={submitting}
            >
              Create Table
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TABLE MODAL */}
      <Modal
        isOpen={showEditModal && Boolean(editingTable)}
        onClose={() => setShowEditModal(false)}
        title={`Edit ${editingTable?.tableNumber}`}
        subtitle="Update table details, seating capacity, and status"
      >
        <form onSubmit={handleUpdateTable} className="space-y-4">
          <Input
            label="Table Number / Name"
            required
            value={editForm.tableNumber}
            onChange={(e) => setEditForm({ ...editForm, tableNumber: e.target.value })}
          />

          <Input
            label="Seating Capacity (Guests)"
            type="number"
            min="1"
            max="100"
            required
            value={editForm.capacity}
            onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] font-sans">Table Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full bg-[#F7EFE4]/60 dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36] font-semibold"
            >
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              loading={submitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW ORDER DETAILS MODAL (READ-ONLY FOR RESTAURANT ADMIN) */}
      <Modal
        isOpen={Boolean(viewingOrder)}
        onClose={() => {
          setViewingOrder(null);
          setViewingTable(null);
        }}
        title={`Order ${viewingOrder?.orderNumber || ''} — ${viewingTable?.tableNumber ? (viewingTable.tableNumber.toLowerCase().startsWith('table') ? viewingTable.tableNumber : `Table ${viewingTable.tableNumber}`) : ''}`}
        subtitle={`Server: ${viewingOrder?.waiter?.name || 'Assigned Waiter'} • Placed: ${viewingOrder?.createdAt ? new Date(viewingOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4DCD0] dark:border-[#1E362E]">
            <span className="text-xs font-semibold text-[#657168] dark:text-[#9FB29E]">Order Status</span>
            <Badge
              variant={viewingOrder?.status || 'PENDING'}
              status={(viewingOrder?.status || 'PENDING').replace('_', ' ')}
              size="sm"
            />
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            <div className="text-xs font-bold uppercase tracking-wider text-[#657168] dark:text-[#9FB29E]">
              Order Items ({viewingOrder?.items?.length || 0})
            </div>
            {(viewingOrder?.items || []).map((item, idx) => {
              const itemName = item.menuItem?.name || item.name || 'Dish Item';
              const itemPrice = Number(item.unitPrice || item.menuItem?.price || 0);
              const subtotal = itemPrice * Number(item.quantity || 1);
              return (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7EFE4]/50 dark:bg-[#101A18] border border-[#E4DCD0]/60 dark:border-[#1E362E] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#173F36]/10 dark:bg-[#9FB29E]/10 font-mono font-bold text-[#173F36] dark:text-[#9FB29E] flex items-center justify-center text-xs">
                      {item.quantity}x
                    </span>
                    <div>
                      <div className="font-semibold text-[#17251F] dark:text-[#F7EFE4]">{itemName}</div>
                      {item.notes && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-sans italic">{item.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-[#17251F] dark:text-[#F7EFE4] tabular-nums">
                    {currency}{subtotal.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E] flex items-center justify-between">
            <span className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4]">Total Estimated Amount</span>
            <span className="text-sm font-mono font-bold text-[#173F36] dark:text-[#9FB29E] tabular-nums">
              {currency}
              {Number(
                viewingOrder?.totalAmount ||
                viewingOrder?.items?.reduce((s, it) => s + (Number(it.unitPrice || it.menuItem?.price || 0) * it.quantity), 0) ||
                0
              ).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setViewingOrder(null);
                setViewingTable(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
