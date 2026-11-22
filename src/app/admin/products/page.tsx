'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import AdminNav from '@/components/admin/AdminNav';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Upload,
  Loader2,
} from 'lucide-react';
import { Product } from '@/types';
import { formatINR } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { useRealtimeSubscription } from '@/context/RealtimeContext';

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for editing or creating
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategorySlug, setFormCategorySlug] = useState('regular-flavours');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formHalfKgPrice, setFormHalfKgPrice] = useState('300');
  const [formOneKgPrice, setFormOneKgPrice] = useState('500');
  const [formEgglessExtra, setFormEgglessExtra] = useState('200');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formIsBestseller, setFormIsBestseller] = useState(false);
  const [formIsMarketDependent, setFormIsMarketDependent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('File size exceeds 25MB limit', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setFormImageUrl(data.url);
        showToast('Cake photo uploaded successfully!', 'success');
      } else {
        showToast(data.message || 'Failed to upload photo', 'error');
      }
    } catch {
      showToast('Upload failed due to network error', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/products', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.products) setProducts(data.products);
      })
      .catch((e) => console.error(e));

    return () => {
      active = false;
    };
  }, []);

  useRealtimeSubscription(
    ['PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED'],
    (event) => {
      if (event.type === 'PRODUCT_UPDATED') {
        const updated = event.data as Product;
        if (updated?.id) {
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          );
        } else {
          loadProducts();
        }
      } else if (event.type === 'PRODUCT_CREATED') {
        const created = event.data as Product;
        if (created?.id) {
          setProducts((prev) => {
            if (prev.some((p) => p.id === created.id)) {
              return prev.map((p) => (p.id === created.id ? created : p));
            }
            return [created, ...prev];
          });
        } else {
          loadProducts();
        }
      } else if (event.type === 'PRODUCT_DELETED') {
        const payload = event.data as { productId?: string };
        if (payload?.productId) {
          setProducts((prev) => prev.filter((p) => p.id !== payload.productId));
        } else {
          loadProducts();
        }
      }
    }
  );

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormDescription(p.description);
    setFormCategorySlug(p.category_slug || 'regular-flavours');
    setFormImageUrl(p.image_url);
    const halfKg = p.variants.find((v) => v.weight_kg === 0.5);
    const oneKg = p.variants.find((v) => v.weight_kg === 1.0);
    setFormHalfKgPrice(halfKg ? String(halfKg.price_paise / 100) : '300');
    setFormOneKgPrice(oneKg ? String(oneKg.price_paise / 100) : '500');
    setFormEgglessExtra(String((p.eggless_extra_paise || 20000) / 100));
    setFormIsAvailable(p.is_available);
    setFormIsBestseller(p.is_bestseller);
    setFormIsMarketDependent(p.is_price_market_dependent);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDescription('');
    setFormCategorySlug('regular-flavours');
    setFormImageUrl('https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80');
    setFormHalfKgPrice('400');
    setFormOneKgPrice('700');
    setFormEgglessExtra('200');
    setFormIsAvailable(true);
    setFormIsBestseller(false);
    setFormIsMarketDependent(false);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        id: editingProduct?.id,
        name: formName.trim(),
        description: formDescription.trim(),
        category_slug: formCategorySlug,
        image_url: formImageUrl.trim(),
        is_available: formIsAvailable,
        is_bestseller: formIsBestseller,
        is_price_market_dependent: formIsMarketDependent,
        eggless_extra_paise: parseInt(formEgglessExtra, 10) * 100,
        variants: [
          {
            id: editingProduct?.variants.find((v) => v.weight_kg === 0.5)?.id || `var-${Date.now()}-1`,
            product_id: editingProduct?.id || '',
            weight_kg: 0.5,
            price_paise: parseInt(formHalfKgPrice, 10) * 100,
            is_available: true,
          },
          {
            id: editingProduct?.variants.find((v) => v.weight_kg === 1.0)?.id || `var-${Date.now()}-2`,
            product_id: editingProduct?.id || '',
            weight_kg: 1.0,
            price_paise: parseInt(formOneKgPrice, 10) * 100,
            is_available: true,
          },
        ],
      };

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(`Saved ${formName} successfully!`, 'success');
        setIsModalOpen(false);
        loadProducts();
      } else {
        showToast('Failed to save product on server', 'error');
      }
    } catch {
      showToast('Error saving product', 'error');
    }
  };

  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, is_available: !currentStatus }),
      });
      if (res.ok) {
        showToast(`Availability updated!`, 'success');
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, is_available: !currentStatus } : p))
        );
      }
    } catch {
      showToast('Failed to update availability', 'error');
    }
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the active menu?`)) return;
    try {
      const res = await fetch(`/api/admin/products?id=${productId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Removed "${name}"`, 'info');
        loadProducts();
      }
    } catch {
      showToast('Failed to remove product', 'error');
    }
  };

  // Filtered view
  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category_slug === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#FFFDFB]">
      <AdminNav />

      <main className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 space-y-6">
        
        {/* Header and Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-extrabold text-[#70132C]">
              Cakes Menu &amp; Pricing Management
            </h1>
            <p className="text-xs text-[#8C485A] mt-1">
              Add new cakes, modify ½ Kg &amp; 1 Kg prices, manage availability &amp; eggless charges.
            </p>
          </div>

          <button
            onClick={handleOpenNew}
            className="px-5 py-2.5 bg-[#990F35] hover:bg-[#800A2A] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Cake</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-[#F5D3DC] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Search cakes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#F5D3DC] text-[#70132C]"
            />
            <Search className="w-3.5 h-3.5 text-[#8C485A] absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-xs font-semibold">
            {['all', 'regular-flavours', 'fruit-flavours', 'special-flavours'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#990F35] text-white'
                    : 'bg-[#FFFDFB] text-[#70132C] border border-[#F5D3DC]'
                }`}
              >
                {cat === 'all'
                  ? 'All Cakes'
                  : cat === 'regular-flavours'
                  ? 'Regular'
                  : cat === 'fruit-flavours'
                  ? 'Fruit'
                  : 'Special'}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-3xl border border-[#F5D3DC] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFFDFB] border-b border-[#F5D3DC] text-[#8C485A] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cake</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">½ Kg Price</th>
                  <th className="py-3 px-4">1 Kg Price</th>
                  <th className="py-3 px-4">Eggless Extra</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5D3DC]/60">
                {filtered.map((product) => {
                  const halfKg = product.variants.find((v) => v.weight_kg === 0.5);
                  const oneKg = product.variants.find((v) => v.weight_kg === 1.0);

                  return (
                    <tr key={product.id} className="hover:bg-[#FFFDFB]/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 border border-[#F5D3DC] shrink-0">
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-[#70132C] block text-sm">
                              {product.name}
                            </span>
                            {product.is_bestseller && (
                              <span className="text-[10px] text-[#990F35] font-bold uppercase tracking-wider">
                                ★ Bestseller
                              </span>
                            )}
                            {product.is_price_market_dependent && (
                              <span className="text-[10px] text-amber-700 block">
                                (Market rate dependent)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#8C485A]">
                        {product.category_name}
                      </td>

                      <td className="py-3 px-4 font-extrabold text-[#70132C]">
                        {halfKg ? formatINR(halfKg.price_paise) : '—'}
                      </td>

                      <td className="py-3 px-4 font-extrabold text-[#70132C]">
                        {oneKg ? formatINR(oneKg.price_paise) : '—'}
                      </td>

                      <td className="py-3 px-4 text-[#8C485A]">
                        +{formatINR(product.eggless_extra_paise || 20000)}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleAvailability(product.id, product.is_available)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                            product.is_available
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {product.is_available ? 'Available' : 'Disabled'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 rounded-lg border border-[#F5D3DC] text-[#70132C] hover:bg-[#FCE8ED]"
                            title="Edit Cake & Pricing"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="p-1.5 rounded-lg border border-[#F5D3DC] text-rose-600 hover:bg-rose-50"
                            title="Delete Cake"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#F5D3DC] max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#F5D3DC] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#990F35]">
                {editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Cake to Menu'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-[#990F35]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#70132C] mb-1">Cake Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#70132C] mb-1">Category *</label>
                <select
                  value={formCategorySlug}
                  onChange={(e) => setFormCategorySlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                >
                  <option value="regular-flavours">Regular Flavours</option>
                  <option value="fruit-flavours">Fruit Flavours</option>
                  <option value="special-flavours">Special Flavours</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#70132C] mb-1">
                    ½ Kg Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    value={formHalfKgPrice}
                    onChange={(e) => setFormHalfKgPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C] font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#70132C] mb-1">
                    1 Kg Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={formOneKgPrice}
                    onChange={(e) => setFormOneKgPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#70132C] mb-1">
                  Eggless Additional Charge (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formEgglessExtra}
                  onChange={(e) => setFormEgglessExtra(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                />
              </div>

              {/* High Quality Cake Photo Upload Option */}
              <div className="space-y-2">
                <label className="block font-bold text-[#70132C]">
                  Cake Photograph (High Quality Upload) *
                </label>

                {formImageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-[#8F1237]/20 p-2.5 bg-[#FFF6F0] flex items-center gap-3">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#F5D3DC]">
                      <Image
                        src={formImageUrl}
                        alt="Cake Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-[#70132C] truncate">
                        High-Resolution Photo Attached
                      </p>
                      <p className="text-[10px] text-[#8C485A] truncate mt-0.5 font-mono">
                        {formImageUrl}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#F5D3DC] text-[#8F1237] rounded-lg text-[11px] font-bold hover:bg-[#FCE8ED]"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Change Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('')}
                          className="px-2 py-1 text-rose-600 hover:underline text-[11px] font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#F5D3DC] hover:border-[#8F1237] bg-[#FFFDFC] rounded-2xl p-6 text-center cursor-pointer transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FCE8ED] text-[#8F1237] flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <p className="font-bold text-xs text-[#70132C]">
                      {isUploading
                        ? 'Uploading High-Resolution Photo...'
                        : 'Click to Upload High-Quality Cake Photo'}
                    </p>
                    <p className="text-[10px] text-[#8C485A] mt-1">
                      Accepts JPG, PNG, WEBP, AVIF up to 25MB
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg,image/avif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#70132C] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-[#F5D3DC]">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#70132C]">
                  <input
                    type="checkbox"
                    checked={formIsAvailable}
                    onChange={(e) => setFormIsAvailable(e.target.checked)}
                    className="rounded text-[#990F35]"
                  />
                  <span>Mark Cake as Available for Purchase</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#70132C]">
                  <input
                    type="checkbox"
                    checked={formIsBestseller}
                    onChange={(e) => setFormIsBestseller(e.target.checked)}
                    className="rounded text-[#990F35]"
                  />
                  <span>Display &ldquo;Bestseller&rdquo; Badge</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#70132C]">
                  <input
                    type="checkbox"
                    checked={formIsMarketDependent}
                    onChange={(e) => setFormIsMarketDependent(e.target.checked)}
                    className="rounded text-[#990F35]"
                  />
                  <span>Subject to seasonal fresh fruit market rate</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#F5D3DC]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#990F35] text-white rounded-xl font-bold shadow-md hover:bg-[#800A2A]"
                >
                  Save Cake &amp; Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

