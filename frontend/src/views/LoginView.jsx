import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ChefHat,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Store,
  AlertCircle,
  X,
  Phone,
  HelpCircle
} from 'lucide-react';

import loginHero from '../assets/login_hero.jpg';
import chefPosHero from '../assets/chef_pos_hero.jpg';

export default function LoginView({ onNavigateToForgotPassword, onLoginSuccess }) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Form credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('pos_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const authResult = await login(email.trim(), password);

      // Persist remember me preference
      if (rememberMe) {
        localStorage.setItem('pos_remember_email', email.trim());
      } else {
        localStorage.removeItem('pos_remember_email');
      }

      if (onLoginSuccess && authResult?.defaultPath) {
        onLoginSuccess(authResult);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-screen min-h-screen lg:h-screen lg:overflow-hidden select-none bg-[#121E1B] flex flex-col justify-between font-sans">
      {/* ============================================================ */}
      {/* 1. CINEMATIC RESTAURANT BACKGROUND LAYER                     */}
      {/* ============================================================ */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-[center_top] sm:bg-center lg:bg-[position:left_center] transition-all duration-700 pointer-events-none"
        style={{
          backgroundImage: `url(${loginHero})`,
        }}
      />

      {/* Subtle Warm Vignette Overlay (Preserves Restaurant Lighting & Ambience) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/35 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

      {/* ============================================================ */}
      {/* 2. TOP BRAND & NAVIGATION AREA                               */}
      {/* ============================================================ */}
      <header className="relative z-20 flex items-center justify-between px-6 sm:px-12 lg:px-16 pt-6 sm:pt-8 shrink-0">
        {/* Top-Left: Elegant Chef Hat Icon + POS Brand */}
        <div className="flex items-center gap-2.5">
          <ChefHat className="w-6 h-6 text-[#FFFDF9]" strokeWidth={1.8} />
          <span className="font-serif text-2xl lg:text-[26px] font-bold tracking-widest text-[#FFFDF9]">
            POS
          </span>
        </div>

        {/* Top-Right: Editorial Tagline */}
        <div className="hidden sm:flex items-center gap-2.5 text-xs lg:text-[13px] text-[#FAF5EB]/90 font-serif tracking-wide">
          <span>Good Food</span>
          <span className="text-[#FAF5EB]/40 font-sans">/</span>
          <span>Better Management</span>
          <span className="text-[#FAF5EB]/40 font-sans">/</span>
          <span>Higher Profits</span>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 3. MAIN HERO COMPOSITION (LEFT CHEF/POS + RIGHT LOGIN CARD)  */}
      {/* ============================================================ */}
      <main className="relative z-20 flex-1 flex flex-col lg:flex-row items-center justify-between px-6 sm:px-12 lg:px-16 py-6 lg:py-0 w-full max-w-[1700px] mx-auto">
        {/* LEFT SECTION — HERO MESSAGING (ALIGNED WITH 3D CHEF & POS) */}
        <div className="w-full lg:w-[58%] flex flex-col justify-end lg:h-full lg:pb-14 xl:pb-16 text-white">
          {/* Mobile-Only Chef + Giant POS Card (visible on mobile where wide bg is cropped) */}
          <div className="lg:hidden w-full max-w-sm mx-auto mb-6 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black/30 backdrop-blur-sm">
            <img
              src={chefPosHero}
              alt="POS Mascot Chef leaning on POS"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Editorial Tagline Underneath POS Letters */}
          <div className="max-w-xl text-left pl-1 sm:pl-4 lg:pl-6 xl:pl-10 animate-fade-in">
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-[38px] xl:text-[42px] font-normal text-[#FFFDF9] tracking-tight leading-[1.18] drop-shadow-md">
              Smarter Restaurant Operations
            </h1>
            <p className="mt-3 text-xs sm:text-sm lg:text-[15px] text-[#EFE7DA]/95 leading-relaxed font-sans max-w-lg drop-shadow-sm font-normal">
              Manage your tables, orders, menu, inventory and more — all in one place.
              <br className="hidden sm:inline" /> Simple. Fast. Reliable.
            </p>
          </div>
        </div>

        {/* RIGHT SECTION — TRANSPARENT / FROSTED GLASS LOGIN CARD */}
        <div className="w-full lg:w-[42%] flex justify-center lg:justify-end mt-8 lg:mt-0">
          <div className="w-full max-w-[420px] rounded-[22px] bg-[#FFFBF2]/90 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.35)] p-7 sm:p-9 transition-all">
            {/* Card Header: Editorial Serif Heading + Subtitle */}
            <div className="text-left mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#173F36] tracking-tight">
                Welcome Back
              </h2>
              <p className="text-xs sm:text-sm text-[#4A5D54] mt-1 font-medium font-sans">
                Sign in to your POS account
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-xl bg-[#FDF0ED] border border-[#F5C6CB] text-[#C53030] text-xs font-medium flex items-start gap-2 animate-slide-up">
                <AlertCircle className="w-4 h-4 text-[#C53030] shrink-0 mt-0.5" />
                <span className="flex-1 leading-snug">{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => setErrorMsg('')}
                  className="text-[#C53030] hover:opacity-80 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Address Input */}
              <div>
                <div className="relative rounded-xl border border-[#DFD5C4]/90 bg-white/60 focus-within:bg-white/95 focus-within:border-[#173F36] focus-within:ring-2 focus-within:ring-[#173F36]/15 transition-all">
                  <Mail className="w-4 h-4 text-[#657168] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-[#17251F] placeholder-[#8A978E] focus:outline-none font-medium"
                    placeholder="Email address"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="relative rounded-xl border border-[#DFD5C4]/90 bg-white/60 focus-within:bg-white/95 focus-within:border-[#173F36] focus-within:ring-2 focus-within:ring-[#173F36]/15 transition-all">
                  <Lock className="w-4 h-4 text-[#657168] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full bg-transparent pl-10 pr-10 py-3 text-sm text-[#17251F] placeholder-[#8A978E] focus:outline-none font-medium"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#657168] hover:text-[#17251F] transition-colors p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between pt-0.5 text-xs text-[#4A5D54]">
                <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#DFD5C4] text-[#173F36] focus:ring-[#173F36] accent-[#173F36] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToForgotPassword) {
                      onNavigateToForgotPassword();
                    } else {
                      window.history.pushState(null, '', '/forgot-password');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                  className="font-medium text-[#173F36] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 sm:h-12 flex items-center justify-center gap-2 bg-[#173F36] hover:bg-[#12332C] active:bg-[#0E2621] text-[#FFFDF9] font-semibold text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 mt-3"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                <span className="text-base leading-none">→</span>
              </button>
            </form>

            {/* OR Divider */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#DFD5C4]/80" />
              </div>
              <span className="relative bg-[#FFFBF2] px-3 text-[11px] uppercase tracking-wider text-[#7A8A80] font-semibold">
                OR
              </span>
            </div>

            {/* Support Action */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="inline-flex items-center justify-center gap-2 text-xs text-[#3D5247] hover:text-[#173F36] transition-colors font-medium cursor-pointer"
              >
                <Store className="w-4 h-4 text-[#173F36]" />
                <span>Need help? Contact support</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* 4. BOTTOM CREDITS / LEGAL NOTICE                             */}
      {/* ============================================================ */}
      <footer className="relative z-20 px-6 sm:px-12 lg:px-16 pb-4 sm:pb-6 text-center lg:text-left text-[11px] text-[#FAF5EB]/60 font-sans shrink-0">
        <span>© {new Date().getFullYear()} POS Enterprise Restaurant Management. All rights reserved.</span>
      </footer>

      {/* ============================================================ */}
      {/* SUPPORT MODAL                                                */}
      {/* ============================================================ */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#FFFDF9] rounded-2xl border border-[#E4DCD0] p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 text-[#657168] hover:text-[#17251F] p-1.5 rounded-lg hover:bg-[#F7EFE4] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#173F36] flex items-center justify-center text-white">
                <Store className="w-5 h-5 text-[#FFFDF9]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#173F36]">POS Customer Support</h3>
                <p className="text-xs text-[#657168]">24/7 Dedicated Restaurant Assistance</p>
              </div>
            </div>
            <div className="space-y-3 my-4 text-xs text-[#17251F]">
              <div className="p-3 rounded-xl bg-[#F7EFE4] border border-[#E4DCD0] flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#173F36]" />
                <div>
                  <span className="font-semibold block">Email Support</span>
                  <a href="mailto:support@pos-restaurant.com" className="text-[#173F36] hover:underline">
                    support@pos-restaurant.com
                  </a>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F7EFE4] border border-[#E4DCD0] flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#173F36]" />
                <div>
                  <span className="font-semibold block">Emergency Hotline</span>
                  <span className="text-[#657168]">+1 (800) 555-0199 (Toll-Free)</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#F7EFE4] border border-[#E4DCD0] flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-[#173F36]" />
                <div>
                  <span className="font-semibold block">Knowledge Base</span>
                  <span className="text-[#657168]">docs.pos-restaurant.com/troubleshooting</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2.5 bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] rounded-xl text-xs font-semibold transition-colors mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
