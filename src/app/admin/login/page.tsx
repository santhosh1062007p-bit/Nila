'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Phone, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, mfaCode: mfaRequired ? mfaCode : undefined }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        showToast('Authorized: Welcome to Nila’s Treat Owner Dashboard', 'success');
        window.location.href = '/admin/dashboard';
      } else if (data.mfaRequired) {
        setMfaRequired(true);
        setError(data.message || 'Please enter your 6-digit MFA code.');
      } else {
        setError(data.message || 'Access Denied: Invalid owner administrator credentials.');
      }
    } catch {
      setError('Unable to authenticate with backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-[#FFFDFB]">
      <div className="max-w-md w-full space-y-8">
        
        <div className="text-center space-y-3">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#8F1237]/30 shadow-md mx-auto bg-[#FFF6F0]">
            <Image
              src="/images/nilas-badge.png"
              alt="Nila's Treat"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-extrabold text-[#33252A]">
              Owner Admin Portal
            </h1>
            <p className="text-xs text-[#8F1237] font-semibold tracking-wider uppercase mt-1">
              Nila&apos;s Treat — The Home of Fresh Baking
            </p>
          </div>
          <p className="text-xs text-[#70132C]/70">
            Secure business desk to manage cake menu, live prices, eggless surcharge &amp; orders.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#F5D3DC] p-8 shadow-sm space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#70132C] mb-1">
              Admin Phone or Email *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 9344597833"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#F5D3DC] text-sm text-[#70132C] focus:outline-none focus:border-[#990F35]"
              />
              <Phone className="w-4 h-4 text-[#8C485A] absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#70132C] mb-1">
              Owner Password *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#F5D3DC] text-sm text-[#70132C] focus:outline-none focus:border-[#990F35]"
              />
              <Lock className="w-4 h-4 text-[#8C485A] absolute left-3.5 top-3" />
            </div>
            <p className="text-[11px] text-[#8C485A] mt-1">
              Enter your registered owner administrator password.
            </p>
          </div>

          {mfaRequired && (
            <div>
              <label className="block text-xs font-bold text-[#70132C] mb-1">
                6-Digit Authenticator Code (MFA) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#F5D3DC] text-sm tracking-widest font-mono text-[#70132C] focus:outline-none focus:border-[#990F35]"
                />
                <ShieldCheck className="w-4 h-4 text-[#8C485A] absolute left-3.5 top-3" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#990F35] hover:bg-[#800A2A] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Enter Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center">
          <a href="/" className="text-xs font-semibold text-[#8C485A] hover:text-[#990F35] hover:underline">
            ← Return to Customer Storefront
          </a>
        </div>
      </div>
    </div>
  );
}

