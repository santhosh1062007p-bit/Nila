# NILA'S TREAT — REST API SPECIFICATION

All endpoints are built using Next.js App Router API Routes (`src/app/api/*`).

## 1. AUTHENTICATION & PROFILE

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Creates customer account, sets HTTP-only session cookie. | No (Rate Limited) |
| `POST` | `/api/auth/login` | Authenticates via phone/email and password. | No (Rate Limited) |
| `GET` | `/api/auth/me` | Retrieves active authenticated user session. | Cookie |
| `POST` | `/api/auth/logout` | Clears authentication cookies and invalidates session. | Cookie |
| `POST` | `/api/auth/reset-password` | Resets customer password via 10-digit mobile number. | No (Rate Limited) |
| `GET/PUT` | `/api/account/profile` | Reads or updates customer profile details and avatar. | Customer/Admin |

---

## 2. PRODUCTS & REVIEWS

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/products` | Returns all active cakes and categories. | Public |
| `GET` | `/api/reviews` | Retrieves customer reviews (`?product_id=...`). | Public |
| `POST` | `/api/reviews` | Submits verified customer cake rating (1-5 stars). | Public (Rate Limited) |

---

## 3. REAL-TIME GPS & DELIVERY FLEET

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/delivery/partners` | Lists all active delivery riders. | Admin |
| `POST` | `/api/delivery/partners` | Registers a new delivery rider. | Admin |
| `POST` | `/api/delivery/assign` | Assigns an order to a delivery partner. | Admin |
| `POST` | `/api/delivery/partner/login` | Rider login via registered 10-digit phone number. | Public |
| `GET` | `/api/delivery/partner/orders` | Fetches active assigned orders for a rider. | Rider Phone Header |
| `PATCH` | `/api/delivery/partner/orders` | Updates milestone status (Picked Up, Out for Delivery, Delivered). | Rider Phone Header |
| `POST` | `/api/delivery/location` | Broadcasts rider live coordinates, computes Haversine distance & ETA. | Rider Phone Header |

---

## 4. ORDERS & PAYMENTS

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/orders` | Places a new order (online or COD). | Public/Customer |
| `GET` | `/api/orders/[id]` | Retrieves order details and live GPS coordinates. | Public (by Order Code/ID) |
| `POST` | `/api/payments/razorpay/create-order` | Generates Razorpay Order ID. | Customer |
| `POST` | `/api/payments/razorpay/verify` | Verifies cryptographic payment signature. | Customer |
| `POST` | `/api/payments/razorpay/webhook` | Handles Razorpay webhook callbacks. | Secret Header |
| `GET` | `/api/sync/events` | SSE event stream for real-time order and rider synchronization. | Public |
