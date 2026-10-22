import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

// Navigation & Role Configuration
import {
  ROLES,
  normalizeRole,
  ROLE_CONFIG,
  resolveRoute,
  getPathForTab,
  getDefaultPathForRole,
  getDefaultTabForRole,
} from './config/navigation';

// Views
import LoginView from './views/LoginView';
import ForgotPasswordView from './views/ForgotPasswordView';
import RegistrationAdminDashboard from './views/RegistrationAdminDashboard';
import FloorMapView from './views/FloorMapView';
import TableManagementView from './views/TableManagementView';
import PosTerminalView from './views/PosTerminalView';
import KitchenDisplayView from './views/KitchenDisplayView';
import KitchenDashboardView from './views/KitchenDashboardView';
import KitchenOrdersView from './views/KitchenOrdersView';
import KitchenRecipesView from './views/KitchenRecipesView';
import WaiterDashboardView from './views/WaiterDashboardView';
import WaiterTablesView from './views/WaiterTablesView';
import WaiterOrdersView from './views/WaiterOrdersView';
import WaiterMenuView from './views/WaiterMenuView';
import BillingView from './views/BillingView';
import MenuView from './views/MenuView';
import InventoryView from './views/InventoryView';
import PurchasesView from './views/PurchasesView';
import ReportsView from './views/ReportsView';
import StaffView from './views/StaffView';
import SettingsView from './views/SettingsView';
import RestaurantAdminDashboardView from './views/RestaurantAdminDashboardView';
import ReceptionistDashboardView from './views/ReceptionistDashboardView';

import { UtensilsCrossed, RefreshCw, AlertCircle } from 'lucide-react';

function PosDashboard() {
  const { user, role, loading, addToast } = useAuth();

  // Resolve current route for initial state
  const initialResolution = useMemo(() => {
    return resolveRoute(window.location.pathname, role);
  }, [role]);

  const [activeTab, setActiveTab] = useState(initialResolution.tab);
  const [settingsSubTab, setSettingsSubTab] = useState(initialResolution.subTab || 'profile');
  const [selectedTable, setSelectedTable] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('pos_sidebar_collapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Standalone auth routing (/login, /forgot-password, /verify-otp, /reset-password)
  const [authRoute, setAuthRoute] = useState(() => {
    const p = window.location.pathname;
    if (p.includes('/forgot-password') || p.includes('/verify-otp') || p.includes('/reset-password')) {
      return p;
    }
    return '/login';
  });

  const navigateAuth = useCallback((path) => {
    setAuthRoute(path);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, []);

  // Direct transition callback upon successful login
  const handleLoginSuccess = useCallback((authResult) => {
    const userRole = normalizeRole(authResult?.role || authResult?.user?.role);
    const targetPath = authResult?.defaultPath || getDefaultPathForRole(userRole);
    const targetTab = getDefaultTabForRole(userRole);

    setActiveTab(targetTab);
    setSettingsSubTab('profile');

    if (window.location.pathname !== targetPath) {
      window.history.replaceState({ tab: targetTab, subTab: 'profile' }, '', targetPath);
    }
  }, []);

  // Centralized tab & route navigation function
  const navigateTab = useCallback(
    (tab, subTab = 'profile') => {
      const normalizedRole = normalizeRole(role);
      const roleCfg = ROLE_CONFIG[normalizedRole];

      // If tab is not allowed for role, fallback to default
      const targetTab = roleCfg?.allowedTabs?.includes(tab) ? tab : (roleCfg?.defaultTab || 'dashboard');
      const targetSubTab = targetTab === 'settings' ? subTab : 'profile';

      setActiveTab(targetTab);
      if (targetTab === 'settings') {
        setSettingsSubTab(targetSubTab);
      }

      // Compute canonical URL path
      const canonicalPath = targetTab === 'settings' && targetSubTab === 'profile'
        ? '/profile'
        : getPathForTab(targetTab, normalizedRole);

      if (window.location.pathname !== canonicalPath) {
        window.history.pushState({ tab: targetTab, subTab: targetSubTab }, '', canonicalPath);
      }
    },
    [role]
  );

  const navigateToSettings = useCallback(
    (subTab = 'profile') => {
      navigateTab('settings', subTab);
    },
    [navigateTab]
  );

  // Synchronize route and role whenever authentication or role changes
  useEffect(() => {
    if (loading) return;

    if (!user) {
      const p = window.location.pathname;
      if (p.includes('/forgot-password') || p.includes('/verify-otp') || p.includes('/reset-password')) {
        setAuthRoute(p);
      } else {
        setAuthRoute('/login');
        if (p !== '/login' && p !== '/') {
          window.history.replaceState(null, '', '/login');
        }
      }
      return;
    }

    // User is authenticated: resolve current browser path against role
    const resolution = resolveRoute(window.location.pathname, role);

    setActiveTab(resolution.tab);
    if (resolution.subTab) {
      setSettingsSubTab(resolution.subTab);
    }

    // If redirected due to role mismatch or root path, update browser URL
    if (window.location.pathname !== resolution.path) {
      window.history.replaceState({ tab: resolution.tab, subTab: resolution.subTab }, '', resolution.path);
    }

    if (!resolution.isAuthorized && resolution.warning) {
      addToast(resolution.warning, 'warning');
    }
  }, [user, role, loading, addToast]);

  // Handle browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;

      if (!user) {
        if (p.includes('/forgot-password') || p.includes('/verify-otp') || p.includes('/reset-password')) {
          setAuthRoute(p);
        } else {
          setAuthRoute('/login');
        }
        return;
      }

      const resolution = resolveRoute(p, role);
      setActiveTab(resolution.tab);
      if (resolution.subTab) {
        setSettingsSubTab(resolution.subTab);
      }

      if (p !== resolution.path) {
        window.history.replaceState(null, '', resolution.path);
      }

      if (!resolution.isAuthorized && resolution.warning) {
        addToast(resolution.warning, 'warning');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, role, addToast]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('pos_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Table and billing shortcuts
  const handleSelectTableForOrder = useCallback(
    (table) => {
      setSelectedTable(table);
      navigateTab('pos');
    },
    [navigateTab]
  );

  const handleNavigateToBilling = useCallback(
    (table) => {
      setSelectedTable(table);
      navigateTab('billing');
    },
    [navigateTab]
  );

  // 1. Loading Workspace State
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#F7EFE4] dark:bg-[#101A18] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#173F36] to-[#2D6A4F] flex items-center justify-center shadow-editorial-lg shadow-[#173F36]/20 animate-pulse">
          <UtensilsCrossed className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-[#657168] dark:text-[#9FB29E] text-sm font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-[#173F36] dark:text-[#9FB29E]" />
          <span>Loading your workspace...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!user) {
    const isForgotFlow =
      authRoute.includes('/forgot-password') ||
      authRoute.includes('/verify-otp') ||
      authRoute.includes('/reset-password');

    return (
      <>
        {isForgotFlow ? (
          <ForgotPasswordView
            onNavigateToLogin={() => navigateAuth('/login')}
            onNavigate={navigateAuth}
          />
        ) : (
          <LoginView
            onNavigateToForgotPassword={() => navigateAuth('/forgot-password')}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        <Toast />
      </>
    );
  }

  // 3. Render Main View Content with Safety Fallbacks
  const renderMainContent = () => {
    // Settings view is accessible to all authenticated roles
    if (activeTab === 'settings') {
      return <SettingsView initialTab={settingsSubTab} onTabChange={setSettingsSubTab} />;
    }

    // Platform Super Admin / Governance view
    if (role === ROLES.RESTAURANT_REGISTRATION_ADMIN) {
      if (activeTab === 'registration' || activeTab === 'dashboard' || activeTab === 'subscriptions') {
        return <RegistrationAdminDashboard setActiveTab={navigateTab} />;
      }
    }

    // Restaurant Owner Dashboard & Operational Views
    if (role === ROLES.RESTAURANT_OWNER) {
      if (activeTab === 'dashboard') {
        return <RestaurantAdminDashboardView setActiveTab={navigateTab} />;
      }
      if (activeTab === 'tables') {
        return (
          <TableManagementView
            onSelectTableForOrder={handleSelectTableForOrder}
            onNavigateToBilling={handleNavigateToBilling}
          />
        );
      }
      if (activeTab === 'floor') {
        return (
          <TableManagementView
            onSelectTableForOrder={handleSelectTableForOrder}
            onNavigateToBilling={handleNavigateToBilling}
          />
        );
      }
      if (activeTab === 'pos') {
        return (
          <PosTerminalView
            preSelectedTable={selectedTable}
            onOrderPlaced={() => {
              setSelectedTable(null);
              navigateTab('tables');
            }}
          />
        );
      }
      if (activeTab === 'kds') {
        return <KitchenDisplayView />;
      }
      if (activeTab === 'billing') {
        return <BillingView preSelectedTable={selectedTable} />;
      }
      if (activeTab === 'menu') {
        return <MenuView />;
      }
      if (activeTab === 'inventory') {
        return <InventoryView />;
      }
      if (activeTab === 'recipes') {
        return <KitchenRecipesView />;
      }
      if (activeTab === 'purchases') {
        return <PurchasesView />;
      }
      if (activeTab === 'reports') {
        return <ReportsView />;
      }
      if (activeTab === 'staff') {
        return <StaffView />;
      }
    }

    // Kitchen Admin Views
    if (role === ROLES.KITCHEN_ADMIN) {
      if (activeTab === 'dashboard') {
        return <KitchenDashboardView setActiveTab={navigateTab} />;
      }
      if (activeTab === 'orders') {
        return <KitchenOrdersView />;
      }
      if (activeTab === 'inventory') {
        return <InventoryView />;
      }
      if (activeTab === 'recipes') {
        return <KitchenRecipesView />;
      }
    }

    // Waiter Views
    if (role === ROLES.WAITER) {
      if (activeTab === 'dashboard') {
        return (
          <WaiterDashboardView
            setActiveTab={navigateTab}
            onSelectTableForOrder={handleSelectTableForOrder}
          />
        );
      }
      if (activeTab === 'tables') {
        return (
          <WaiterTablesView
            onSelectTableForOrder={handleSelectTableForOrder}
          />
        );
      }
      if (activeTab === 'orders') {
        return <WaiterOrdersView onSelectTableForOrder={handleSelectTableForOrder} />;
      }
      if (activeTab === 'menu') {
        return <WaiterMenuView />;
      }
      if (activeTab === 'pos') {
        return (
          <PosTerminalView
            preSelectedTable={selectedTable}
            onOrderPlaced={() => {
              setSelectedTable(null);
              navigateTab('tables');
            }}
          />
        );
      }
    }

    // Receptionist Views
    if (role === ROLES.RECEPTIONIST) {
      if (activeTab === 'dashboard') {
        return <ReceptionistDashboardView setActiveTab={navigateTab} />;
      }
      if (activeTab === 'billing') {
        return <BillingView preSelectedTable={selectedTable} />;
      }
      if (activeTab === 'floor') {
        return (
          <FloorMapView
            onSelectTableForOrder={handleSelectTableForOrder}
            onNavigateToBilling={handleNavigateToBilling}
          />
        );
      }
      if (activeTab === 'pos') {
        return (
          <PosTerminalView
            preSelectedTable={selectedTable}
            onOrderPlaced={() => {
              setSelectedTable(null);
              navigateTab('floor');
            }}
          />
        );
      }
    }

    // Fallback: If no view matched, render graceful fallback (NEVER a blank white screen!)
    const currentRoleCfg = ROLE_CONFIG[normalizeRole(role)];
    const fallbackTab = currentRoleCfg?.defaultTab || 'dashboard';

    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-2xl p-6 text-center shadow-editorial">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[#173F36] dark:text-[#9FB29E] flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-serif font-bold text-[#17251F] dark:text-[#F7EFE4]">Station Not Available</h3>
          <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-1.5 leading-relaxed">
            The requested view (<span className="font-semibold">{activeTab}</span>) is not available for your role.
          </p>
          <button
            type="button"
            onClick={() => navigateTab(fallbackTab)}
            className="mt-4 px-4 py-2 bg-[#173F36] hover:bg-[#12332C] text-white rounded-xl text-xs font-semibold transition shadow-editorial cursor-pointer"
          >
            Return to {currentRoleCfg?.name || 'Workspace'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F7EFE4] dark:bg-[#101A18] text-[#17251F] dark:text-[#F7EFE4] overflow-hidden font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateTab}
        navigateToSettings={navigateToSettings}
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={navigateTab}
          navigateToSettings={navigateToSettings}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto bg-[#F7EFE4] dark:bg-[#101A18] min-w-0">
          <ErrorBoundary onReset={() => navigateTab(ROLE_CONFIG[normalizeRole(role)]?.defaultTab || 'dashboard')}>
            {renderMainContent()}
          </ErrorBoundary>
        </main>
      </div>

      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <PosDashboard />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
