import React, { useState, useEffect, useMemo } from 'react';
import posService from '../services/pos.service';
import { sanitizePhoneInput, validatePhoneInput, isScientificNotation, guessCountryFromCurrency } from '../utils/validation';
import { useAuth } from '../context/AuthContext';
import { StatCard, ChartCard, LineChart, DonutChart, PhoneInput } from '../components/ui';
import PlatformPerformanceAnalytics from '../components/PlatformPerformanceAnalytics';
import SubscriptionLicenseModal from '../components/SubscriptionLicenseModal';
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
  Clock,
  ArrowRight,
  Edit3,
  Sliders,
  DollarSign,
  Eye,
  EyeOff,
} from 'lucide-react';

import {
  useSuperAdminOverview,
  useSuperAdminRestaurants,
  useSuperAdminPlans,
  useSuperAdminSubscriptionsOverview,
  usePosMutations
} from '../hooks/usePosQueries';

export default function RegistrationAdminDashboard({ setActiveTab: setParentTab }) {
  const { addToast } = useAuth();
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'plans'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: overview = null, isLoading: loadingOverview, refetch: refetchOverview } = useSuperAdminOverview();
  const { data: restData = [], isLoading: loadingRest, refetch: refetchRestaurants } = useSuperAdminRestaurants();
  const { data: plansData = [], isLoading: loadingPlans, refetch: refetchPlans } = useSuperAdminPlans();
  const { data: subOverview = null } = useSuperAdminSubscriptionsOverview();
  const { invalidateSuperAdmin } = usePosMutations();

  const restaurants = Array.isArray(restData) ? restData : (restData.items || []);
  const plans = Array.isArray(plansData) ? plansData : (plansData.items || []);
  const loading = (loadingOverview && !overview) || (loadingRest && restaurants.length === 0) || (loadingPlans && plans.length === 0);

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
  const [onboardPhoneError, setOnboardPhoneError] = useState('');

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

  // Password Visibility Toggle States
  const [showOnboardPassword, setShowOnboardPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

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

  useEffect(() => {
    if (!onboardForm.planId && plans.length > 0) {
      setOnboardForm((prev) => ({ ...prev, planId: plans[0].id }));
    }
  }, [plans, onboardForm.planId]);

  const fetchData = async () => {
    try {
      invalidateSuperAdmin();
      await Promise.all([refetchOverview(), refetchRestaurants(), refetchPlans()]);
    } catch (err) {
      setError(err.message || 'Unable to refresh platform data');
      addToast(err.message || 'Failed to refresh platform data', 'error');
    }
  };

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
  };

  const handleUpdateSubscription = async (licensePayload) => {
    if (!selectedRestForSub) return;

    setSubmittingSub(true);
    try {
      const res = await posService.superAdmin.updateSubscription(selectedRestForSub.id, {
        planId: licensePayload.planId,
        status: licensePayload.status,
        durationYears: licensePayload.durationYears,
        durationDays: licensePayload.durationDays,
      });
      if (res.success) {
        addToast(`Subscription license updated for "${selectedRestForSub.name}"`, 'success');
        setSelectedRestForSub(null);
        await fetchData();
      } else {
        addToast(res.message || 'Failed to update subscription', 'error');
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

    if (onboardForm.phone && onboardForm.phone.trim()) {
      const err = validatePhoneInput(onboardForm.phone);
      if (err) {
        setOnboardPhoneError(err);
        addToast(err, 'warning');
        return;
      }
    }
    setOnboardPhoneError('');

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

  const totalTenants = overview?.totalRestaurants ?? restaurants.length;
  const activeSubscriptions = overview?.activeSubscriptions ?? restaurants.filter((r) => r.subscription?.status === 'ACTIVE' || r.isActive).length;
  const suspendedTenants = overview?.inactiveRestaurants ?? restaurants.filter((r) => !r.isActive).length;
  const activeTenants = overview?.activeRestaurants ?? restaurants.filter((r) => r.isActive).length;
  const totalUsers = overview?.totalPlatformUsers ?? 0;

  const planDistribution = useMemo(() => {
    const pList = overview?.plans || plans || [];
    const colors = ['#173F36', '#2D6A4F', '#9FB29E', '#C07D37', '#657168', '#426B5B'];
    return pList.map((p, idx) => ({
      label: p.name,
      value: p.activeSubscribers || p._count?.subscriptions || 0,
      color: colors[idx % colors.length],
      sublabel: `₹${Number(p.price || 0).toLocaleString()}/yr`,
    }));
  }, [overview, plans]);

  const tenantHealthData = useMemo(() => [
    { label: 'Active', value: activeTenants, color: '#2D6A4F' },
    { label: 'Suspended', value: suspendedTenants, color: '#C53030' },
  ], [activeTenants, suspendedTenants]);

  const tenantGrowthData = useMemo(() => {
    if (!restaurants || restaurants.length === 0) return [];
    const sorted = [...restaurants].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const dateMap = {};
    let cumulative = 0;
    sorted.forEach((r) => {
      const d = r.createdAt ? new Date(r.createdAt) : new Date();
      const monthKey = d.toLocaleDateString([], { month: 'short', year: '2-digit' });
      cumulative += 1;
      dateMap[monthKey] = cumulative;
    });
    return Object.entries(dateMap).map(([label, value]) => ({ label, value }));
  }, [restaurants]);

  const subscriptionRevenueData = useMemo(() => {
    if (!restaurants || restaurants.length === 0) return [];
    const sorted = [...restaurants].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const revMap = {};
    let cumulativeRevenue = 0;
    sorted.forEach((r) => {
      const d = r.createdAt ? new Date(r.createdAt) : new Date();
      const monthKey = d.toLocaleDateString([], { month: 'short', year: '2-digit' });
      const planPrice = Number(r.subscription?.plan?.price || 5000);
      cumulativeRevenue += planPrice;
      revMap[monthKey] = cumulativeRevenue;
    });
    return Object.entries(revMap).map(([label, value]) => ({ label, value }));
  }, [restaurants]);

  const userRoleDistribution = useMemo(() => {
    return [
      { label: 'Active Tenants', value: activeTenants, color: '#2D6A4F', sublabel: 'Operating' },
      { label: 'Suspended', value: suspendedTenants, color: '#C53030', sublabel: 'Inactive' },
      { label: 'Active Subs', value: activeSubscriptions, color: '#C07D37', sublabel: 'Paid Licenses' },
      { label: 'Platform Users', value: totalUsers, color: '#173F36', sublabel: 'Staff Roster' },
    ];
  }, [activeTenants, suspendedTenants, activeSubscriptions, totalUsers]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 bg-[#F7EFE4] dark:bg-[#101A18] text-[#17251F] dark:text-[#F7EFE4]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/25 border border-[#173F36]/20 dark:border-[#173F36]/30 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] bg-[#173F36]/10 text-[#173F36] dark:text-[#9FB29E] font-semibold px-2.5 py-0.5 rounded-full border border-[#173F36]/20">
                Super Admin
              </span>
              <span className="text-xs text-[#657168] dark:text-[#9FB29E] font-medium">• Multi-Tenant SaaS Governance</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight mt-1">
              Platform Governance & Tenant Subscriptions
            </h1>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5">
              Overview of dining establishments, subscription tiers, and platform performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[#F7EFE4] dark:bg-[#1E2E2A] hover:bg-[#EBDDCB] dark:hover:bg-[#233630] text-[#17251F] dark:text-[#F7EFE4] rounded-xl text-xs font-semibold border border-[#E4DCD0] dark:border-[#233630] shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Refresh Platform Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#173F36] dark:text-[#9FB29E]' : 'text-[#657168] dark:text-[#9FB29E]'}`} />
            <span>Refresh</span>
          </button>

          {activeTab === 'plans' ? (
            <button
              onClick={handleOpenCreatePlan}
              className="flex items-center gap-2 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-editorial hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Subscription Plan</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOnboardModal(true)}
              className="flex items-center gap-2 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-editorial hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Restaurant</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && !overview && restaurants.length === 0 && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#F5C6CB] dark:border-[#5C2328] rounded-2xl p-8 text-center shadow-editorial max-w-md mx-auto my-6">
          <div className="w-12 h-12 rounded-xl bg-[#FDF0ED] dark:bg-[#2E1A1C] border border-[#F5C6CB] dark:border-[#5C2328] text-[#C53030] flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#17251F] dark:text-[#F7EFE4]">Unable to load platform data</h3>
          <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1 font-medium">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Registered Restaurants"
          value={loading && !overview ? '...' : totalTenants}
          subtitle="Total registered tenants"
          icon={Building2}
          iconColor="text-[#173F36] dark:text-[#9FB29E]"
          iconBg="bg-[#173F36]/10 dark:bg-[#173F36]/25 border border-[#173F36]/20"
        />

        <StatCard
          title="Active Restaurants"
          value={loading && !overview ? '...' : activeTenants}
          subtitle="Currently operational tenants"
          icon={ShieldCheck}
          iconColor="text-[#2D6A4F] dark:text-[#52B788]"
          iconBg="bg-[#E8F3ED] dark:bg-[#1B382B] border border-[#C8E0D2] dark:border-[#2D6A4F]"
        />

        <StatCard
          title="Suspended Tenants"
          value={loading && !overview ? '...' : suspendedTenants}
          subtitle="Blocked from terminal access"
          icon={ShieldAlert}
          iconColor="text-[#C53030] dark:text-[#E57373]"
          iconBg="bg-[#FDF0ED] dark:bg-[#381B1D] border border-[#F5C6CB] dark:border-[#7A2E33]"
        />

        <StatCard
          title="Platform Users"
          value={loading && !overview ? '...' : totalUsers}
          subtitle="Users across all restaurants"
          icon={Users}
          iconColor="text-[#173F36] dark:text-[#9FB29E]"
          iconBg="bg-[#F7EFE4] dark:bg-[#1E2E2A] border border-[#E4DCD0] dark:border-[#233630]"
        />
      </div>

      {/* Consolidated Platform Analytics (One section as per design specification) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2">
          <ChartCard
            title="Platform Tenant Growth"
            subtitle="Cumulative customer restaurants onboarded to the POS platform"
            badge="Tenant Scale"
            empty={tenantGrowthData.length === 0}
            emptyMessage="No restaurant tenants onboarded yet. Newly created accounts will plot growth here."
          >
            <div className="pt-2">
              <LineChart
                data={tenantGrowthData}
                color="#173F36"
                height={210}
                valueLabel="tenants"
              />
              <div className="flex items-center justify-between text-xs text-[#657168] dark:text-[#9FB29E] pt-3 border-t border-[#E4DCD0]/60 dark:border-[#233630]/60 font-medium">
                <span>Active Operating Tenants: <strong className="text-[#2D6A4F] dark:text-[#52B788] font-bold">{activeTenants} active</strong></span>
                <span>Total Registered: <strong className="font-mono text-[#17251F] dark:text-[#F7EFE4]">{totalTenants} organizations</strong></span>
              </div>
            </div>
          </ChartCard>
        </div>

        <ChartCard
          title="Subscription Tier Distribution"
          subtitle="Active tenant subscriptions across licensing plans"
          badge="Live Plans"
        >
          <div className="py-1 flex items-center justify-center">
            <DonutChart
              data={planDistribution}
              centerLabel="Active Subs"
              centerValue={activeSubscriptions}
              size={150}
              strokeWidth={20}
              layout="col"
            />
          </div>
        </ChartCard>
      </div>

      {/* SUBSCRIPTION OVERVIEW & HOTELS NEAR EXPIRY (Section 17 Requirement) */}
      <div className="bg-[#FFFDF9] dark:bg-[#14221E] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl p-5 shadow-editorial">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E4DCD0] dark:border-[#233630]">
          <div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#173F36] dark:text-[#F7EFE4] flex items-center gap-2">
              <CreditCard className="w-4.5 h-4.5 text-[#173F36] dark:text-[#4EBA87]" />
              <span>Subscription Health & Expiry Overview</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
              Real-time tenant license quotas, active subscriptions, and renewal tracking
            </p>
          </div>
          {setParentTab && (
            <button
              onClick={() => setParentTab('subscriptions')}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#173F36] dark:text-[#4EBA87] hover:underline cursor-pointer"
            >
              <span>Manage Subscriptions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 4 Mini Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 pb-4">
          <div className="p-3 rounded-xl bg-[#FBF8F3] dark:bg-[#121E1B] border border-[#E4DCD0] dark:border-[#233630]">
            <span className="text-[10px] text-[#657168] dark:text-[#9FB29E] uppercase font-bold tracking-wider">
              Total Hotels
            </span>
            <div className="text-lg font-bold font-mono text-[#17251F] dark:text-[#F7EFE4] mt-0.5">
              {subOverview?.totalOrganizations ?? totalTenants}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#E8F3ED] dark:bg-[#1B382B] border border-[#C8E0D2] dark:border-[#2D6A4F]">
            <span className="text-[10px] text-[#2D6A4F] dark:text-[#52B788] uppercase font-bold tracking-wider">
              Active Plans
            </span>
            <div className="text-lg font-bold font-mono text-[#2D6A4F] dark:text-[#52B788] mt-0.5">
              {subOverview?.activeSubscriptions ?? activeSubscriptions}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#FEF3C7] dark:bg-[#3D2E14] border border-[#FCD34D] dark:border-[#785418]">
            <span className="text-[10px] text-[#92551A] dark:text-[#FBBF24] uppercase font-bold tracking-wider">
              Expiring Soon
            </span>
            <div className="text-lg font-bold font-mono text-[#92551A] dark:text-[#FBBF24] mt-0.5">
              {subOverview?.expiringSoon ?? 0}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#FDF0ED] dark:bg-[#381B1D] border border-[#F5C6CB] dark:border-[#7A2E33]">
            <span className="text-[10px] text-[#C53030] dark:text-[#E57373] uppercase font-bold tracking-wider">
              Expired
            </span>
            <div className="text-lg font-bold font-mono text-[#C53030] dark:text-[#E57373] mt-0.5">
              {subOverview?.expired ?? 0}
            </div>
          </div>
        </div>

        {/* Hotels Near Expiry List */}
        <div className="pt-2 border-t border-[#E4DCD0]/60 dark:border-[#233630]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Hotels Near Expiry (Next 7 Days)</span>
            </span>
            {subOverview?.nearExpiryList?.length > 0 && (
              <span className="text-[10px] text-[#D97706] font-bold bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FCD34D]">
                Action Required
              </span>
            )}
          </div>

          {(!subOverview?.nearExpiryList || subOverview.nearExpiryList.length === 0) ? (
            <div className="py-3 px-4 rounded-xl bg-[#FBF8F3] dark:bg-[#121E1B] border border-[#E4DCD0] dark:border-[#233630] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#2D6A4F] dark:text-[#52B788]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>All active restaurant subscriptions are healthy. No renewals pending in the immediate 7-day window.</span>
              </div>
              {setParentTab && (
                <button
                  onClick={() => setParentTab('subscriptions')}
                  className="font-bold text-[#173F36] dark:text-[#4EBA87] hover:underline"
                >
                  View All &rarr;
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#E4DCD0]/60 dark:divide-[#233630]/60 border border-[#E4DCD0] dark:border-[#233630] rounded-xl overflow-hidden text-xs">
              {subOverview.nearExpiryList.map((item) => (
                <div key={item.organizationId} className="p-3 bg-[#FFFDF9] dark:bg-[#152320] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#D97706]/15 text-[#D97706] flex items-center justify-center font-bold text-xs">
                      !
                    </div>
                    <div>
                      <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] block">{item.organizationName}</span>
                      <span className="text-[10px] text-[#657168] dark:text-[#9FB29E]">{item.ownerName} • {item.ownerEmail}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#173F36]/10 text-[#173F36] dark:text-[#4EBA87]">
                      {item.planName}
                    </span>
                    <span className="text-xs font-bold font-mono text-[#D97706] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FCD34D]">
                      {item.daysRemaining} days left
                    </span>
                    <button
                      onClick={() => handleOpenSubModal({
                        id: item.organizationId,
                        name: item.organizationName,
                        subscription: { endDate: item.endDate, status: item.status },
                      })}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#173F36] text-white hover:bg-[#12332C] transition cursor-pointer"
                    >
                      Renew
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E4DCD0] dark:border-[#233630] pb-3">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'tenants'
              ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial'
              : 'text-[#657168] dark:text-[#9FB29E] hover:text-[#173F36] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E2E2A]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tenants & Subscriptions ({totalTenants})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'plans'
              ? 'bg-[#173F36] text-[#FFFDF9] shadow-editorial'
              : 'text-[#657168] dark:text-[#9FB29E] hover:text-[#173F36] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E2E2A]'
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
              <Search className="w-4 h-4 text-[#657168] dark:text-[#9FB29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by restaurant name, owner email, plan, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] dark:placeholder-[#657168] focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36] shadow-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              {['ALL', 'ACTIVE', 'SUSPENDED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    statusFilter === f
                      ? 'bg-[#173F36] text-[#FFFDF9] border-[#173F36] shadow-xs'
                      : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] border-[#E4DCD0] dark:border-[#233630] hover:bg-[#F7EFE4] dark:hover:bg-[#1E2E2A]'
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
              <RefreshCw className="w-8 h-8 text-[#173F36] animate-spin" />
              <span className="text-sm text-[#657168] font-medium">Loading customer tenants...</span>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="bg-[#FFFDF9] border border-[#E4DCD0] rounded-2xl p-16 text-center shadow-editorial">
              <Building2 className="w-12 h-12 text-[#9FB29E] mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#173F36]">No restaurant tenants found</h3>
              <p className="text-sm text-[#657168] mt-1 font-medium">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try adjusting your search query or status filters.'
                  : 'Get started by onboarding your first restaurant customer tenant.'}
              </p>
              <button
                onClick={() => setShowOnboardModal(true)}
                className="mt-4 inline-flex items-center gap-2 bg-[#173F36] hover:bg-[#12332C] active:scale-95 text-[#FFFDF9] font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-editorial hover:-translate-y-0.5 cursor-pointer"
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
                    className={`bg-[#FFFDF9] dark:bg-[#152320] border rounded-2xl p-5 sm:p-6 transition-all shadow-editorial flex flex-col justify-between ${
                      !isSuspended ? 'border-[#E4DCD0] dark:border-[#233630]' : 'border-[#F5C6CB] dark:border-[#5C2328] bg-[#FDF0ED]/20 dark:bg-[#2A1719]/20'
                    }`}
                  >
                    <div>
                      {/* Tenant Title & Badges */}
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-serif text-xl font-bold text-[#173F36] dark:text-[#F7EFE4]">{rest.name}</h3>
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                                !isSuspended
                                  ? 'bg-[#E8F3ED] dark:bg-[#1B382B] text-[#2D6A4F] dark:text-[#52B788] border-[#C8E0D2] dark:border-[#2D6A4F]'
                                  : 'bg-[#FDF0ED] dark:bg-[#381B1D] text-[#C53030] dark:text-[#E57373] border-[#F5C6CB] dark:border-[#7A2E33]'
                              }`}
                            >
                              {!isSuspended ? 'Active' : 'Suspended'}
                            </span>

                            {plan && (
                              <span className="text-[10px] font-semibold bg-[#F7EFE4] text-[#173F36] dark:bg-[#1E2E2A] dark:text-[#9FB29E] border border-[#E4DCD0] dark:border-[#233630] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-[#173F36] dark:text-[#9FB29E]" />
                                <span>{plan.name}</span>
                              </span>
                            )}

                            {sub?.endDate && (
                              <span
                                className="text-[10px] font-semibold bg-[#F7EFE4] text-[#173F36] dark:bg-[#1E2E2A] dark:text-[#9FB29E] border border-[#E4DCD0] dark:border-[#233630] px-2.5 py-0.5 rounded-full flex items-center gap-1"
                                title={`Expires: ${new Date(sub.endDate).toLocaleDateString()}`}
                              >
                                <Calendar className="w-2.5 h-2.5 text-[#173F36] dark:text-[#9FB29E]" />
                                <span>
                                  {Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d left
                                </span>
                              </span>
                            )}
                          </div>
                          {rest.address && (
                            <p className="text-xs text-[#657168] dark:text-[#9FB29E] flex items-center gap-1.5 mt-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-[#657168] dark:text-[#9FB29E] shrink-0" />
                              <span>{rest.address}</span>
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono bg-[#F7EFE4] dark:bg-[#1E2E2A] border border-[#E4DCD0] dark:border-[#233630] text-[#173F36] dark:text-[#F7EFE4] px-2.5 py-1 rounded-xl font-bold shadow-xs">
                            {rest.currency} | Tax: {rest.taxRate}%
                          </span>
                        </div>
                      </div>

                      {/* Owner Information Box */}
                      <div className="bg-[#F7EFE4] dark:bg-[#1C2C27] border border-[#E4DCD0] dark:border-[#233630] rounded-xl p-3.5 my-3.5 space-y-2">
                        <div className="text-[11px] font-bold text-[#173F36] dark:text-[#9FB29E] uppercase tracking-wider flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>Restaurant Administrator / Owner</span>
                          </div>
                          <span className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-semibold bg-[#FFFDF9] dark:bg-[#152320] px-2 py-0.5 rounded-md border border-[#E4DCD0] dark:border-[#233630]">
                            Tenant Admin
                          </span>
                        </div>
                        {rest.owner ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[#657168] dark:text-[#9FB29E] block text-[10px] font-medium">Name</span>
                              <span className="text-[#17251F] dark:text-[#F7EFE4] font-bold">{rest.owner.name}</span>
                            </div>
                            <div>
                              <span className="text-[#657168] dark:text-[#9FB29E] block text-[10px] font-medium">Login Email</span>
                              <span className="text-[#17251F] dark:text-[#F7EFE4] font-mono text-[11px] font-semibold truncate block">{rest.owner.email}</span>
                            </div>
                            {rest.owner.phone && (
                              <div>
                                <span className="text-[#657168] dark:text-[#9FB29E] block text-[10px] font-medium">Phone</span>
                                <span className="text-[#657168] dark:text-[#9FB29E] font-mono font-medium">{rest.owner.phone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-[#C07D37] italic font-medium">No admin user assigned</div>
                        )}
                      </div>

                      {/* Plan Limits & Current Usage Metrics */}
                      <div className="grid grid-cols-3 gap-2 text-center py-3 border-y border-[#E4DCD0] dark:border-[#233630] my-3.5 bg-[#F7EFE4] dark:bg-[#1C2C27] rounded-xl">
                        <div>
                          <div className="text-xs font-bold text-[#173F36] dark:text-[#F7EFE4] font-mono">
                            {rest.roleCounts?.waiters ?? 0}
                            <span className="text-[#657168] dark:text-[#9FB29E] text-[10px] font-normal"> / {plan?.maxWaiters ?? 10}</span>
                          </div>
                          <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-semibold uppercase tracking-wider mt-0.5">Waiters</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#173F36] dark:text-[#F7EFE4] font-mono">
                            {rest.roleCounts?.kitchenAdmins ?? 0}
                            <span className="text-[#657168] dark:text-[#9FB29E] text-[10px] font-normal"> / {plan?.maxKitchenAdmins ?? 2}</span>
                          </div>
                          <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-semibold uppercase tracking-wider mt-0.5">Kitchen Admins</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#173F36] dark:text-[#F7EFE4] font-mono">
                            {rest.roleCounts?.receptionists ?? 0}
                            <span className="text-[#657168] dark:text-[#9FB29E] text-[10px] font-normal"> / {plan?.maxReceptionists ?? 2}</span>
                          </div>
                          <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-semibold uppercase tracking-wider mt-0.5">Receptionists</div>
                        </div>
                      </div>
                    </div>

                    {/* Super Admin Action Controls */}
                    <div className="flex items-center justify-between gap-2 pt-3 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={() => handleOpenSubModal(rest)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#FFFDF9] dark:bg-[#152320] hover:bg-[#F7EFE4] dark:hover:bg-[#1E2E2A] active:scale-95 text-[#173F36] dark:text-[#9FB29E] text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#E4DCD0] dark:border-[#233630] shadow-xs transition-all cursor-pointer"
                        title="Manage Plan & Limits"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                        <span>Manage Subscription</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedRestForReset(rest);
                          setResetForm({
                            newEmail: rest.owner?.email || '',
                            newPassword: '',
                          });
                        }}
                        className="flex items-center justify-center gap-1.5 bg-[#FFFDF9] dark:bg-[#152320] hover:bg-[#F7EFE4] dark:hover:bg-[#1E2E2A] active:scale-95 text-[#17251F] dark:text-[#F7EFE4] text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#E4DCD0] dark:border-[#233630] shadow-xs transition-all cursor-pointer"
                        title="Reset Owner Credentials"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#C07D37]" />
                        <span className="hidden sm:inline">Reset Login</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(rest)}
                        className={`flex items-center gap-1.5 text-xs font-semibold py-2.5 px-3.5 rounded-xl border shadow-xs active:scale-95 transition-all cursor-pointer ${
                          rest.isActive
                            ? 'bg-[#FDF0ED] dark:bg-[#381B1D] text-[#C53030] dark:text-[#E57373] border-[#F5C6CB] dark:border-[#7A2E33] hover:bg-[#FCE3DF]'
                            : 'bg-[#E8F3ED] dark:bg-[#1B382B] text-[#2D6A4F] dark:text-[#52B788] border-[#C8E0D2] dark:border-[#2D6A4F] hover:bg-[#D7EBE0]'
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
                className={`bg-[#FFFDF9] dark:bg-[#152320] border rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all shadow-editorial ${
                  p.isActive ? 'border-[#E4DCD0] dark:border-[#233630]' : 'border-[#E4DCD0]/50 dark:border-[#233630]/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-[#173F36] dark:text-[#F7EFE4]">{p.name}</h3>
                      <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">{p.description || 'SaaS subscription tier'}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                        p.isActive
                          ? 'bg-[#E8F3ED] dark:bg-[#1B382B] text-[#2D6A4F] dark:text-[#52B788] border-[#C8E0D2] dark:border-[#2D6A4F]'
                          : 'bg-[#F7EFE4] dark:bg-[#1E2E2A] text-[#657168] dark:text-[#9FB29E] border-[#E4DCD0] dark:border-[#233630]'
                      }`}
                    >
                      {p.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  <div className="my-4 pb-4 border-b border-[#E4DCD0] dark:border-[#233630]">
                    <div className="text-3xl font-serif font-bold text-[#173F36] dark:text-[#F7EFE4]">
                      ₹{Number(p.price).toLocaleString()}
                      <span className="text-xs font-sans text-[#657168] dark:text-[#9FB29E] font-normal"> / {p.durationDays} days</span>
                    </div>
                    <div className="text-xs text-[#173F36] dark:text-[#9FB29E] mt-1.5 flex items-center gap-1.5 font-semibold">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{p.activeSubscribers || 0} active restaurant subscribers</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-xs">
                    <span className="text-[11px] font-bold uppercase text-[#657168] dark:text-[#9FB29E] block tracking-wider">
                      Included Capacity Limits
                    </span>
                    <div className="flex items-center justify-between text-[#657168] dark:text-[#9FB29E] py-1 border-b border-[#E4DCD0]/60 dark:border-[#233630]/60">
                      <span>Waiters:</span>
                      <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] font-mono">{p.maxWaiters ?? 10} Staff</span>
                    </div>
                    <div className="flex items-center justify-between text-[#657168] dark:text-[#9FB29E] py-1 border-b border-[#E4DCD0]/60 dark:border-[#233630]/60">
                      <span>Kitchen Admins:</span>
                      <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] font-mono">{p.maxKitchenAdmins ?? 2} Staff</span>
                    </div>
                    <div className="flex items-center justify-between text-[#657168] dark:text-[#9FB29E] py-1 border-b border-[#E4DCD0]/60 dark:border-[#233630]/60">
                      <span>Receptionists:</span>
                      <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] font-mono">{p.maxReceptionists ?? 2} Staff</span>
                    </div>
                    <div className="flex items-center justify-between text-[#657168] dark:text-[#9FB29E] py-1 border-b border-[#E4DCD0]/60 dark:border-[#233630]/60">
                      <span>Max Dining Tables:</span>
                      <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] font-mono">{p.maxTables} Tables</span>
                    </div>
                    <div className="flex items-center justify-between text-[#657168] dark:text-[#9FB29E] py-1 border-b border-[#E4DCD0]/60 dark:border-[#233630]/60">
                      <span>Max Menu Items:</span>
                      <span className="font-bold text-[#17251F] dark:text-[#F7EFE4] font-mono">{p.maxMenuItems} Dishes</span>
                    </div>
                  </div>

                  {Array.isArray(p.features) && p.features.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                      <span className="text-[11px] font-bold uppercase text-[#657168] dark:text-[#9FB29E] block tracking-wider">
                        Feature Modules
                      </span>
                      {p.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-[#17251F] dark:text-[#F7EFE4]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#52B788] shrink-0" />
                          <span className="font-medium">{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E4DCD0] dark:border-[#233630]">
                  <button
                    onClick={() => handleOpenEditPlan(p)}
                    className="w-full flex items-center justify-center gap-1.5 bg-[#FFFDF9] dark:bg-[#152320] hover:bg-[#F7EFE4] dark:hover:bg-[#1E2E2A] active:scale-95 text-[#173F36] dark:text-[#9FB29E] text-xs font-semibold py-2.5 rounded-xl border border-[#E4DCD0] dark:border-[#233630] shadow-xs transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
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
          <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl w-full max-w-xl p-6 sm:p-7 shadow-editorial relative max-h-[90vh] overflow-y-auto text-[#17251F] dark:text-[#F7EFE4]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4DCD0] dark:border-[#233630]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#173F36] dark:text-[#F7EFE4] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
                  <span>Onboard New Restaurant Tenant</span>
                </h3>
                <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
                  Provisions tenant database space, creates Owner account, and links Subscription Plan
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutofillOnboard}
                className="text-[11px] text-[#173F36] dark:text-[#9FB29E] hover:text-[#12332C] dark:hover:text-[#F7EFE4] font-semibold flex items-center gap-1 bg-[#F7EFE4] dark:bg-[#1E2E2A] border border-[#E4DCD0] dark:border-[#233630] px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#173F36] dark:text-[#9FB29E]" />
                <span>Auto-fill Demo</span>
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Restaurant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bukhara Spice Kitchen"
                  value={onboardForm.restaurantName}
                  onChange={(e) => setOnboardForm({ ...onboardForm, restaurantName: e.target.value })}
                  className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] focus:ring-1 focus:ring-[#173F36]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Assign Subscription Plan *</label>
                <select
                  value={onboardForm.planId}
                  onChange={(e) => setOnboardForm({ ...onboardForm, planId: e.target.value })}
                  className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] font-medium"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id} className="dark:bg-[#152320] dark:text-[#F7EFE4]">
                      {p.name} — ₹{Number(p.price).toLocaleString()} / year ({p.maxWaiters ?? 10} Waiters, {p.maxKitchenAdmins ?? 2} Kitchen Admins, {p.maxReceptionists ?? 2} Receptionists)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={onboardForm.currency}
                    onChange={(e) => setOnboardForm({ ...onboardForm, currency: e.target.value })}
                    className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono"
                    placeholder="₹ or $"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={onboardForm.taxRate}
                    onChange={(e) => setOnboardForm({ ...onboardForm, taxRate: e.target.value })}
                    className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. 104 MG Road, Bangalore"
                  value={onboardForm.address}
                  onChange={(e) => setOnboardForm({ ...onboardForm, address: e.target.value })}
                  className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36]"
                />
              </div>

              <div className="pt-3 border-t border-[#E4DCD0] dark:border-[#233630]">
                <span className="text-[11px] font-bold uppercase text-[#173F36] dark:text-[#9FB29E] block mb-2">
                  Restaurant Administrator Credentials
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alok Verma"
                      value={onboardForm.ownerName}
                      onChange={(e) => setOnboardForm({ ...onboardForm, ownerName: e.target.value })}
                      className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36]"
                    />
                  </div>
                  <div>
                    <PhoneInput
                      id="onboard-phone"
                      label="Phone Number"
                      value={onboardForm.phone}
                      defaultCountry={guessCountryFromCurrency(onboardForm.currency || 'INR')}
                      onChange={(val, meta) => {
                        setOnboardForm({ ...onboardForm, phone: val });
                        setOnboardPhoneError(meta.error);
                      }}
                      error={onboardPhoneError}
                      helperText={!onboardPhoneError ? 'Owner official mobile number' : undefined}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Owner Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@example.com"
                      value={onboardForm.ownerEmail}
                      onChange={(e) => setOnboardForm({ ...onboardForm, ownerEmail: e.target.value })}
                      className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Initial Password *</label>
                    <div className="relative">
                      <input
                        type={showOnboardPassword ? 'text' : 'password'}
                        required
                        placeholder="Min 6 characters"
                        value={onboardForm.password}
                        onChange={(e) => setOnboardForm({ ...onboardForm, password: e.target.value })}
                        className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl pl-3 pr-10 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOnboardPassword(!showOnboardPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] p-1 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#173F36]"
                        aria-label={showOnboardPassword ? 'Hide password' : 'Show password'}
                        title={showOnboardPassword ? 'Hide password' : 'Show password'}
                      >
                        {showOnboardPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E4DCD0] dark:border-[#233630]">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E2E2A] transition-colors cursor-pointer border border-[#E4DCD0] dark:border-[#233630]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOnboard}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] transition-all shadow-editorial cursor-pointer"
                >
                  {submittingOnboard ? 'Onboarding Establishment...' : 'Onboard Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE SUBSCRIPTION MODAL */}
      <SubscriptionLicenseModal
        restaurant={selectedRestForSub}
        plans={plans}
        isOpen={Boolean(selectedRestForSub)}
        onClose={() => setSelectedRestForSub(null)}
        onSubmit={handleUpdateSubscription}
        isSubmitting={submittingSub}
      />

      {/* RESET OWNER CREDENTIALS MODAL */}
      {selectedRestForReset && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl w-full max-w-md p-6 shadow-editorial relative text-[#17251F] dark:text-[#F7EFE4]">
            <h3 className="font-serif text-xl font-bold text-[#173F36] dark:text-[#F7EFE4] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#C07D37]" />
              <span>Reset Owner Credentials</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1 font-medium">
              Update login credentials for <span className="text-[#17251F] dark:text-[#F7EFE4] font-semibold">{selectedRestForReset.name}</span>
            </p>

            <form onSubmit={handleResetCredentials} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">New Owner Email</label>
                <input
                  type="email"
                  placeholder="Leave as is or enter new email"
                  value={resetForm.newEmail}
                  onChange={(e) => setResetForm({ ...resetForm, newEmail: e.target.value })}
                  className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">New Password (leave empty to keep current)</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={resetForm.newPassword}
                    onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                    className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl pl-3 pr-10 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] p-1 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#173F36]"
                    aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                    title={showResetPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E4DCD0] dark:border-[#233630]">
                <button
                  type="button"
                  onClick={() => setSelectedRestForReset(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E2E2A] transition-colors cursor-pointer border border-[#E4DCD0] dark:border-[#233630]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] transition-all shadow-editorial cursor-pointer"
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
          <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl w-full max-w-lg p-6 shadow-editorial relative max-h-[90vh] overflow-y-auto text-[#17251F] dark:text-[#F7EFE4]">
            <h3 className="font-serif text-xl font-bold text-[#173F36] dark:text-[#F7EFE4] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>{editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1 font-medium">
              Define pricing and resource capacity limits for restaurant tenants
            </p>

            <form onSubmit={handlePlanSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growth Plan"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Short Description</label>
                <input
                  type="text"
                  placeholder="e.g. For expanding restaurants and bistros"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                    className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E4DCD0] dark:border-[#233630]">
                <span className="text-[11px] font-bold uppercase text-[#173F36] dark:text-[#9FB29E] block mb-2">
                  Enforced Resource Limits
                </span>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Max Waiters</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxWaiters}
                      onChange={(e) => setPlanForm({ ...planForm, maxWaiters: e.target.value })}
                      className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Kitchen Admins</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxKitchenAdmins}
                      onChange={(e) => setPlanForm({ ...planForm, maxKitchenAdmins: e.target.value })}
                      className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Receptionists</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxReceptionists}
                      onChange={(e) => setPlanForm({ ...planForm, maxReceptionists: e.target.value })}
                      className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Max Tables</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxTables}
                      onChange={(e) => setPlanForm({ ...planForm, maxTables: e.target.value })}
                      className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Max Dishes</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxMenuItems}
                      onChange={(e) => setPlanForm({ ...planForm, maxMenuItems: e.target.value })}
                      className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1">Features (comma separated)</label>
                <input
                  type="text"
                  placeholder="POS Terminal, Kitchen Display, Inventory BOM, Reports"
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="planActiveCheck"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  className="rounded bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#233630] text-[#173F36] focus:ring-0 accent-[#173F36]"
                />
                <label htmlFor="planActiveCheck" className="text-xs text-[#17251F] dark:text-[#F7EFE4] font-medium">
                  Plan is active for onboarding
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E4DCD0] dark:border-[#233630]">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E2E2A] transition-colors cursor-pointer border border-[#E4DCD0] dark:border-[#233630]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] transition-all shadow-editorial cursor-pointer"
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
