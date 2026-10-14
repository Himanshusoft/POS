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
  AlertCircle
} from 'lucide-react';

import { useTables, usePosMutations } from '../hooks/usePosQueries';

export default function TableManagementView({ onSelectTableForOrder, onNavigateToBilling }) {
  const { restaurant, role, addToast } = useAuth();
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

  // Form states
  const [addForm, setAddForm] = useState({ tableNumber: '', capacity: 4, status: 'AVAILABLE' });
  const [editForm, setEditForm] = useState({ tableNumber: '', capacity: 4, status: 'AVAILABLE' });
  const [submitting, setSubmitting] = useState(false);

  const handleCreateTable = async (e) => {
    e.preventDefault();
    if (!addForm.tableNumber.trim()) {
      addToast('Table number is required', 'warning');
      return;
    }
    const cap = Number(addForm.capacity);
    if (!Number.isInteger(cap) || cap < 1) {
      addToast('Capacity must be a positive integer', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await posService.tables.create({
        tableNumber: addForm.tableNumber.trim(),
        capacity: cap,
        status: addForm.status || 'AVAILABLE',
      });
      addToast(`Table ${addForm.tableNumber} created successfully`, 'success');
      setShowAddModal(false);
      setAddForm({ tableNumber: '', capacity: 4, status: 'AVAILABLE' });
      fetchTables();
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
    if (!editForm.tableNumber.trim()) {
      addToast('Table number is required', 'warning');
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
        tableNumber: editForm.tableNumber.trim(),
        capacity: cap,
        status: editForm.status,
      });
      addToast(`Table ${editForm.tableNumber} updated successfully`, 'success');
      setShowEditModal(false);
      setEditingTable(null);
      fetchTables();
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] min-h-screen text-[#1F2937]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#E5D8C6] p-5 sm:p-6 rounded-2xl shadow-sandstone">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#92400E]/10 border border-[#92400E]/20 flex items-center justify-center text-[#92400E] shrink-0 shadow-sm">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] tracking-tight">
                Table Management
              </h1>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#92400E]/10 text-[#92400E] border border-[#92400E]/20 shadow-2xs">
                Dining Floor Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5B6470] mt-0.5 font-medium">
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
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 card-hover select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] ${
            filterStatus === 'ALL'
              ? 'bg-white border-[#92400E] ring-2 ring-[#92400E] shadow-sandstone'
              : 'bg-white border-[#E5D8C6] hover:border-[#92400E]/60 shadow-sandstone'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-[#5B6470]">Total Tables</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] font-mono tabular-nums mt-1">{summary.total}</div>
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
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 card-hover select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
            filterStatus === 'AVAILABLE'
              ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500 shadow-sandstone'
              : 'bg-white border-[#E5D8C6] hover:border-emerald-300 shadow-sandstone'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Available
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-800 font-mono tabular-nums mt-1">{summary.available}</div>
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
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 card-hover select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            filterStatus === 'OCCUPIED'
              ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500 shadow-sandstone'
              : 'bg-white border-[#E5D8C6] hover:border-rose-300 shadow-sandstone'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Occupied
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-800 font-mono tabular-nums mt-1">{summary.occupied}</div>
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
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 card-hover select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            filterStatus === 'RESERVED'
              ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500 shadow-sandstone'
              : 'bg-white border-[#E5D8C6] hover:border-amber-300 shadow-sandstone'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Reserved
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-900 font-mono tabular-nums mt-1">{summary.reserved}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E5D8C6] shadow-sandstone">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] ${
                filterStatus === status
                  ? 'bg-[#92400E] text-white shadow-sm'
                  : 'bg-[#FAF7F2] text-[#5B6470] hover:text-[#1F2937] hover:bg-[#F1E8DB] border border-[#E5D8C6]'
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
          <Search className="w-4 h-4 text-[#5B6470] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by table number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-[#1F2937] placeholder-[#5B6470] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] transition-all"
          />
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white border border-[#E5D8C6] rounded-2xl p-5 shadow-sandstone space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20" />
              <div className="pt-3 border-t border-[#E5D8C6]/50">
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
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sandstone card-hover group ${
                  table.status === 'OCCUPIED'
                    ? 'border-rose-200 bg-rose-50/15'
                    : table.status === 'AVAILABLE'
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : 'border-[#E5D8C6]'
                }`}
              >
                {/* Table Header & Seating Info */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-extrabold text-[#1F2937] text-lg tracking-tight group-hover:text-[#92400E] transition-colors">
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

                  <div className="flex items-center gap-3 text-xs text-[#5B6470] mb-4 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#92400E]" />
                      <span className="font-bold text-[#1F2937] tabular-nums">{table.capacity} Seats</span>
                    </span>
                    {activeOrder && (
                      <>
                        <span className="text-[#E5D8C6]">•</span>
                        <span className="text-rose-700 font-semibold truncate max-w-[120px] font-mono">
                          {activeOrder.orderNumber}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="space-y-2 pt-3 border-t border-[#E5D8C6]">
                  {/* Order Workflow Buttons */}
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
                      className="text-xs bg-[#FAF7F2] border border-[#E5D8C6] text-[#1F2937] font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#92400E] cursor-pointer"
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
                        className="p-1.5 rounded-lg text-[#5B6470] hover:text-[#1F2937] hover:bg-[#F1E8DB] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
                        title="Edit Table"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                        aria-label={`Delete ${table.tableNumber}`}
                        className="p-1.5 rounded-lg text-[#5B6470] hover:text-[#EF4444] hover:bg-rose-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
                        title="Delete Table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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
            <label className="text-xs font-bold text-[#1F2937]">Initial Status</label>
            <select
              value={addForm.status}
              onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
              className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] font-semibold"
            >
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5D8C6]">
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
            <label className="text-xs font-bold text-[#1F2937]">Table Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] font-semibold"
            >
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5D8C6]">
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
    </div>
  );
}
