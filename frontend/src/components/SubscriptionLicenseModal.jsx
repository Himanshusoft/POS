import React, { useState, useMemo } from 'react';
import {
  Crown,
  Calendar,
  ShieldCheck,
  Check,
  Clock,
  Sparkles,
  X,
  Users,
  ChefHat,
  Receipt,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  LICENSE_OPTIONS,
  getLicenseOptionByYears,
  calculateLicenseExpiry,
} from '../config/license.config';

/**
 * Format a date nicely as "21 Oct 2026"
 */
function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SubscriptionLicenseModal({
  restaurant,
  plans = [],
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  if (!isOpen || !restaurant) return null;

  // Single plan enforcement: Find existing Basic Plan or use first active plan
  const basicPlan = useMemo(() => {
    return (
      plans.find((p) => p.id === restaurant.subscription?.planId) ||
      plans.find((p) => p.name?.toLowerCase().includes('basic')) ||
      plans[0] || {
        name: 'Basic Plan',
        price: 5000,
        maxWaiters: 10,
        maxKitchenAdmins: 2,
        maxReceptionists: 2,
      }
    );
  }, [plans, restaurant]);

  // Form state
  const [selectedYears, setSelectedYears] = useState(1);
  const [status, setStatus] = useState(restaurant.subscription?.status || 'ACTIVE');

  // Selected duration configuration
  const selectedOption = useMemo(() => {
    return getLicenseOptionByYears(selectedYears);
  }, [selectedYears]);

  // Active subscription evaluation & dynamic date calculation
  const sub = restaurant.subscription;
  const isCurrentlyActive = Boolean(
    sub &&
    sub.status === 'ACTIVE' &&
    sub.endDate &&
    new Date(sub.endDate).getTime() > Date.now()
  );

  const existingExpiry = isCurrentlyActive ? new Date(sub.endDate) : null;
  const baseDate = isCurrentlyActive ? existingExpiry : new Date();

  // Expiry dynamically calculated based on selected duration
  const calculatedExpiry = useMemo(() => {
    return calculateLicenseExpiry(baseDate, selectedYears);
  }, [baseDate, selectedYears]);

  // Effective start date
  const calculatedStartDate = useMemo(() => {
    if (isCurrentlyActive && sub.startDate) {
      return new Date(sub.startDate);
    }
    return new Date();
  }, [isCurrentlyActive, sub]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    onSubmit({
      planId: basicPlan?.id,
      durationYears: selectedYears,
      durationDays: selectedOption.days,
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-[#FFFDF9] dark:bg-[#14221E] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl w-full max-w-4xl shadow-editorial-lg flex flex-col max-h-[92vh] overflow-hidden text-[#17251F] dark:text-[#F7EFE4]">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-[#E4DCD0] dark:border-[#233630] flex items-center justify-between bg-[#FBF8F3] dark:bg-[#121E1B]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#173F36]/10 dark:bg-[#173F36]/30 text-[#173F36] dark:text-[#4EBA87]">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#173F36] dark:text-[#F7EFE4] tracking-tight">
                Manage Plan & Subscription
              </h2>
            </div>
            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5 ml-8.5 font-medium">
              Configure subscription license for <span className="font-semibold text-[#17251F] dark:text-[#F7EFE4]">{restaurant.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E4DCD0]/40 dark:hover:bg-[#233630] rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (TWO-COLUMN DESKTOP / STACKED MOBILE) */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <form id="license-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: PLAN + DURATION + DETAILS (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* SECTION 1: BASIC PLAN */}
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#173F36] dark:text-[#9FB29E] flex items-center gap-1.5">
                    <span className="w-4.5 h-4.5 rounded-full bg-[#173F36] text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Basic Plan</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-[#2D6A4F] dark:text-[#4EBA87] bg-[#E8F3ED] dark:bg-[#1A2E26] px-2.5 py-0.5 rounded-full border border-[#C5DED0] dark:border-[#244237]">
                    Standard Edition
                  </span>
                </div>

                <div className="p-4 rounded-xl border-2 border-[#173F36]/30 dark:border-[#4EBA87]/40 bg-[#FBF8F3] dark:bg-[#121E1B] relative shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#173F36] text-white shadow-2xs">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-lg font-bold text-[#173F36] dark:text-[#F7EFE4]">
                            Basic
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-[#C07D37]/15 text-[#92551A] dark:text-[#E8A563] px-2 py-0.5 rounded-md">
                            All-in-One
                          </span>
                        </div>
                        <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-0.5">
                          Perfect for small restaurants and cafes.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-base sm:text-lg font-bold text-[#173F36] dark:text-[#4EBA87]">
                        ₹5,000
                      </div>
                      <div className="text-[10px] font-medium text-[#657168] dark:text-[#9FB29E]">
                        / year base rate
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 2: CHOOSE LICENSE DURATION */}
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#173F36] dark:text-[#9FB29E] flex items-center gap-1.5">
                    <span className="w-4.5 h-4.5 rounded-full bg-[#173F36] text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Choose License Duration</span>
                  </h3>
                  <span className="text-[11px] text-[#657168] dark:text-[#9FB29E]">
                    Multi-year discounted tiers
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {LICENSE_OPTIONS.map((opt) => {
                    const isSelected = selectedYears === opt.years;
                    return (
                      <button
                        key={opt.years}
                        type="button"
                        onClick={() => setSelectedYears(opt.years)}
                        className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[115px] ${
                          isSelected
                            ? 'border-2 border-[#173F36] dark:border-[#4EBA87] bg-[#E8F3ED]/40 dark:bg-[#1A2E26] shadow-sm ring-1 ring-[#173F36]/20'
                            : 'border-[#E4DCD0] dark:border-[#233630] bg-[#FFFDF9] dark:bg-[#152320] hover:border-[#173F36]/40 dark:hover:border-[#4EBA87]/40'
                        }`}
                      >
                        {/* Best value badge for 5 years */}
                        {opt.badge && (
                          <span className="absolute -top-2.5 right-2 bg-[#C07D37] text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shadow-xs tracking-wider">
                            {opt.badge}
                          </span>
                        )}

                        {/* Top: Radio indicator & Duration Label */}
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-[#173F36] dark:border-[#4EBA87] bg-[#173F36] dark:bg-[#4EBA87]'
                                : 'border-[#657168]/50 dark:border-[#9FB29E]/50'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? 'text-[#173F36] dark:text-[#4EBA87]' : 'text-[#17251F] dark:text-[#F7EFE4]'
                            }`}
                          >
                            {opt.durationLabel}
                          </span>
                        </div>

                        {/* Middle & Bottom: Price and Yearly Equivalent */}
                        <div className="mt-3">
                          <div className="font-mono text-sm sm:text-base font-bold text-[#173F36] dark:text-[#F7EFE4]">
                            ₹{opt.price.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] mt-0.5 font-medium">
                            ₹{opt.yearlyEquivalent.toLocaleString()}/year
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* SECTION 3: PLAN DETAILS & LIMITS */}
              <section className="pt-1">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#173F36] dark:text-[#9FB29E] flex items-center gap-1.5">
                    <span className="w-4.5 h-4.5 rounded-full bg-[#173F36] text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Plan Details & Enforced Capacities</span>
                  </h3>
                  <span className="text-[11px] text-[#657168] dark:text-[#9FB29E]">
                    Standard Basic Quotas
                  </span>
                </div>

                {/* 3 User limit chips */}
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  <div className="p-2.5 rounded-xl bg-[#FBF8F3] dark:bg-[#121E1B] border border-[#E4DCD0] dark:border-[#233630] text-center">
                    <div className="flex items-center justify-center gap-1 text-[#173F36] dark:text-[#4EBA87] mb-0.5">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-base font-bold font-mono">10</span>
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#657168] dark:text-[#9FB29E]">
                      Waiters
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FBF8F3] dark:bg-[#121E1B] border border-[#E4DCD0] dark:border-[#233630] text-center">
                    <div className="flex items-center justify-center gap-1 text-[#173F36] dark:text-[#4EBA87] mb-0.5">
                      <ChefHat className="w-3.5 h-3.5" />
                      <span className="text-base font-bold font-mono">2</span>
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#657168] dark:text-[#9FB29E]">
                      Kitchen Admins
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FBF8F3] dark:bg-[#121E1B] border border-[#E4DCD0] dark:border-[#233630] text-center">
                    <div className="flex items-center justify-center gap-1 text-[#173F36] dark:text-[#4EBA87] mb-0.5">
                      <Receipt className="w-3.5 h-3.5" />
                      <span className="text-base font-bold font-mono">2</span>
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#657168] dark:text-[#9FB29E]">
                      Receptionists
                    </div>
                  </div>
                </div>

                {/* Existing features list */}
                <div className="p-3 rounded-xl bg-[#FBF8F3] dark:bg-[#121E1B] border border-[#E4DCD0] dark:border-[#233630]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#17251F] dark:text-[#F7EFE4]">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                      <span>10 Service Waiters (POS & Map)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                      <span>2 Kitchen Admins (Live KDS)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                      <span>2 Receptionists (Billing & Cashier)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                      <span>Role-based user management</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                      <span>Complete Operations & Reports</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                      <span>Full menu & dining table control</span>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN: SUMMARY + DATES + STATUS + CTA (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-5 bg-[#FBF8F3] dark:bg-[#121E1B] border border-[#E4DCD0] dark:border-[#233630] rounded-2xl p-5 shadow-2xs">
              
              <div className="space-y-4">
                {/* Summary Header */}
                <div className="border-b border-[#E4DCD0] dark:border-[#233630] pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#657168] dark:text-[#9FB29E]">
                      Subscription Summary
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#C07D37]">
                      <Sparkles className="w-3 h-3" />
                      <span>License Purchase</span>
                    </span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-[#173F36] dark:text-[#F7EFE4] mt-1">
                    Basic Plan — {selectedOption.durationLabel}
                  </h4>
                </div>

                {/* Line Items */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#657168] dark:text-[#9FB29E]">Plan Name</span>
                    <span className="font-semibold text-[#17251F] dark:text-[#F7EFE4]">Basic</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#657168] dark:text-[#9FB29E]">License Duration</span>
                    <span className="font-semibold text-[#17251F] dark:text-[#F7EFE4]">
                      {selectedOption.durationLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#657168] dark:text-[#9FB29E]">Base Annual Rate</span>
                    <span className="font-mono text-[#657168] dark:text-[#9FB29E]">₹5,000 / year</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#657168] dark:text-[#9FB29E]">Price</span>
                    <span className="font-mono font-semibold text-[#17251F] dark:text-[#F7EFE4]">
                      ₹{selectedOption.price.toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#E4DCD0] dark:border-[#233630] flex items-center justify-between">
                    <span className="font-bold text-sm text-[#173F36] dark:text-[#F7EFE4]">Total Amount</span>
                    <span className="font-mono text-lg font-extrabold text-[#173F36] dark:text-[#4EBA87]">
                      ₹{selectedOption.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Dynamic Dates & Subscription Lifecycle Details */}
                <div className="pt-3 border-t border-[#E4DCD0] dark:border-[#233630] space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#657168] dark:text-[#9FB29E] block">
                    License Schedule
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630]">
                      <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] uppercase font-semibold">
                        Start Date
                      </div>
                      <div className="font-mono font-bold text-[#173F36] dark:text-[#F7EFE4] mt-0.5">
                        {formatDate(calculatedStartDate)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630]">
                      <div className="text-[10px] text-[#657168] dark:text-[#9FB29E] uppercase font-semibold">
                        Expiry Date
                      </div>
                      <div className="font-mono font-bold text-[#173F36] dark:text-[#4EBA87] mt-0.5">
                        {formatDate(calculatedExpiry)}
                      </div>
                    </div>
                  </div>

                  {/* Extension Context Banner */}
                  {isCurrentlyActive ? (
                    <div className="p-2.5 rounded-xl bg-[#E8F3ED] dark:bg-[#1A2E26] border border-[#C5DED0] dark:border-[#244237] text-[11px] text-[#1E4D38] dark:text-[#88D4A8] flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Continuous Renewal:</strong> Extends from current expiry ({formatDate(existingExpiry)}) to {formatDate(calculatedExpiry)}.
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] text-[11px] text-[#657168] dark:text-[#9FB29E] flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#173F36] dark:text-[#4EBA87]" />
                      <span>
                        License initiates immediately upon activation and remains valid for {selectedOption.durationLabel}.
                      </span>
                    </div>
                  )}

                  {/* Subscription Status Control */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-[#657168] dark:text-[#9FB29E] uppercase mb-1">
                      Subscription Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#233630] rounded-xl px-3 py-2 text-xs text-[#17251F] dark:text-[#F7EFE4] font-medium focus:outline-none focus:border-[#173F36] dark:focus:border-[#4EBA87]"
                    >
                      <option value="ACTIVE">ACTIVE (Normal Operations)</option>
                      <option value="SUSPENDED">SUSPENDED (Temporarily Blocked)</option>
                      <option value="EXPIRED">EXPIRED (Renewal Required)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS / CTA */}
              <div className="space-y-2 pt-2 border-t border-[#E4DCD0] dark:border-[#233630]">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] shadow-editorial transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#FFFDF9] border-t-transparent rounded-full animate-spin" />
                      <span>Activating License...</span>
                    </>
                  ) : (
                    <>
                      <span>Activate License</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4] hover:bg-[#E4DCD0]/40 dark:hover:bg-[#1E2E2A] transition-colors cursor-pointer border border-[#E4DCD0] dark:border-[#233630]"
                >
                  Cancel
                </button>

                <p className="text-[10px] text-center text-[#657168] dark:text-[#9FB29E] pt-1">
                  License is bound directly to restaurant tenant operations
                </p>
              </div>

            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
