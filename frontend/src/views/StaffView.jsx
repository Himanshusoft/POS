import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { Button, Badge, Modal, Input, SkeletonTable, EmptyState } from '../components/ui';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  ChefHat,
  Coffee,
  Receipt,
  Edit2,
  Power,
  RefreshCw,
  Sparkles,
  Lock,
  Phone,
  Mail,
  User,
  X
} from 'lucide-react';

export default function StaffView() {
  const { addToast } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Add Form
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'WAITER',
  });

  // Edit Form
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    role: 'WAITER',
    password: '',
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await posService.users.getAll();
      if (res.success && res.data) {
        setStaff(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load staff roster', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Compute counts by role
  const waiterCount = staff.filter((u) => u.role === 'WAITER').length;
  const chefCount = staff.filter((u) => u.role === 'KITCHEN_ADMIN').length;
  const receptionistCount = staff.filter((u) => u.role === 'RECEPTIONIST').length;

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      addToast('Name, Email and Password are required', 'warning');
      return;
    }
    if (form.password.length < 6) {
      addToast('Password must be at least 6 characters', 'warning');
      return;
    }

    try {
      await posService.users.create(form);
      addToast(`Staff member "${form.name}" added successfully!`, 'success');
      setShowAddModal(false);
      setForm({ name: '', email: '', password: '', phone: '', role: 'WAITER' });
      fetchStaff();
    } catch (err) {
      addToast(err.message || 'Failed to create staff member', 'error');
    }
  };

  const handleOpenEdit = (usr) => {
    setEditingStaff(usr);
    setEditForm({
      name: usr.name || '',
      phone: usr.phone || '',
      role: usr.role || 'WAITER',
      password: '',
    });
    setShowEditModal(true);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editForm.name.trim()) {
      addToast('Name is required', 'warning');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      addToast('Password must be at least 6 characters', 'warning');
      return;
    }

    try {
      const payload = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || undefined,
        role: editForm.role,
        ...(editForm.password ? { password: editForm.password } : {}),
      };

      await posService.users.update(editingStaff.id, payload);
      addToast(`Staff details for "${editForm.name}" updated!`, 'success');
      setShowEditModal(false);
      fetchStaff();
    } catch (err) {
      addToast(err.message || 'Failed to update staff member', 'error');
    }
  };

  const handleToggleStatus = async (usr) => {
    const nextState = !usr.isActive;
    const actionText = nextState ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${actionText} staff account for "${usr.name}"?`)) {
      return;
    }

    try {
      await posService.users.toggleStatus(usr.id, nextState);
      addToast(`Account for "${usr.name}" is now ${nextState ? 'ACTIVE' : 'DEACTIVATED'}`, 'success');
      fetchStaff();
    } catch (err) {
      addToast(err.message || 'Failed to update account status', 'error');
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Permanently remove ${name} from restaurant staff roster?`)) return;
    try {
      await posService.users.delete(id);
      addToast(`${name} removed from roster`, 'success');
      fetchStaff();
    } catch (err) {
      addToast(err.message || 'Failed to remove user', 'error');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'RESTAURANT_OWNER':
        return <Shield className="w-4 h-4 text-[#92400E]" />;
      case 'KITCHEN_ADMIN':
        return <ChefHat className="w-4 h-4 text-[#D97706]" />;
      case 'WAITER':
        return <Coffee className="w-4 h-4 text-[#2563EB]" />;
      case 'RECEPTIONIST':
        return <Receipt className="w-4 h-4 text-[#16A34A]" />;
      default:
        return <Users className="w-4 h-4 text-[#5B6470]" />;
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] dark:bg-[#141210] min-h-screen text-[#1F2937] dark:text-[#F7F3EC]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] p-5 sm:p-6 rounded-2xl shadow-sandstone">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/30 flex items-center justify-center text-[#92400E] dark:text-[#D97706] shrink-0 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] dark:text-[#F7F3EC] tracking-tight">
                Manage Staff & Access Control
              </h1>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#92400E]/10 dark:bg-[#92400E]/20 text-[#92400E] dark:text-[#D97706] border border-[#92400E]/20 dark:border-[#92400E]/30 shadow-2xs">
                Roster Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">
              Create, edit, activate/deactivate, and configure role credentials for restaurant personnel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={fetchStaff}
            disabled={loading}
            icon={RefreshCw}
            loading={loading}
            title="Refresh Staff Roster"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setShowAddModal(true)}
            icon={UserPlus}
          >
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Role Quota Tracker Banner */}
      <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl p-5 shadow-sandstone">
        <div className="flex items-center gap-2 mb-3.5">
          <Sparkles className="w-4 h-4 text-[#D97706]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#5B6470] dark:text-[#A89B8C]">
            Subscription Role Capacities (Standard Annual Plan)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Waiters Box */}
          <div className="bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl p-3.5 flex items-center justify-between hover:border-[#2563EB]/40 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-[#2563EB] dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 shadow-2xs">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC]">Waiters</div>
                <div className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-medium">POS & Tables</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono tabular-nums font-bold text-[#2563EB] dark:text-blue-400">
                {waiterCount} / 10
              </span>
              <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] block font-medium tabular-nums">
                {10 - waiterCount} available
              </span>
            </div>
          </div>

          {/* Kitchen Admins Box */}
          <div className="bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl p-3.5 flex items-center justify-between hover:border-[#D97706]/40 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-[#D97706] dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 shadow-2xs">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC]">Kitchen Admins</div>
                <div className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-medium">KDS & Recipes</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono tabular-nums font-bold text-[#D97706] dark:text-amber-400">
                {chefCount} / 2
              </span>
              <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] block font-medium tabular-nums">
                {2 - chefCount} available
              </span>
            </div>
          </div>

          {/* Receptionists Box */}
          <div className="bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl p-3.5 flex items-center justify-between hover:border-[#16A34A]/40 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC]">Receptionists</div>
                <div className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-medium">Billing & Cashier</div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono tabular-nums font-bold text-[#16A34A] dark:text-emerald-400">
                {receptionistCount} / 2
              </span>
              <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] block font-medium tabular-nums">
                {2 - receptionistCount} available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl overflow-hidden shadow-sandstone">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] sticky top-0 z-10 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Login Email</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <SkeletonTable rows={4} cols={6} />
            </table>
          </div>
        ) : staff.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Staff Members Found"
            description="Add your waiters, kitchen chefs, and receptionists to give them station access."
            actionLabel="Add First Staff Member"
            onAction={() => setShowAddModal(true)}
            actionIcon={UserPlus}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] uppercase text-[10px] font-bold border-b border-[#E5D8C6] dark:border-[#382F26] sticky top-0 z-10 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Login Email</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5D8C6]/60 dark:divide-[#382F26]">
                {staff.map((usr) => {
                  const isOwner = usr.role === 'RESTAURANT_OWNER';
                  return (
                    <tr key={usr.id} className="hover:bg-[#F1E8DB]/40 dark:hover:bg-[#25201C]/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#1F2937] dark:text-[#F7F3EC] text-sm">{usr.name}</div>
                        <div className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-mono mt-0.5">
                          {isOwner ? 'Restaurant Administrator' : `ID: ${usr.id.slice(0, 8)}`}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] text-[#1F2937] dark:text-[#F7F3EC]">
                          {getRoleIcon(usr.role)}
                          <span>
                            {usr.role === 'KITCHEN_ADMIN'
                              ? 'Kitchen Admin'
                              : usr.role === 'RESTAURANT_OWNER'
                              ? 'Restaurant Admin'
                              : usr.role.replace('_', ' ')}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#1F2937] dark:text-[#F7F3EC] font-mono">
                        {usr.email}
                      </td>
                      <td className="px-5 py-4 text-[#5B6470] dark:text-[#A89B8C] font-mono tabular-nums">
                        {usr.phone || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={usr.isActive ? 'ACTIVE' : 'INACTIVE'}
                          status={usr.isActive ? 'Active' : 'Deactivated'}
                          size="sm"
                        />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isOwner ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(usr)}
                              aria-label={`Edit ${usr.name}`}
                              className="p-2 rounded-xl text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
                              title="Edit Staff Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(usr)}
                              aria-label={usr.isActive ? `Deactivate ${usr.name}` : `Activate ${usr.name}`}
                              className={`p-2 rounded-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] ${
                                usr.isActive
                                  ? 'text-[#EF4444] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                  : 'text-[#16A34A] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                              title={usr.isActive ? 'Deactivate Account' : 'Activate Account'}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(usr.id, usr.name)}
                              aria-label={`Remove ${usr.name}`}
                              className="p-2 rounded-xl text-[#5B6470] dark:text-[#A89B8C] hover:text-[#EF4444] dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
                              title="Remove from roster"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-semibold italic">Primary Admin</span>
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

      {/* ADD STAFF MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Staff Member"
        subtitle="Assign role and provision credentials within plan capacity limits"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <Input
            label="Full Name"
            required
            placeholder="e.g. Ramesh Kumar"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            icon={User}
          />

          <Input
            label="Email Address"
            type="email"
            required
            placeholder="waiter1@restaurant.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            icon={Mail}
          />

          <Input
            label="Initial Password"
            type="password"
            required
            placeholder="Min 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            icon={Lock}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="+91 9876543210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              icon={Phone}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#1F2937]">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] font-semibold"
              >
                <option value="WAITER">Waiter ({10 - waiterCount} slots left)</option>
                <option value="KITCHEN_ADMIN">Kitchen Admin ({2 - chefCount} slots left)</option>
                <option value="RECEPTIONIST">Receptionist ({2 - receptionistCount} slots left)</option>
              </select>
            </div>
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
            >
              Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT STAFF MODAL */}
      <Modal
        isOpen={showEditModal && Boolean(editingStaff)}
        onClose={() => setShowEditModal(false)}
        title="Edit Staff Member"
        subtitle={`Update account profile or permissions for ${editingStaff?.name}`}
      >
        <form onSubmit={handleUpdateStaff} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            icon={User}
          />

          <div>
            <label className="block text-xs font-semibold text-[#5B6470] mb-1">Email (Cannot be changed)</label>
            <input
              type="email"
              disabled
              value={editingStaff?.email || ''}
              className="w-full bg-gray-100 border border-[#E5D8C6] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-gray-500 font-mono cursor-not-allowed"
            />
          </div>

          <Input
            label="Phone Number"
            placeholder="+91 9876543210"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            icon={Phone}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#1F2937]">Assigned Role *</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full bg-[#FAF7F2] border border-[#E5D8C6] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] font-semibold"
            >
              <option value="WAITER">Waiter</option>
              <option value="KITCHEN_ADMIN">Kitchen Admin</option>
              <option value="RECEPTIONIST">Receptionist</option>
            </select>
          </div>

          <Input
            label="Reset Password (Optional)"
            type="password"
            placeholder="Leave blank to keep unchanged"
            value={editForm.password}
            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            helperText="Leave empty to preserve existing password"
            icon={Lock}
          />

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
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
