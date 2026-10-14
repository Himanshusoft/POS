import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
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
      <div className="flex flex-col h-full select-none bg-white dark:bg-[#161310] transition-colors duration-200">
        <div className="py-4 px-3 space-y-1 flex-1 overflow-y-auto">
          {/* Mobile Drawer Close Header */}
          {isMobileDrawer && (
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E5D8C6] dark:border-[#382F26] px-2">
              <span className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC] uppercase tracking-wider">Navigation Menu</span>
              <button
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className="p-1 rounded-lg text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201A] cursor-pointer transition-colors"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Section Header */}
          {!isIconOnly && (
            <div className="px-3 pb-2 text-[11px] font-bold text-[#6B6258] dark:text-[#8C7E72] uppercase tracking-wider flex items-center justify-between">
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
                    ? 'bg-[#92400E] text-white shadow-md shadow-[#92400E]/20 font-bold'
                    : 'text-[#4B5563] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#FAF7F2] dark:hover:bg-[#201C18]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-[#6B6258] dark:text-[#8C7E72] group-hover:text-[#92400E] dark:group-hover:text-[#D97706]'
                    }`}
                  />
                  {!isIconOnly && <span className="truncate whitespace-nowrap">{item.label}</span>}
                </div>
                {!isIconOnly && item.badge && (
                  <span
                    className={`text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ml-2 tracking-wider whitespace-nowrap ${
                      isActive
                        ? 'bg-[#78350F] text-[#FDE68A] border border-[#B45309]'
                        : 'bg-[#D97706]/10 dark:bg-[#D97706]/20 text-[#92400E] dark:text-[#D97706] border border-[#D97706]/20 dark:border-[#D97706]/35'
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
          className="relative mt-auto border-t border-[#E5D8C6] dark:border-[#382F26] p-2.5 bg-white dark:bg-[#161310] shrink-0"
        >
          {/* Upward Interactive Dropdown Menu */}
          {profileDropdownOpen && (
            <div
              className={`absolute mb-2 bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] rounded-2xl shadow-xl p-2 z-50 animate-scale-in ${
                isIconOnly
                  ? 'bottom-0 left-full ml-2 w-64'
                  : 'bottom-full left-2 right-2'
              }`}
              role="menu"
            >
              {/* Profile Card Header */}
              <div className="p-2.5 bg-[#FAF7F2] dark:bg-[#201C18] rounded-xl border border-[#E5D8C6] dark:border-[#382F26] mb-2">
                <div className="font-bold text-[#1F2937] dark:text-[#F7F3EC] text-xs truncate">
                  {userName}
                </div>
                <div className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] truncate mt-0.5">
                  {userEmail || 'staff@pos.com'}
                </div>
                <div className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#92400E]/10 dark:bg-[#92400E]/20 text-[#92400E] dark:text-[#D97706] border border-[#92400E]/20 dark:border-[#92400E]/40">
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left disabled:opacity-50"
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
              className="w-full flex items-center justify-center p-1 rounded-xl hover:bg-[#FAF7F2] dark:hover:bg-[#201C18] transition-all cursor-pointer group"
              title={`${userName} • ${roleLabel}`}
              aria-label={`${userName} (${roleLabel}) Account Menu`}
              aria-expanded={profileDropdownOpen}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FAF7F2] to-[#E7DCCB] dark:from-[#25201A] dark:to-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-center font-bold text-[#92400E] dark:text-[#D97706] text-sm shadow-xs group-hover:scale-105 transition-transform">
                {avatarInitial}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF7F2] dark:hover:bg-[#201C18] border border-transparent hover:border-[#E5D8C6] dark:border-[#382F26] transition-all cursor-pointer group text-left"
              aria-label="User Account Menu"
              aria-expanded={profileDropdownOpen}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FAF7F2] to-[#E7DCCB] dark:from-[#25201A] dark:to-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] flex items-center justify-center font-bold text-[#92400E] dark:text-[#D97706] text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  {avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC] truncate leading-tight">
                    {userName}
                  </div>
                  <div className="text-[10.5px] font-medium text-[#5B6470] dark:text-[#A89B8C] truncate leading-tight mt-0.5">
                    {roleLabel}
                  </div>
                </div>
              </div>
              <ChevronUp
                className={`w-3.5 h-3.5 text-[#5B6470] dark:text-[#A89B8C] shrink-0 ml-1 transition-transform duration-200 ${
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
        className={`hidden lg:flex flex-col bg-white dark:bg-[#161310] border-r border-[#E5D8C6] dark:border-[#382F26] shrink-0 transition-all duration-300 ease-in-out shadow-[1px_0_3px_0_rgba(41,35,31,0.02)] dark:shadow-none ${
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
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#161310] border-r border-[#E5D8C6] dark:border-[#382F26] shadow-2xl z-50 animate-slide-up">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
