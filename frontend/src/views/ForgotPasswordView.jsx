import React, { useState, useEffect, useRef } from 'react';
import {
  UtensilsCrossed,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import posService from '../services/pos.service';
import { useAuth } from '../context/AuthContext';

/**
 * Production-Grade Forgot Password / Password Reset Flow for POS
 * Supports /forgot-password, /verify-otp, /reset-password, and success states
 */
export default function ForgotPasswordView({ initialStep = 'forgot', onNavigateToLogin, onNavigate }) {
  const { addToast } = useAuth();

  // Active step: 'forgot' | 'verify' | 'reset' | 'success'
  const [step, setStep] = useState(() => {
    const path = window.location.pathname;
    if (path.includes('/verify-otp')) return 'verify';
    if (path.includes('/reset-password')) return 'reset';
    return initialStep;
  });

  // Flow State
  const [email, setEmail] = useState(() => sessionStorage.getItem('pos_reset_email') || '');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState(() => sessionStorage.getItem('pos_reset_token') || '');

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Resend Countdown Timer (45 seconds)
  const [resendCooldown, setResendCooldown] = useState(45);

  const otpInputRefs = useRef([]);

  // Sync route with browser history
  const navigateTo = (newStep, path) => {
    setStep(newStep);
    setErrorMsg('');
    if (window.location.pathname !== path) {
      window.history.pushState({ step: newStep }, '', path);
    }
    if (onNavigate) {
      onNavigate(path);
    }
  };

  // Listen to browser popstate (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes('/verify-otp')) {
        setStep('verify');
      } else if (path.includes('/reset-password')) {
        setStep('reset');
      } else if (path.includes('/forgot-password')) {
        setStep('forgot');
      } else if (path.includes('/login') || path === '/') {
        if (onNavigateToLogin) onNavigateToLogin();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onNavigateToLogin]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step !== 'verify') return;
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  // Auto-focus first OTP input when reaching verify step
  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Validation rules for new password
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  // -------------------------------------------------------------
  // STEP 1: SEND OTP (POST /api/auth/forgot-password)
  // -------------------------------------------------------------
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await posService.auth.forgotPassword(cleanEmail);
      sessionStorage.setItem('pos_reset_email', cleanEmail);
      addToast(res.message || 'Verification code sent to your email.', 'info');
      setResendCooldown(45);
      setOtpValues(['', '', '', '', '', '']);
      navigateTo('verify', '/verify-otp');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send verification code. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // STEP 2: RESEND OTP (POST /api/auth/resend-reset-otp)
  // -------------------------------------------------------------
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setErrorMsg('');
    setResending(true);

    try {
      const res = await posService.auth.resendResetOtp(email);
      addToast(res.message || 'A new verification code has been dispatched.', 'success');
      setResendCooldown(60);
      setOtpValues(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setErrorMsg(err.message || 'Unable to resend verification code right now.');
    } finally {
      setResending(false);
    }
  };

  // -------------------------------------------------------------
  // OTP INPUT HANDLERS (Paste & Auto-Advance)
  // -------------------------------------------------------------
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = digit;
    setOtpValues(newOtp);
    if (errorMsg) setErrorMsg('');

    // Advance to next box if digit entered
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otpValues];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtpValues(newOtp);
    if (errorMsg) setErrorMsg('');

    // Focus last filled or 6th input
    const nextFocusIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextFocusIndex]?.focus();
  };

  // -------------------------------------------------------------
  // STEP 3: VERIFY OTP (POST /api/auth/verify-reset-otp)
  // -------------------------------------------------------------
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const otpCode = otpValues.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await posService.auth.verifyResetOtp(email, otpCode);
      const token = res.data?.resetToken || res.resetToken;
      if (!token) {
        throw new Error('Verification succeeded but reset token was not received.');
      }
      setResetToken(token);
      sessionStorage.setItem('pos_reset_token', token);
      addToast('Verification code confirmed!', 'success');
      navigateTo('reset', '/reset-password');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // STEP 4: RESET PASSWORD (POST /api/auth/reset-password)
  // -------------------------------------------------------------
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isPasswordValid) {
      setErrorMsg('Please satisfy all password security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const tokenToUse = resetToken || sessionStorage.getItem('pos_reset_token');
    if (!tokenToUse) {
      setErrorMsg('Your reset session has expired. Please restart the verification flow.');
      return;
    }

    setLoading(true);
    try {
      await posService.auth.resetPassword(tokenToUse, newPassword);
      sessionStorage.removeItem('pos_reset_email');
      sessionStorage.removeItem('pos_reset_token');
      addToast('Password updated successfully!', 'success');
      setStep('success');
      window.history.pushState({ step: 'success' }, '', '/login');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password. Please request a new verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    sessionStorage.removeItem('pos_reset_email');
    sessionStorage.removeItem('pos_reset_token');
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.history.pushState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F7EFE4] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative select-none font-sans overflow-y-auto">
      {/* Ambient background glow accents */}
      <div className="fixed top-12 left-1/4 w-96 h-96 bg-[#E4DCD0]/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-12 right-1/4 w-96 h-96 bg-[#173F36]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Decorative leaf / geometric motif */}
      <svg
        className="fixed -bottom-10 -right-10 w-72 h-72 text-[#E4DCD0]/40 pointer-events-none select-none -z-10"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M190 190C190 110 130 50 50 50C50 130 110 190 190 190Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path d="M170 170C170 100 120 50 50 50" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="w-full max-w-[440px] my-auto py-6 animate-fade-in relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#173F36] flex items-center justify-center shadow-editorial mx-auto mb-3 border border-[#E4DCD0]">
            <UtensilsCrossed className="w-7 h-7 text-[#FFFDF9]" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#173F36] tracking-tight">POS Terminal</h2>
          <p className="text-xs text-[#657168] mt-1 font-medium tracking-wide">
            Enterprise Password Recovery
          </p>
        </div>

        {/* Main Ivory Authentication Card */}
        <div className="bg-[#FFFDF9] border border-[#E4DCD0] rounded-2xl p-7 sm:p-9 shadow-editorial transition-all">
          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-[#FDF0ED] border border-[#F5C6CB] text-[#C53030] text-xs font-medium flex items-start gap-2.5 animate-slide-up">
              <AlertCircle className="w-4 h-4 text-[#C53030] shrink-0 mt-0.5" />
              <span className="flex-1 leading-snug">{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="text-[#C53030] hover:opacity-80 p-0.5"
                title="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: FORGOT PASSWORD (EMAIL ENTRY)                    */}
          {/* ======================================================== */}
          {step === 'forgot' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#F7EFE4] border border-[#E4DCD0] flex items-center justify-center mx-auto mb-2.5 text-[#173F36]">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#173F36] tracking-tight">Forgot Password?</h3>
                <p className="text-xs text-[#657168] mt-1 leading-relaxed">
                  Enter your registered email address and we'll send you a verification code.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#17251F] mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#657168] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full bg-[#FFFDF9] border border-[#E4DCD0] rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-sm text-[#17251F] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] focus:ring-2 focus:ring-[#173F36]/15 transition-all font-medium"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] font-semibold text-sm rounded-xl transition-all duration-200 shadow-editorial cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#173F36] focus:ring-offset-2 hover:-translate-y-0.5 mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FFFDF9]" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[#E4DCD0] text-center">
                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173F36] hover:text-[#12332C] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: VERIFY OTP                                       */}
          {/* ======================================================== */}
          {step === 'verify' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#F7EFE4] border border-[#E4DCD0] flex items-center justify-center mx-auto mb-2.5 text-[#173F36]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#173F36] tracking-tight">Verify Your Email</h3>
                <p className="text-xs text-[#657168] mt-1 leading-relaxed">
                  Enter the 6-digit verification code sent to:
                </p>
                <p className="text-xs font-bold text-[#17251F] mt-0.5 break-all bg-[#F7EFE4] py-1 px-2.5 rounded-lg border border-[#E4DCD0] inline-block max-w-full">
                  {email || 'your email'}
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* 6-Digit OTP Individual Inputs */}
                <div>
                  <label className="block text-xs font-semibold text-[#17251F] mb-2 uppercase tracking-wide text-center">
                    Verification Code
                  </label>
                  <div
                    className="grid grid-cols-6 gap-2 sm:gap-2.5"
                    onPaste={handleOtpPaste}
                  >
                    {otpValues.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-full h-12 sm:h-13 text-center text-lg sm:text-xl font-bold bg-[#FFFDF9] border border-[#E4DCD0] rounded-xl text-[#173F36] focus:outline-none focus:border-[#173F36] focus:ring-2 focus:ring-[#173F36]/15 transition-all font-mono"
                        placeholder="•"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpValues.join('').length !== 6}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] font-semibold text-sm rounded-xl transition-all duration-200 shadow-editorial cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#173F36] focus:ring-offset-2 hover:-translate-y-0.5 mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FFFDF9]" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Resend OTP Section with Timer */}
              <div className="mt-5 p-3.5 rounded-xl bg-[#F7EFE4] border border-[#E4DCD0] text-center text-xs space-y-1">
                <span className="text-[#657168]">Didn't receive the code? </span>
                {resendCooldown > 0 ? (
                  <div className="font-semibold text-[#173F36] inline-flex items-center gap-1.5 mt-0.5">
                    <span>Resend available in:</span>
                    <span className="font-mono bg-[#FFFDF9] px-1.5 py-0.5 rounded border border-[#E4DCD0] text-[#173F36]">
                      00:{resendCooldown < 10 ? `0${resendCooldown}` : resendCooldown}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="font-bold text-[#173F36] hover:text-[#12332C] transition-colors underline cursor-pointer inline-flex items-center gap-1 ml-1"
                  >
                    {resending ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Sending new code...</span>
                      </>
                    ) : (
                      <span>Resend OTP</span>
                    )}
                  </button>
                )}
              </div>

              {/* Back Button */}
              <div className="mt-5 pt-4 border-t border-[#E4DCD0] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => navigateTo('forgot', '/forgot-password')}
                  className="inline-flex items-center gap-1 font-semibold text-[#657168] hover:text-[#17251F] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>
                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="font-semibold text-[#173F36] hover:text-[#12332C] transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: RESET PASSWORD                                   */}
          {/* ======================================================== */}
          {step === 'reset' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#F7EFE4] border border-[#E4DCD0] flex items-center justify-center mx-auto mb-2.5 text-[#173F36]">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#173F36] tracking-tight">Create New Password</h3>
                <p className="text-xs text-[#657168] mt-1 leading-relaxed">
                  Create a new secure password for your POS account.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#17251F] mb-1.5 uppercase tracking-wide">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#657168] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full bg-[#FFFDF9] border border-[#E4DCD0] rounded-xl pl-10 pr-11 py-2.5 sm:py-3 text-sm text-[#17251F] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] focus:ring-2 focus:ring-[#173F36]/15 transition-all font-medium"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#657168] hover:text-[#17251F] hover:bg-[#F7EFE4] p-1.5 rounded-lg transition-colors cursor-pointer"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#17251F] mb-1.5 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#657168] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full bg-[#FFFDF9] border border-[#E4DCD0] rounded-xl pl-10 pr-11 py-2.5 sm:py-3 text-sm text-[#17251F] placeholder-[#9FB29E] focus:outline-none focus:border-[#173F36] focus:ring-2 focus:ring-[#173F36]/15 transition-all font-medium"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#657168] hover:text-[#17251F] hover:bg-[#F7EFE4] p-1.5 rounded-lg transition-colors cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-[11px] text-[#C53030] mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Passwords do not match.</span>
                    </p>
                  )}
                </div>

                {/* Password Requirement Rules Checklist */}
                <div className="p-3 bg-[#F7EFE4] border border-[#E4DCD0] rounded-xl text-xs space-y-1.5">
                  <span className="font-semibold text-[#17251F] block text-[11px] uppercase tracking-wider mb-1">
                    Password must contain:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-[#2D6A4F] font-semibold' : 'text-[#657168]'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-[#2D6A4F]' : 'text-[#9FB29E]'}`} />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-[#2D6A4F] font-semibold' : 'text-[#657168]'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${hasUppercase ? 'text-[#2D6A4F]' : 'text-[#9FB29E]'}`} />
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-[#2D6A4F] font-semibold' : 'text-[#657168]'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${hasLowercase ? 'text-[#2D6A4F]' : 'text-[#9FB29E]'}`} />
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-[#2D6A4F] font-semibold' : 'text-[#657168]'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? 'text-[#2D6A4F]' : 'text-[#9FB29E]'}`} />
                      <span>One number</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isPasswordValid || !passwordsMatch}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] font-semibold text-sm rounded-xl transition-all duration-200 shadow-editorial cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#173F36] focus:ring-offset-2 hover:-translate-y-0.5 mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FFFDF9]" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-[#E4DCD0] text-center">
                <button
                  type="button"
                  onClick={() => navigateTo('forgot', '/forgot-password')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#657168] hover:text-[#17251F] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Restart Password Recovery</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: SUCCESS VIEW                                     */}
          {/* ======================================================== */}
          {step === 'success' && (
            <div className="text-center py-2 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-[#E8F3ED] border-2 border-[#C8E0D2] flex items-center justify-center mx-auto mb-4 text-[#2D6A4F] shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-serif font-bold text-[#173F36] tracking-tight">
                Password Updated Successfully
              </h3>

              <p className="text-xs text-[#657168] mt-2 leading-relaxed max-w-xs mx-auto">
                Your POS password has been updated. You can now sign in using your new password.
              </p>

              <div className="mt-6 pt-4 border-t border-[#E4DCD0]">
                <button
                  type="button"
                  onClick={handleReturnToLogin}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-[#173F36] hover:bg-[#12332C] text-[#FFFDF9] font-semibold text-sm rounded-xl transition-all duration-200 shadow-editorial cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#173F36] focus:ring-offset-2 hover:-translate-y-0.5"
                >
                  <span>Back to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Security Guarantee Notice */}
          <div className="mt-6 pt-4 border-t border-[#E4DCD0] text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#657168] font-medium">
              <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
              <span>POS Encrypted Auth Session</span>
            </div>
          </div>
        </div>

        {/* Support note */}
        <div className="mt-4 p-2.5 rounded-xl bg-[#FFFDF9]/80 border border-[#E4DCD0] text-center text-xs text-[#657168]">
          <span>Need help? Contact your restaurant system administrator.</span>
        </div>
      </div>
    </div>
  );
}
