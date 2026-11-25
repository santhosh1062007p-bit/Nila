// Nila's Treat — Unified Domain TypeScript Types

export type Role = 'customer' | 'admin';

export type GenderOption = 'female' | 'male' | 'other' | 'prefer_not_to_say';
export type AddressType = 'Home' | 'Work' | 'Other';

export interface NotificationPreferences {
  order_updates: boolean;
  promotions: boolean;
}

export interface UserProfile {
  user_id: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: GenderOption | null;
  notify_order_updates: boolean;
  notify_promotions: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  password?: string;
  password_hash?: string;
  last_login?: string;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  gender?: GenderOption | null;
  notification_preferences?: NotificationPreferences;
}

export interface Address {
  id: string;
  user_id?: string;
  label?: string;
  address_type?: AddressType;
  recipient_name: string;
  phone: string;
  alternate_phone?: string | null;
  house_no?: string;
  street_name?: string;
  area_locality?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  landmark?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  weight_kg: 0.5 | 1.0;
  price_paise: number; // Stored in paise (e.g. ₹300 = 30000)
  is_available: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_eggless_available: boolean;
  eggless_extra_paise: number; // e.g. 20000 = ₹200
  is_price_market_dependent: boolean; // Note for fruit cakes
  is_available: boolean;
  is_bestseller: boolean;
  is_featured: boolean;
  variants: ProductVariant[];
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  id: string; // Unique cart item ID (product_id + weight + eggless + custom_message hash)
  product_id: string;
  product_name: string;
  product_slug: string;
  image_url: string;
  category_name: string;
  weight_kg: 0.5 | 1.0;
  eggless: boolean;
  base_price_paise: number;
  eggless_charge_paise: number;
  unit_price_paise: number; // base_price_paise + (eggless ? eggless_charge_paise : 0)
  quantity: number;
  line_total_paise: number; // unit_price_paise * quantity
  custom_message?: string;
  special_instructions?: string;
  is_price_market_dependent?: boolean;
}

export interface DeliveryZone {
  id: string;
  pincode: string;
  area_name: string;
  delivery_charge_paise: number;
  minimum_order_paise: number;
  is_serviceable: boolean;
}

export interface StoreSettings {
  id?: string;
  store_name: string;
  tagline: string;
  location: string;
  primary_phone: string;
  secondary_phone: string;
  instagram_handle: string;
  facebook_page: string;
  shop_address: string;
  is_pickup_enabled: boolean;
  is_cod_enabled: boolean;
  global_eggless_surcharge_paise: number;
  opening_time: string;
  closing_time: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number; // percentage or fixed in rupees
  minimum_order_paise: number;
  maximum_discount_paise?: number;
  is_active: boolean;
  target_type?: 'all' | 'specific_customers' | 'first_order_only';
  allowed_phones?: string[];
  description?: string;
}

export type FulfilmentType = 'delivery' | 'pickup';

export type OrderStatus =
  | 'Order Placed'
  | 'Payment Confirmed'
  | 'Order Confirmed'
  | 'Order Accepted'
  | 'Baking in Progress'
  | 'Cake Ready'
  | 'Ready for Pickup'
  | 'Delivery Partner Assigned'
  | 'Picked Up'
  | 'Out for Delivery'
  | 'Arriving Soon'
  | 'Delivered'
  | 'Cancelled'
  | 'Rejected';

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicle_type: 'bike' | 'scooter' | 'van';
  vehicle_number: string;
  is_active: boolean;
  current_lat?: number | null;
  current_lng?: number | null;
  last_location_updated_at?: string | null;
  created_at?: string;
}

export interface DeliveryLocationUpdate {
  order_id: string;
  partner_id: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: string;
  distance_remaining_km?: number | null;
  eta_minutes?: number | null;
}

export type PaymentMethod = 'razorpay' | 'cod';
export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  category_name: string;
  product_image_snapshot?: string;
  weight_kg: 0.5 | 1.0;
  eggless: boolean;
  custom_message?: string | null;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
}

export interface OrderStatusHistoryRecord {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: OrderStatus;
  changed_by_id: string | null;
  changed_by_role: string;
  note?: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: number;
  order_code: string;
  user_id?: string | null;
  guest_access_token_hash?: string | null;
  idempotency_key?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  fulfilment_type: FulfilmentType;
  order_status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal_paise: number;
  delivery_charge_paise: number;
  discount_paise: number;
  coupon_code?: string | null;
  total_paise: number;
  delivery_pincode?: string | null;
  delivery_address_snapshot?: Address | null;
  delivery_date: string;
  delivery_slot: string;
  special_instructions?: string | null;
  rejection_reason?: string | null;
  razorpay_order_id?: string | null;
  delivery_partner_id?: string | null;
  delivery_partner?: DeliveryPartner | null;
  live_delivery_location?: DeliveryLocationUpdate | null;
  items: OrderItem[];
  status_history?: OrderStatusHistoryRecord[];
  created_at: string;
  updated_at: string;
}

export type PaymentTransactionStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';

export interface PaymentRecord {
  id: string;
  order_id: string;
  provider: 'razorpay';
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount_paise: number;
  currency: string;
  status: PaymentTransactionStatus;
  method?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  id: string;
  subject_id: string;
  subject_role: Role;
  mfa_verified: boolean;
  ip_address?: string | null;
  user_agent?: string | null;
  revoked_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface WebhookEventRecord {
  id: string;
  provider: 'razorpay';
  event_id: string;
  event_type: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  signature_verified: boolean;
  status: 'processed' | 'ignored' | 'failed';
  payload_hash: string;
  processed_at: string;
}

export interface AuditLogRecord {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AdminUserRecord {
  id: string;
  username: string;
  full_name: string;
  phone: string;
  email: string;
  password_hash: string;
  mfa_enabled: boolean;
  mfa_secret?: string | null;
  mfa_backup_codes?: string[];
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  order_id?: string;
  product_id: string;
  product_name?: string;
  customer_name: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
}

export interface CustomisationRequest {
  id: string;
  customer_name: string;
  customer_phone: string;
  cake_theme: string;
  weight_kg: number;
  flavor_preference?: string;
  eggless: boolean;
  event_date: string;
  reference_image_url?: string;
  notes?: string;
  quoted_price_paise?: number;
  status: 'pending' | 'quoted' | 'approved' | 'rejected' | 'converted_to_order';
  created_at: string;
}

export interface CustomerLoginRecord {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  login_time: string;
  type: 'login' | 'register';
}


