'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import {
  Users,
  Phone,
  RefreshCw,
  UserCheck,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  Eye,
  X,
  Lock,
} from 'lucide-react';
import { CustomerLoginRecord } from '@/types';
import { formatINR } from '@/lib/utils';
import { useRealtimeSubscription } from '@/context/RealtimeContext';

interface CustomerOrderSummary {
  id: string;
  order_code: string;
  created_at: string;
  order_status: string;
  total_paise: number;
  items_summary: string;
}

interface VerifiedCustomer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  orders_count: number;
  total_spent_paise: number;
  last_active: string;
  is_verified: boolean;
  recent_orders?: CustomerOrderSummary[];
}

export default function AdminCustomerLoginsPage() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [activeTab, setActiveTab] = useState<'directory' | 'logins'>('directory');
  const [logins, setLogins] = useState<CustomerLoginRecord[]>([]);
  const [customers, setCustomers] = useState<VerifiedCustomer[]>([]);
  const [, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedCustomer, setSelectedCustomer] = useState<VerifiedCustomer | null>(null);

  const fetchLogins = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/customer-logins', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.logins) {
          setLogins(data.logins);
        }
        if (data.customers) {
          setCustomers(data.customers);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/customer-logins', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.logins) setLogins(data.logins);
        if (data.customers) setCustomers(data.customers);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (active) {
          setIsLoading(false);
          setLastRefreshed(new Date());
        }
      });

    const interval = setInterval(fetchLogins, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchLogins]);

  useRealtimeSubscription(['CUSTOMER_LOGGED_IN'], (event) => {
    const rec = event.data as CustomerLoginRecord;
    if (rec && rec.id) {
      setLogins((prev) => {
        if (prev.some((l) => l.id === rec.id)) return prev;
        return [rec, ...prev];
      });
    } else {
      fetchLogins();
    }
  });

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getTimeAgo = (isoString: string) => {
    if (!isoString) return '';
    try {
      const diffMs = lastRefreshed.getTime() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 45) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
      return `${Math.floor(diffHr / 24)}d ago`;
    } catch {
      return '';
    }
  };

  const filteredCustomers = customers.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.full_name.toLowerCase().includes(q) ||
      item.phone.includes(q) ||
      (item.email && item.email.toLowerCase().includes(q))
    );
  });

  const filteredLogins = logins.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.full_name.toLowerCase().includes(q) ||
      item.phone.includes(q) ||
      (item.email && item.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#FFFDFB]">
      <AdminNav />

      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 space-y-6">
        
        {/* Header & Live Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#70132C]">
                Customer Verification &amp; Accounts
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Sync
              </span>
            </div>
            <p className="text-xs text-[#8C485A] mt-1">
              Verify customer accounts, view detailed customer profiles, order history, and track real-time logins.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#8C485A]" suppressHydrationWarning>
              Updated: {mounted ? lastRefreshed.toLocaleTimeString() : 'Connecting...'}
            </span>
            <button
              onClick={fetchLogins}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#F5D3DC] hover:border-[#8F1237] text-[#8F1237] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#F5D3DC] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8C485A]">Registered Customers</span>
              <div className="w-8 h-8 rounded-xl bg-[#FCE8ED] text-[#8F1237] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="font-serif text-2xl font-black text-[#70132C] mt-2">
              {customers.length}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#F5D3DC] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8C485A]">Total Customer Login Sessions</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="font-serif text-2xl font-black text-blue-700 mt-2">
              {logins.length}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#F5D3DC] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8C485A]">New Customer Signups</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="font-serif text-2xl font-black text-emerald-700 mt-2">
              {logins.filter((l) => l.type === 'register').length}
            </p>
          </div>
        </div>

        {/* Bakery Administrator Profile (View Only - Protected from Customer Portals) */}
        <div className="bg-[#FFF6F0] border border-[#F5D3DC] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#70132C] text-white flex items-center justify-center font-serif text-base font-black shadow-xs shrink-0">
              NT
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif font-extrabold text-base text-[#70132C]">
                  Nila&apos;s Treat Owner
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#70132C] text-white uppercase tracking-wider">
                  Admin Details (View Only)
                </span>
              </div>
              <p className="text-xs text-[#8C485A] mt-1 space-x-2">
                <span>Phone: <strong className="font-mono text-[#70132C]">9344597833</strong></span>
                <span>•</span>
                <span>Email: <strong className="text-[#70132C]">admin@nilastreat.com</strong></span>
              </p>
            </div>
          </div>

          <div className="text-xs text-[#8C485A] bg-white px-3.5 py-2 rounded-xl border border-[#F5D3DC] shrink-0 space-y-0.5">
            <div className="font-bold text-[#70132C] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#8F1237]" />
              <span>Master Admin Credentials</span>
            </div>
            <p className="text-[11px] text-[#8C485A]">
              View only. Cannot be used for customer orders or customer registration.
            </p>
          </div>
        </div>

        {/* Tab Toggle: Verified Customers vs Live Logins */}
        <div className="flex items-center gap-2 border-b border-[#F5D3DC] pb-2">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'directory'
                ? 'bg-[#8F1237] text-white shadow-xs'
                : 'bg-white text-[#70132C] border border-[#F5D3DC] hover:border-[#8F1237]'
            }`}
          >
            Verified Customer Directory ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('logins')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'logins'
                ? 'bg-[#8F1237] text-white shadow-xs'
                : 'bg-white text-[#70132C] border border-[#F5D3DC] hover:border-[#8F1237]'
            }`}
          >
            Live Customer Login Stream ({logins.length})
          </button>
        </div>

        {/* Search Filter */}
        <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-[#F5D3DC]">
          <input
            type="text"
            placeholder={
              activeTab === 'directory'
                ? 'Search customer by name, mobile number or email...'
                : 'Search login history by customer name or phone...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none text-[#33252A] placeholder:text-[#8C485A]/60 px-2"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#8F1237] font-bold hover:underline shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        {/* TAB 1: VERIFIED CUSTOMER DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="bg-white rounded-3xl border border-[#F5D3DC] overflow-hidden shadow-xs">
            {filteredCustomers.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="font-serif font-bold text-base text-[#70132C]">
                  No registered customers found
                </p>
                <p className="text-xs text-[#8C485A]">
                  When customers register with their mobile number and password, their verified profile will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FFF6F0] border-b border-[#F5D3DC] text-[#70132C] font-bold">
                      <tr>
                        <th className="py-3.5 px-6">Customer Name</th>
                        <th className="py-3.5 px-6">Phone Number</th>
                        <th className="py-3.5 px-6">Account Status</th>
                        <th className="py-3.5 px-6">Orders Placed</th>
                        <th className="py-3.5 px-6">Total Spent</th>
                        <th className="py-3.5 px-6">Joined Date</th>
                        <th className="py-3.5 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5D3DC]/60 text-[#33252A]">
                      {filteredCustomers.map((cust) => (
                        <tr key={cust.id} className="hover:bg-[#FFFDFC] transition-colors">
                          <td className="py-4 px-6 font-bold text-[#70132C]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#8F1237] text-white flex items-center justify-center font-serif text-xs font-black shrink-0">
                                {cust.full_name?.charAt(0).toUpperCase() || 'C'}
                              </div>
                              <div>
                                <span className="block">{cust.full_name}</span>
                                {cust.email && (
                                  <span className="block text-[10px] text-[#8C485A] font-normal">{cust.email}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-[#70132C]">
                            {cust.phone}
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified Account
                            </span>
                          </td>
                          <td className="py-4 px-6 font-bold text-[#70132C]">
                            <span className="inline-flex items-center gap-1">
                              <ShoppingBag className="w-3.5 h-3.5 text-[#8F1237]" />
                              {cust.orders_count} orders
                            </span>
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-emerald-700">
                            {formatINR(cust.total_spent_paise)}
                          </td>
                          <td className="py-4 px-6 text-[#33252A]" suppressHydrationWarning>
                            {mounted ? formatDateTime(cust.created_at) : '...'}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setSelectedCustomer(cust)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF6F0] hover:bg-[#8F1237] text-[#8F1237] hover:text-white border border-[#F5D3DC] text-xs font-bold transition-all active:scale-95 shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards for Customer Directory */}
                <div className="md:hidden divide-y divide-[#F5D3DC]">
                  {filteredCustomers.map((cust) => (
                    <div key={cust.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#8F1237] text-white flex items-center justify-center font-serif text-xs font-black">
                            {cust.full_name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#70132C] block">{cust.full_name}</span>
                            <span className="font-mono text-xs text-[#8C485A]">{cust.phone}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Verified
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F5D3DC]/50">
                        <span className="text-[#8C485A]">{cust.orders_count} Orders placed</span>
                        <span className="font-bold text-emerald-700">{formatINR(cust.total_spent_paise)}</span>
                      </div>

                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="w-full py-2 rounded-xl bg-[#FFF6F0] hover:bg-[#8F1237] text-[#8F1237] hover:text-white border border-[#F5D3DC] text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Customer Details</span>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: LIVE LOGIN ACTIVITY STREAM */}
        {activeTab === 'logins' && (
          <div className="bg-white rounded-3xl border border-[#F5D3DC] overflow-hidden shadow-xs">
            {filteredLogins.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="font-serif font-bold text-base text-[#70132C]">
                  No login activity recorded yet
                </p>
                <p className="text-xs text-[#8C485A]">
                  When customers sign in or register to order cakes, their name and login time will instantly appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FFF6F0] border-b border-[#F5D3DC] text-[#70132C] font-bold">
                      <tr>
                        <th className="py-3.5 px-6">Customer Name</th>
                        <th className="py-3.5 px-6">Phone Number</th>
                        <th className="py-3.5 px-6">Activity Type</th>
                        <th className="py-3.5 px-6">Login Time (Exact Date &amp; Time)</th>
                        <th className="py-3.5 px-6 text-right">Elapsed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5D3DC]/60 text-[#33252A]">
                      {filteredLogins.map((entry) => (
                        <tr key={entry.id} className="hover:bg-[#FFFDFC] transition-colors">
                          <td className="py-4 px-6 font-bold text-[#70132C]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#8F1237] text-white flex items-center justify-center font-serif text-xs font-black">
                                {entry.full_name?.charAt(0).toUpperCase() || 'C'}
                              </div>
                              <span>{entry.full_name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono font-medium text-[#70132C]">
                            {entry.phone}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                entry.type === 'register'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {entry.type === 'register' ? 'New Registration' : 'Signed In'}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-medium text-[#33252A]" suppressHydrationWarning>
                            {mounted ? formatDateTime(entry.login_time) : '...'}
                          </td>
                          <td className="py-4 px-6 text-right font-semibold text-[#8C485A]" suppressHydrationWarning>
                            {mounted ? getTimeAgo(entry.login_time) : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-[#F5D3DC]">
                  {filteredLogins.map((entry) => (
                    <div key={entry.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#8F1237] text-white flex items-center justify-center font-serif text-xs font-black">
                            {entry.full_name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <span className="font-bold text-sm text-[#70132C]">{entry.full_name}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            entry.type === 'register'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {entry.type === 'register' ? 'New Signup' : 'Login'}
                        </span>
                      </div>

                      <div className="text-xs text-[#8C485A] space-y-1 pl-9">
                        <p className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5 text-[#8F1237]" />
                          <span>{entry.phone}</span>
                        </p>
                        <p className="flex items-center justify-between pt-1 text-[11px] text-[#33252A]" suppressHydrationWarning>
                          <span>{mounted ? formatDateTime(entry.login_time) : '...'}</span>
                          <span className="font-bold text-[#8F1237]">{mounted ? getTimeAgo(entry.login_time) : ''}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* CUSTOMER DETAILS MODAL (VIEW OPTION) */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-[#F5D3DC] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-[#70132C] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFF6F0] text-[#70132C] flex items-center justify-center font-serif text-base font-black border-2 border-white/20">
                  {selectedCustomer.full_name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg text-white leading-tight">
                    {selectedCustomer.full_name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#FCE8ED]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Customer Profile</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              
              {/* Contact Information & Quick Actions */}
              <div className="bg-[#FFF6F0] p-4 rounded-2xl border border-[#F5D3DC] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#70132C]">Contact Information</span>
                  <a
                    href={`tel:${selectedCustomer.phone}`}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#8F1237] hover:bg-[#70132C] text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call Customer</span>
                  </a>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8C485A]">Mobile Phone:</span>
                    <span className="font-mono font-bold text-[#70132C]">{selectedCustomer.phone}</span>
                  </div>
                  {selectedCustomer.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#8C485A]">Email Address:</span>
                      <span className="text-[#70132C] font-medium">{selectedCustomer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between" suppressHydrationWarning>
                    <span className="text-[#8C485A]">Registered On:</span>
                    <span className="text-[#33252A]">
                      {mounted ? formatDateTime(selectedCustomer.created_at) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between" suppressHydrationWarning>
                    <span className="text-[#8C485A]">Last Activity:</span>
                    <span className="font-semibold text-[#8F1237]">
                      {mounted ? getTimeAgo(selectedCustomer.last_active) : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shopping & Order Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-[#F5D3DC]">
                  <span className="text-xs font-semibold text-[#8C485A] block">Total Orders</span>
                  <span className="font-serif text-2xl font-black text-[#70132C] block mt-1">
                    {selectedCustomer.orders_count}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#F5D3DC]">
                  <span className="text-xs font-semibold text-[#8C485A] block">Total Spent</span>
                  <span className="font-serif text-2xl font-black text-emerald-700 block mt-1">
                    {formatINR(selectedCustomer.total_spent_paise)}
                  </span>
                </div>
              </div>

              {/* Order History Preview */}
              <div>
                <h4 className="font-serif font-bold text-sm text-[#70132C] mb-2.5">
                  Recent Orders History
                </h4>

                {!selectedCustomer.recent_orders || selectedCustomer.recent_orders.length === 0 ? (
                  <div className="p-4 bg-[#FFFDFB] rounded-xl border border-[#F5D3DC] text-center text-xs text-[#8C485A]">
                    No past orders recorded for this customer yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.recent_orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 bg-white rounded-xl border border-[#F5D3DC] text-xs flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#8F1237]">
                              #{ord.order_code}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                              {ord.order_status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#33252A] font-medium">
                            {ord.items_summary}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[#70132C] block">
                            {formatINR(ord.total_paise)}
                          </span>
                          <span className="text-[10px] text-[#8C485A]" suppressHydrationWarning>
                            {mounted ? formatDateTime(ord.created_at) : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FFFDFC] border-t border-[#F5D3DC] flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 rounded-xl bg-[#8F1237] hover:bg-[#70132C] text-white text-xs font-bold transition-all active:scale-95"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
