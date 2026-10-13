import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/ui';
import PlatformPerformanceAnalytics from '../components/PlatformPerformanceAnalytics';
import {
  Building2,
  Plus,
  Search,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  Power,
  Mail,
  User,
  Phone,
  MapPin,
  Sparkles,
  Users,
  LayoutGrid,
  Layers,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Edit3,
  Sliders,
  DollarSign
} from 'lucide-react';

export default function RegistrationAdminDashboard() {
  const { addToast } = useAuth();
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'plans'
  const [restaurants, setRestaurants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [overview, setOverview] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState('30D');
  const [activeMetric, setActiveMetric] = useState('tenants');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Onboarding Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [submittingOnboard, setSubmittingOnboard] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    restaurantName: '',
    address: '',
    currency: '₹',
    taxRate: 5,
    planId: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
    phone: '',
  });

  // Manage Subscription Modal State
  const [selectedRestForSub, setSelectedRestForSub] = useState(null);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subForm, setSubForm] = useState({
    planId: '',
    status: 'ACTIVE',
    durationDays: 30,
  });

  // Reset Credentials Modal State
  const [selectedRestForReset, setSelectedRestForReset] = useState(null);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetForm, setResetForm] = useState({
    newEmail: '',
    newPassword: '',
  });

  // Create / Edit Plan Modal State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: 5000,
    durationDays: 365,
    maxStaff: 14,
    maxWaiters: 10,
    maxKitchenAdmins: 2,
    maxReceptionists: 2,
    maxTables: 10,
    maxMenuItems: 50,
    features: '',
    isActive: true,
  });

  const [error, setError] = useState(null);

  const fetchData = async (range = analyticsRange) => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, restRes, plansRes, analyticsRes] = await Promise.all([
        posService.superAdmin.getOverview(),
        posService.superAdmin.getRestaurants(),
        posService.superAdmin.getPlans(),
        posService.superAdmin.getAnalytics({ range }),
      ]);

      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
      }
      if (restRes.success && restRes.data) {
        setRestaurants(restRes.data);
      }
      if (plansRes.success && plansRes.data) {
        setPlans(plansRes.data);
        if (!onboardForm.planId && plansRes.data.length > 0) {
          setOnboardForm((prev) => ({ ...prev, planId: plansRes.data[0].id }));
        }
      }
      if (analyticsRes.success && analyticsRes.data) {
        setAnalyticsData(analyticsRes.data);
      }
    } catch (err) {
      setError(err.message || 'Unable to load platform data');
      addToast(err.message || 'Failed to load platform data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = async (newRange) => {
    setAnalyticsRange(newRange);
    setAnalyticsLoading(true);
    try {
      const res = await posService.superAdmin.getAnalytics({ range: newRange });
      if (res.success && res.data) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load analytics for range', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (restaurant) => {
    const nextStatus = !restaurant.isActive;
    const actionText = nextStatus ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionText} "${restaurant.name}"? Suspended restaurants cannot process orders or sign in.`)) {
      return;
    }

    try {
      const res = await posService.superAdmin.updateStatus(restaurant.id, nextStatus);
      if (res.success) {
        addToast(`Restaurant "${restaurant.name}" is now ${nextStatus ? 'ACTIVE' : 'SUSPENDED'}`, 'success');
        fetchData();
      }
    } catch (err) {
      addToast(err.message || 'Failed to update restaurant status', 'error');
    }
  };

  const handleOpenSubModal = (rest) => {
    setSelectedRestForSub(rest);
    setSubForm({
      planId: rest.subscription?.planId || (plans[0]?.id || ''),
      status: rest.subscription?.status || 'ACTIVE',
      durationDays: 30,
    });
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    if (!selectedRestForSub) return;

    setSubmittingSub(true);
    try {
      const res = await posService.superAdmin.updateSubscription(selectedRestForSub.id, {
        planId: subForm.planId,
        status: subForm.status,
        durationDays: Number(subForm.durationDays) || undefined,
      });
      if (res.success) {
        addToast(`Subscription updated for "${selectedRestForSub.name}"`, 'success');
        setSelectedRestForSub(null);
        fetchData();
      }
    } catch (err) {
      addToast(err.message || 'Failed to update subscription', 'error');
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleOpenResetModal = (rest) => {
    setSelectedRestForReset(rest);
    setResetForm({
      newEmail: rest.owner?.email || '',
      newPassword: '',
    });
  };

  const handleResetCredentials = async (e) => {
    e.preventDefault();
    if (!selectedRestForReset) return;
    if (!resetForm.newEmail && !resetForm.newPassword) {
      addToast('Please provide a new email or password', 'warning');
      return;
    }
    if (resetForm.newPassword && resetForm.newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'warning');
      return;
    }

    setSubmittingReset(true);
    try {
      const payload = {
        newEmail: resetForm.newEmail.trim() || undefined,
        newPassword: resetForm.newPassword || undefined,
      };
      const res = await posService.superAdmin.resetOwnerCredentials(selectedRestForReset.id, payload);
      if (res.success) {
        addToast(`Owner credentials updated for "${selectedRestForReset.name}"`, 'success');
        setSelectedRestForReset(null);
        fetchData();
      }
    } catch (err) {
      addToast(err.message || 'Failed to update credentials', 'error');
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!onboardForm.restaurantName.trim() || !onboardForm.ownerName.trim() || !onboardForm.ownerEmail.trim() || !onboardForm.password) {
      addToast('Please fill all required fields (*)', 'warning');
      return;
    }
    if (onboardForm.password.length < 6) {
      addToast('Password must be at least 6 characters', 'warning');
      return;
    }

    setSubmittingOnboard(true);
    try {
      const payload = {
        name: onboardForm.restaurantName.trim(),
        address: onboardForm.address.trim() || undefined,
        currency: onboardForm.currency.trim() || '₹',
        taxRate: Number(onboardForm.taxRate) || 5.0,
        planId: onboardForm.planId || undefined,
        owner: {
          name: onboardForm.ownerName.trim(),
          email: onboardForm.ownerEmail.trim(),
          password: onboardForm.password,
          phone: onboardForm.phone.trim() || undefined,
        },
      };

      const res = await posService.superAdmin.onboardRestaurant(payload);
      if (res.success) {
        addToast(`Tenant "${onboardForm.restaurantName}" successfully provisioned!`, 'success');
        setShowOnboardModal(false);
        setOnboardForm({
          restaurantName: '',
          address: '',
          currency: '₹',
          taxRate: 5,
          planId: plans[0]?.id || '',
          ownerName: '',
          ownerEmail: '',
          password: '',
          phone: '',
        });
        fetchData();
      }
    } catch (err) {
      addToast(err.message || 'Failed to onboard restaurant', 'error');
    } finally {
      setSubmittingOnboard(false);
    }
  };

  const handleAutofillOnboard = () => {
    const rnd = Math.floor(100 + Math.random() * 900);
    setOnboardForm({
      restaurantName: `Heritage Kitchen #${rnd}`,
      address: `${rnd} Mahatma Gandhi Marg, South City`,
      currency: '₹',
      taxRate: 5,
      planId: plans[0]?.id || '',
      ownerName: 'Sunil Kapoor',
      ownerEmail: `sunil.kitchen${rnd}@pos.com`,
      password: 'Password123',
      phone: '+91 9811223344',
    });
    addToast('Sample onboarding data populated!', 'info');
  };

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      description: '',
      price: 5000,
      durationDays: 365,
      maxStaff: 14,
      maxWaiters: 10,
      maxKitchenAdmins: 2,
      maxReceptionists: 2,
      maxTables: 15,
      maxMenuItems: 75,
      features: 'Full POS, Real-time KDS, Recipe BOM, Inventory Tracking, Multi-role Support',
      isActive: true,
    });
    setShowPlanModal(true);
  };

  const handleOpenEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      price: Number(plan.price) || 0,
      durationDays: plan.durationDays || 365,
      maxStaff: plan.maxStaff || 14,
      maxWaiters: plan.maxWaiters || 10,
      maxKitchenAdmins: plan.maxKitchenAdmins || 2,
      maxReceptionists: plan.maxReceptionists || 2,
      maxTables: plan.maxTables || 10,
      maxMenuItems: plan.maxMenuItems || 50,
      features: Array.isArray(plan.features) ? plan.features.join(', ') : '',
      isActive: plan.isActive,
    });
    setShowPlanModal(true);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (!planForm.name.trim()) {
      addToast('Plan name is required', 'warning');
      return;
    }

    setSubmittingPlan(true);
    try {
      const payload = {
        name: planForm.name.trim(),
        description: planForm.description.trim() || undefined,
        price: Number(planForm.price),
        durationDays: Number(planForm.durationDays),
        maxStaff: Number(planForm.maxStaff),
        maxWaiters: Number(planForm.maxWaiters),
        maxKitchenAdmins: Number(planForm.maxKitchenAdmins),
        maxReceptionists: Number(planForm.maxReceptionists),
        maxTables: Number(planForm.maxTables),
        maxMenuItems: Number(planForm.maxMenuItems),
        features: planForm.features.split(',').map((f) => f.trim()).filter(Boolean),
        isActive: planForm.isActive,
      };

      if (editingPlan) {
        await posService.superAdmin.updatePlan(editingPlan.id, payload);
        addToast(`Plan "${planForm.name}" updated successfully!`, 'success');
      } else {
        await posService.superAdmin.createPlan(payload);
        addToast(`Plan "${planForm.name}" created successfully!`, 'success');
      }
      setShowPlanModal(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to save plan', 'error');
    } finally {
      setSubmittingPlan(false);
    }
  };

  // Filter restaurants
  const filteredRestaurants = restaurants.filter((r) => {
    const matchQuery =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.owner?.name && r.owner.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.owner?.email && r.owner.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.subscription?.plan?.name && r.subscription.plan.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && r.isActive) ||
      (statusFilter === 'SUSPENDED' && !r.isActive);

    return matchQuery && matchStatus;
  });

  const totalTenants = overview?.totalRestaurants ?? analyticsData?.summary?.registeredTenants ?? restaurants.length;
  const activeSubscriptions = overview?.activeSubscriptions ?? analyticsData?.summary?.activeSubscriptions ?? restaurants.filter((r) => r.subscription?.status === 'ACTIVE' || r.isActive).length;
  const suspendedTenants = overview?.inactiveRestaurants ?? analyticsData?.summary?.suspendedTenants ?? restaurants.filter((r) => !r.isActive).length;
  const activeTenants = overview?.activeRestaurants ?? analyticsData?.summary?.activeTenants ?? restaurants.filter((r) => r.isActive).length;
  const totalUsers = overview?.totalPlatformUsers ?? analyticsData?.summary?.platformUsers ?? 0;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#FAF7F2] dark:bg-[#141210] text-[#1F2937] dark:text-[#F7F3EC]">
      {/* 1. HEADER / PLATFORM OVERVIEW */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] p-5 sm:p-6 rounded-2xl shadow-sandstone">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/30 flex items-center justify-center text-[#92400E] dark:text-[#D97706] shrink-0 shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] bg-[#92400E]/15 text-[#92400E] dark:text-[#D97706] font-bold px-2.5 py-0.5 rounded-full border border-[#92400E]/30">
                Platform Super Admin
              </span>
              <span className="text-xs text-[#5B6470] dark:text-[#A89B8C] font-medium">• Multi-Tenant SaaS Governance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2937] dark:text-[#F7F3EC] tracking-tight mt-1">
              Platform Overview
            </h1>
            <p className="text-xs sm:text-sm text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">
              Manage restaurant tenants, subscriptions, platform access and overall platform performance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2F2722] text-[#1F2937] dark:text-[#F7F3EC] rounded-xl text-xs font-semibold border border-[#E5D8C6] dark:border-[#382F26] shadow-sandstone hover:shadow-sandstone-md active:scale-95 transition-all cursor-pointer"
            title="Refresh Platform Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#92400E] dark:text-[#D97706]' : 'text-[#5B6470] dark:text-[#A89B8C]'}`} />
            <span>Refresh</span>
          </button>

          {activeTab === 'plans' ? (
            <button
              onClick={handleOpenCreatePlan}
              className="flex items-center gap-2 bg-[#92400E] hover:bg-[#78350F] active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sandstone hover:shadow-sandstone-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Subscription Plan</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOnboardModal(true)}
              className="flex items-center gap-2 bg-[#92400E] hover:bg-[#78350F] active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sandstone hover:shadow-sandstone-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Restaurant</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && !overview && !analyticsData && restaurants.length === 0 && (
        <div className="bg-white dark:bg-[#1C1815] border border-rose-200 dark:border-rose-900 rounded-2xl p-8 text-center shadow-sandstone max-w-md mx-auto my-6">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-[#EF4444] flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1F2937] dark:text-[#F7F3EC]">Unable to load platform data</h3>
          <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-1 font-medium">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 bg-[#92400E] hover:bg-[#78350F] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. KPI SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Registered Restaurants"
          value={loading && !overview && !analyticsData ? '...' : totalTenants}
          subtitle="Total registered tenants"
          icon={Building2}
          iconColor="text-[#92400E] dark:text-[#D97706]"
          iconBg="bg-[#92400E]/10 dark:bg-[#92400E]/20 border border-[#92400E]/20 dark:border-[#92400E]/30"
        />

        <StatCard
          title="Active Restaurants"
          value={loading && !overview && !analyticsData ? '...' : activeTenants}
          subtitle="Currently operational tenants"
          icon={ShieldCheck}
          iconColor="text-[#16A34A] dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
        />

        <StatCard
          title="Active Subscriptions"
          value={loading && !overview && !analyticsData ? '...' : activeSubscriptions}
          subtitle="Currently active subscriptions"
          icon={CreditCard}
          iconColor="text-[#D97706] dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
        />

        <StatCard
          title="Platform Users"
          value={loading && !overview && !analyticsData ? '...' : totalUsers}
          subtitle="Users across all restaurants"
          icon={Users}
          iconColor="text-[#2563EB] dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
        />
      </div>

      {/* 3. ONE CONSOLIDATED PLATFORM ANALYTICS GRAPH */}
      <PlatformPerformanceAnalytics
        analyticsData={analyticsData}
        loading={analyticsLoading || (loading && !analyticsData)}
        timeRange={analyticsRange}
        onTimeRangeChange={handleRangeChange}
        activeMetric={activeMetric}
        onMetricChange={setActiveMetric}
      />

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E5D8C6] dark:border-[#382F26] pb-3">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'tenants'
              ? 'bg-[#92400E] text-white shadow-sandstone'
              : 'text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tenants & Subscriptions ({totalTenants})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'plans'
              ? 'bg-[#92400E] text-white shadow-sandstone'
              : 'text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Subscription Plans ({plans.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: TENANTS & SUBSCRIPTIONS */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#5B6470] dark:text-[#A89B8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by restaurant name, owner email, plan, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E] shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              {['ALL', 'ACTIVE', 'SUSPENDED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    statusFilter === f
                      ? 'bg-[#92400E] text-white border-[#92400E] shadow-sm'
                      : 'bg-white dark:bg-[#1C1815] text-[#5B6470] dark:text-[#A89B8C] border-[#E5D8C6] dark:border-[#382F26] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C]'
                  }`}
                >
                  {f === 'ALL' ? `All (${totalTenants})` : f === 'ACTIVE' ? `Active (${activeTenants})` : `Suspended (${suspendedTenants})`}
                </button>
              ))}
            </div>
          </div>

          {/* Tenants Grid */}
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-[#92400E] animate-spin" />
              <span className="text-sm text-[#5B6470] font-medium">Loading customer tenants...</span>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="bg-white border border-[#E5D8C6] rounded-2xl p-16 text-center shadow-sandstone card-hover">
              <Building2 className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#1F2937]">No restaurant tenants found</h3>
              <p className="text-sm text-[#5B6470] mt-1 font-medium">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try adjusting your search query or status filters.'
                  : 'Get started by onboarding your first restaurant customer tenant.'}
              </p>
              <button
                onClick={() => setShowOnboardModal(true)}
                className="mt-4 inline-flex items-center gap-2 bg-[#92400E] hover:bg-[#78350F] active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sandstone hover:shadow-sandstone-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard Restaurant Tenant</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredRestaurants.map((rest) => {
                const sub = rest.subscription;
                const plan = sub?.plan;
                const isSuspended = !rest.isActive || sub?.status === 'SUSPENDED';

                return (
                  <div
                    key={rest.id}
                    className={`bg-white dark:bg-[#1C1815] border rounded-2xl p-5 sm:p-6 transition-all shadow-sandstone card-hover flex flex-col justify-between ${
                      !isSuspended ? 'border-[#E5D8C6] dark:border-[#382F26]' : 'border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20'
                    }`}
                  >
                    <div>
                      {/* Tenant Title & Badges */}
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-extrabold text-[#1F2937] dark:text-[#F7F3EC]">{rest.name}</h3>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                                !isSuspended
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {!isSuspended ? 'Active' : 'Suspended'}
                            </span>

                            {plan && (
                              <span className="text-[10px] font-bold bg-[#D97706]/15 text-[#B45309] dark:text-[#D97706] border border-[#D97706]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>{plan.name}</span>
                              </span>
                            )}
                          </div>
                          {rest.address && (
                            <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] flex items-center gap-1.5 mt-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-[#5B6470] dark:text-[#A89B8C] shrink-0" />
                              <span>{rest.address}</span>
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] text-[#1F2937] dark:text-[#F7F3EC] px-2.5 py-1 rounded-xl font-bold shadow-sm">
                            {rest.currency} | Tax: {rest.taxRate}%
                          </span>
                        </div>
                      </div>

                      {/* Owner Information Box */}
                      <div className="bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl p-3.5 my-3.5 space-y-2">
                        <div className="text-[11px] font-bold text-[#92400E] dark:text-[#D97706] uppercase tracking-wider flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>Restaurant Administrator / Owner</span>
                          </div>
                          <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-semibold bg-white dark:bg-[#1C1815] px-2 py-0.5 rounded-md border border-[#E5D8C6] dark:border-[#382F26]">
                            Tenant Admin
                          </span>
                        </div>
                        {rest.owner ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[#5B6470] dark:text-[#A89B8C] block text-[10px] font-medium">Name</span>
                              <span className="text-[#1F2937] dark:text-[#F7F3EC] font-bold">{rest.owner.name}</span>
                            </div>
                            <div>
                              <span className="text-[#5B6470] dark:text-[#A89B8C] block text-[10px] font-medium">Login Email</span>
                              <span className="text-[#1F2937] dark:text-[#F7F3EC] font-mono text-[11px] font-semibold truncate block">{rest.owner.email}</span>
                            </div>
                            {rest.owner.phone && (
                              <div>
                                <span className="text-[#5B6470] dark:text-[#A89B8C] block text-[10px] font-medium">Phone</span>
                                <span className="text-[#5B6470] dark:text-[#A89B8C] font-mono font-medium">{rest.owner.phone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-[#D97706] italic font-medium">No admin user assigned</div>
                        )}
                      </div>

                      {/* Plan Limits & Current Usage Metrics */}
                      <div className="grid grid-cols-3 gap-2 text-center py-3 border-y border-[#E5D8C6] dark:border-[#382F26] my-3.5 bg-[#FAF7F2] dark:bg-[#25201C] rounded-xl">
                        <div>
                          <div className="text-xs font-extrabold text-[#1F2937] dark:text-[#F7F3EC] font-mono">
                            {rest.roleCounts?.waiters ?? 0}
                            <span className="text-[#5B6470] dark:text-[#A89B8C] text-[10px] font-normal"> / {plan?.maxWaiters ?? 10}</span>
                          </div>
                          <div className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-semibold uppercase tracking-wider mt-0.5">Waiters</div>
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-[#1F2937] dark:text-[#F7F3EC] font-mono">
                            {rest.roleCounts?.kitchenAdmins ?? 0}
                            <span className="text-[#5B6470] dark:text-[#A89B8C] text-[10px] font-normal"> / {plan?.maxKitchenAdmins ?? 2}</span>
                          </div>
                          <div className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-semibold uppercase tracking-wider mt-0.5">Kitchen Admins</div>
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-[#1F2937] dark:text-[#F7F3EC] font-mono">
                            {rest.roleCounts?.receptionists ?? 0}
                            <span className="text-[#5B6470] dark:text-[#A89B8C] text-[10px] font-normal"> / {plan?.maxReceptionists ?? 2}</span>
                          </div>
                          <div className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-semibold uppercase tracking-wider mt-0.5">Receptionists</div>
                        </div>
                      </div>
                    </div>

                    {/* Super Admin Action Controls */}
                    <div className="flex items-center justify-between gap-2 pt-3 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={() => handleOpenSubModal(rest)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2F2722] active:scale-95 text-[#92400E] dark:text-[#D97706] text-xs font-bold py-2.5 px-3 rounded-xl border border-[#E5D8C6] dark:border-[#382F26] shadow-sandstone hover:shadow-sandstone-md transition-all cursor-pointer"
                        title="Manage Plan & Limits"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#92400E] dark:text-[#D97706]" />
                        <span>Manage Subscription</span>
                      </button>

                      <button
                        onClick={() => handleOpenResetModal(rest)}
                        className="flex items-center justify-center gap-1.5 bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2F2722] active:scale-95 text-[#1F2937] dark:text-[#F7F3EC] text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#E5D8C6] dark:border-[#382F26] shadow-sandstone hover:shadow-sandstone-md transition-all cursor-pointer"
                        title="Reset Owner Credentials"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#D97706]" />
                        <span className="hidden sm:inline">Reset Login</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(rest)}
                        className={`flex items-center gap-1.5 text-xs font-bold py-2.5 px-3.5 rounded-xl border shadow-sandstone hover:shadow-sandstone-md active:scale-95 transition-all cursor-pointer ${
                          rest.isActive
                            ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                        }`}
                        title={rest.isActive ? 'Suspend Restaurant' : 'Activate Restaurant'}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{rest.isActive ? 'Suspend' : 'Activate'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SUBSCRIPTION PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`bg-white dark:bg-[#1C1815] border rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all shadow-sandstone card-hover ${
                  p.isActive ? 'border-[#E5D8C6] dark:border-[#382F26]' : 'border-[#E5D8C6]/50 dark:border-[#382F26]/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-extrabold text-[#1F2937] dark:text-[#F7F3EC]">{p.name}</h3>
                      <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">{p.description || 'SaaS subscription tier'}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                        p.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-[#FAF7F2] dark:bg-[#25201C] text-[#5B6470] dark:text-[#A89B8C] border-[#E5D8C6] dark:border-[#382F26]'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  <div className="my-4 pb-4 border-b border-[#E5D8C6] dark:border-[#382F26]">
                    <div className="text-3xl font-extrabold text-[#1F2937] dark:text-[#F7F3EC] font-mono">
                      ₹{Number(p.price).toLocaleString()}
                      <span className="text-xs text-[#5B6470] dark:text-[#A89B8C] font-normal"> / {p.durationDays} days</span>
                    </div>
                    <div className="text-xs text-[#92400E] dark:text-[#D97706] mt-1.5 flex items-center gap-1.5 font-bold">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{p.activeSubscribers || 0} active restaurant subscribers</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-xs">
                    <span className="text-[11px] font-bold uppercase text-[#5B6470] dark:text-[#A89B8C] block tracking-wider">
                      Included Capacity Limits
                    </span>
                    <div className="flex items-center justify-between text-[#5B6470] dark:text-[#A89B8C] py-1 border-b border-[#E5D8C6]/60 dark:border-[#382F26]/60">
                      <span>Waiters:</span>
                      <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC] font-mono">{p.maxWaiters ?? 10} Staff</span>
                    </div>
                    <div className="flex items-center justify-between text-[#5B6470] dark:text-[#A89B8C] py-1 border-b border-[#E5D8C6]/60 dark:border-[#382F26]/60">
                      <span>Kitchen Admins:</span>
                      <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC] font-mono">{p.maxKitchenAdmins ?? 2} Staff</span>
                    </div>
                    <div className="flex items-center justify-between text-[#5B6470] dark:text-[#A89B8C] py-1 border-b border-[#E5D8C6]/60 dark:border-[#382F26]/60">
                      <span>Receptionists:</span>
                      <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC] font-mono">{p.maxReceptionists ?? 2} Staff</span>
                    </div>
                    <div className="flex items-center justify-between text-[#5B6470] dark:text-[#A89B8C] py-1 border-b border-[#E5D8C6]/60 dark:border-[#382F26]/60">
                      <span>Max Dining Tables:</span>
                      <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC] font-mono">{p.maxTables} Tables</span>
                    </div>
                    <div className="flex items-center justify-between text-[#5B6470] dark:text-[#A89B8C] py-1 border-b border-[#E5D8C6]/60 dark:border-[#382F26]/60">
                      <span>Max Menu Items:</span>
                      <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC] font-mono">{p.maxMenuItems} Dishes</span>
                    </div>
                  </div>

                  {Array.isArray(p.features) && p.features.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                      <span className="text-[11px] font-bold uppercase text-[#5B6470] dark:text-[#A89B8C] block tracking-wider">
                        Feature Modules
                      </span>
                      {p.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-[#1F2937] dark:text-[#F7F3EC]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400 shrink-0" />
                          <span className="font-medium">{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E5D8C6] dark:border-[#382F26]">
                  <button
                    onClick={() => handleOpenEditPlan(p)}
                    className="w-full flex items-center justify-center gap-1.5 bg-[#FAF7F2] dark:bg-[#25201C] hover:bg-[#F1E8DB] dark:hover:bg-[#2F2722] active:scale-95 text-[#92400E] dark:text-[#D97706] text-xs font-bold py-2.5 rounded-xl border border-[#E5D8C6] dark:border-[#382F26] shadow-sandstone hover:shadow-sandstone-md transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#92400E] dark:text-[#D97706]" />
                    <span>Edit Plan Parameters</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ONBOARD RESTAURANT MODAL */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-3xl w-full max-w-xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[#1F2937] dark:text-[#F7F3EC]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5D8C6] dark:border-[#382F26]">
              <div>
                <h3 className="text-lg font-bold text-[#1F2937] dark:text-[#F7F3EC] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#92400E] dark:text-[#D97706]" />
                  <span>Onboard New Restaurant Tenant</span>
                </h3>
                <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium">
                  Provisions tenant database space, creates Owner account, and links Subscription Plan
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutofillOnboard}
                className="text-[11px] text-[#92400E] dark:text-[#D97706] hover:text-[#78350F] dark:hover:text-[#F59E0B] font-semibold flex items-center gap-1 bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Auto-fill Demo</span>
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Restaurant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bukhara Spice Kitchen"
                  value={onboardForm.restaurantName}
                  onChange={(e) => setOnboardForm({ ...onboardForm, restaurantName: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E] focus:ring-1 focus:ring-[#92400E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Assign Subscription Plan *</label>
                <select
                  value={onboardForm.planId}
                  onChange={(e) => setOnboardForm({ ...onboardForm, planId: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] focus:outline-none focus:border-[#92400E] font-medium"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id} className="dark:bg-[#1C1815] dark:text-[#F7F3EC]">
                      {p.name} — ₹{Number(p.price).toLocaleString()} / year ({p.maxWaiters ?? 10} Waiters, {p.maxKitchenAdmins ?? 2} Kitchen Admins, {p.maxReceptionists ?? 2} Receptionists)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={onboardForm.currency}
                    onChange={(e) => setOnboardForm({ ...onboardForm, currency: e.target.value })}
                    className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] font-mono"
                    placeholder="₹ or $"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={onboardForm.taxRate}
                    onChange={(e) => setOnboardForm({ ...onboardForm, taxRate: e.target.value })}
                    className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. 104 MG Road, Bangalore"
                  value={onboardForm.address}
                  onChange={(e) => setOnboardForm({ ...onboardForm, address: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5D8C6] dark:border-[#382F26]">
                <span className="text-[11px] font-bold uppercase text-[#92400E] dark:text-[#D97706] block mb-2">
                  Restaurant Administrator Credentials
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alok Verma"
                      value={onboardForm.ownerName}
                      onChange={(e) => setOnboardForm({ ...onboardForm, ownerName: e.target.value })}
                      className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={onboardForm.phone}
                      onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                      className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Owner Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@example.com"
                      value={onboardForm.ownerEmail}
                      onChange={(e) => setOnboardForm({ ...onboardForm, ownerEmail: e.target.value })}
                      className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Initial Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={onboardForm.password}
                      onChange={(e) => setOnboardForm({ ...onboardForm, password: e.target.value })}
                      className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5D8C6] dark:border-[#382F26]">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C] transition-colors cursor-pointer border border-[#E5D8C6] dark:border-[#382F26]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOnboard}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#92400E] hover:bg-[#78350F] text-white transition-all shadow-sandstone cursor-pointer"
                >
                  {submittingOnboard ? 'Onboarding Establishment...' : 'Onboard Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE SUBSCRIPTION MODAL */}
      {selectedRestForSub && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-[#1F2937] dark:text-[#F7F3EC]">
            <h3 className="text-lg font-bold text-[#1F2937] dark:text-[#F7F3EC] flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#92400E] dark:text-[#D97706]" />
              <span>Manage Plan & Subscription</span>
            </h3>
            <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-1 font-medium">
              Configure subscription tier for <span className="text-[#1F2937] dark:text-[#F7F3EC] font-semibold">{selectedRestForSub.name}</span>
            </p>

            <form onSubmit={handleUpdateSubscription} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Select Plan</label>
                <select
                  value={subForm.planId}
                  onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] focus:outline-none focus:border-[#92400E]"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id} className="dark:bg-[#1C1815] dark:text-[#F7F3EC]">
                      {p.name} — ₹{Number(p.price).toLocaleString()} / year ({p.maxWaiters ?? 10} Waiters, {p.maxKitchenAdmins ?? 2} Kitchen Admins, {p.maxReceptionists ?? 2} Receptionists)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Subscription Status</label>
                <select
                  value={subForm.status}
                  onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] focus:outline-none focus:border-[#92400E]"
                >
                  <option value="ACTIVE" className="dark:bg-[#1C1815] dark:text-[#F7F3EC]">ACTIVE (Normal Operations)</option>
                  <option value="SUSPENDED" className="dark:bg-[#1C1815] dark:text-[#F7F3EC]">SUSPENDED (Temporarily Blocked)</option>
                  <option value="EXPIRED" className="dark:bg-[#1C1815] dark:text-[#F7F3EC]">EXPIRED (Renewal Required)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Extend Duration (Days from now)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={subForm.durationDays}
                  onChange={(e) => setSubForm({ ...subForm, durationDays: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] focus:outline-none focus:border-[#92400E]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5D8C6] dark:border-[#382F26]">
                <button
                  type="button"
                  onClick={() => setSelectedRestForSub(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C] transition-colors cursor-pointer border border-[#E5D8C6] dark:border-[#382F26]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSub}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#92400E] hover:bg-[#78350F] text-white transition-all shadow-sandstone cursor-pointer"
                >
                  {submittingSub ? 'Updating...' : 'Save Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET OWNER CREDENTIALS MODAL */}
      {selectedRestForReset && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-[#1F2937] dark:text-[#F7F3EC]">
            <h3 className="text-lg font-bold text-[#1F2937] dark:text-[#F7F3EC] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#D97706]" />
              <span>Reset Owner Credentials</span>
            </h3>
            <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-1 font-medium">
              Update login credentials for <span className="text-[#1F2937] dark:text-[#F7F3EC] font-semibold">{selectedRestForReset.name}</span>
            </p>

            <form onSubmit={handleResetCredentials} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">New Owner Email</label>
                <input
                  type="email"
                  placeholder="Leave as is or enter new email"
                  value={resetForm.newEmail}
                  onChange={(e) => setResetForm({ ...resetForm, newEmail: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">New Password (leave empty to keep current)</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={resetForm.newPassword}
                  onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5D8C6] dark:border-[#382F26]">
                <button
                  type="button"
                  onClick={() => setSelectedRestForReset(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C] transition-colors cursor-pointer border border-[#E5D8C6] dark:border-[#382F26]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#92400E] hover:bg-[#78350F] text-white transition-all shadow-sandstone cursor-pointer"
                >
                  {submittingReset ? 'Updating...' : 'Save New Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[#1F2937] dark:text-[#F7F3EC]">
            <h3 className="text-lg font-bold text-[#1F2937] dark:text-[#F7F3EC] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#92400E] dark:text-[#D97706]" />
              <span>{editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</span>
            </h3>
            <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-1 font-medium">
              Define pricing and resource capacity limits for restaurant tenants
            </p>

            <form onSubmit={handlePlanSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growth Plan"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Short Description</label>
                <input
                  type="text"
                  placeholder="e.g. For expanding restaurants and bistros"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] focus:outline-none focus:border-[#92400E] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                    className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] focus:outline-none focus:border-[#92400E] font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5D8C6] dark:border-[#382F26]">
                <span className="text-[11px] font-bold uppercase text-[#92400E] dark:text-[#D97706] block mb-2">
                  Enforced Resource Limits
                </span>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Max Waiters</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxWaiters}
                      onChange={(e) => setPlanForm({ ...planForm, maxWaiters: e.target.value })}
                      className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Kitchen Admins</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxKitchenAdmins}
                      onChange={(e) => setPlanForm({ ...planForm, maxKitchenAdmins: e.target.value })}
                      className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Receptionists</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxReceptionists}
                      onChange={(e) => setPlanForm({ ...planForm, maxReceptionists: e.target.value })}
                      className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Max Tables</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxTables}
                      onChange={(e) => setPlanForm({ ...planForm, maxTables: e.target.value })}
                      className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Max Dishes</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxMenuItems}
                      onChange={(e) => setPlanForm({ ...planForm, maxMenuItems: e.target.value })}
                      className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] mb-1">Features (comma separated)</label>
                <input
                  type="text"
                  placeholder="POS Terminal, Kitchen Display, Inventory BOM, Reports"
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  className="w-full bg-[#FAF7F2] dark:bg-[#25201C] border border-[#E5D8C6] dark:border-[#382F26] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#92400E]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="planActiveCheck"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  className="rounded bg-[#FAF7F2] dark:bg-[#25201C] border-[#E5D8C6] dark:border-[#382F26] text-[#92400E] focus:ring-0"
                />
                <label htmlFor="planActiveCheck" className="text-xs text-[#1F2937] dark:text-[#F7F3EC] font-medium">
                  Plan is active for onboarding
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5D8C6] dark:border-[#382F26]">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201C] transition-colors cursor-pointer border border-[#E5D8C6] dark:border-[#382F26]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#92400E] hover:bg-[#78350F] text-white transition-all shadow-sandstone cursor-pointer"
                >
                  {submittingPlan ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
