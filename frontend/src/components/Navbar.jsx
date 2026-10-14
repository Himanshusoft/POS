import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationDropdown from './NotificationDropdown';
import {
  UtensilsCrossed,
  LogOut,
  Sparkles,
  User,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Sun,
  Moon
} from 'lucide-react';

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 rounded-xl transition-all duration-200 border cursor-pointer text-[#4B5563] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201A] border-[#E5D8C6] dark:border-[#382F26] bg-white dark:bg-[#1C1815] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E]"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle light or dark theme"
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#4B5563]" />}
    </button>
  );
}

export default function Navbar({
  activeTab,
  setActiveTab,
  navigateToSettings,
  sidebarCollapsed,
  toggleSidebar,
  mobileSidebarOpen,
  setMobileSidebarOpen,
}) {
  const { user, restaurant, logout, loggingOut, role } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const roleBadges = {
    RESTAURANT_REGISTRATION_ADMIN: {
      label: 'Platform Super Admin',
      color: 'bg-[#92400E]/10 dark:bg-[#92400E]/20 text-[#92400E] dark:text-[#D97706] border-[#92400E]/25 dark:border-[#92400E]/40',
      settingsLabel: 'Platform Settings',
      settingsSubTab: 'platform',
    },
    RESTAURANT_OWNER: {
      label: 'Restaurant Admin',
      color: 'bg-[#D97706]/10 dark:bg-[#D97706]/20 text-[#92400E] dark:text-[#D97706] border-[#D97706]/25 dark:border-[#D97706]/40',
      settingsLabel: 'Restaurant Settings',
      settingsSubTab: 'restaurant',
    },
    KITCHEN_ADMIN: {
      label: 'Kitchen Chef',
      color: 'bg-[#D97706]/10 dark:bg-[#D97706]/20 text-[#B45309] dark:text-[#FBBF24] border-[#D97706]/25 dark:border-[#D97706]/40',
      settingsLabel: 'Kitchen Preferences',
      settingsSubTab: 'kitchen_view',
    },
    WAITER: {
      label: 'Service Waiter',
      color: 'bg-[#2563EB]/10 dark:bg-[#2563EB]/20 text-[#2563EB] dark:text-[#60A5FA] border-[#2563EB]/25 dark:border-[#2563EB]/40',
      settingsLabel: 'Service Station Settings',
      settingsSubTab: 'waiter_view',
    },
    RECEPTIONIST: {
      label: 'Reception / Cashier',
      color: 'bg-[#16A34A]/10 dark:bg-[#16A34A]/20 text-[#16A34A] dark:text-[#34D399] border-[#16A34A]/25 dark:border-[#16A34A]/40',
      settingsLabel: 'Cashier Terminal Settings',
      settingsSubTab: 'cashier_view',
    },
  };

  const currentBadge = roleBadges[role] || {
    label: role,
    color: 'bg-[#FAF7F2] dark:bg-[#201C18] text-[#5B6470] dark:text-[#A89B8C] border-[#E5D8C6] dark:border-[#382F26]',
    settingsLabel: 'Preferences',
    settingsSubTab: 'preferences',
  };
  const planName = restaurant?.subscription?.plan?.name;

  const handleNavigate = (subTab = 'profile') => {
    if (navigateToSettings) {
      navigateToSettings(subTab);
    } else if (setActiveTab) {
      setActiveTab('settings');
    }
    setDropdownOpen(false);
  };

  return (
    <header className="h-16 bg-white/95 dark:bg-[#161310]/95 backdrop-blur-sm border-b border-[#E5D8C6] dark:border-[#382F26] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_0_rgba(41,35,31,0.04)] dark:shadow-none transition-colors duration-200">
      {/* Left: Brand & Sidebar Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          onClick={() => setMobileSidebarOpen && setMobileSidebarOpen((prev) => !prev)}
          className="lg:hidden p-2 rounded-xl text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201A] border border-[#E5D8C6] dark:border-[#382F26] transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-2 rounded-xl text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201A] border border-[#E5D8C6] dark:border-[#382F26] transition-colors cursor-pointer"
          title={sidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-[#92400E] dark:text-[#D97706]" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-[#5B6470] dark:text-[#A89B8C]" />
          )}
        </button>

        {/* Brand Icon & Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#92400E] to-[#D97706] flex items-center justify-center shadow-md shadow-[#92400E]/20 shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="font-bold text-[#1F2937] dark:text-[#F7F3EC] text-lg tracking-tight shrink-0">POS</span>
            {role === 'RESTAURANT_REGISTRATION_ADMIN' ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-[#E5D8C6] dark:bg-[#382F26] shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-[#5B6470] dark:text-[#A89B8C] truncate max-w-[120px] sm:max-w-none">
                  Platform Super Admin
                </span>
                <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-[#92400E]/10 dark:bg-[#92400E]/20 text-[#92400E] dark:text-[#D97706] border border-[#92400E]/25 dark:border-[#92400E]/40 shrink-0 shadow-xs">
                  SUPER ADMIN
                </span>
              </div>
            ) : (
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2">
                  {restaurant?.name && (
                    <span className="text-xs sm:text-sm font-semibold text-[#5B6470] dark:text-[#A89B8C] truncate max-w-[140px] sm:max-w-xs">
                      {restaurant.name}
                    </span>
                  )}
                  {planName && (
                    <span className="text-[10px] sm:text-[11px] bg-[#D97706]/10 dark:bg-[#D97706]/20 text-[#92400E] dark:text-[#D97706] font-bold px-2 py-0.5 rounded-full border border-[#D97706]/25 dark:border-[#D97706]/40 flex items-center gap-1 shrink-0">
                      <Sparkles className="w-3 h-3 text-[#D97706]" />
                      <span>{planName}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Notification Bell, Theme Toggle & Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* 1. Notification Bell */}
        <NotificationDropdown />

        {/* 2. Light / Dark Mode Toggle */}
        <ThemeToggle />

        {/* 3. User Card with Interactive Profile Dropdown */}
        <div className="relative pl-1 sm:pl-2 border-l border-[#E5D8C6] dark:border-[#382F26] shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="User Account Menu"
            className="flex items-center gap-2 sm:gap-2.5 p-1.5 rounded-xl hover:bg-[#F1E8DB] dark:hover:bg-[#25201A] transition-colors cursor-pointer text-left shrink-0"
            title="Account Menu"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-[#1F2937] dark:text-[#F7F3EC] leading-tight truncate max-w-[130px] lg:max-w-none">
                {user?.name || 'Staff User'}
              </div>
              <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border inline-block mt-0.5 ${currentBadge.color}`}>
                {currentBadge.label}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FAF7F2] to-[#E7DCCB] dark:from-[#25201A] dark:to-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-center font-bold text-[#92400E] dark:text-[#D97706] text-sm shadow-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#5B6470] dark:text-[#A89B8C] hidden sm:block shrink-0" />
          </button>

          {/* Floating Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl shadow-xl p-2 z-50 animate-scale-in">
              {/* User Identity Header */}
              <div className="p-3 bg-[#FAF7F2] dark:bg-[#201C18] rounded-xl border border-[#E5D8C6] dark:border-[#382F26] mb-2">
                <div className="font-semibold text-[#1F2937] dark:text-[#F7F3EC] text-sm truncate">{user?.name || 'Staff User'}</div>
                <div className="text-xs text-[#5B6470] dark:text-[#A89B8C] truncate">{user?.email || 'user@pos.com'}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${currentBadge.color}`}>
                    {currentBadge.label}
                  </span>
                  {restaurant?.name && (
                    <span className="text-[10px] text-[#5B6470] dark:text-[#A89B8C] font-medium truncate max-w-[120px]">
                      {restaurant.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Menu Items: Exactly 2 role-independent items */}
              <div className="space-y-1">
                {/* 1. My Profile & Account */}
                <button
                  onClick={() => handleNavigate('profile')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#1F2937] dark:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201A] transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#92400E] dark:text-[#D97706]" />
                  <span>My Profile & Account</span>
                </button>

                <div className="h-px bg-[#E5D8C6] dark:bg-[#382F26] my-1" />

                {/* 2. Sign Out */}
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={async () => {
                    setDropdownOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors text-left cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
