'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '';
  const initialMode =
    searchParams.get('mode') === 'register' || searchParams.get('tab') === 'register'
      ? 'register'
      : 'login';

  const { user, checkAuth } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);

  // Login credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register credentials
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Reset password credentials
  const [resetPhone, setResetPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 3-Second Brand Loading Screen State
  const [loadingTransition, setLoadingTransition] = useState<{
    role: 'admin' | 'customer';
    targetUrl: string;
    userName?: string;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { message: `Server error (${res.status})` };
      }

      if (res.ok && data.user) {
        showToast(data.message || 'Login successful!', 'success');
        await checkAuth();

        const isAdmin = data.role === 'admin' || data.user.role === 'admin';
        const target = isAdmin ? '/admin/products' : (redirectTarget || '/cakes');

        setLoadingTransition({
          role: isAdmin ? 'admin' : 'customer',
          targetUrl: target,
          userName: data.user.full_name,
        });
      } else {
        setErrorMessage(data.message || 'Invalid username or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('Network connection error. Please refresh the page and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: cleanPhone,
          password: regPassword,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { message: `Server error (${res.status})` };
      }

      if (res.ok && data.user) {
        showToast('Welcome to Nila’s Treat!', 'success');
        await checkAuth();

        setLoadingTransition({
          role: 'customer',
          targetUrl: redirectTarget || '/cakes',
          userName: data.user.full_name,
        });
      } else if (res.status === 409) {
        setErrorMessage('This mobile number is already registered. You can Sign In or Reset Password below.');
        setIdentifier(cleanPhone);
        setResetPhone(cleanPhone);
      } else {
        setErrorMessage(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMessage('Network connection error. Please refresh the page and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanPhone = resetPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          password: newPassword,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { message: `Server error (${res.status})` };
      }

      if (res.ok && data.user) {
        showToast('Password updated successfully! Welcome.', 'success');
        await checkAuth();

        setLoadingTransition({
          role: 'customer',
          targetUrl: redirectTarget || '/cakes',
          userName: data.user.full_name,
        });
      } else {
        setErrorMessage(data.message || 'Unable to update password. Please try again.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setErrorMessage('Network connection error. Please refresh the page and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If entering portal, show 3-second Brand Loading Animation
  if (loadingTransition) {
    return <BrandLoadingScreen targetUrl={loadingTransition.targetUrl} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFFDFC]">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-[#F5D3DC] p-7 sm:p-8 shadow-lg">
        
        {/* Brand Logo & Name */}
        <div className="text-center space-y-2 mb-5">
          <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-[#8F1237]/20 shadow-sm bg-[#FFF6F0]">
            <Image
              src="/images/nilas-badge.png"
              alt="Nila's Treat Logo"
              fill
              priority
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-extrabold text-[#8F1237] tracking-tight">
              Nila&apos;s Treat
            </h1>
            <p className="text-[11px] font-medium text-[#70132C]/70">
              The Home of Fresh Baking
            </p>
          </div>
        </div>

        {/* Tab Toggle: Sign In vs Create Account */}
        {mode !== 'reset' && (
          <div className="flex bg-[#FFF6F0] p-1 rounded-2xl mb-5 border border-[#F5D3DC]/60">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#8F1237] shadow-sm'
                  : 'text-[#70132C]/70 hover:text-[#8F1237]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-white text-[#8F1237] shadow-sm'
                  : 'text-[#70132C]/70 hover:text-[#8F1237]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center space-y-2">
            <div>{errorMessage}</div>
            {errorMessage.includes('already registered') && (
              <div className="flex gap-2 justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="px-3 py-1 bg-[#8F1237] text-white text-[11px] rounded-lg font-bold"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setErrorMessage(null);
                  }}
                  className="px-3 py-1 bg-white border border-[#8F1237] text-[#8F1237] text-[11px] rounded-lg font-bold"
                >
                  Reset Password
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success Notice */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center">
            {successMessage}
          </div>
        )}

        {/* Form: Sign In */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#33252A] mb-1.5">
                Phone Number / Username
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#F5D3DC] text-[#33252A] bg-[#FFFDFC] focus:outline-none focus:border-[#8F1237] focus:ring-1 focus:ring-[#8F1237]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#33252A]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetPhone(identifier.replace(/[^0-9]/g, ''));
                    setMode('reset');
                    setErrorMessage(null);
                  }}
                  className="text-[11px] text-[#8F1237] hover:underline font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#F5D3DC] text-[#33252A] bg-[#FFFDFC] focus:outline-none focus:border-[#8F1237] focus:ring-1 focus:ring-[#8F1237]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#8F1237] hover:bg-[#750E2D] text-white rounded-full font-bold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Form: New Customer Register */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#33252A] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#F5D3DC] text-[#33252A] bg-[#FFFDFC] focus:outline-none focus:border-[#8F1237] focus:ring-1 focus:ring-[#8F1237]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#33252A] mb-1.5">
                10-Digit Mobile Number
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#F5D3DC] text-[#33252A] bg-[#FFFDFC] focus:outline-none focus:border-[#8F1237] focus:ring-1 focus:ring-[#8F1237]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#33252A] mb-1.5">
                Password (minimum 6 characters)
              </label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Create password"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#F5D3DC] text-[#33252A] bg-[#FFFDFC] focus:outline-none focus:border-[#8F1237] focus:ring-1 focus:ring-[#8F1237]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#8F1237] hover:bg-[#750E2D] text-white rounded-full font-bold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Form: Reset Password */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-center mb-3">
              <h2 className="text-sm font-bold text-[#8F1237]">Reset Your Password</h2>
              <p className="text-[11px] text-[#70132C]/70">Enter your 10-digit mobile number and create a new password.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#33252A] mb-1.5">
                10-Digit Mobile Number
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={resetPhone}
                onChange={(e) => setResetPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#F5D3DC] text-[#33252A] bg-[#FFFDFC] focus:outline-none focus:border-[#8F1237] focus:ring-1 focus:ring-[#8F1237]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#33252A] mb-1.5">
                New Password (minimum 6 characters)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#F5D3DC] text-[#33252A] bg-[#FFFDFC] focus:outline-none focus:border-[#8F1237] focus:ring-1 focus:ring-[#8F1237]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#8F1237] hover:bg-[#750E2D] text-white rounded-full font-bold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Updating password...' : 'Set New Password & Sign In'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className="text-xs text-[#8F1237] hover:underline font-semibold"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-[#8F1237]">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
