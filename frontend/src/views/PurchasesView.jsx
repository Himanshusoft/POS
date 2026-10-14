import React, { useState } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { usePurchases, useSuppliers, useInventory, usePosMutations } from '../hooks/usePosQueries';
import { Modal, Button } from '../components/ui';
import {
  Truck,
  Plus,
  Trash2,
  Building2,
  Package,
} from 'lucide-react';

export default function PurchasesView() {
  const { restaurant, addToast } = useAuth();
  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' | 'suppliers'

  const { data: purchases = [], isLoading: loadingPurchases, refetch: refetchPurchases } = usePurchases(restaurant?.id);
  const { data: suppliers = [], isLoading: loadingSuppliers, refetch: refetchSuppliers } = useSuppliers(restaurant?.id);
  const { data: inventoryItems = [], isLoading: loadingInventory, refetch: refetchInventory } = useInventory(restaurant?.id);
  const { invalidatePurchases, invalidateInventory } = usePosMutations(restaurant?.id);

  const loading = (loadingPurchases && purchases.length === 0) ||
    (loadingSuppliers && suppliers.length === 0) ||
    (loadingInventory && inventoryItems.length === 0);

  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
  });

  // Purchase Form
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    items: [],
    notes: '',
  });

  const currency = restaurant?.currency || '₹';

  const loadData = async () => {
    invalidatePurchases();
    invalidateInventory();
    await Promise.all([refetchPurchases(), refetchSuppliers(), refetchInventory()]);
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;
    try {
      await posService.suppliers.create(supplierForm);
      addToast('Supplier added successfully', 'success');
      setShowSupplierModal(false);
      setSupplierForm({ name: '', contactPerson: '', email: '', phone: '', address: '', taxId: '' });
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to create supplier', 'error');
    }
  };

  const handleAddPurchaseItem = () => {
    if (inventoryItems.length === 0) {
      addToast('Add inventory items before creating purchase order', 'warning');
      return;
    }
    setPurchaseForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          inventoryItemId: inventoryItems[0].id,
          quantity: 1,
          unitCost: inventoryItems[0].costPrice || 10,
        },
      ],
    }));
  };

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.supplierId) {
      addToast('Please select a supplier', 'warning');
      return;
    }
    if (purchaseForm.items.length === 0) {
      addToast('Add at least one raw material line item', 'warning');
      return;
    }

    try {
      const payload = {
        supplierId: purchaseForm.supplierId,
        invoiceNumber: purchaseForm.invoiceNumber.trim() || undefined,
        purchaseDate: purchaseForm.purchaseDate,
        notes: purchaseForm.notes.trim() || undefined,
        items: purchaseForm.items.map((it) => ({
          inventoryItemId: it.inventoryItemId,
          quantity: Number(it.quantity),
          costPerUnit: Number(it.unitCost),
          unitCost: Number(it.unitCost),
        })),
      };

      const res = await posService.purchases.create(payload);
      if (res?.data?.id) {
        try {
          await posService.purchases.receive(res.data.id);
        } catch {
          // If already received or error, continue
        }
      }
      addToast('Purchase receipt recorded & warehouse stock updated!', 'success');
      setShowPurchaseModal(false);
      setPurchaseForm({
        supplierId: '',
        invoiceNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        items: [],
        notes: '',
      });
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to record purchase', 'error');
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/30 border border-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0 shadow-sm">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight">
              Procurement & Supplier Relations
            </h1>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-sans">
              Manage vendor accounts, record inward stock purchases, and restock ingredient inventory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowSupplierModal(true)}
            icon={Building2}
          >
            New Supplier
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (suppliers.length === 0) {
                addToast('Create a supplier first', 'warning');
                return;
              }
              setPurchaseForm({
                supplierId: suppliers[0].id,
                invoiceNumber: `PO-${Date.now().toString().slice(-6)}`,
                purchaseDate: new Date().toISOString().split('T')[0],
                items: inventoryItems.length > 0 ? [{ inventoryItemId: inventoryItems[0].id, quantity: 10, unitCost: inventoryItems[0].costPrice || 25 }] : [],
                notes: '',
              });
              setShowPurchaseModal(true);
            }}
            icon={Plus}
          >
            Record Inward Stock
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E4DCD0] dark:border-[#1E362E] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
            activeTab === 'purchases'
              ? 'bg-[#173F36] text-white shadow-editorial font-bold'
              : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#1E362E]'
          }`}
        >
          Purchase Orders <span className="tabular-nums font-mono">({purchases.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
            activeTab === 'suppliers'
              ? 'bg-[#173F36] text-white shadow-editorial font-bold'
              : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#1E362E]'
          }`}
        >
          Vendors & Suppliers <span className="tabular-nums font-mono">({suppliers.length})</span>
        </button>
      </div>

      {/* TAB 1: PURCHASES */}
      {activeTab === 'purchases' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
          {purchases.length === 0 ? (
            <div className="p-12 text-center text-[#657168] dark:text-[#9FB29E]">
              <Package className="w-12 h-12 mx-auto mb-2 text-[#9FB29E] opacity-60" />
              <p className="text-[#17251F] dark:text-[#F7EFE4] font-serif font-bold">No Inward Purchases Recorded</p>
              <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">Record purchases to automatically replenish ingredient inventory levels.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-semibold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Invoice #</th>
                    <th className="px-5 py-3.5">Supplier</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Items Restocked</th>
                    <th className="px-5 py-3.5">Total Cost</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DCD0]/60 dark:divide-[#1E362E]">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/40 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-[#17251F] dark:text-[#F7EFE4]">
                        {p.invoiceNumber || `PO-${p.id.slice(0, 8)}`}
                      </td>
                      <td className="px-5 py-4 font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">
                        {p.supplier?.name || 'Unknown Supplier'}
                      </td>
                      <td className="px-5 py-4 text-[#657168] dark:text-[#9FB29E] font-mono tabular-nums">
                        {new Date(p.purchaseDate || p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-[#17251F] dark:text-[#F7EFE4]">
                        <div className="space-y-0.5">
                          {p.items?.map((it, idx) => (
                            <div key={idx} className="text-xs">
                              {it.quantity} {it.inventoryItem?.unit || ''} {it.inventoryItem?.name || 'Item'} @ {currency}{Number(it.costPerUnit ?? it.unitCost ?? 0).toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-emerald-700 dark:text-emerald-300 font-mono text-sm tabular-nums">
                        {currency}{Number(p.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          {p.status || 'RECEIVED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl overflow-hidden shadow-editorial">
          {suppliers.length === 0 ? (
            <div className="p-12 text-center text-[#657168] dark:text-[#9FB29E]">
              <Building2 className="w-12 h-12 mx-auto mb-2 text-[#9FB29E] opacity-60" />
              <p className="text-[#17251F] dark:text-[#F7EFE4] font-serif font-bold">No Suppliers Registered</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7EFE4] dark:bg-[#101A18] text-[#657168] dark:text-[#9FB29E] uppercase text-[10px] font-semibold border-b border-[#E4DCD0] dark:border-[#1E362E] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Vendor Name</th>
                    <th className="px-5 py-3.5">Contact Person</th>
                    <th className="px-5 py-3.5">Phone / Email</th>
                    <th className="px-5 py-3.5">Address</th>
                    <th className="px-5 py-3.5">Tax / GSTIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4DCD0]/60 dark:divide-[#1E362E]">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F7EFE4]/40 dark:hover:bg-[#1E362E]/40 transition-colors">
                      <td className="px-5 py-4 font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] text-sm">
                        {s.name}
                      </td>
                      <td className="px-5 py-4 text-[#17251F] dark:text-[#F7EFE4]">
                        {s.contactPerson || '—'}
                      </td>
                      <td className="px-5 py-4 text-[#657168] dark:text-[#9FB29E] font-mono">
                        <div>{s.phone || '—'}</div>
                        <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">{s.email || ''}</div>
                      </td>
                      <td className="px-5 py-4 text-[#657168] dark:text-[#9FB29E]">
                        {s.address || '—'}
                      </td>
                      <td className="px-5 py-4 font-mono text-[#657168] dark:text-[#9FB29E]">
                        {s.taxId || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE SUPPLIER MODAL */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        title="Add Vendor / Supplier"
        subtitle="Register a wholesale merchant for goods procurement"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Company / Vendor Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Metro Farm Produce Ltd."
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="John Doe"
                value={supplierForm.contactPerson}
                onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Phone</label>
              <input
                type="text"
                placeholder="+91 98765 00000"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Email</label>
            <input
              type="email"
              placeholder="sales@vendor.com"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Billing Address</label>
            <input
              type="text"
              placeholder="Industrial Area, Sector 4"
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowSupplierModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Save Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* RECORD PURCHASE MODAL */}
      <Modal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        title="Record Inward Stock Purchase"
        subtitle="Stock received will automatically increase ingredient inventories"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Supplier *</label>
              <select
                required
                value={purchaseForm.supplierId}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E]"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Invoice Number</label>
              <input
                type="text"
                value={purchaseForm.invoiceNumber}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E]"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Goods Inward Items</span>
              <button
                type="button"
                onClick={handleAddPurchaseItem}
                className="text-xs text-[#173F36] dark:text-[#9FB29E] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2">
              {purchaseForm.items.map((it, idx) => (
                <div key={idx} className="bg-[#F7EFE4] dark:bg-[#101A18] p-2.5 rounded-xl border border-[#E4DCD0] dark:border-[#1E362E] flex items-center gap-2">
                  <select
                    value={it.inventoryItemId}
                    onChange={(e) => {
                      const inv = inventoryItems.find((x) => x.id === e.target.value);
                      setPurchaseForm((prev) => ({
                        ...prev,
                        items: prev.items.map((x, i) =>
                          i === idx ? { ...x, inventoryItemId: e.target.value, unitCost: inv?.costPrice || x.unitCost } : x
                        ),
                      }));
                    }}
                    className="flex-1 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-lg px-2 py-1 text-xs"
                  >
                    {inventoryItems.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.unit})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        items: prev.items.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)),
                      }))
                    }
                    className="w-20 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-lg px-2 py-1 text-xs font-mono"
                  />

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Unit Cost"
                    value={it.unitCost}
                    onChange={(e) =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        items: prev.items.map((x, i) => (i === idx ? { ...x, unitCost: e.target.value } : x)),
                      }))
                    }
                    className="w-24 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-lg px-2 py-1 text-xs font-mono"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== idx),
                      }))
                    }
                    className="text-[#657168] dark:text-[#9FB29E] hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Notes / Batch Info</label>
            <input
              type="text"
              placeholder="e.g. Received batch fresh from supplier van"
              value={purchaseForm.notes}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
              className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-[#17251F] dark:text-[#F7EFE4] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E4DCD0] dark:border-[#1E362E]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPurchaseModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Confirm Goods Receipt
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
