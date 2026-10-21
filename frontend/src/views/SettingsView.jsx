import React, { useState, useEffect } from 'react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';
import { useSettings, usePosMutations } from '../hooks/usePosQueries';
import { Button, Badge } from '../components/ui';
import {
  Settings,
  Building2,
  User,
  Lock,
  Sliders,
  Save,
  ShieldCheck,
  Volume2,
  ChefHat,
  RefreshCw,
  Receipt,
  Boxes,
  Server,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SettingsView({ initialTab = 'profile', onTabChange }) {
  const { restaurant, setRestaurant, user, setUser, addToast, role } = useAuth();

  const normalizeCurrencyToCode = (val) => {
    if (!val) return 'INR';
    const str = String(val).trim();
    if (/^[A-Za-z]{3}$/.test(str)) return str.toUpperCase();
    const match = str.match(/\b([A-Za-z]{3})\b/);
    if (match) return match[1].toUpperCase();
    if (str.includes('₹')) return 'INR';
    if (str.includes('$')) return 'USD';
    if (str.includes('€')) return 'EUR';
    if (str.includes('£')) return 'GBP';
    if (str.includes('د.إ') || str.includes('AED')) return 'AED';
    return 'INR';
  };

  // Active top-level settings tab
  const [activeTab, setActiveTab] = useState(initialTab || 'profile');
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(null);

  // Sync with initialTab prop whenever caller requests a specific tab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Raw persisted settings bundle
  const [serverSettings, setServerSettings] = useState(null);

  // Forms State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [restForm, setRestForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    currency: 'INR',
    taxRate: 5,
  });

  const [operationsForm, setOperationsForm] = useState({
    serviceChargeRate: 0,
    gstNumber: '',
    autoPrintReceipt: true,
    orderHoldTimeoutMinutes: 30,
    enableTableOrdering: true,
    invoicePrefix: 'INV-',
    defaultPaymentMethod: 'CASH',
    roundOffTotal: true,
    footerMessage: 'Thank you for dining with us! Please visit again.',
  });

  const [kitchenPolicyForm, setKitchenPolicyForm] = useState({
    autoAcceptOrders: false,
    alertCookingTimeMinutes: 20,
    soundOnNewOrder: true,
    defaultTicketDensity: 'comfortable',
  });

  const [inventoryPolicyForm, setInventoryPolicyForm] = useState({
    autoDeductOnPreparation: true,
    lowStockThresholdDefault: 5,
    notifyLowStockOnLogin: true,
  });

  const [platformForm, setPlatformForm] = useState({
    platformName: 'POS Enterprise Cloud',
    supportEmail: 'support@pos.com',
    supportPhone: '+1 (800) 555-POS',
    maintenanceMode: false,
    allowNewRegistrations: true,
    defaultPlanDurationDays: 365,
    sessionTimeoutMinutes: 120,
    auditLogging: true,
  });

  const [userPrefForm, setUserPrefForm] = useState({
    theme: 'sandstone',
    soundAlerts: true,
    orderNotifications: true,
    defaultScreen: 'dashboard',
    density: 'comfortable',
    quickCash: false,
  });

  const {
    data: settingsData = null,
    isLoading: loadingSettings,
    refetch: refetchSettings,
  } = useSettings(restaurant?.id);
  const { invalidateSettings } = usePosMutations(restaurant?.id);

  // Synchronize persisted settings whenever query data updates
  useEffect(() => {
    if (settingsData && settingsData.settings) {
      setServerSettings(settingsData);
      const st = settingsData.settings;

      // Populate User Personal Preferences
      if (st.user) {
        setUserPrefForm((prev) => ({ ...prev, ...st.user }));
      }

      // Populate Platform Settings
      if (st.platform) {
        setPlatformForm({
          ...(st.platform.platform_general || {}),
          ...(st.platform.platform_system || {}),
        });
      }

      // Populate Restaurant Settings
      if (st.restaurant) {
        if (st.restaurant.profile) {
          setRestForm({
            name: st.restaurant.profile.name || '',
            address: st.restaurant.profile.address || '',
            phone: st.restaurant.profile.phone || '',
            email: st.restaurant.profile.email || '',
            currency: normalizeCurrencyToCode(st.restaurant.profile.currency || 'INR'),
            taxRate: st.restaurant.profile.taxRate ?? 5,
          });
        }
        if (st.restaurant.operations || st.restaurant.billing) {
          setOperationsForm({
            ...(st.restaurant.operations || {}),
            ...(st.restaurant.billing || {}),
          });
        }
        if (st.restaurant.kitchen) {
          setKitchenPolicyForm((prev) => ({ ...prev, ...st.restaurant.kitchen }));
        }
        if (st.restaurant.inventory) {
          setInventoryPolicyForm((prev) => ({ ...prev, ...st.restaurant.inventory }));
        }
      }
      setLoading(false);
    } else if (!loadingSettings) {
      setLoading(false);
    }
  }, [settingsData, loadingSettings]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
    if (restaurant) {
      setRestForm((prev) => ({
        ...prev,
        name: restaurant.name || prev.name,
        address: restaurant.address || prev.address,
        phone: restaurant.phone || prev.phone,
        email: restaurant.email || prev.email,
        currency: normalizeCurrencyToCode(restaurant.currency || prev.currency),
        taxRate: restaurant.taxRate !== undefined ? Number(restaurant.taxRate) : prev.taxRate,
      }));
    }
  }, [user, restaurant]);

  const fetchAllSettings = async () => {
    await refetchSettings();
  };

  // Handle Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      addToast('Name is required', 'warning');
      return;
    }

    setSavingSection('profile');
    try {
      const res = await posService.auth.updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim() || undefined,
        phone: profileForm.phone.trim() || undefined,
      });

      if (res.success && res.data) {
        if (setUser) setUser((prev) => ({ ...prev, ...res.data }));
        addToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  // Handle Password Save
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      addToast('Please enter your current password', 'warning');
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      addToast('New password must be at least 6 characters long', 'warning');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('New passwords do not match', 'warning');
      return;
    }

    setSavingSection('security');
    try {
      const res = await posService.auth.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res.success) {
        addToast('Password changed successfully!', 'success');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      }
    } catch (err) {
      addToast(err.message || 'Failed to change password. Verify your current password.', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  // Handle Restaurant Profile Save
  const handleSaveRestaurantProfile = async (e) => {
    e.preventDefault();
    if (!restForm.name.trim()) {
      addToast('Restaurant name is required', 'warning');
      return;
    }

    setSavingSection('restaurant');
    try {
      const payload = {
        name: restForm.name.trim(),
        address: restForm.address.trim() || undefined,
        phone: restForm.phone.trim() || undefined,
        email: restForm.email.trim() || undefined,
        currency: normalizeCurrencyToCode(restForm.currency),
        taxRate: Number(restForm.taxRate),
      };

      const restId = restaurant?.id || user?.restaurantId;
      if (restId) {
        const [updateRes] = await Promise.all([
          posService.restaurant.update(restId, payload),
          posService.settings.update('RESTAURANT', 'restaurant_profile', payload).catch(() => null),
        ]);

        if (updateRes.success && updateRes.data) {
          if (setRestaurant) setRestaurant(updateRes.data);
          addToast('Restaurant brand & profile saved successfully!', 'success');
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to update restaurant settings', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  // Handle Operations & Billing Policy Save
  const handleSaveOperations = async (e) => {
    e.preventDefault();
    setSavingSection('operations');
    try {
      const opsPayload = {
        serviceChargeRate: Number(operationsForm.serviceChargeRate) || 0,
        gstNumber: operationsForm.gstNumber.trim(),
        autoPrintReceipt: Boolean(operationsForm.autoPrintReceipt),
        orderHoldTimeoutMinutes: Number(operationsForm.orderHoldTimeoutMinutes) || 30,
        enableTableOrdering: Boolean(operationsForm.enableTableOrdering),
      };

      const billPayload = {
        invoicePrefix: operationsForm.invoicePrefix.trim() || 'INV-',
        defaultPaymentMethod: operationsForm.defaultPaymentMethod,
        roundOffTotal: Boolean(operationsForm.roundOffTotal),
        footerMessage: operationsForm.footerMessage.trim(),
      };

      await Promise.all([
        posService.settings.update('RESTAURANT', 'restaurant_operations', opsPayload),
        posService.settings.update('RESTAURANT', 'restaurant_billing', billPayload),
      ]);

      addToast('Restaurant operational and billing policies saved!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save operational settings', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  // Handle Kitchen Policy Save
  const handleSaveKitchenPolicy = async (e) => {
    e.preventDefault();
    setSavingSection('kitchen');
    try {
      await posService.settings.update('RESTAURANT', 'restaurant_kitchen', kitchenPolicyForm);
      addToast('Kitchen production and KDS policy saved!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save kitchen policy', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  // Handle Inventory Policy Save
  const handleSaveInventoryPolicy = async (e) => {
    e.preventDefault();
    const threshold = Number(inventoryPolicyForm.lowStockThresholdDefault);
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 1000) {
      addToast('Default low-stock alert threshold must be between 1 and 1000', 'warning');
      return;
    }

    setSavingSection('inventory');
    try {
      const payload = {
        autoDeductOnPreparation: Boolean(inventoryPolicyForm.autoDeductOnPreparation),
        lowStockThresholdDefault: threshold,
        notifyLowStockOnLogin: Boolean(inventoryPolicyForm.notifyLowStockOnLogin),
      };
      await posService.settings.update('RESTAURANT', 'restaurant_inventory', payload);
      await refetchSettings();
      addToast('Inventory tracking and deduction policies saved!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save inventory policy', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  // Handle Platform Governance Save (Super Admin)
  const handleSavePlatform = async (e) => {
    e.preventDefault();
    setSavingSection('platform');
    try {
      const generalPayload = {
        platformName: platformForm.platformName.trim(),
        supportEmail: platformForm.supportEmail.trim(),
        supportPhone: platformForm.supportPhone.trim(),
        maintenanceMode: Boolean(platformForm.maintenanceMode),
        allowNewRegistrations: Boolean(platformForm.allowNewRegistrations),
        defaultPlanDurationDays: Number(platformForm.defaultPlanDurationDays) || 365,
      };

      const systemPayload = {
        sessionTimeoutMinutes: Number(platformForm.sessionTimeoutMinutes) || 120,
        auditLogging: Boolean(platformForm.auditLogging),
      };

      await Promise.all([
        posService.settings.update('PLATFORM', 'platform_general', generalPayload),
        posService.settings.update('PLATFORM', 'platform_system', systemPayload),
      ]);

      addToast('Platform governance and security parameters saved!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save platform settings', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  // Handle Personal Station Preferences Save
  const handleSaveUserPreferences = async (e) => {
    e.preventDefault();
    setSavingSection('preferences');
    try {
      await posService.settings.update('USER', 'user_preferences', userPrefForm);
      localStorage.setItem('pos_preferences', JSON.stringify(userPrefForm));
      addToast('Your personal station preferences were persisted to the database!', 'success');
    } catch {
      localStorage.setItem('pos_preferences', JSON.stringify(userPrefForm));
      addToast('Preferences saved locally to this station.', 'info');
    } finally {
      setSavingSection(null);
    }
  };

  // Build role-scoped tab list
  const getTabsForRole = () => {
    if (role === 'RESTAURANT_REGISTRATION_ADMIN') {
      return [
        { id: 'profile', label: 'Super Admin Profile', icon: User },
        { id: 'security', label: 'Security & Password', icon: Lock },
        { id: 'platform', label: 'Platform Governance', icon: Server },
        { id: 'preferences', label: 'Station Preferences', icon: Sliders },
      ];
    }

    if (role === 'RESTAURANT_OWNER') {
      return [
        { id: 'profile', label: 'Admin Profile', icon: User },
        { id: 'restaurant', label: 'Restaurant Brand & Info', icon: Building2 },
        { id: 'operations', label: 'Operations & Billing', icon: Receipt },
        { id: 'kitchen', label: 'Kitchen & KDS Rules', icon: ChefHat },
        { id: 'inventory', label: 'Inventory Policies', icon: Boxes },
        { id: 'security', label: 'Security & Password', icon: Lock },
        { id: 'preferences', label: 'Station Preferences', icon: Sliders },
      ];
    }

    if (role === 'KITCHEN_ADMIN') {
      return [
        { id: 'profile', label: 'Chef Profile', icon: User },
        { id: 'security', label: 'Security & Password', icon: Lock },
        { id: 'kitchen_view', label: 'Kitchen Display (KDS)', icon: ChefHat },
        { id: 'preferences', label: 'Station Preferences', icon: Sliders },
      ];
    }

    if (role === 'WAITER') {
      return [
        { id: 'profile', label: 'Staff Profile', icon: User },
        { id: 'security', label: 'Security & Password', icon: Lock },
        { id: 'waiter_view', label: 'Service Terminal', icon: Sliders },
        { id: 'preferences', label: 'Station Preferences', icon: Volume2 },
      ];
    }

    if (role === 'RECEPTIONIST') {
      return [
        { id: 'profile', label: 'Cashier Profile', icon: User },
        { id: 'security', label: 'Security & Password', icon: Lock },
        { id: 'cashier_view', label: 'Billing Terminal', icon: Receipt },
        { id: 'preferences', label: 'Station Preferences', icon: Sliders },
      ];
    }

    return [
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'security', label: 'Security', icon: Lock },
      { id: 'preferences', label: 'Preferences', icon: Sliders },
    ];
  };

  const tabs = getTabsForRole();

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onTabChange) onTabChange(tabId);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] p-5 sm:p-6 rounded-2xl shadow-editorial">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#173F36]/10 dark:bg-[#173F36]/30 border border-[#173F36]/20 flex items-center justify-center text-[#173F36] dark:text-[#9FB29E] shrink-0 shadow-sm">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight">
                {role === 'RESTAURANT_REGISTRATION_ADMIN'
                  ? 'Platform Governance & SaaS Settings'
                  : role === 'RESTAURANT_OWNER'
                    ? 'Restaurant Administration & Policy Settings'
                    : 'Station Preferences & Account Settings'}
              </h1>
              <Badge variant="success" size="sm">
                <ShieldCheck className="w-3 h-3 mr-1" />
                <span>Real-Time Database Persistence</span>
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#657168] dark:text-[#9FB29E] mt-0.5 font-sans">
              Dynamic, persistent settings engine synchronized with PostgreSQL database tables across tenant, platform, and user scopes.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={fetchAllSettings}
          disabled={loading}
          icon={RefreshCw}
          loading={loading}
          title="Reload Settings from Database"
        >
          Reload
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-[#E4DCD0] dark:border-[#1E362E] pb-3 overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36] ${
                isActive
                  ? 'bg-[#173F36] text-white shadow-editorial font-bold'
                  : 'bg-[#FFFDF9] dark:bg-[#152320] text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#F7EFE4] dark:hover:bg-[#1E362E] border border-[#E4DCD0] dark:border-[#1E362E]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: PROFILE (All Roles) */}
      {activeTab === 'profile' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <User className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>User Account Profile</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              Personal credentials and contact information for your authenticated session
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Contact Phone</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#657168] dark:placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                placeholder="+91 9876543210"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'profile'}
              >
                {savingSection === 'profile' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Save Profile Changes</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: SECURITY & PASSWORD (All Roles) */}
      {activeTab === 'security' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Security & Password Protection</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              Ensure your account is protected with a secure password of at least 6 characters
            </p>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E4DCD0]/40 dark:hover:bg-[#1E362E]/50 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#173F36]/30 dark:focus:ring-[#9FB29E]/30"
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">New Password *</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E4DCD0]/40 dark:hover:bg-[#1E362E]/50 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#173F36]/30 dark:focus:ring-[#9FB29E]/30"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Confirm New Password *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                  placeholder="Repeat new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E4DCD0]/40 dark:hover:bg-[#1E362E]/50 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#173F36]/30 dark:focus:ring-[#9FB29E]/30"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'security'}
              >
                {savingSection === 'security' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Update Password</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: RESTAURANT BRAND & INFO (Owner Only) */}
      {activeTab === 'restaurant' && role === 'RESTAURANT_OWNER' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Restaurant Brand & Business Identity</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              Legal establishment details printed on customer invoices, receipts, and KDS tickets
            </p>
          </div>

          <form onSubmit={handleSaveRestaurantProfile} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Restaurant Brand Name *</label>
              <input
                type="text"
                required
                value={restForm.name}
                onChange={(e) => setRestForm({ ...restForm, name: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] font-semibold transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Physical Address / City</label>
              <input
                type="text"
                value={restForm.address}
                onChange={(e) => setRestForm({ ...restForm, address: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                placeholder="104 MG Road, Indiranagar, Bangalore"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Official Phone</label>
                <input
                  type="text"
                  value={restForm.phone}
                  onChange={(e) => setRestForm({ ...restForm, phone: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                  placeholder="+91 80 12345678"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Billing Email</label>
                <input
                  type="email"
                  value={restForm.email}
                  onChange={(e) => setRestForm({ ...restForm, email: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                  placeholder="billing@restaurant.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Currency Code *</label>
                <select
                  value={normalizeCurrencyToCode(restForm.currency)}
                  onChange={(e) => setRestForm({ ...restForm, currency: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] font-mono transition-all"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                </select>
                <span className="text-[10px] text-[#657168] dark:text-[#9FB29E] mt-1 block">3-letter standard ISO currency code</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Default Tax / GST (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={restForm.taxRate}
                  onChange={(e) => setRestForm({ ...restForm, taxRate: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] font-mono tabular-nums transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'restaurant'}
              >
                {savingSection === 'restaurant' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Save Restaurant Brand Info</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: OPERATIONS & BILLING (Owner Only) */}
      {activeTab === 'operations' && role === 'RESTAURANT_OWNER' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Operational & Billing Policies</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              Fine-tune invoice generation, receipt printing, service charges, and customer billing rules
            </p>
          </div>

          <form onSubmit={handleSaveOperations} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Invoice Prefix</label>
                <input
                  type="text"
                  value={operationsForm.invoicePrefix}
                  onChange={(e) => setOperationsForm({ ...operationsForm, invoicePrefix: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                  placeholder="INV-"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">GST / Tax Identification</label>
                <input
                  type="text"
                  value={operationsForm.gstNumber}
                  onChange={(e) => setOperationsForm({ ...operationsForm, gstNumber: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                  placeholder="29AAAAA0000A1Z5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Service Charge Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={operationsForm.serviceChargeRate}
                  onChange={(e) => setOperationsForm({ ...operationsForm, serviceChargeRate: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Default Tender Method</label>
                <select
                  value={operationsForm.defaultPaymentMethod}
                  onChange={(e) => setOperationsForm({ ...operationsForm, defaultPaymentMethod: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="CARD">Credit / Debit Card</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Receipt Footer Message</label>
              <input
                type="text"
                value={operationsForm.footerMessage}
                onChange={(e) => setOperationsForm({ ...operationsForm, footerMessage: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                placeholder="Thank you! Please visit again."
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={operationsForm.autoPrintReceipt}
                  onChange={(e) => setOperationsForm({ ...operationsForm, autoPrintReceipt: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Auto-Trigger Thermal Receipt Printing</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Instantly launch print dialog upon cashier bill settlement</div>
                </div>
              </label>

              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={operationsForm.roundOffTotal}
                  onChange={(e) => setOperationsForm({ ...operationsForm, roundOffTotal: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Round Off Final Invoice Payable Amount</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Rounds to nearest currency whole number for cash convenience</div>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'operations'}
              >
                {savingSection === 'operations' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Save Billing & Operational Policies</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: KITCHEN & KDS RULES (Owner Only) */}
      {activeTab === 'kitchen' && role === 'RESTAURANT_OWNER' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Kitchen Display & Production Workflow Policies</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              Establishment-wide kitchen routing, ticket sound indicators, and preparation timers
            </p>
          </div>

          <form onSubmit={handleSaveKitchenPolicy} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">
                Preparation Warning Threshold (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={kitchenPolicyForm.alertCookingTimeMinutes}
                onChange={(e) =>
                  setKitchenPolicyForm({ ...kitchenPolicyForm, alertCookingTimeMinutes: Number(e.target.value) })
                }
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
              />
              <span className="text-[10px] text-[#657168] dark:text-[#9FB29E] mt-1 block">
                Tickets in preparation longer than this will flash amber on kitchen display
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={kitchenPolicyForm.autoAcceptOrders}
                  onChange={(e) =>
                    setKitchenPolicyForm({ ...kitchenPolicyForm, autoAcceptOrders: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Auto-Accept Incoming Orders to Kitchen Queue</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Bypasses manual order acceptance step by chef</div>
                </div>
              </label>

              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={kitchenPolicyForm.soundOnNewOrder}
                  onChange={(e) =>
                    setKitchenPolicyForm({ ...kitchenPolicyForm, soundOnNewOrder: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Chime on New Kitchen Ticket Arrival</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Audible notification on KDS screens when waiter submits an order</div>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'kitchen'}
              >
                {savingSection === 'kitchen' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Save Kitchen Workflow Rules</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: INVENTORY & WASTAGE POLICIES (Owner Only) */}
      {activeTab === 'inventory' && role === 'RESTAURANT_OWNER' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Inventory & Stock Depletion Policies</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              Control recipe Bill of Materials (BOM) inventory consumption and low-stock alert thresholds
            </p>
          </div>

          <form onSubmit={handleSaveInventoryPolicy} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">
                Default Low-Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={inventoryPolicyForm.lowStockThresholdDefault}
                onChange={(e) =>
                  setInventoryPolicyForm({
                    ...inventoryPolicyForm,
                    lowStockThresholdDefault: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
              />
              <span className="text-[10px] text-[#657168] dark:text-[#9FB29E] mt-1 block">
                Ingredients with stock below this level trigger amber badges on dashboard
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={inventoryPolicyForm.autoDeductOnPreparation}
                  onChange={(e) =>
                    setInventoryPolicyForm({
                      ...inventoryPolicyForm,
                      autoDeductOnPreparation: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Auto-Deduct Ingredients via Recipe BOM</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">
                    Automatically subtracts inventory items as soon as a dish order is marked READY or SERVED
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={inventoryPolicyForm.notifyLowStockOnLogin}
                  onChange={(e) =>
                    setInventoryPolicyForm({
                      ...inventoryPolicyForm,
                      notifyLowStockOnLogin: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Display Low-Stock Warning Banner at Login</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Alerts kitchen chefs and administrators upon signing in</div>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'inventory'}
              >
                {savingSection === 'inventory' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Save Stock Policies</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: PLATFORM GOVERNANCE (Super Admin Only) */}
      {activeTab === 'platform' && role === 'RESTAURANT_REGISTRATION_ADMIN' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <Server className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Platform Governance & Multi-Tenant SaaS Controls</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              System-wide platform parameters for customer onboarding, session controls, and platform support
            </p>
          </div>

          <form onSubmit={handleSavePlatform} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Platform Brand Name</label>
              <input
                type="text"
                value={platformForm.platformName}
                onChange={(e) => setPlatformForm({ ...platformForm, platformName: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Support Desk Email</label>
                <input
                  type="email"
                  value={platformForm.supportEmail}
                  onChange={(e) => setPlatformForm({ ...platformForm, supportEmail: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Support Hotline Phone</label>
                <input
                  type="text"
                  value={platformForm.supportPhone}
                  onChange={(e) => setPlatformForm({ ...platformForm, supportPhone: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">
                  Default Plan Duration (Days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="730"
                  value={platformForm.defaultPlanDurationDays}
                  onChange={(e) =>
                    setPlatformForm({ ...platformForm, defaultPlanDurationDays: Number(e.target.value) })
                  }
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">
                  Session Inactivity Timeout (Mins)
                </label>
                <input
                  type="number"
                  min="15"
                  max="1440"
                  value={platformForm.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setPlatformForm({ ...platformForm, sessionTimeoutMinutes: Number(e.target.value) })
                  }
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] font-mono tabular-nums focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={platformForm.allowNewRegistrations}
                  onChange={(e) => setPlatformForm({ ...platformForm, allowNewRegistrations: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Enable Restaurant Self-Registration</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Allows new restaurant owners to sign up via public registration page</div>
                </div>
              </label>

              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={platformForm.maintenanceMode}
                  onChange={(e) => setPlatformForm({ ...platformForm, maintenanceMode: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Platform Maintenance Lock</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Prevents new POS orders during system maintenance windows</div>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'platform'}
              >
                {savingSection === 'platform' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Save Platform Governance</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: KITCHEN DISPLAY / CHEF STATION (Kitchen Admin Only) */}
      {activeTab === 'kitchen_view' && role === 'KITCHEN_ADMIN' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Kitchen Station Terminal Preferences</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              Personalized display density and audio alert settings for your kitchen station
            </p>
          </div>

          <form onSubmit={handleSaveUserPreferences} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Ticket Display Density</label>
              <select
                value={userPrefForm.density}
                onChange={(e) => setUserPrefForm({ ...userPrefForm, density: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
              >
                <option value="comfortable">Comfortable (Larger text, kitchen readability)</option>
                <option value="compact">Compact (Show more tickets simultaneously)</option>
              </select>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPrefForm.soundAlerts}
                  onChange={(e) => setUserPrefForm({ ...userPrefForm, soundAlerts: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Chime on Incoming Kitchen Tickets</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Plays an audio tone when a waiter submits a new ticket</div>
                </div>
              </label>

              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPrefForm.orderNotifications}
                  onChange={(e) => setUserPrefForm({ ...userPrefForm, orderNotifications: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Show Toast Alerts for Expedited Dishes</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Visual popup when priority orders are created</div>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'preferences'}
              >
                {savingSection === 'preferences' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Save Station Preferences</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: WAITER STATION TERMINAL (Waiter Only) */}
      {activeTab === 'waiter_view' && role === 'WAITER' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Waiter Service Station Preferences</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              Configure default order landing view and table alert indicators
            </p>
          </div>

          <form onSubmit={handleSaveUserPreferences} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Default Landing Screen</label>
              <select
                value={userPrefForm.defaultScreen}
                onChange={(e) => setUserPrefForm({ ...userPrefForm, defaultScreen: e.target.value })}
                className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
              >
                <option value="dashboard">Shift Overview Dashboard</option>
                <option value="tables">Floor Map & Table Grid</option>
                <option value="orders">Active Orders List</option>
              </select>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPrefForm.soundAlerts}
                  onChange={(e) => setUserPrefForm({ ...userPrefForm, soundAlerts: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Audio Alert on "Order Ready to Serve"</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Plays an audible alert when the kitchen marks your dish ready</div>
                </div>
              </label>

              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPrefForm.orderNotifications}
                  onChange={(e) => setUserPrefForm({ ...userPrefForm, orderNotifications: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Visual Popup Alerts</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Shows a green toast banner whenever kitchen prepares food</div>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'preferences'}
              >
                {savingSection === 'preferences' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Save Waiter Preferences</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: CASHIER TERMINAL (Receptionist Only) */}
      {activeTab === 'cashier_view' && role === 'RECEPTIONIST' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Cashier Terminal Preferences</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              Payment tender presets, quick denominations, and thermal printing preferences
            </p>
          </div>

          <form onSubmit={handleSaveUserPreferences} className="space-y-4 max-w-xl">
            <div className="space-y-3">
              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPrefForm.quickCash}
                  onChange={(e) => setUserPrefForm({ ...userPrefForm, quickCash: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Enable Quick-Cash Tender Shortcut Pills</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Shows instant ₹100, ₹500, ₹2000 cash buttons during bill payment</div>
                </div>
              </label>

              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPrefForm.soundAlerts}
                  onChange={(e) => setUserPrefForm({ ...userPrefForm, soundAlerts: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Payment Settlement Confirmation Chime</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Plays an audio feedback tone upon successful transaction recording</div>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'preferences'}
              >
                {savingSection === 'preferences' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Save Cashier Preferences</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: GENERAL STATION PREFERENCES (All Roles) */}
      {activeTab === 'preferences' && (
        <div className="bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 shadow-editorial space-y-6">
          <div className="border-b border-[#E4DCD0] dark:border-[#1E362E] pb-4">
            <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#173F36] dark:text-[#9FB29E]" />
              <span>Personal Station & UI Preferences</span>
            </h3>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1">
              These settings belong exclusively to your user account and persist across terminal sessions
            </p>
          </div>

          <form onSubmit={handleSaveUserPreferences} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Color Theme</label>
                <select
                  value={userPrefForm.theme}
                  onChange={(e) => setUserPrefForm({ ...userPrefForm, theme: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                >
                  <option value="sandstone">Editorial Warm Ivory (Default)</option>
                  <option value="dark">Editorial Deep Forest Dark</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] mb-1.5">Layout Density</label>
                <select
                  value={userPrefForm.density}
                  onChange={(e) => setUserPrefForm({ ...userPrefForm, density: e.target.value })}
                  className="w-full bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] rounded-xl px-3.5 py-2.5 text-xs text-[#17251F] dark:text-[#F7EFE4] focus:outline-none focus:border-[#173F36] dark:focus:border-[#9FB29E] focus:ring-1 focus:ring-[#173F36] transition-all"
                >
                  <option value="comfortable">Comfortable Touch (Default)</option>
                  <option value="compact">Compact High-Density</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPrefForm.soundAlerts}
                  onChange={(e) => setUserPrefForm({ ...userPrefForm, soundAlerts: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Audio Sound Cues</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Play pleasant sound chimes on successful operations</div>
                </div>
              </label>

              <label className="flex items-center gap-3 bg-[#F7EFE4]/60 dark:bg-[#1E362E]/40 border border-[#E4DCD0] dark:border-[#1E362E] p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPrefForm.orderNotifications}
                  onChange={(e) => setUserPrefForm({ ...userPrefForm, orderNotifications: e.target.checked })}
                  className="w-4 h-4 rounded text-[#173F36] focus:ring-[#173F36] bg-[#FFFDF9] dark:bg-[#152320] border-[#E4DCD0] dark:border-[#1E362E]"
                />
                <div>
                  <div className="text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4]">Interactive Toast Notifications</div>
                  <div className="text-[11px] text-[#657168] dark:text-[#9FB29E]">Display popup alerts when actions complete</div>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={savingSection === 'preferences'}
              >
                {savingSection === 'preferences' ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                <span>Persist Preferences to Database</span>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
