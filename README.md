# 🎂 Nila's Treat — The Home of Fresh Baking
### Premium Bakery E-Commerce Platform & Administration System
*Location: Theni, Tamil Nadu, India | Contact: 93445 97833 / 89398 00225*

---

## 🚀 How to Run the Application

You can start the development server from the root directory `E:\client` or `E:\client\nilas-treat`:

```bash
# In E:\client:
npm run dev
```

The application will be live at:
👉 **http://localhost:3000**

---

## 🧁 Key Storefront Features (Inspired by Zomato, Swiggy & Flipkart)

1. **Brand Identity & Atmosphere**:
   - Primary burgundy theme (`#990F35`), soft pink accents (`#FCE8ED`), warm background (`#FFFDFB`), and elegant serif typography.
   - Genuine Nila's Treat branding, Theni location identity, official store contact numbers (93445 97833, 89398 00225), and Instagram link (`@NILAS_TREAT`).

2. **Complete Original Cake Menu**:
   - **Regular Flavours**: Vanilla (½ Kg ₹300, 1 Kg ₹500), Chocolate (½ Kg ₹400, 1 Kg ₹700), Pista (½ Kg ₹350, 1 Kg ₹600), Blackforest (½ Kg ₹400, 1 Kg ₹750), White Forest (½ Kg ₹450, 1 Kg ₹800), Butterscotch (½ Kg ₹450, 1 Kg ₹800), Choco Vanilla (½ Kg ₹450, 1 Kg ₹800).
   - **Fruit Flavours**: Fresh Alphonso Mango, Pineapple, authentic Theni Jack Fruit, Strawberry, Blackcurrant, Blueberry. Includes clear seasonal fruit rate advisory.
   - **Special Flavours**: Regional signature Rose Milk (₹450/₹800), Rasamalai (₹650/₹1200), Gulab Jamun, Srivilliputhur Palkova, Milk/White/Dark Chocolate Truffles, Ferrero Rocher, Triple Chocolate Mousse, Lotus Biscoff, Kunafa Truffle, and Vancho cake.

3. **Weight & Eggless Variants with Instant Recalculation**:
   - Weight selection (½ Kg & 1 Kg).
   - **100% Eggless Option**: Adds configured ₹200 surcharge with instant visual price update.
   - Custom inscription message on cake (e.g., *"Happy 25th Anniversary"*).
   - Special baking instructions input.

4. **Fulfilment System**:
   - **Doorstep Delivery**: Serviceable across Theni Town (625531), Allinagaram (625512), Periyakulam (625534), Bodinayakanur (625516), Chinnamanur (625513), Cumbum (625517), Uthamapalayam (625530). Unserviceable pincodes display a friendly notice recommending store pickup.
   - **Store Pickup**: ₹0 delivery fee with verified store pickup address (*Periyakulam Main Road, Near Old Bus Stand, Theni - 625531*).
   - Preferred delivery/pickup date and 4 time slots.

5. **Shopping Cart & Checkout**:
   - Guest checkout without mandatory login.
   - Duplicate item grouping with variant matching.
   - Server-side price validation in paise (never trusting client prices).
   - Coupon system (`NILA100`, `FRESH10`, `THENIFREESHIP`).
   - Payment options: **Razorpay Online (UPI/GPay/Cards)** + **Cash on Delivery (COD)**.

6. **Order Tracking & Digital Invoicing**:
   - Live order lifecycle tracking:
     - Delivery: *Order Placed → Order Confirmed → Baking in Progress → Cake Ready → Out for Delivery → Delivered*
     - Pickup: *Order Placed → Order Confirmed → Baking in Progress → Ready for Pickup → Picked Up*
   - Printable bakery receipts and bills.

---

## 🛡️ Owner Admin Dashboard (`/admin`)

- **Secure Login**: Protected with JWT cookies and role authorization.
- **Pre-configured Owner Credentials**:
  - **Phone / Identifier**: `9344597833` (or `admin@nilastreat.com`)
  - **Password**: `NilasAdmin@2026`
- **Dashboard Analytics**: Total revenue from paid transactions, uncollected COD orders, active orders, completed count.
- **Cake & Pricing Management**: Edit ½ Kg and 1 Kg prices on the fly, toggle product availability, add new cakes, manage bestsellers.
- **Order Management**: Change live status (e.g. *Baking in Progress*), record COD cash collection, view order details and print invoices.
- **Delivery Zones**: Manage serviceable Theni pincodes, delivery charges, and minimum order values.
- **Store Settings**: Change contact phones, verified shop address, eggless surcharge, and toggle COD/Pickup availability.

---

## 🗄️ Self-Hosted PostgreSQL Database

Database migrations and initial seeds are located in:
- `database/migrations/001_initial_schema.sql` (18 tables, triggers, indexes, and audit logs)
- `database/seeds/001_cake_menu.sql` (Complete original menu, Theni delivery zones, initial coupons, and admin account)

The application automatically connects to PostgreSQL when `DATABASE_URL` is set, or operates using the unified high-performance memory repository for zero-config offline development.
