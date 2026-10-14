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
      className="p-2 rounded-xl transition-all duration-200 border cursor-pointer text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E8EFEA] dark:hover:bg-[#1A2B26] border-[#E4DCD0] dark:border-[#233630] bg-[#FFFDF9] dark:bg-[#14221E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#173F36]"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle light or dark theme"
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#173F36]" />}
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
      color: 'bg-[#E8EFEA] dark:bg-[#1A2B26] text-[#173F36] dark:text-[#4EBA87] border-[#C8DDD2] dark:border-[#233630]',
      settingsLabel: 'Platform Settings',
      settingsSubTab: 'platform',
    },
    RESTAURANT_OWNER: {
      label: 'Restaurant Admin',
      color: 'bg-[#E8EFEA] dark:bg-[#1A2B26] text-[#173F36] dark:text-[#4EBA87] border-[#C8DDD2] dark:border-[#233630]',
      settingsLabel: 'Restaurant Settings',
      settingsSubTab: 'restaurant',
    },
    KITCHEN_ADMIN: {
      label: 'Kitchen Chef',
      color: 'bg-[#FDF4E6] dark:bg-[#342414] text-[#9A5B13] dark:text-[#FBBF24] border-[#F6D8A8] dark:border-[#523B22]',
      settingsLabel: 'Kitchen Preferences',
      settingsSubTab: 'kitchen_view',
    },
    WAITER: {
      label: 'Service Waiter',
      color: 'bg-[#EAF2F0] dark:bg-[#172D28] text-[#1E5248] dark:text-[#5FA596] border-[#BED9D3] dark:border-[#2A4B43]',
      settingsLabel: 'Service Station Settings',
      settingsSubTab: 'waiter_view',
    },
    RECEPTIONIST: {
      label: 'Reception / Cashier',
      color: 'bg-[#E8F3ED] dark:bg-[#1B3629] text-[#2D6A4F] dark:text-[#4EBA87] border-[#B7DAC7] dark:border-[#2D5441]',
      settingsLabel: 'Cashier Terminal Settings',
      settingsSubTab: 'cashier_view',
    },
  };

  const currentBadge = roleBadges[role] || {
    label: role,
    color: 'bg-[#F4ECE1] dark:bg-[#1A2521] text-[#55635B] dark:text-[#A0ABA2] border-[#DDD3C5] dark:border-[#233630]',
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
    <header className="h-16 bg-[#FFFDF9]/95 dark:bg-[#0E1815]/95 backdrop-blur-sm border-b border-[#E4DCD0] dark:border-[#233630] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_0_rgba(23,63,54,0.03)] dark:shadow-none transition-colors duration-200">
      {/* Left: Brand & Sidebar Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          onClick={() => setMobileSidebarOpen && setMobileSidebarOpen((prev) => !prev)}
          className="lg:hidden p-2 rounded-xl text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E8EFEA] dark:hover:bg-[#1A2B26] border border-[#E4DCD0] dark:border-[#233630] transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-2 rounded-xl text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E8EFEA] dark:hover:bg-[#1A2B26] border border-[#E4DCD0] dark:border-[#233630] transition-colors cursor-pointer"
          title={sidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-[#173F36] dark:text-[#4EBA87]" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-[#657168] dark:text-[#9FB29E]" />
          )}
        </button>

        {/* Brand Icon & Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#173F36] flex items-center justify-center shadow-sm shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-[#FFFDF9]" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="font-serif font-bold text-[#173F36] dark:text-[#F7EFE4] text-xl tracking-tight shrink-0">POS</span>
            {role === 'RESTAURANT_REGISTRATION_ADMIN' ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-[#E4DCD0] dark:bg-[#233630] shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-[#657168] dark:text-[#9FB29E] truncate max-w-[120px] sm:max-w-none">
                  Platform Super Admin
                </span>
                <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-[#E8EFEA] dark:bg-[#1A2B26] text-[#173F36] dark:text-[#4EBA87] border border-[#C8DDD2] dark:border-[#233630] shrink-0 shadow-xs">
                  SUPER ADMIN
                </span>
              </div>
            ) : (
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2">
                  {restaurant?.name && (
                    <span className="text-xs sm:text-sm font-semibold text-[#657168] dark:text-[#9FB29E] truncate max-w-[140px] sm:max-w-xs">
                      {restaurant.name}
                    </span>
                  )}
                  {planName && (
                    <span className="text-[10px] sm:text-[11px] bg-[#E8EFEA] dark:bg-[#1A2B26] text-[#173F36] dark:text-[#4EBA87] font-bold px-2 py-0.5 rounded-full border border-[#C8DDD2] dark:border-[#233630] flex items-center gap-1 shrink-0">
                      <Sparkles className="w-3 h-3 text-[#173F36] dark:text-[#4EBA87]" />
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
        <div className="relative pl-1 sm:pl-2 border-l border-[#E4DCD0] dark:border-[#233630] shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="User Account Menu"
            className="flex items-center gap-2 sm:gap-2.5 p-1.5 rounded-xl hover:bg-[#F4ECE0] dark:hover:bg-[#1A2B26] transition-colors cursor-pointer text-left shrink-0"
            title="Account Menu"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-[#17251F] dark:text-[#F7EFE4] leading-tight truncate max-w-[130px] lg:max-w-none">
                {user?.name || 'Staff User'}
              </div>
              <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border inline-block mt-0.5 ${currentBadge.color}`}>
                {currentBadge.label}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8EFEA] to-[#D0DDD0] dark:from-[#1A2B26] dark:to-[#14221E] border border-[#173F36]/20 dark:border-[#233630] flex items-center justify-center font-bold text-[#173F36] dark:text-[#4EBA87] text-sm shadow-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#657168] dark:text-[#9FB29E] hidden sm:block shrink-0" />
          </button>

          {/* Floating Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#FFFDF9] dark:bg-[#14221E] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl shadow-editorial-lg p-2 z-50 animate-scale-in">
              {/* User Identity Header */}
              <div className="p-3 bg-[#F7EFE4] dark:bg-[#111D1A] rounded-xl border border-[#E4DCD0] dark:border-[#233630] mb-2">
                <div className="font-semibold text-[#17251F] dark:text-[#F7EFE4] text-sm truncate">{user?.name || 'Staff User'}</div>
                <div className="text-xs text-[#657168] dark:text-[#9FB29E] truncate">{user?.email || 'user@pos.com'}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${currentBadge.color}`}>
                    {currentBadge.label}
                  </span>
                  {restaurant?.name && (
                    <span className="text-[10px] text-[#657168] dark:text-[#9FB29E] font-medium truncate max-w-[120px]">
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#17251F] dark:text-[#F7EFE4] hover:bg-[#F3ECE0] dark:hover:bg-[#1A2B26] transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#173F36] dark:text-[#4EBA87]" />
                  <span>My Profile & Account</span>
                </button>

                <div className="h-px bg-[#E4DCD0] dark:bg-[#233630] my-1" />

                {/* 2. Sign Out */}
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={async () => {
                    setDropdownOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#C53030] dark:text-[#F87171] hover:bg-[#FDF0ED] dark:hover:bg-[#361A1A] transition-colors text-left cursor-pointer disabled:opacity-50"
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
