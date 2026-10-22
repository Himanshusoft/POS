import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  ReceiptText,
  UtensilsCrossed,
  Boxes,
  Users,
  Settings,
  ClipboardList,
  BookOpen,
  X,
  User,
  LogOut,
  ChevronUp,
} from 'lucide-react';

const ROLE_DISPLAY_NAMES = {
  RESTAURANT_REGISTRATION_ADMIN: 'Platform Super Admin',
  RESTAURANT_OWNER: 'Restaurant Admin',
  KITCHEN_ADMIN: 'Kitchen Chef',
  WAITER: 'Waiter',
  RECEPTIONIST: 'Reception / Cashier',
};

export default function Sidebar({
  activeTab,
  setActiveTab,
  navigateToSettings,
  collapsed = false,
  setCollapsed,
  toggleSidebar,
  mobileOpen = false,
  setMobileOpen,
}) {
  const { role, user, logout, loggingOut } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Navigation specifically structured per role requirements
  const getNavigationForRole = () => {
    if (role === 'RESTAURANT_REGISTRATION_ADMIN') {
      return [
        {
          id: 'registration',
          label: 'Platform Governance',
          icon: Building2,
          badge: 'Super Admin',
        },
        {
          id: 'settings',
          label: 'Platform Settings',
          icon: Settings,
        },
      ];
    }

    if (role === 'RESTAURANT_OWNER') {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: 'Overview',
        },
        {
          id: 'staff',
          label: 'Manage Staff',
          icon: Users,
        },
        {
          id: 'menu',
          label: 'Menu Selection',
          icon: UtensilsCrossed,
        },
        {
          id: 'tables',
          label: 'Table Management',
          icon: LayoutGrid,
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Boxes,
        },
        {
          id: 'billing',
          label: 'Billing & Payments',
          icon: ReceiptText,
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
        },
      ];
    }

    if (role === 'WAITER') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'Live' },
        { id: 'tables', label: 'Tables', icon: LayoutGrid },
        { id: 'orders', label: 'Orders', icon: ClipboardList },
        { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    if (role === 'KITCHEN_ADMIN') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'Live' },
        { id: 'orders', label: 'Orders', icon: ClipboardList },
        { id: 'inventory', label: 'Inventory', icon: Boxes },
        { id: 'recipes', label: 'Recipes', icon: BookOpen },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    if (role === 'RECEPTIONIST') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'billing', label: 'Billing & Cashier', icon: ReceiptText },
        { id: 'floor', label: 'Floor & Tables', icon: LayoutGrid },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    return [];
  };

  const allowedItems = getNavigationForRole();

  const handleItemClick = (id) => {
    if (id === 'settings' && navigateToSettings) {
      navigateToSettings('profile');
    } else {
      setActiveTab(id);
    }
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const roleLabel = ROLE_DISPLAY_NAMES[role] || role || 'Staff Member';
  const userName = user?.name || user?.username || 'Staff User';
  const userEmail = user?.email || '';
  const avatarInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  const renderNavContent = (isMobileDrawer = false) => {
    const isIconOnly = collapsed && !isMobileDrawer;

    return (
      <div className="flex flex-col h-full select-none bg-[#FFFDF9] dark:bg-[#0E1815] transition-colors duration-200">
        <div className="py-4 px-3 space-y-1.5 flex-1 overflow-y-auto">
          {/* Mobile Drawer Close Header */}
          {isMobileDrawer && (
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E4DCD0] dark:border-[#233630] px-2">
              <span className="font-serif text-sm font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-wider">Navigation Menu</span>
              <button
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className="p-1 rounded-lg text-[#657168] dark:text-[#9FB29E] hover:text-[#173F36] dark:hover:text-[#F7EFE4] hover:bg-[#E8EFEA] dark:hover:bg-[#1A2B26] cursor-pointer transition-colors"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Section Header */}
          {!isIconOnly && (
            <div className="px-3 pb-2 text-[10.5px] font-bold text-[#8D9890] dark:text-[#657168] uppercase tracking-widest flex items-center justify-between">
              <span>Operations</span>
            </div>
          )}

          {/* Navigation Items */}
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                title={isIconOnly ? item.label : undefined}
                className={`w-full flex items-center rounded-xl font-semibold text-sm transition-all duration-200 group cursor-pointer relative ${
                  isIconOnly ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#173F36] text-[#FFFDF9] shadow-sm shadow-[#173F36]/20 font-bold'
                    : 'text-[#55635B] dark:text-[#9FB29E] hover:text-[#173F36] dark:hover:text-[#F7EFE4] hover:bg-[#F3ECE0] dark:hover:bg-[#1A2B26]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-[#FFFDF9]' : 'text-[#657168] dark:text-[#9FB29E] group-hover:text-[#173F36] dark:group-hover:text-[#4EBA87]'
                    }`}
                  />
                  {!isIconOnly && <span className="truncate whitespace-nowrap">{item.label}</span>}
                </div>
                {!isIconOnly && item.badge && (
                  <span
                    className={`text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ml-2 tracking-wider whitespace-nowrap ${
                      isActive
                        ? 'bg-[#12332C] text-[#E8EFEA] border border-[#235A4D]'
                        : 'bg-[#E8EFEA] dark:bg-[#1A2B26] text-[#173F36] dark:text-[#4EBA87] border border-[#C8DDD2] dark:border-[#233630]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Role Profile Footer at Sidebar Bottom */}
        <div
          ref={profileMenuRef}
          className="relative mt-auto border-t border-[#E4DCD0] dark:border-[#233630] p-2.5 bg-[#FFFDF9] dark:bg-[#0E1815] shrink-0"
        >
          {/* Upward Interactive Dropdown Menu */}
          {profileDropdownOpen && (
            <div
              className={`absolute mb-2 bg-[#FFFDF9] dark:bg-[#14221E] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl shadow-editorial-lg p-2 z-50 animate-scale-in ${
                isIconOnly
                  ? 'bottom-0 left-full ml-2 w-64'
                  : 'bottom-full left-2 right-2'
              }`}
              role="menu"
            >
              {/* Profile Card Header */}
              <div className="p-2.5 bg-[#F7EFE4] dark:bg-[#111D1A] rounded-xl border border-[#E4DCD0] dark:border-[#233630] mb-2">
                <div className="font-bold text-[#17251F] dark:text-[#F7EFE4] text-xs truncate">
                  {userName}
                </div>
                <div className="text-[11px] text-[#657168] dark:text-[#9FB29E] truncate mt-0.5">
                  {userEmail || 'staff@pos.com'}
                </div>
                <div className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E8EFEA] dark:bg-[#1A2B26] text-[#173F36] dark:text-[#4EBA87] border border-[#C8DDD2] dark:border-[#233630]">
                  {roleLabel}
                </div>
              </div>

              {/* Menu Items: Cleanly contains only Sign Out */}
              <div className="pt-0.5">
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={async () => {
                    setProfileDropdownOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#C53030] dark:text-[#F87171] hover:bg-[#FDF0ED] dark:hover:bg-[#361A1A] transition-colors cursor-pointer text-left disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Trigger Button */}
          {isIconOnly ? (
            <button
              type="button"
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-center p-1 rounded-xl hover:bg-[#F4ECE0] dark:hover:bg-[#1A2B26] transition-all cursor-pointer group"
              title={`${userName} • ${roleLabel}`}
              aria-label={`${userName} (${roleLabel}) Account Menu`}
              aria-expanded={profileDropdownOpen}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8EFEA] to-[#D0DDD0] dark:from-[#1A2B26] dark:to-[#14221E] border border-[#173F36]/20 dark:border-[#233630] flex items-center justify-center font-bold text-[#173F36] dark:text-[#4EBA87] text-sm shadow-xs group-hover:scale-105 transition-transform">
                {avatarInitial}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#F4ECE0] dark:hover:bg-[#1A2B26] border border-transparent hover:border-[#E4DCD0] dark:border-[#233630] transition-all cursor-pointer group text-left"
              aria-label="User Account Menu"
              aria-expanded={profileDropdownOpen}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8EFEA] to-[#D0DDD0] dark:from-[#1A2B26] dark:to-[#14221E] border border-[#173F36]/20 dark:border-[#233630] flex items-center justify-center font-bold text-[#173F36] dark:text-[#4EBA87] text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  {avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] truncate leading-tight">
                    {userName}
                  </div>
                  <div className="text-[10.5px] font-medium text-[#657168] dark:text-[#9FB29E] truncate leading-tight mt-0.5">
                    {roleLabel}
                  </div>
                </div>
              </div>
              <ChevronUp
                className={`w-3.5 h-3.5 text-[#657168] dark:text-[#9FB29E] shrink-0 ml-1 transition-transform duration-200 ${
                  profileDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar Container */}
      <aside
        className={`hidden lg:flex flex-col bg-[#FFFDF9] dark:bg-[#0E1815] border-r border-[#E4DCD0] dark:border-[#233630] shrink-0 transition-all duration-300 ease-in-out shadow-[1px_0_4px_0_rgba(23,63,54,0.03)] dark:shadow-none ${
          collapsed
            ? 'w-20'
            : role === 'RESTAURANT_REGISTRATION_ADMIN'
              ? 'w-72'
              : 'w-64'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Subtle Warm Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen && setMobileOpen(false)}
          />

          {/* Sliding Drawer Container */}
          <div className="fixed inset-y-0 left-0 w-72 bg-[#FFFDF9] dark:bg-[#0E1815] border-r border-[#E4DCD0] dark:border-[#233630] shadow-2xl z-50 animate-slide-up">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
