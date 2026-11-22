'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  MapPin,
  Package,
  Settings,
  LogOut,
  ShieldCheck,
  Heart,
  Camera,
  Trash2,
  Pencil,
  Plus,
  CheckCircle2,
  Star,
  Calendar,
  Phone,
  Mail,
  Lock,
  Bell,
  ArrowRight,
  LayoutDashboard,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRealtimeSubscription } from '@/context/RealtimeContext';
import { Address, GenderOption, Order, User } from '@/types';
import { formatINR } from '@/lib/utils';
import AddressFormModal from '@/components/account/AddressFormModal';
import ConfirmDialog from '@/components/account/ConfirmDialog';

type AccountTab = 'overview' | 'profile' | 'addresses' | 'orders' | 'settings';

function getInitials(name?: string | null): string {
  if (!name) return 'C';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'C';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export default function AccountPage() {
  const router = useRouter();
  const { user: authUser, isAdmin, isLoading: authLoading, logout, updateUserState } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AccountTab>('overview');
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [completion, setCompletion] = useState<{ percentage: number; missing: string[] }>({
    percentage: 0,
    missing: [],
  });
  const [dataLoading, setDataLoading] = useState(true);

  // Personal Info Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<GenderOption | ''>('');
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyPromos, setNotifyPromos] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Profile Photo Upload Preview State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Address Modal & Confirmation Dialogs
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const hydrateUserFields = useCallback((u: User) => {
    setProfileUser(u);
    setFullName(u.full_name || '');
    setPhone(u.phone || '');
    setEmail(u.email || '');
    setDob(u.date_of_birth || '');
    setGender(u.gender || '');
    setNotifyOrders(u.notification_preferences?.order_updates ?? true);
    setNotifyPromos(u.notification_preferences?.promotions ?? false);
  }, []);

  const loadAccountData = useCallback(async () => {
    if (!authUser) return;
    try {
      const [profRes, ordRes] = await Promise.all([
        fetch('/api/account/profile', { cache: 'no-store' }),
        fetch('/api/orders', { cache: 'no-store' }),
      ]);
      if (profRes.status === 401) {
        router.push('/login?redirect=/account');
        return;
      }
      if (profRes.ok) {
        const profData = await profRes.json();
        if (profData.user) hydrateUserFields(profData.user);
        if (Array.isArray(profData.addresses)) setAddresses(profData.addresses);
        if (profData.completion) setCompletion(profData.completion);
      }
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        if (Array.isArray(ordData.orders)) setOrders(ordData.orders);
      }
    } catch {
      // ignore transient network glitches
    } finally {
      setDataLoading(false);
    }
  }, [authUser, router, hydrateUserFields]);

  useEffect(() => {
    let active = true;
    if (!authLoading && !authUser) {
      router.push('/login?redirect=/account');
      return;
    }
    if (!authLoading && authUser) {
      Promise.all([
        fetch('/api/account/profile', { cache: 'no-store' }),
        fetch('/api/orders', { cache: 'no-store' }),
      ])
        .then(async ([profRes, ordRes]) => {
          if (!active) return;
          if (profRes.status === 401) {
            router.push('/login?redirect=/account');
            return;
          }
          if (profRes.ok) {
            const profData = await profRes.json();
            if (active && profData.user) hydrateUserFields(profData.user);
            if (active && Array.isArray(profData.addresses)) setAddresses(profData.addresses);
            if (active && profData.completion) setCompletion(profData.completion);
          }
          if (ordRes.ok) {
            const ordData = await ordRes.json();
            if (active && Array.isArray(ordData.orders)) setOrders(ordData.orders);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setDataLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [authLoading, authUser, router, hydrateUserFields]);

  useRealtimeSubscription(
    [
      'USER_ADDRESSES_UPDATED',
      'USER_PROFILE_UPDATED',
      'ORDER_CREATED',
      'ORDER_STATUS_CHANGED',
      'ORDER_PAYMENT_STATUS_CHANGED',
    ],
    () => {
      loadAccountData();
    }
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Recalculate client completion summary whenever addresses change locally
  const recomputeCompletion = useCallback(
    (nextUser: User, addrList: Address[]) => {
      const checks = [
        Boolean(nextUser.full_name && nextUser.full_name.trim().length >= 2),
        Boolean(nextUser.phone && nextUser.phone.trim().length >= 10),
        Boolean(nextUser.email && nextUser.email.trim().length > 0),
        Boolean(nextUser.avatar_url),
        Boolean(nextUser.date_of_birth),
        Boolean(nextUser.gender),
        addrList.length > 0,
      ];
      const labels = [
        'Full name',
        'Mobile number',
        'Email address',
        'Profile photo',
        'Date of birth',
        'Gender',
        'Saved address',
      ];
      const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
      const missing = labels.filter((_, i) => !checks[i]);
      setCompletion({ percentage: pct, missing });
    },
    []
  );

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please select a valid JPG, PNG, WEBP, GIF, or AVIF image.', 'error');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast('Image size must be 3 MB or less.', 'error');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSavePhoto() {
    if (!selectedFile) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const res = await fetch('/api/account/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.user) {
        showToast(data.message || 'Could not upload profile photo.', 'error');
        return;
      }
      hydrateUserFields(data.user);
      updateUserState(data.user);
      recomputeCompletion(data.user, addresses);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      showToast('Profile photo updated!', 'success');
    } catch {
      showToast('Failed to upload photo.', 'error');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleRemovePhotoConfirmed() {
    setActionBusy(true);
    try {
      const res = await fetch('/api/account/avatar', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.user) {
        showToast(data.message || 'Could not remove photo.', 'error');
        return;
      }
      hydrateUserFields(data.user);
      updateUserState(data.user);
      recomputeCompletion(data.user, addresses);
      setConfirmRemovePhoto(false);
      showToast('Profile photo removed.', 'success');
    } catch {
      showToast('Failed to remove photo.', 'error');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveProfile(e?: React.FormEvent, overrides?: { notifyOrders?: boolean; notifyPromos?: boolean }) {
    if (e) e.preventDefault();
    setProfileError(null);

    const nextOrders = overrides?.notifyOrders ?? notifyOrders;
    const nextPromos = overrides?.notifyPromos ?? notifyPromos;

    setProfileSaving(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          date_of_birth: dob || null,
          gender: gender || null,
          notification_preferences: {
            order_updates: nextOrders,
            promotions: nextPromos,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        const msg = data.message || 'Could not save profile changes.';
        setProfileError(msg);
        showToast(msg, 'error');
        return;
      }
      hydrateUserFields(data.user);
      updateUserState(data.user);
      if (data.completion) setCompletion(data.completion);
      showToast('Profile information saved successfully!', 'success');
    } catch {
      setProfileError('Network error while saving profile.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.message || 'Password update failed.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Your password has been updated securely.', 'success');
    } catch {
      setPasswordError('Network error while updating password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleSetDefaultAddress(addrId: string) {
    try {
      const res = await fetch(`/api/addresses/${addrId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Unable to set default address.', 'error');
        return;
      }
      setAddresses((prev) =>
        prev
          .map((a) => ({ ...a, is_default: a.id === addrId }))
          .sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)))
      );
      showToast('Default delivery address updated!', 'success');
    } catch {
      showToast('Failed to update default address.', 'error');
    }
  }

  async function handleConfirmDeleteAddress() {
    if (!addressToDelete) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/addresses/${addressToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Unable to delete address.', 'error');
        setAddressToDelete(null);
        return;
      }
      const next = addresses.filter((a) => a.id !== addressToDelete.id);
      setAddresses(next);
      if (profileUser) recomputeCompletion(profileUser, next);
      setAddressToDelete(null);
      showToast('Delivery address deleted.', 'success');
    } catch {
      showToast('Failed to delete address.', 'error');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSignOutConfirmed() {
    setActionBusy(true);
    await logout();
  }

  if (authLoading || dataLoading) {
    return (
      <div className="py-10 bg-[#FFFDFB] w-full">
        <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-6 animate-pulse">
          <div className="h-36 bg-white rounded-3xl border border-[#F5D3DC]" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 h-72 bg-white rounded-3xl border border-[#F5D3DC]" />
            <div className="lg:col-span-9 h-96 bg-white rounded-3xl border border-[#F5D3DC]" />
          </div>
        </div>
      </div>
    );
  }

  if (!authUser || !profileUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <p className="text-sm text-[#70132C]">Redirecting to sign in...</p>
        <Link
          href="/login?redirect=/account"
          className="px-6 py-2.5 bg-[#8F1237] text-white rounded-full text-xs font-bold"
        >
          Sign In to Your Account
        </Link>
      </div>
    );
  }

  const displayedAvatar = previewUrl || profileUser.avatar_url;
  const initials = getInitials(profileUser.full_name);
  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0] || null;
  const latestOrder = orders[0] || null;

  const navItems: { id: AccountTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Profile Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'Personal Info & Photo', icon: UserIcon },
    { id: 'addresses', label: `Saved Addresses (${addresses.length})`, icon: MapPin },
    { id: 'orders', label: `Order History (${orders.length})`, icon: Package },
    { id: 'settings', label: 'Account Settings', icon: Settings },
  ];

  return (
    <div className="py-6 sm:py-10 bg-[#FFFDFB] w-full overflow-x-hidden">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-6">
        {/* Top Profile Summary Card */}
        <section className="p-5 sm:p-7 bg-white rounded-3xl border border-[#F5D3DC] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              {/* Circular Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#8F1237] to-[#630B25] text-white flex items-center justify-center font-serif font-extrabold text-2xl shadow-md ring-4 ring-[#FCE8ED]">
                  {displayedAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayedAvatar}
                      alt={profileUser.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    title="Change profile photo"
                    aria-label="Change profile photo"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-[#F5D3DC] text-[#8F1237] hover:bg-[#8F1237] hover:text-white flex items-center justify-center shadow-sm transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#70132C]">
                    {profileUser.full_name}
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FCE8ED] text-[#8F1237]">
                    {isAdmin ? 'Bakery Owner' : 'Verified Customer'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-[#8C485A]">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-[#8F1237]" />
                    {profileUser.phone}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#8F1237]" />
                    {profileUser.email || 'Email not added'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#8F1237]" />
                    Member since{' '}
                    {new Date(profileUser.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Profile Completion + Edit Button */}
            <div className="flex flex-col sm:items-end gap-3 min-w-[230px]">
              {!isAdmin ? (
                <div className="w-full sm:w-64 p-3 rounded-2xl bg-[#FFF6F0] border border-[#F5D3DC]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#70132C] mb-1.5">
                    <span>Profile Completion</span>
                    <span className="text-[#8F1237]">{completion.percentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white overflow-hidden border border-[#F5D3DC]">
                    <div
                      className="h-full bg-gradient-to-r from-[#8F1237] to-[#D9466E] transition-all duration-300"
                      style={{ width: `${completion.percentage}%` }}
                    />
                  </div>
                  {completion.missing.length > 0 ? (
                    <p className="text-[11px] text-[#8C485A] mt-1.5 line-clamp-1">
                      Next: Add {completion.missing[0].toLowerCase()}
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> All profile details complete
                    </p>
                  )}
                </div>
              ) : (
                <Link
                  href="/admin/products"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8F1237] text-white rounded-full text-xs font-bold hover:bg-[#750E2D] shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Open Owner Admin Desk</span>
                </Link>
              )}

              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-[#8F1237] text-[#8F1237] hover:bg-[#8F1237] hover:text-white text-xs font-bold transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Mobile Tab Navigation */}
        <nav
          aria-label="Account sections"
          className="flex lg:hidden items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border transition-all ${
                  active
                    ? 'bg-[#8F1237] text-white border-[#8F1237] shadow-xs'
                    : 'bg-white text-[#70132C] border-[#F5D3DC]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Sidebar + Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col justify-between bg-white rounded-3xl border border-[#F5D3DC] shadow-sm p-4 min-h-[520px]">
            <div className="space-y-1.5">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8C485A]">
                My Account
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left ${
                      active
                        ? 'bg-[#8F1237] text-white shadow-sm'
                        : 'text-[#70132C] hover:bg-[#FFF6F0]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="pt-2 border-t border-[#F5D3DC]/60 mt-3 space-y-1">
                <Link
                  href="/wishlist"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-[#70132C] hover:bg-[#FFF6F0] transition-colors"
                >
                  <Heart className="w-4 h-4 text-[#8F1237]" />
                  <span>Wishlist Flavours</span>
                </Link>
                <Link
                  href="/cakes"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-[#70132C] hover:bg-[#FFF6F0] transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-[#8F1237]" />
                  <span>Browse Bakery Menu</span>
                </Link>
              </div>
            </div>

            {/* Sign Out at Bottom of Left Sidebar */}
            <div className="pt-4 mt-6 border-t border-[#F5D3DC]">
              <button
                type="button"
                onClick={() => setConfirmSignOutOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-600 hover:text-white text-xs font-bold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-9 space-y-6">
            {/* A. PROFILE OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="p-5 bg-white rounded-3xl border border-[#F5D3DC] hover:border-[#8F1237] text-left transition-all shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FCE8ED] text-[#8F1237] flex items-center justify-center mb-3">
                      <Package className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-extrabold text-[#70132C]">{orders.length}</p>
                    <p className="text-xs text-[#8C485A] font-semibold mt-0.5">Total Orders Placed</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('addresses')}
                    className="p-5 bg-white rounded-3xl border border-[#F5D3DC] hover:border-[#8F1237] text-left transition-all shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FCE8ED] text-[#8F1237] flex items-center justify-center mb-3">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-extrabold text-[#70132C]">{addresses.length}</p>
                    <p className="text-xs text-[#8C485A] font-semibold mt-0.5">Saved Delivery Addresses</p>
                  </button>

                  <Link
                    href="/wishlist"
                    className="p-5 bg-white rounded-3xl border border-[#F5D3DC] hover:border-[#8F1237] text-left transition-all shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FCE8ED] text-[#8F1237] flex items-center justify-center mb-3">
                      <Heart className="w-5 h-5" />
                    </div>
                    <p className="text-base font-serif font-extrabold text-[#70132C] mt-1">
                      Wishlist &amp; Reorder
                    </p>
                    <p className="text-xs text-[#8C485A] mt-0.5">View saved favourite cakes →</p>
                  </Link>
                </div>

                {/* Default Address Snapshot + Latest Order */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h2 className="font-serif text-lg font-extrabold text-[#70132C]">
                          Default Delivery Address
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('addresses')}
                          className="text-xs font-bold text-[#8F1237] hover:underline"
                        >
                          Manage
                        </button>
                      </div>

                      {defaultAddress ? (
                        <div className="p-4 rounded-2xl bg-[#FFF6F0] border border-[#F5D3DC] space-y-1 text-xs text-[#70132C]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#8F1237]">
                              {defaultAddress.address_type || defaultAddress.label || 'Home'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Default
                            </span>
                          </div>
                          <p className="font-bold">{defaultAddress.recipient_name}</p>
                          <p>
                            {defaultAddress.house_no || defaultAddress.address_line1}
                            {defaultAddress.street_name ? `, ${defaultAddress.street_name}` : ''}
                          </p>
                          <p>
                            {defaultAddress.area_locality || defaultAddress.city},{' '}
                            {defaultAddress.district || defaultAddress.city}, {defaultAddress.state} -{' '}
                            <span className="font-bold">{defaultAddress.pincode}</span>
                          </p>
                          <p className="text-[#8C485A] font-mono pt-1">Mobile: {defaultAddress.phone}</p>
                        </div>
                      ) : (
                        <div className="p-5 rounded-2xl bg-[#FFFDFB] border border-dashed border-[#F5D3DC] text-center space-y-2">
                          <p className="text-xs text-[#8C485A]">
                            No saved delivery address yet. Save one for instant checkout auto-fill.
                          </p>
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddress(null);
                                setAddressModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-[#8F1237] text-white rounded-full text-xs font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Address
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h2 className="font-serif text-lg font-extrabold text-[#70132C]">
                          Recent Order
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('orders')}
                          className="text-xs font-bold text-[#8F1237] hover:underline"
                        >
                          View All
                        </button>
                      </div>

                      {latestOrder ? (
                        <div className="p-4 rounded-2xl bg-[#FFF6F0] border border-[#F5D3DC] space-y-2 text-xs text-[#70132C]">
                          <div className="flex items-center justify-between">
                            <span className="font-serif font-bold text-sm text-[#8F1237]">
                              #{latestOrder.order_code}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#F5D3DC] font-bold text-[10px]">
                              {latestOrder.order_status}
                            </span>
                          </div>
                          <p className="text-[#8C485A]">
                            {latestOrder.items.length} item(s) • Total{' '}
                            <strong className="text-[#70132C]">
                              {formatINR(latestOrder.total_paise)}
                            </strong>
                          </p>
                          <p className="text-[#8C485A]">
                            {latestOrder.fulfilment_type === 'pickup' ? 'Store Pickup' : 'Delivery'} on{' '}
                            {latestOrder.delivery_date} ({latestOrder.delivery_slot})
                          </p>
                          <Link
                            href={`/orders/${latestOrder.id}`}
                            className="inline-flex items-center gap-1 font-bold text-[#8F1237] hover:underline pt-1"
                          >
                            <span>Track &amp; View Order</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      ) : (
                        <div className="p-5 rounded-2xl bg-[#FFFDFB] border border-dashed border-[#F5D3DC] text-center space-y-2">
                          <p className="text-xs text-[#8C485A]">
                            You haven&apos;t ordered any freshly baked cakes yet.
                          </p>
                          <Link
                            href="/cakes"
                            className="inline-flex items-center gap-1 px-4 py-2 bg-[#8F1237] text-white rounded-full text-xs font-bold"
                          >
                            <span>Explore Cakes</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* B & C. PERSONAL INFORMATION + PROFILE PHOTO */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Profile Photo Card */}
                {!isAdmin && (
                  <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4">
                    <h2 className="font-serif text-xl font-extrabold text-[#70132C]">
                      Profile Photo
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#8F1237] to-[#630B25] text-white flex items-center justify-center font-serif font-extrabold text-3xl shadow-md ring-4 ring-[#FCE8ED] shrink-0">
                        {displayedAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={displayedAvatar}
                            alt="Profile avatar preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>

                      <div className="space-y-3 text-center sm:text-left">
                        <p className="text-xs text-[#8C485A] max-w-md">
                          Upload a clear photo (JPG, PNG, WEBP, GIF, or AVIF up to 3 MB). You can
                          preview your photo before saving.
                        </p>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#8F1237] text-[#8F1237] hover:bg-[#FFF6F0] text-xs font-bold"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{displayedAvatar ? 'Choose New Photo' : 'Upload Photo'}</span>
                          </button>

                          {selectedFile && (
                            <button
                              type="button"
                              disabled={photoUploading}
                              onClick={handleSavePhoto}
                              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#8F1237] hover:bg-[#750E2D] text-white text-xs font-bold shadow-xs disabled:opacity-50"
                            >
                              {photoUploading ? 'Uploading...' : 'Save Photo'}
                            </button>
                          )}

                          {selectedFile && (
                            <button
                              type="button"
                              onClick={() => {
                                if (previewUrl) URL.revokeObjectURL(previewUrl);
                                setSelectedFile(null);
                                setPreviewUrl(null);
                              }}
                              className="px-4 py-2 rounded-full border border-[#F5D3DC] text-xs font-bold text-[#8C485A]"
                            >
                              Cancel Preview
                            </button>
                          )}

                          {profileUser.avatar_url && !selectedFile && (
                            <button
                              type="button"
                              onClick={() => setConfirmRemovePhoto(true)}
                              className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove Photo</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Information Form */}
                <form
                  onSubmit={(e) => handleSaveProfile(e)}
                  className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-5"
                >
                  <div>
                    <h2 className="font-serif text-xl font-extrabold text-[#70132C]">
                      Personal Information
                    </h2>
                    <p className="text-xs text-[#8C485A] mt-0.5">
                      These details automatically fill checkout forms when you place cake orders
                    </p>
                  </div>

                  {profileError && (
                    <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                      {profileError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label htmlFor="prof-name" className="block text-xs font-bold text-[#70132C] mb-1">
                        Full Name *
                      </label>
                      <input
                        id="prof-name"
                        type="text"
                        required
                        disabled={isAdmin}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237] disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="prof-phone" className="block text-xs font-bold text-[#70132C] mb-1">
                        Registered Mobile Number *
                      </label>
                      <input
                        id="prof-phone"
                        type="tel"
                        required
                        disabled={isAdmin}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit Indian mobile"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237] disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="prof-email" className="block text-xs font-bold text-[#70132C] mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        id="prof-email"
                        type="email"
                        disabled={isAdmin}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237] disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="prof-dob" className="block text-xs font-bold text-[#70132C] mb-1">
                        Date of Birth (Optional)
                      </label>
                      <input
                        id="prof-dob"
                        type="date"
                        disabled={isAdmin}
                        max={new Date().toISOString().slice(0, 10)}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237] disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="prof-gender" className="block text-xs font-bold text-[#70132C] mb-1">
                        Gender (Optional)
                      </label>
                      <select
                        id="prof-gender"
                        disabled={isAdmin}
                        value={gender}
                        onChange={(e) => setGender(e.target.value as GenderOption | '')}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] bg-white focus:outline-none focus:border-[#8F1237] disabled:bg-gray-50"
                      >
                        <option value="">Prefer not to specify</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  {!isAdmin && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="px-6 py-2.5 rounded-full bg-[#8F1237] hover:bg-[#750E2D] text-white text-xs font-bold shadow-sm disabled:opacity-50"
                      >
                        {profileSaving ? 'Saving Changes...' : 'Save Personal Details'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* D. SAVED ADDRESSES */}
            {activeTab === 'addresses' && (
              <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-xl font-extrabold text-[#70132C]">
                      Saved Delivery Addresses
                    </h2>
                    <p className="text-xs text-[#8C485A] mt-0.5">
                      Manage multiple addresses and set a default address for one-tap checkout
                    </p>
                  </div>

                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(null);
                        setAddressModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#8F1237] hover:bg-[#750E2D] text-white text-xs font-bold shadow-sm shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Address</span>
                    </button>
                  )}
                </div>

                {addresses.length === 0 ? (
                  <div className="p-10 rounded-3xl bg-[#FFFDFB] border border-dashed border-[#F5D3DC] text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#FCE8ED] text-[#8F1237] flex items-center justify-center mx-auto">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#70132C]">
                      No saved addresses yet
                    </h3>
                    <p className="text-xs text-[#8C485A] max-w-sm mx-auto">
                      Add your Home or Work address so checkout auto-fills your delivery details every time.
                    </p>
                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddress(null);
                          setAddressModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#8F1237] text-white text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Your First Address</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => {
                      const isOnlyOrNotDefault = !addr.is_default || addresses.length === 1;
                      return (
                        <div
                          key={addr.id}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                            addr.is_default
                              ? 'border-[#8F1237] bg-[#FFF6F0]/60 shadow-xs'
                              : 'border-[#F5D3DC] bg-white'
                          }`}
                        >
                          <div className="space-y-1.5 text-xs text-[#70132C]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] px-2.5 py-0.5 rounded-full bg-[#FCE8ED] text-[#8F1237]">
                                {addr.address_type || addr.label || 'Home'}
                              </span>
                              {addr.is_default && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                  <Star className="w-3 h-3 fill-emerald-600" />
                                  Default
                                </span>
                              )}
                            </div>

                            <p className="text-sm font-bold text-[#33252A] pt-1">
                              {addr.recipient_name}
                            </p>
                            <p className="leading-relaxed">
                              {addr.house_no || addr.address_line1}
                              {addr.street_name ? `, ${addr.street_name}` : ''}
                            </p>
                            {(addr.area_locality || addr.address_line2) && (
                              <p>{addr.area_locality || addr.address_line2}</p>
                            )}
                            {addr.landmark && (
                              <p className="text-[#8C485A]">Landmark: {addr.landmark}</p>
                            )}
                            <p>
                              {addr.city}
                              {addr.district && addr.district !== addr.city ? `, ${addr.district}` : ''}
                              , {addr.state} — <strong className="font-mono">{addr.pincode}</strong>
                            </p>
                            <p className="font-mono text-[#8C485A] pt-1">
                              Mobile: {addr.phone}
                              {addr.alternate_phone ? ` • Alt: ${addr.alternate_phone}` : ''}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#F5D3DC]/60">
                            {!addr.is_default && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="px-3.5 py-1.5 rounded-full bg-[#FCE8ED] hover:bg-[#8F1237] text-[#8F1237] hover:text-white text-[11px] font-bold transition-colors"
                              >
                                Set as Default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddress(addr);
                                setAddressModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-[#F5D3DC] hover:border-[#8F1237] text-[#70132C] text-[11px] font-bold"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              title={
                                isOnlyOrNotDefault
                                  ? 'Delete address'
                                  : 'Set another address as default before deleting'
                              }
                              onClick={() => {
                                if (!isOnlyOrNotDefault) {
                                  showToast(
                                    'Please set another address as default before deleting this default address.',
                                    'error'
                                  );
                                  return;
                                }
                                setAddressToDelete(addr);
                              }}
                              className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-[11px] font-bold ${
                                isOnlyOrNotDefault
                                  ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* E. ORDER HISTORY */}
            {activeTab === 'orders' && (
              <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-xl font-extrabold text-[#70132C]">
                      Your Order History
                    </h2>
                    <p className="text-xs text-[#8C485A] mt-0.5">
                      Real-time baking status, invoices, and delivery tracking for your orders
                    </p>
                  </div>
                  <Link
                    href="/cakes"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#8F1237] text-white text-xs font-bold shrink-0"
                  >
                    <span>Order Another Cake</span>
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <div className="p-10 rounded-3xl bg-[#FFFDFB] border border-dashed border-[#F5D3DC] text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#FCE8ED] text-[#8F1237] flex items-center justify-center mx-auto">
                      <Package className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#70132C]">No orders placed yet</h3>
                    <p className="text-xs text-[#8C485A] max-w-sm mx-auto">
                      Explore our regular, fruit, and special handcrafted cakes to place your first order.
                    </p>
                    <Link
                      href="/cakes"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#8F1237] text-white text-xs font-bold"
                    >
                      <span>Browse Cake Menu</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-5 rounded-2xl border border-[#F5D3DC] hover:border-[#8F1237] bg-[#FFFDFB] transition-all space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F5D3DC]/60 pb-3">
                          <div>
                            <span className="font-serif font-extrabold text-base text-[#8F1237]">
                              Order #{order.order_code}
                            </span>
                            <span className="text-xs text-[#8C485A] block">
                              Placed on{' '}
                              {new Date(order.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#FCE8ED] text-[#8F1237]">
                              {order.order_status}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                order.payment_status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.payment_status === 'failed'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.payment_method === 'cod' ? 'COD' : 'Razorpay'} •{' '}
                              {order.payment_status}
                            </span>
                            <span className="text-base font-extrabold text-[#33252A] pl-1">
                              {formatINR(order.total_paise)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#70132C]">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-2">
                              <span>
                                {item.quantity} × {item.product_name} ({item.weight_kg} Kg
                                {item.eggless ? ', Eggless' : ''})
                              </span>
                              <span className="font-bold">{formatINR(item.line_total_paise)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-[#F5D3DC]/50 text-xs">
                          <span className="text-[#8C485A]">
                            <strong className="uppercase">{order.fulfilment_type}:</strong>{' '}
                            {order.delivery_date} ({order.delivery_slot})
                          </span>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/orders/${order.id}`}
                              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full border border-[#8F1237] text-[#8F1237] hover:bg-[#8F1237] hover:text-white font-bold transition-colors"
                            >
                              <span>View Order Details</span>
                            </Link>
                            <Link
                              href={`/orders/${order.id}`}
                              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#8F1237] text-white hover:bg-[#750E2D] font-bold transition-colors"
                            >
                              <span>Track Order</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* F. ACCOUNT SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Change Password */}
                {!isAdmin && (
                  <form
                    onSubmit={handlePasswordChange}
                    className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FCE8ED] text-[#8F1237] flex items-center justify-center">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-serif text-lg font-extrabold text-[#70132C]">
                          Change Password
                        </h2>
                        <p className="text-xs text-[#8C485A]">
                          Use at least 8 characters to keep your account protected
                        </p>
                      </div>
                    </div>

                    {passwordError && (
                      <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                        {passwordError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-sm">
                      <div>
                        <label htmlFor="pwd-current" className="block text-xs font-bold text-[#70132C] mb-1">
                          Current Password *
                        </label>
                        <input
                          id="pwd-current"
                          type="password"
                          required
                          autoComplete="current-password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
                        />
                      </div>

                      <div>
                        <label htmlFor="pwd-new" className="block text-xs font-bold text-[#70132C] mb-1">
                          New Password (min 8) *
                        </label>
                        <input
                          id="pwd-new"
                          type="password"
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
                        />
                      </div>

                      <div>
                        <label htmlFor="pwd-confirm" className="block text-xs font-bold text-[#70132C] mb-1">
                          Confirm New Password *
                        </label>
                        <input
                          id="pwd-confirm"
                          type="password"
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={passwordSaving}
                        className="px-6 py-2.5 rounded-full bg-[#8F1237] hover:bg-[#750E2D] text-white text-xs font-bold shadow-sm disabled:opacity-50"
                      >
                        {passwordSaving ? 'Updating Password...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Notification Preferences */}
                {!isAdmin && (
                  <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#FCE8ED] text-[#8F1237] flex items-center justify-center">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="font-serif text-lg font-extrabold text-[#70132C]">
                          Notification Preferences
                        </h2>
                        <p className="text-xs text-[#8C485A]">
                          Choose how you would like updates from Nila&apos;s Treat
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <label className="flex items-center justify-between p-4 rounded-2xl border border-[#F5D3DC] bg-[#FFFDFB] cursor-pointer">
                        <div>
                          <span className="font-bold text-[#33252A] block text-xs sm:text-sm">
                            Order &amp; Baking Status Updates
                          </span>
                          <span className="text-xs text-[#8C485A]">
                            Live notifications when your cake is confirmed, baked, or out for delivery
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyOrders}
                          onChange={(e) => {
                            const nextVal = e.target.checked;
                            setNotifyOrders(nextVal);
                            handleSaveProfile(undefined, { notifyOrders: nextVal });
                          }}
                          className="w-5 h-5 accent-[#8F1237] shrink-0"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 rounded-2xl border border-[#F5D3DC] bg-[#FFFDFB] cursor-pointer">
                        <div>
                          <span className="font-bold text-[#33252A] block text-xs sm:text-sm">
                            Festival Offers &amp; Coupon Alerts
                          </span>
                          <span className="text-xs text-[#8C485A]">
                            Receive special seasonal cake discounts and celebration coupons
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyPromos}
                          onChange={(e) => {
                            const nextVal = e.target.checked;
                            setNotifyPromos(nextVal);
                            handleSaveProfile(undefined, { notifyPromos: nextVal });
                          }}
                          className="w-5 h-5 accent-[#8F1237] shrink-0"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Quick Contact & Address Shortcuts */}
                <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-base font-extrabold text-[#70132C]">
                      Update Email, Mobile Number &amp; Delivery Addresses
                    </h3>
                    <p className="text-xs text-[#8C485A]">
                      Update your registered phone or email safely in Personal Info, or manage delivery addresses.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="px-4 py-2 rounded-full border border-[#F5D3DC] hover:border-[#8F1237] text-xs font-bold text-[#70132C]"
                    >
                      Edit Phone / Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('addresses')}
                      className="px-4 py-2 rounded-full bg-[#FCE8ED] text-xs font-bold text-[#8F1237]"
                    >
                      Manage Addresses
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Bottom Sign Out Card */}
            <div className="lg:hidden pt-2">
              <div className="p-5 bg-white rounded-3xl border border-rose-200 shadow-xs flex items-center justify-between gap-4">
                <div>
                  <p className="font-serif font-bold text-sm text-[#70132C]">Ready to step away?</p>
                  <p className="text-xs text-[#8C485A]">Securely sign out of your account on this device.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmSignOutOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Add / Edit Address Modal */}
      <AddressFormModal
        key={editingAddress?.id || (addressModalOpen ? 'new-open' : 'closed')}
        open={addressModalOpen}
        initialAddress={editingAddress}
        defaultRecipientName={profileUser.full_name}
        defaultPhone={profileUser.phone}
        onClose={() => {
          setAddressModalOpen(false);
          setEditingAddress(null);
        }}
        onSaved={(saved, isEdit) => {
          setAddresses((prev) => {
            let next: Address[];
            if (isEdit) {
              next = prev.map((a) =>
                a.id === saved.id ? saved : saved.is_default ? { ...a, is_default: false } : a
              );
            } else {
              const cleared = saved.is_default
                ? prev.map((a) => ({ ...a, is_default: false }))
                : prev;
              next = [saved, ...cleared];
            }
            next.sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)));
            recomputeCompletion(profileUser, next);
            return next;
          });
          setAddressModalOpen(false);
          setEditingAddress(null);
          showToast(isEdit ? 'Address updated!' : 'New address added to your profile!', 'success');
        }}
      />

      {/* Delete Address Confirmation */}
      <ConfirmDialog
        open={Boolean(addressToDelete)}
        title="Delete Saved Address?"
        description={
          addressToDelete
            ? `Remove "${addressToDelete.address_type || addressToDelete.label || 'Saved'} (${addressToDelete.pincode})" from your saved addresses? Existing orders remain unchanged.`
            : ''
        }
        confirmLabel="Delete Address"
        danger
        isBusy={actionBusy}
        onConfirm={handleConfirmDeleteAddress}
        onCancel={() => setAddressToDelete(null)}
      />

      {/* Remove Photo Confirmation */}
      <ConfirmDialog
        open={confirmRemovePhoto}
        title="Remove Profile Photo?"
        description="Your circular avatar will revert to showing your initials until you upload a new photo."
        confirmLabel="Remove Photo"
        danger
        isBusy={actionBusy}
        onConfirm={handleRemovePhotoConfirmed}
        onCancel={() => setConfirmRemovePhoto(false)}
      />

      {/* Sign Out Confirmation */}
      <ConfirmDialog
        open={confirmSignOutOpen}
        title="Sign Out of Nila's Treat?"
        description="Your session will end securely on this browser. You can sign back in anytime using your mobile number and password."
        confirmLabel="Yes, Sign Out"
        danger
        isBusy={actionBusy}
        onConfirm={handleSignOutConfirmed}
        onCancel={() => setConfirmSignOutOpen(false)}
      />
    </div>
  );
}
