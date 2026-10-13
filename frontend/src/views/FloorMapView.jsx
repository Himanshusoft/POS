import React, { useState, useEffect } from 'react';
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
  Clock,
  AlertCircle,
  ShoppingBag,
  Receipt
} from 'lucide-react';

export default function FloorMapView({ onSelectTableForOrder, onNavigateToBilling }) {
  const { role, restaurant, addToast } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterFloor, setFilterFloor] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTable, setNewTable] = useState({ tableNumber: '', capacity: 4, floor: 'Ground Floor' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await posService.tables.getAll();
      if (res.success && res.data) {
        setTables(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch floor tables', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleServeOrder = async (orderId) => {
    try {
      await posService.orders.updateStatus(orderId, 'SERVED');
      addToast('Order marked SERVED to customer!', 'success');
      fetchTables();
    } catch (err) {
      addToast(err.message || 'Failed to mark order as served', 'error');
    }
  };

  const handleStatusChange = async (tableId, nextStatus) => {
    try {
      await posService.tables.updateStatus(tableId, nextStatus);
      addToast(`Table status updated to ${nextStatus}`, 'success');
      fetchTables();
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
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Available', dot: 'bg-emerald-500' };
      case 'OCCUPIED':
        return { bg: 'bg-rose-50 text-rose-800 border-rose-200', label: 'Occupied', dot: 'bg-rose-500' };
      case 'RESERVED':
        return { bg: 'bg-amber-50 text-amber-900 border-amber-200', label: 'Reserved', dot: 'bg-amber-500' };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', label: 'Out of Order', dot: 'bg-slate-400' };
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
          <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-[#92400E]" />
            <span>Floor Plan & Dining Tables</span>
          </h1>
          <p className="text-sm text-[#5B6470]">
            Real-time table availability, active dining sessions, and seating management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTables}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-[#F1E8DB] text-[#1F2937] rounded-xl border border-[#E5D8C6] shadow-sandstone transition-colors cursor-pointer"
            title="Refresh Floor"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#92400E]' : 'text-[#5B6470]'}`} />
          </button>
          {['RESTAURANT_OWNER'].includes(role) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-[#92400E] hover:bg-[#78350F] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-sandstone hover:shadow-sandstone-md cursor-pointer"
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
              ? 'bg-white border-[#92400E] ring-1 ring-[#92400E] shadow-sandstone-md'
              : 'bg-white border-[#E5D8C6] hover:border-[#92400E] shadow-sandstone'
          }`}
        >
          <div className="text-xs font-semibold text-[#5B6470]">Total Tables</div>
          <div className="text-2xl font-extrabold text-[#1F2937] mt-1">{summary.total}</div>
        </div>

        <div
          onClick={() => setFilterStatus('AVAILABLE')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'AVAILABLE'
              ? 'bg-emerald-50/60 border-emerald-400 ring-1 ring-emerald-400 shadow-sandstone-md'
              : 'bg-white border-[#E5D8C6] hover:border-emerald-300 shadow-sandstone'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Available
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 mt-1">{summary.available}</div>
        </div>

        <div
          onClick={() => setFilterStatus('OCCUPIED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'OCCUPIED'
              ? 'bg-rose-50/60 border-rose-400 ring-1 ring-rose-400 shadow-sandstone-md'
              : 'bg-white border-[#E5D8C6] hover:border-rose-300 shadow-sandstone'
          }`}
        >
          <div className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Occupied
          </div>
          <div className="text-2xl font-extrabold text-rose-800 mt-1">{summary.occupied}</div>
        </div>

        <div
          onClick={() => setFilterStatus('RESERVED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'RESERVED'
              ? 'bg-amber-50/60 border-amber-400 ring-1 ring-amber-400 shadow-sandstone-md'
              : 'bg-white border-[#E5D8C6] hover:border-amber-300 shadow-sandstone'
          }`}
        >
          <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Reserved
          </div>
          <div className="text-2xl font-extrabold text-amber-900 mt-1">{summary.reserved}</div>
        </div>
      </div>

      {/* Floor Filter Tabs */}
      {floors.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => setFilterFloor(floor)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                filterFloor === floor
                  ? 'bg-[#92400E] text-white border-[#92400E] shadow-sandstone font-bold'
                  : 'bg-white text-[#5B6470] border-[#E5D8C6] hover:bg-[#F1E8DB] hover:text-[#1F2937]'
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
          <RefreshCw className="w-8 h-8 text-[#92400E] animate-spin" />
          <span className="text-sm text-[#5B6470]">Loading dining floor layout...</span>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white border border-[#E5D8C6] rounded-2xl p-12 text-center shadow-sandstone">
          <LayoutGrid className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[#1F2937]">No Tables Found</h3>
          <p className="text-sm text-[#5B6470] mt-1 max-w-sm mx-auto">
            {tables.length === 0
              ? 'No tables created yet. Add your dining tables to start taking orders.'
              : 'No tables match the current filter selection.'}
          </p>
          {['RESTAURANT_OWNER'].includes(role) && tables.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 bg-[#92400E] hover:bg-[#78350F] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sandstone transition cursor-pointer"
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
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sandstone hover:shadow-sandstone-md hover:-translate-y-0.5 group ${
                  table.status === 'OCCUPIED'
                    ? 'border-rose-200 bg-rose-50/20'
                    : table.status === 'AVAILABLE'
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-[#E5D8C6] hover:border-[#92400E]'
                }`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-[#1F2937] text-lg group-hover:text-[#92400E] transition-colors">
                      Table #{table.tableNumber}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${badge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#5B6470] mb-4 font-medium">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#5B6470]" />
                      <span>{table.capacity} Guests</span>
                    </span>
                    <span className="text-[#E5D8C6]">•</span>
                    <span>{table.floor || 'Main Hall'}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-[#E5D8C6]">
                  {/* Ready Order Alert Banner for Waiter */}
                  {table.orders?.some((o) => o.status === 'READY') && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                        <span>Food Ready to Serve!</span>
                      </div>
                      <button
                        onClick={() => {
                          const readyOrd = table.orders.find((o) => o.status === 'READY');
                          if (readyOrd) handleServeOrder(readyOrd.id);
                        }}
                        className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[11px] px-3 py-1 rounded-lg transition-all shadow-sandstone cursor-pointer"
                      >
                        Serve Food
                      </button>
                    </div>
                  )}

                  {table.status === 'AVAILABLE' ? (
                    <button
                      onClick={() => onSelectTableForOrder && onSelectTableForOrder(table)}
                      className="w-full flex items-center justify-center gap-2 bg-[#92400E] hover:bg-[#78350F] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-colors shadow-sandstone hover:shadow-sandstone-md cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>New Order</span>
                    </button>
                  ) : table.status === 'OCCUPIED' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {role !== 'RECEPTIONIST' && (
                        <button
                          onClick={() => onSelectTableForOrder && onSelectTableForOrder(table)}
                          className="flex items-center justify-center gap-1 bg-[#FAF7F2] hover:bg-[#F1E8DB] text-[#1F2937] border border-[#E5D8C6] text-xs font-semibold py-2 px-2 rounded-xl transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3 h-3 text-[#92400E]" />
                          <span>Add Items</span>
                        </button>
                      )}
                      {role !== 'WAITER' && table.orders?.some((o) => o.status === 'SERVED') ? (
                        <button
                          onClick={() => onNavigateToBilling && onNavigateToBilling(table)}
                          className="flex items-center justify-center gap-1 bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold py-2 px-2 rounded-xl transition-colors shadow-sandstone cursor-pointer"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Checkout</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1 bg-slate-100 text-[#5B6470] border border-slate-200 text-[10px] font-semibold py-2 px-2 rounded-xl text-center">
                          <span>{table.orders?.some((o) => o.status === 'SERVED') ? 'Waiting Reception' : 'Locked until served'}</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Status Dropdown & Delete Option */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <select
                      value={table.status}
                      onChange={(e) => handleStatusChange(table.id, e.target.value)}
                      className="text-[11px] bg-[#FAF7F2] border border-[#E5D8C6] text-[#1F2937] rounded-lg px-2 py-1 focus:outline-none focus:border-[#92400E]"
                    >
                      <option value="AVAILABLE">Mark Available</option>
                      <option value="OCCUPIED">Mark Occupied</option>
                      <option value="RESERVED">Mark Reserved</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                    </select>

                    {role === 'RESTAURANT_OWNER' && (
                      <button
                        onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                        className="text-[#5B6470] hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
            <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1.5">
              Table Number / Identifier *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 101, T-5, Patio-1"
              value={newTable.tableNumber}
              onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
              className="w-full bg-[#FAF7F2] dark:bg-[#181512] border border-[#E5D8C6] dark:border-[#382F26] text-[#1F2937] dark:text-[#F7F3EC] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#92400E] dark:focus:border-[#D97706]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1.5">
              Guest Seating Capacity
            </label>
            <input
              type="number"
              min="1"
              max="50"
              required
              value={newTable.capacity}
              onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
              className="w-full bg-[#FAF7F2] dark:bg-[#181512] border border-[#E5D8C6] dark:border-[#382F26] text-[#1F2937] dark:text-[#F7F3EC] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#92400E] dark:focus:border-[#D97706]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1.5">
              Floor / Dining Section
            </label>
            <select
              value={newTable.floor}
              onChange={(e) => setNewTable({ ...newTable, floor: e.target.value })}
              className="w-full bg-[#FAF7F2] dark:bg-[#181512] border border-[#E5D8C6] dark:border-[#382F26] text-[#1F2937] dark:text-[#F7F3EC] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#92400E] dark:focus:border-[#D97706]"
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
              className="px-4 py-2 text-xs font-semibold text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#92400E] hover:bg-[#78350F] text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-sandstone hover:shadow-sandstone-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Create Table'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
