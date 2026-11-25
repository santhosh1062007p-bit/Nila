'use client';

import React, { useState } from 'react';
import { Star, X, CheckCircle2, Sparkles, Heart } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { Order } from '@/types';

interface CustomerReviewModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CustomerReviewModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: CustomerReviewModalProps) {
  const { showToast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>(
    order.items[0]?.product_id || ''
  );
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>(order.customer_name || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentItem = order.items.find((it) => it.product_id === selectedProductId) || order.items[0];

  const quickTags = [
    'Super Fresh & Soft',
    'Perfect Sweetness',
    'Timely Delivery',
    'Loved the Decoration',
    'Authentic Flavour',
  ];

  const handleTagClick = (tag: string) => {
    if (comment.includes(tag)) return;
    setComment((prev) => (prev ? `${prev}, ${tag}` : tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 5) {
      showToast('Please share a few words about your experience (min 5 characters)', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          product_id: currentItem?.product_id || 'prod-custom',
          product_name: currentItem?.product_name || 'Nila’s Treat Cake',
          customer_name: customerName.trim() || 'Happy Customer',
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        showToast('Thank you for reviewing Nila’s Treat!', 'success');
        if (onSuccess) onSuccess();
      } else {
        showToast(data.message || 'Failed to submit review', 'error');
      }
    } catch {
      showToast('Network error submitting review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#F5D3DC] max-w-md w-full p-6 shadow-2xl relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-[#70132C] transition-colors p-1 rounded-full hover:bg-[#FFF6F0]"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#70132C]">
              Thank You for Your Review!
            </h3>
            <p className="text-xs text-stone-600 max-w-xs mx-auto">
              Your valuable feedback helps our home bakers continuously craft the freshest cakes in Theni.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-[#8F1237] text-white rounded-full font-bold text-xs shadow-md hover:bg-[#70132C]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF6F0] text-[#8F1237] font-bold text-[11px] border border-[#F5D3DC]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Fresh Baking Review</span>
              </div>
              <h3 className="font-serif font-bold text-xl text-[#70132C]">
                How Was Your Cake?
              </h3>
              <p className="text-[11px] text-stone-500">
                Order #{order.order_code} • {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              </p>
            </div>

            {/* Select product if multiple items in order */}
            {order.items.length > 1 && (
              <div>
                <label className="block font-bold text-[#70132C] mb-1">Select Cake to Rate</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C] font-semibold bg-white"
                >
                  {order.items.map((it) => (
                    <option key={it.id} value={it.product_id}>
                      {it.product_name} ({it.weight_kg} Kg)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Interactive 5-Star Rating */}
            <div className="flex flex-col items-center justify-center py-2 space-y-1">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="font-bold text-xs text-[#8F1237]">
                {rating === 5 && 'Outstanding! (5 of 5)'}
                {rating === 4 && 'Very Tasty! (4 of 5)'}
                {rating === 3 && 'Good Experience (3 of 5)'}
                {rating === 2 && 'Needs Improvement (2 of 5)'}
                {rating === 1 && 'Disappointed (1 of 5)'}
              </span>
            </div>

            {/* Quick Feedback Tags */}
            <div>
              <label className="block font-bold text-[#70132C] mb-1.5">Quick Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#FFF6F0] border border-[#F5D3DC] text-[#70132C] hover:border-[#8F1237] transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block font-bold text-[#70132C] mb-1">
                Share Your Experience *
              </label>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what you liked about the flavor, freshness, or delivery..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block font-bold text-[#70132C] mb-1">Your Name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C] font-semibold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-[#F5D3DC] text-[#70132C] rounded-full font-bold hover:bg-[#FFF6F0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-[#8F1237] hover:bg-[#70132C] text-white rounded-full font-bold shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Review'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
