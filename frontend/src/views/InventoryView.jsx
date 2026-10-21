import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { INVENTORY_UNITS } from '../constants/inventory.constants';
import { Modal, SkeletonTable, EmptyState, Badge, Button } from '../components/ui';
import {
  Boxes,
  Plus,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  Search,
  Scale,
  TrendingDown,
  History,
} from 'lucide-react';

import { useInventory, usePosMutations } from '../hooks/usePosQueries';

export default function InventoryView() {
  const { restaurant, addToast, role } = useAuth();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'consumption' | 'audit' | 'wastage'

  const {
    data: inventoryData = [],
    isLoading: loadingInventory,
    refetch: refetchInventory,
  } = useInventory(restaurant?.id);
  const { invalidateInventory } = usePosMutations(restaurant?.id);

  const items = Array.isArray(inventoryData) ? inventoryData : (inventoryData.items || []);
  const [wastages, setWastages] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [auditTransactions, setAuditTransactions] = useState([]);
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showWastageModal, setShowWastageModal] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);

  // Policy Settings
  const [inventoryPolicy, setInventoryPolicy] = useState({
    lowStockThresholdDefault: 5,
    notifyLowStockOnLogin: true,
  });

  const loadPolicy = async () => {
    try {
      const res = await posService.settings.getAll();
      if (res.success && res.data?.settings?.restaurant?.inventory) {
        setInventoryPolicy({
          lowStockThresholdDefault: Number(res.data.settings.restaurant.inventory.lowStockThresholdDefault) || 5,
          notifyLowStockOnLogin: res.data.settings.restaurant.inventory.notifyLowStockOnLogin !== false,
        });
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadPolicy();
  }, [restaurant?.id]);

  const defaultThreshold = Number(inventoryPolicy.lowStockThresholdDefault) || 5;

  const getItemThreshold = (it) => {
    if (it.effectiveMinStockThreshold !== undefined && it.effectiveMinStockThreshold !== null) {
      return Number(it.effectiveMinStockThreshold);
    }
    const raw = it.minStockThreshold !== undefined && it.minStockThreshold !== null
      ? Number(it.minStockThreshold)
      : (it.minSafeLevel !== undefined && it.minSafeLevel !== null ? Number(it.minSafeLevel) : null);
    if (raw === null || raw === undefined || raw === 5) {
      return defaultThreshold;
    }
    return raw;
  };

  const getWastageNote = (wst) => {
    if (!wst) return '';
    if (wst.notes !== undefined && wst.notes !== null && String(wst.notes).trim().length > 0) {
      return String(wst.notes).trim();
    }
    if (wst.incidentNotes !== undefined && wst.incidentNotes !== null && String(wst.incidentNotes).trim().length > 0) {
      return String(wst.incidentNotes).trim();
    }
    if (wst.incident_notes !== undefined && wst.incident_notes !== null && String(wst.incident_notes).trim().length > 0) {
      return String(wst.incident_notes).trim();
    }

    const rawReason = (wst.reason || '').trim();
    if (!rawReason) return '';

    const standardReasons = ['SPOILAGE', 'EXPIRATION', 'PREPARATION_ERROR', 'SPILLAGE', 'OVERPRODUCTION'];

    const colonSpaceIdx = rawReason.indexOf(': ');
    if (colonSpaceIdx !== -1) {
      const prefix = rawReason.slice(0, colonSpaceIdx).trim();
      if (standardReasons.includes(prefix.toUpperCase()) || prefix.length <= 30) {
        return rawReason.slice(colonSpaceIdx + 2).trim();
      }
    }

    const colonIdx = rawReason.indexOf(':');
    if (colonIdx !== -1) {
      const prefix = rawReason.slice(0, colonIdx).trim();
      if (standardReasons.includes(prefix.toUpperCase())) {
        return rawReason.slice(colonIdx + 1).trim();
      }
    }

    const dashIdx = rawReason.indexOf(' — ');
    if (dashIdx !== -1) {
      const prefix = rawReason.slice(0, dashIdx).trim();
      if (standardReasons.includes(prefix.toUpperCase()) || prefix.length <= 30) {
        return rawReason.slice(dashIdx + 3).trim();
      }
    }

    const hyphenIdx = rawReason.indexOf(' - ');
    if (hyphenIdx !== -1) {
      const prefix = rawReason.slice(0, hyphenIdx).trim();
      if (standardReasons.includes(prefix.toUpperCase()) || prefix.length <= 30) {
        return rawReason.slice(hyphenIdx + 3).trim();
      }
    }

    if (!standardReasons.includes(rawReason.toUpperCase())) {
      return rawReason;
    }
    return '';
  };

  const getWastageReason = (wst) => {
    if (!wst) return '';
    const rawReason = (wst.reason || '').trim();
    if (!rawReason) return '';

    const standardReasons = ['SPOILAGE', 'EXPIRATION', 'PREPARATION_ERROR', 'SPILLAGE', 'OVERPRODUCTION'];

    const colonSpaceIdx = rawReason.indexOf(': ');
    if (colonSpaceIdx !== -1) {
      const prefix = rawReason.slice(0, colonSpaceIdx).trim();
      if (standardReasons.includes(prefix.toUpperCase()) || prefix.length <= 30) {
        return prefix;
      }
    }

    const colonIdx = rawReason.indexOf(':');
    if (colonIdx !== -1) {
      const prefix = rawReason.slice(0, colonIdx).trim();
      if (standardReasons.includes(prefix.toUpperCase())) {
        return prefix;
      }
    }

    const dashIdx = rawReason.indexOf(' — ');
    if (dashIdx !== -1) {
      const prefix = rawReason.slice(0, dashIdx).trim();
      if (standardReasons.includes(prefix.toUpperCase()) || prefix.length <= 30) {
        return prefix;
      }
    }

    const hyphenIdx = rawReason.indexOf(' - ');
    if (hyphenIdx !== -1) {
      const prefix = rawReason.slice(0, hyphenIdx).trim();
      if (standardReasons.includes(prefix.toUpperCase()) || prefix.length <= 30) {
        return prefix;
      }
    }

    return rawReason;
  };

  // Forms
  const [itemForm, setItemForm] = useState({
    name: '',
    sku: '',
    unit: 'KG',
    currentStock: 0,
    minStockThreshold: 5,
    costPerUnit: 0,
    storageLocation: 'Kitchen Storage',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    sku: '',
    unit: 'KG',
    currentStock: 0,
    minStockThreshold: 5,
    costPerUnit: 0,
    storageLocation: 'Kitchen Storage',
  });

  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('Purchase Inward Receipt');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  const [wastageForm, setWastageForm] = useState({
    inventoryItemId: '',
    quantity: 1,
    reason: 'SPOILAGE',
    notes: '',
  });

  const currency = restaurant?.currency || '₹';

  const loadWastages = async () => {
    setLoadingExtra(true);
    try {
      const res = await posService.wastage.getAll();
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      if (res.success) setWastages(list);
    } catch (err) {
      addToast(err.message || 'Failed to load wastage records', 'error');
    } finally {
      setLoadingExtra(false);
    }
  };

  const loadConsumptions = async () => {
    setLoadingExtra(true);
    try {
      const res = await posService.kitchen.getDashboard();
      if (res.success && res.data?.recentActivity) {
        setConsumptions(res.data.recentActivity || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load consumption activity', 'error');
    } finally {
      setLoadingExtra(false);
    }
  };

  const loadAudit = async () => {
    setLoadingExtra(true);
    try {
      const res = await posService.inventory.getTransactions({ limit: 100 });
      if (res.success && res.data) {
        setAuditTransactions(Array.isArray(res.data) ? res.data : (res.data.transactions || []));
      }
    } catch (err) {
      addToast(err.message || 'Failed to load audit transactions', 'error');
    } finally {
      setLoadingExtra(false);
    }
  };

  // Lazy-load sub-tab data only when that tab is actually viewed
  useEffect(() => {
    if (activeTab === 'wastage') {
      loadWastages();
    } else if (activeTab === 'consumption' && consumptions.length === 0) {
      loadConsumptions();
    } else if (activeTab === 'audit' && auditTransactions.length === 0) {
      loadAudit();
    }
  }, [activeTab]);

  const loadData = async (force = true) => {
    try {
      if (force) invalidateInventory();
      await Promise.all([refetchInventory(), loadPolicy()]);
      if (activeTab === 'wastage') await loadWastages();
      if (activeTab === 'consumption') await loadConsumptions();
      if (activeTab === 'audit') await loadAudit();
    } catch (err) {
      addToast(err.message || 'Failed to refresh inventory', 'error');
    }
  };

  const loading = (loadingInventory && items.length === 0) || (loadingExtra && activeTab !== 'stock');

  const handleCreateItem = async (e) => {
    e.preventDefault();
    const name = itemForm.name.trim();
    if (!name) {
      addToast('Item name is required', 'warning');
      return;
    }

    const currentStock = itemForm.currentStock === '' || itemForm.currentStock === null || itemForm.currentStock === undefined
      ? 0
      : Number(itemForm.currentStock);
    if (!Number.isFinite(currentStock) || currentStock < 0) {
      addToast('Opening stock cannot be negative', 'warning');
      return;
    }

    const minStockThreshold = itemForm.minStockThreshold === '' || itemForm.minStockThreshold === null || itemForm.minStockThreshold === undefined
      ? 5
      : Number(itemForm.minStockThreshold);
    if (!Number.isFinite(minStockThreshold) || minStockThreshold < 0) {
      addToast('Min safe level cannot be negative', 'warning');
      return;
    }

    const costPerUnit = itemForm.costPerUnit === '' || itemForm.costPerUnit === null || itemForm.costPerUnit === undefined
      ? 0
      : Number(itemForm.costPerUnit);
    if (!Number.isFinite(costPerUnit) || costPerUnit < 0) {
      addToast('Cost per unit cannot be negative', 'warning');
      return;
    }

    const sku = itemForm.sku.trim();
    if (sku) {
      const isDuplicate = items.some(
        (it) => it.sku && it.sku.trim().toLowerCase() === sku.toLowerCase()
      );
      if (isDuplicate) {
        addToast('This SKU/code already exists. Please use a unique code.', 'warning');
        return;
      }
    }

    try {
      const payload = {
        name,
        sku: sku || undefined,
        unit: itemForm.unit,
        currentStock,
        minStockThreshold,
        costPerUnit,
      };

      await posService.inventory.create(payload);
      addToast(`${payload.name} added to inventory`, 'success');
      setShowItemModal(false);
      setItemForm({
        name: '',
        sku: '',
        unit: 'KG',
        currentStock: 0,
        minStockThreshold: 5,
        costPerUnit: 0,
        storageLocation: 'Kitchen Storage',
      });
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to create inventory item', 'error');
    }
  };

  const openEditModal = (it) => {
    setSelectedItemForEdit(it);
    setEditForm({
      name: it.name || '',
      sku: it.sku || '',
      unit: it.unit || 'KG',
      currentStock: it.currentStock !== undefined ? Number(it.currentStock) : 0,
      minStockThreshold: it.minStockThreshold !== undefined ? Number(it.minStockThreshold) : 5,
      costPerUnit: it.costPerUnit !== undefined ? Number(it.costPerUnit) : 0,
      storageLocation: it.storageLocation || 'Kitchen Storage',
    });
    setShowEditModal(true);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!selectedItemForEdit) return;
    const name = editForm.name.trim();
    if (!name) {
      addToast('Item name is required', 'warning');
      return;
    }

    const sku = editForm.sku.trim();
    if (sku) {
      const isDuplicate = items.some(
        (it) => it.id !== selectedItemForEdit.id && it.sku && it.sku.trim().toLowerCase() === sku.toLowerCase()
      );
      if (isDuplicate) {
        addToast('This SKU/code already exists. Please use a unique code.', 'warning');
        return;
      }
    }

    try {
      const payload = {
        name,
        sku: sku || undefined,
        unit: editForm.unit,
        currentStock: Number(editForm.currentStock) || 0,
        minStockThreshold: Number(editForm.minStockThreshold) || 0,
        costPerUnit: Number(editForm.costPerUnit) || 0,
      };

      await posService.inventory.update(selectedItemForEdit.id, payload);
      addToast(`${payload.name} updated successfully`, 'success');
      setShowEditModal(false);
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to update inventory item', 'error');
    }
  };

  const handleAutoGenerateSku = () => {
    const raw = (itemForm.name || 'INV').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const prefix = (raw.slice(0, 3) || 'INV').padEnd(3, 'X');
    let maxNum = 0;
    for (const it of items) {
      if (it.sku) {
        const m = it.sku.match(new RegExp(`^${prefix}-(\\d+)`, 'i'));
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    }
    let nextNum = maxNum + 1;
    let candidate = `${prefix}-${String(nextNum).padStart(3, '0')}`;
    while (items.some((it) => it.sku && it.sku.toLowerCase() === candidate.toLowerCase())) {
      nextNum += 1;
      candidate = `${prefix}-${String(nextNum).padStart(3, '0')}`;
    }
    setItemForm((prev) => ({ ...prev, sku: candidate }));
  };

  const handleAutoGenerateEditSku = () => {
    const raw = (editForm.name || 'INV').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const prefix = (raw.slice(0, 3) || 'INV').padEnd(3, 'X');
    let maxNum = 0;
    for (const it of items) {
      if (it.sku && it.id !== selectedItemForEdit?.id) {
        const m = it.sku.match(new RegExp(`^${prefix}-(\\d+)`, 'i'));
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    }
    let nextNum = maxNum + 1;
    let candidate = `${prefix}-${String(nextNum).padStart(3, '0')}`;
    while (items.some((it) => it.id !== selectedItemForEdit?.id && it.sku && it.sku.toLowerCase() === candidate.toLowerCase())) {
      nextNum += 1;
      candidate = `${prefix}-${String(nextNum).padStart(3, '0')}`;
    }
    setEditForm((prev) => ({ ...prev, sku: candidate }));
  };

  const handleDeleteItem = async (it) => {
    if (!window.confirm(`Are you sure you want to delete ${it.name}?`)) return;
    try {
      await posService.inventory.delete(it.id);
      addToast(`${it.name} deleted successfully`, 'success');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to delete inventory item', 'error');
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedItemForAdjust || adjustLoading) return;

    if (adjustQuantity === '' || adjustQuantity === null || adjustQuantity === undefined) {
      addToast('Please enter a quantity adjustment', 'warning');
      return;
    }

    const numAdj = Number(adjustQuantity);
    if (!Number.isFinite(numAdj)) {
      addToast('Quantity adjustment must be a valid number', 'warning');
      return;
    }

    if (numAdj === 0) {
      addToast('Quantity adjustment cannot be zero', 'warning');
      return;
    }

    if (!adjustReason || !adjustReason.trim()) {
      addToast('Please select a reason for the adjustment', 'warning');
      return;
    }

    setAdjustLoading(true);
    try {
      await posService.inventory.adjustStock(selectedItemForAdjust.id, {
        quantityAdjustment: numAdj,
        reason: adjustReason.trim(),
        auditNotes: adjustNotes.trim() || undefined,
      });
      addToast('Stock adjusted successfully', 'success');
      setShowAdjustModal(false);
      setAdjustQuantity('');
      setAdjustNotes('');
      await loadData();
    } catch (err) {
      addToast(err.message || 'Unable to adjust stock. Please try again.', 'error');
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleLogWastage = async (e) => {
    e.preventDefault();
    if (!wastageForm.inventoryItemId) {
      addToast('Please select an ingredient', 'warning');
      return;
    }
    const noteText = (wastageForm.notes || '').trim();
    const reasonValue = wastageForm.reason || 'SPOILAGE';
    const combinedReason = noteText ? `${reasonValue}: ${noteText}` : reasonValue;
    try {
      await posService.wastage.log({
        inventoryItemId: wastageForm.inventoryItemId,
        quantity: Number(wastageForm.quantity),
        reason: combinedReason,
        notes: noteText || undefined,
        incidentNotes: noteText || undefined,
      });
      addToast('Wastage logged & inventory reduced', 'success');
      setShowWastageModal(false);
      setWastageForm({
        inventoryItemId: items[0]?.id || '',
        quantity: 1,
        reason: 'SPOILAGE',
        notes: '',
      });
      invalidateInventory();
      await Promise.all([
        refetchInventory(),
        loadWastages(),
        loadPolicy(),
      ]);
    } catch (err) {
      addToast(err.message || 'Failed to log wastage', 'error');
    }
  };

  const lowStockItems = items.filter((it) => {
    const threshold = getItemThreshold(it);
    return Number(it.currentStock ?? 0) <= threshold;
  });

  const filteredItems = items.filter((it) =>
    it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (it.sku && it.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/30 border border-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0 shadow-sm">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight">
              Inventory, Stock & Wastage Control
            </h1>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-sans">
              Real-time raw material balances, threshold reorder alerts, and spoilage tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (items.length > 0) {
                setWastageForm({
                  inventoryItemId: items[0].id,
                  quantity: 1,
                  reason: 'SPOILAGE',
                  notes: '',
                });
              }
              setShowWastageModal(true);
            }}
            className="border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <TrendingDown className="w-4 h-4 mr-1.5 text-rose-600 dark:text-rose-400" />
            <span>Log Wastage</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setItemForm({
                name: '',
                sku: '',
                unit: 'KG',
                currentStock: 0,
                minStockThreshold: defaultThreshold,
                costPerUnit: 0,
                storageLocation: 'Kitchen Storage',
              });
              setShowItemModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add Stock Item</span>
          </Button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && inventoryPolicy.notifyLowStockOnLogin !== false && (
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-editorial animate-fade-in" role="alert">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800/50">
              <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Low Stock Alert: {lowStockItems.length} ingredient{lowStockItems.length > 1 ? 's' : ''} below safe reorder threshold!
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5 font-medium">
                {lowStockItems.map((i) => `${i.name} (${Number(i.currentStock).toFixed(1)} ${i.unit})`).slice(0, 4).join(', ')}
                {lowStockItems.length > 4 ? ` and ${lowStockItems.length - 4} more...` : ''}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('stock');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-amber-800 dark:text-amber-300 underline hover:text-amber-900 dark:hover:text-amber-200 shrink-0 px-2 py-1 cursor-pointer"
          >
            Review Items
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E4DCD0] dark:border-[#1E362E] pb-3 overflow-x-auto" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'stock'}
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
            activeTab === 'stock'
              ? 'bg-[#173F36] text-white shadow-editorial font-bold'
              : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#1E362E]'
          }`}
        >
          Raw Materials Stock <span className="tabular-nums font-mono">({items.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'consumption'}
          onClick={() => setActiveTab('consumption')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
            activeTab === 'consumption'
              ? 'bg-[#173F36] text-white shadow-editorial font-bold'
              : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#1E362E]'
          }`}
        >
          Consumption History <span className="tabular-nums font-mono">({consumptions.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'audit'}
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
            activeTab === 'audit'
              ? 'bg-[#173F36] text-white shadow-editorial font-bold'
              : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#1E362E]'
          }`}
        >
          Stock Movements & Audit <span className="tabular-nums font-mono">({auditTransactions.length})</span>
        </button>
        {role !== 'KITCHEN_ADMIN' && (
          <button
            role="tab"
            aria-selected={activeTab === 'wastage'}
            onClick={() => setActiveTab('wastage')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
              activeTab === 'wastage'
                ? 'bg-[#173F36] text-white shadow-editorial font-bold'
                : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#1E362E]'
            }`}
          >
            Wastage Log History <span className="tabular-nums font-mono">({wastages.length})</span>
          </button>
        )}
      </div>

      {/* TAB 1: STOCK ITEMS */}
      {activeTab === 'stock' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
          <div className="p-4 border-b border-[#E4DCD0] dark:border-[#1E362E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#657168] dark:text-[#9FB29E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search raw material or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-9 pr-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
              />
            </div>
            <div className="text-xs text-[#657168] dark:text-[#9FB29E] font-medium">
              Showing <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] tabular-nums font-mono">{filteredItems.length}</span> of <span className="tabular-nums font-mono">{items.length}</span> ingredients
            </div>
          </div>

          {loading ? (
            <div className="p-4">
              <SkeletonTable rows={5} columns={7} />
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title={searchQuery ? 'No matching ingredients found' : 'No inventory items registered'}
              description={searchQuery ? `No ingredients matching "${searchQuery}". Clear your search to view all items.` : 'Start adding raw materials, bulk produce, or bar stock to track kitchen inventory.'}
              actionLabel={searchQuery ? 'Clear Search' : 'Add First Stock Item'}
              onAction={searchQuery ? () => setSearchQuery('') : () => setShowItemModal(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-semibold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Raw Material / Ingredient</th>
                    <th className="px-5 py-3.5">SKU / Code</th>
                    <th className="px-5 py-3.5">Current Stock</th>
                    <th className="px-5 py-3.5">Min Safe Level</th>
                    <th className="px-5 py-3.5">Cost / Unit</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DCD0]/60 dark:divide-[#1E362E]">
                  {filteredItems.map((it) => {
                    const minSafe = getItemThreshold(it);
                    const currentStock = Number(it.currentStock ?? 0);
                    const isLow = currentStock <= minSafe;
                    const cost = Number(it.costPerUnit !== undefined ? it.costPerUnit : (it.costPrice !== undefined ? it.costPrice : 0));
                    return (
                      <tr key={it.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/40 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] text-sm group-hover:text-[#173F36] dark:group-hover:text-[#9FB29E] transition-colors">{it.name}</div>
                          <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] font-mono mt-0.5">Unit: {it.unit}</div>
                        </td>
                        <td className="px-5 py-4 font-mono text-[#657168] dark:text-[#9FB29E] text-xs">
                          {it.sku || '—'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-bold text-sm tabular-nums ${
                                isLow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {currentStock % 1 === 0 ? currentStock : currentStock.toFixed(2)} {it.unit}
                            </span>
                            {isLow && (
                              <Badge variant="danger" size="sm">
                                LOW STOCK
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums">
                          {minSafe % 1 === 0 ? minSafe : minSafe.toFixed(2)} {it.unit}
                        </td>
                        <td className="px-5 py-4 text-[#17251F] dark:text-[#F7EFE4] font-mono font-medium tabular-nums">
                          {currency}{cost.toFixed(2)} / {it.unit}
                        </td>
                        <td className="px-5 py-4 text-[#657168] dark:text-[#9FB29E]">
                          {it.storageLocation || 'Main Warehouse'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <button
                              onClick={() => {
                                setSelectedItemForAdjust(it);
                                setAdjustQuantity('');
                                setAdjustReason('Purchase Inward Receipt');
                                setAdjustNotes('');
                                setShowAdjustModal(true);
                              }}
                              className="inline-flex items-center gap-1.5 min-h-[36px] bg-[#FFFDF9] dark:bg-[#152320] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] text-[#173F36] dark:text-[#9FB29E] px-3 py-1.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] font-semibold transition-all shadow-editorial text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] cursor-pointer"
                              title="Adjust Stock"
                            >
                              <Scale className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                              <span>Adjust</span>
                            </button>
                            <button
                              onClick={() => openEditModal(it)}
                              className="p-2 min-h-[36px] min-w-[36px] bg-[#FFFDF9] dark:bg-[#152320] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] transition-colors shadow-editorial flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] cursor-pointer"
                              title="Edit Item"
                              aria-label={`Edit ${it.name}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {role === 'RESTAURANT_OWNER' && (
                              <button
                                onClick={() => handleDeleteItem(it)}
                                className="p-2 min-h-[36px] min-w-[36px] bg-[#FFFDF9] dark:bg-[#152320] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[#657168] dark:text-[#9FB29E] hover:text-rose-600 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] hover:border-rose-200 transition-colors shadow-editorial flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 cursor-pointer"
                                title="Delete Item"
                                aria-label={`Delete ${it.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WASTAGE LOGS */}
      {activeTab === 'wastage' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
          {loading ? (
            <div className="p-4">
              <SkeletonTable rows={5} columns={6} />
            </div>
          ) : wastages.length === 0 ? (
            <EmptyState
              icon={TrendingDown}
              title="No Spoilage / Wastage Logged"
              description="Track kitchen prep burns, spilled ingredients, and expired items here to keep recipe food costs balanced."
              actionLabel="Log Wastage"
              onAction={() => {
                if (items.length > 0) {
                  setWastageForm({
                    inventoryItemId: items[0].id,
                    quantity: 1,
                    reason: 'SPOILAGE',
                    notes: '',
                  });
                }
                setShowWastageModal(true);
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-semibold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Ingredient</th>
                    <th className="px-5 py-3.5">Wasted Quantity</th>
                    <th className="px-5 py-3.5">Reason</th>
                    <th className="px-5 py-3.5">Estimated Cost</th>
                    <th className="px-5 py-3.5">Logged At</th>
                    <th className="px-5 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DCD0]/60 dark:divide-[#1E362E]">
                  {wastages.map((wst) => {
                    const noteText = getWastageNote(wst);
                    const reasonText = getWastageReason(wst);
                    return (
                      <tr key={wst.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/40 transition-colors">
                        <td className="px-5 py-4 font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">
                          {wst.inventoryItem?.name || 'Raw Ingredient'}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {wst.quantity} {wst.inventoryItem?.unit || 'units'}
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="danger" size="sm">
                            {reasonText}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 font-mono text-[#17251F] dark:text-[#F7EFE4] font-semibold tabular-nums">
                          {currency}{Number(wst.totalCost || wst.cost || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 font-mono text-[#657168] dark:text-[#9FB29E] tabular-nums whitespace-nowrap">
                          {new Date(wst.createdAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-[#657168] dark:text-[#9FB29E] max-w-xs sm:max-w-sm">
                          {noteText ? (
                            <span
                              className="line-clamp-2 hover:line-clamp-none break-words cursor-default"
                              title={noteText}
                            >
                              {noteText}
                            </span>
                          ) : (
                            <span className="text-[#657168]/60 dark:text-[#9FB29E]/60 italic">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONSUMPTION HISTORY */}
      {activeTab === 'consumption' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
          <div className="p-4 border-b border-[#E4DCD0] dark:border-[#1E362E]">
            <h3 className="text-sm font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">Recipe Ingredient Depletion Audit Trail</h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5">Traceable log of stock automatically deducted when food tickets are marked READY in kitchen</p>
          </div>

          {loading ? (
            <div className="p-4">
              <SkeletonTable rows={5} columns={7} />
            </div>
          ) : consumptions.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No Consumption Recorded Yet"
              description="Stock consumption entries are automatically recorded when kitchen prep tickets with BOM recipes are marked READY."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-semibold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Date / Time</th>
                    <th className="px-5 py-3.5">Ingredient</th>
                    <th className="px-5 py-3.5">Deduction (Quantity)</th>
                    <th className="px-5 py-3.5">Previous Balance</th>
                    <th className="px-5 py-3.5">Remaining Stock</th>
                    <th className="px-5 py-3.5">Order Reference</th>
                    <th className="px-5 py-3.5">Reason / Dishes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DCD0]/60 dark:divide-[#1E362E]">
                  {consumptions.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/40 transition-colors">
                      <td className="px-5 py-4 font-mono text-[#657168] dark:text-[#9FB29E] tabular-nums whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">
                        {entry.inventoryItem?.name || 'Raw Material'}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        -{Number(entry.quantity).toFixed(4)} {entry.unit}
                      </td>
                      <td className="px-5 py-4 font-mono text-[#657168] dark:text-[#9FB29E] tabular-nums">
                        {Number(entry.previousBalance).toFixed(4)} {entry.unit}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                        {Number(entry.remainingBalance).toFixed(4)} {entry.unit}
                      </td>
                      <td className="px-5 py-4 font-mono text-[#173F36] dark:text-[#9FB29E] font-semibold tabular-nums">
                        {entry.reference || '—'}
                      </td>
                      <td className="px-5 py-4 text-[#17251F] dark:text-[#F7EFE4]">
                        {entry.reason || 'Order consumption'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STOCK MOVEMENTS & AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
          <div className="p-4 border-b border-[#E4DCD0] dark:border-[#1E362E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">Stock Movements & Transaction Audit Trail</h3>
              <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5">Traceable ledger of inward receipts, manual adjustments, transfers, and opening balances</p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#F7EFE4] dark:bg-[#101A18] p-1 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E]">
              {['ALL', 'PURCHASE', 'ADJUSTMENT', 'TRANSFER'].map((f) => (
                <button
                  key={f}
                  onClick={() => setAuditFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#173F36] ${
                    auditFilter === f
                      ? 'bg-[#173F36] text-white shadow-xs font-bold'
                      : 'text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E4DCD0] dark:hover:bg-[#1E362E]'
                  }`}
                >
                  {f === 'ALL' ? 'All Movements' : f === 'PURCHASE' ? 'Inward / Opening' : f === 'ADJUSTMENT' ? 'Adjustments' : 'Transfers'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-4">
              <SkeletonTable rows={5} columns={8} />
            </div>
          ) : auditTransactions.filter((t) => auditFilter === 'ALL' || t.type === auditFilter).length === 0 ? (
            <EmptyState
              icon={History}
              title="No Stock Movements Found"
              description="Stock adjustments, inward purchases, and transfers will automatically appear in this immutable ledger."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-semibold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Date / Time</th>
                    <th className="px-5 py-3.5">Ingredient / SKU</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Change</th>
                    <th className="px-5 py-3.5">Prev Balance</th>
                    <th className="px-5 py-3.5">New Balance</th>
                    <th className="px-5 py-3.5">Reason & Reference</th>
                    <th className="px-5 py-3.5">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DCD0]/60 dark:divide-[#1E362E]">
                  {auditTransactions
                    .filter((t) => auditFilter === 'ALL' || t.type === auditFilter)
                    .map((entry) => {
                      const isPositive = Number(entry.quantity) >= 0;
                      const unit = entry.unit || entry.inventoryItem?.unit || 'units';
                      return (
                        <tr key={entry.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/40 transition-colors">
                          <td className="px-5 py-4 font-mono text-[#657168] dark:text-[#9FB29E] tabular-nums whitespace-nowrap">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">
                            <div>{entry.inventoryItem?.name || 'Raw Material'}</div>
                            {entry.inventoryItem?.sku && (
                              <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-mono mt-0.5">{entry.inventoryItem.sku}</div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                              entry.type === 'PURCHASE'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                                : entry.type === 'TRANSFER'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40'
                                : entry.type === 'CONSUMPTION'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                            }`}>
                              {entry.reason?.includes('Opening') ? 'Opening Stock' : entry.type}
                            </span>
                          </td>
                          <td className={`px-5 py-4 font-mono font-bold tabular-nums ${isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isPositive ? `+${Number(entry.quantity).toFixed(2)}` : Number(entry.quantity).toFixed(2)} {unit}
                          </td>
                          <td className="px-5 py-4 font-mono text-[#657168] dark:text-[#9FB29E] tabular-nums">
                            {Number(entry.previousBalance).toFixed(2)} {unit}
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-[#17251F] dark:text-[#F7EFE4] tabular-nums">
                            {Number(entry.remainingBalance).toFixed(2)} {unit}
                          </td>
                          <td className="px-5 py-4 text-[#17251F] dark:text-[#F7EFE4]">
                            <div className="font-medium">{entry.reason || 'Manual Adjustment'}</div>
                            {entry.reference && (
                              <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] italic mt-0.5">{entry.reference}</div>
                            )}
                          </td>
                          <td className="px-5 py-4 font-mono text-[#657168] dark:text-[#9FB29E]">
                            {entry.user?.name || entry.user?.email?.split('@')[0] || 'System'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE STOCK ITEM MODAL */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title="Add Warehouse Inventory Item"
        subtitle="Track bulk raw ingredients, produce, and bar supplies"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Item Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Arabica Coffee Beans"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">SKU / Code</label>
                <button
                  type="button"
                  onClick={handleAutoGenerateSku}
                  className="text-[10px] text-[#173F36] dark:text-[#4EBA87] font-semibold hover:underline cursor-pointer"
                  title="Generate unique SKU"
                >
                  Auto Generate
                </button>
              </div>
              <input
                type="text"
                placeholder="Auto-generated if empty"
                value={itemForm.sku}
                onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Unit of Measure *</label>
              <select
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
              >
                {INVENTORY_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Opening Stock</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.currentStock}
                onChange={(e) => setItemForm({ ...itemForm, currentStock: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Min Safe Level</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.minStockThreshold}
                onChange={(e) => setItemForm({ ...itemForm, minStockThreshold: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Cost ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.costPerUnit}
                onChange={(e) => setItemForm({ ...itemForm, costPerUnit: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowItemModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Add Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT STOCK ITEM MODAL */}
      <Modal
        isOpen={showEditModal && Boolean(selectedItemForEdit)}
        onClose={() => setShowEditModal(false)}
        title="Edit Inventory Item"
        subtitle="Update raw ingredient details and thresholds"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Item Name *</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">SKU / Code</label>
                <button
                  type="button"
                  onClick={handleAutoGenerateEditSku}
                  className="text-[10px] text-[#173F36] dark:text-[#4EBA87] font-semibold hover:underline cursor-pointer"
                  title="Generate unique SKU"
                >
                  Auto Generate
                </button>
              </div>
              <input
                type="text"
                value={editForm.sku}
                onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Unit of Measure *</label>
              <select
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
              >
                {INVENTORY_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Current Stock</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.currentStock}
                onChange={(e) => setEditForm({ ...editForm, currentStock: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Min Safe Level</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.minStockThreshold}
                onChange={(e) => setEditForm({ ...editForm, minStockThreshold: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Cost ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.costPerUnit}
                onChange={(e) => setEditForm({ ...editForm, costPerUnit: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-2.5 py-1.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ADJUST STOCK MODAL */}
      <Modal
        isOpen={showAdjustModal && Boolean(selectedItemForAdjust)}
        onClose={() => !adjustLoading && setShowAdjustModal(false)}
        title="Adjust Inventory Stock"
        subtitle={
          selectedItemForAdjust ? (
            <span>
              Current Balance: <strong className="text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                {Number(selectedItemForAdjust.currentStock) % 1 === 0 ? Number(selectedItemForAdjust.currentStock) : Number(selectedItemForAdjust.currentStock).toFixed(2)} {selectedItemForAdjust.unit}
              </strong>
            </span>
          ) : undefined
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustStock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">
              Quantity Adjustment (positive to add, negative to deduct) *
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="+10 or -5"
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(e.target.value)}
              disabled={adjustLoading}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-sm text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Reason *</label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              disabled={adjustLoading}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] disabled:opacity-50"
            >
              <option value="Purchase Inward Receipt">Purchase Inward Receipt</option>
              <option value="Physical Inventory Audit / Reconciliation">Physical Inventory Audit / Reconciliation</option>
              <option value="Damaged / Broken">Damaged / Broken</option>
              <option value="Expired Shelf Life">Expired Shelf Life</option>
              <option value="Manual Correction">Manual Correction</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Audit Notes</label>
            <input
              type="text"
              placeholder="e.g. Month-end count correction"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              disabled={adjustLoading}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E]">
            <Button
              type="button"
              variant="outline"
              disabled={adjustLoading}
              onClick={() => setShowAdjustModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={adjustLoading}
            >
              {adjustLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              <span>{adjustLoading ? 'Adjusting...' : 'Confirm Adjustment'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* LOG WASTAGE MODAL */}
      <Modal
        isOpen={showWastageModal}
        onClose={() => setShowWastageModal(false)}
        title="Log Spoilage / Food Wastage"
        subtitle="Record kitchen waste to maintain accurate stock and cost tracking"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleLogWastage} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Raw Ingredient *</label>
            <select
              required
              value={wastageForm.inventoryItemId}
              onChange={(e) => setWastageForm({ ...wastageForm, inventoryItemId: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} (Stock: {Number(it.currentStock).toFixed(1)} {it.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Quantity Lost *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={wastageForm.quantity}
                onChange={(e) => setWastageForm({ ...wastageForm, quantity: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Reason</label>
              <select
                value={wastageForm.reason}
                onChange={(e) => setWastageForm({ ...wastageForm, reason: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
              >
                <option value="SPOILAGE">Spoiled / Rotten</option>
                <option value="EXPIRATION">Expired Shelf Date</option>
                <option value="PREPARATION_ERROR">Kitchen Prep Burn / Error</option>
                <option value="SPILLAGE">Spilled / Dropped</option>
                <option value="OVERPRODUCTION">Unsold Overproduction</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Incident Notes</label>
            <input
              type="text"
              placeholder="e.g. Refrigerator temperature failure overnight"
              value={wastageForm.notes}
              onChange={(e) => setWastageForm({ ...wastageForm, notes: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#1E362E]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowWastageModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
            >
              Record Wastage
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
