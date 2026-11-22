-- ==========================================================
-- NILA'S TREAT — SEED DATA
-- Migration/Seed: 001_cake_menu.sql
-- ==========================================================

-- 1. STORE SETTINGS
INSERT INTO store_settings (
    store_name, tagline, location, primary_phone, secondary_phone,
    instagram_handle, facebook_page, shop_address, is_pickup_enabled,
    is_cod_enabled, global_eggless_surcharge_paise, opening_time, closing_time
) VALUES (
    'Nila''s Treat',
    'The Home of Fresh Baking',
    'Theni, Tamil Nadu, India',
    '93445 97833',
    '89398 00225',
    '@NILAS_TREAT',
    'Nila''s Treat',
    'Nila''s Treat Bakery, Periyakulam Road, Theni, Tamil Nadu - 625531',
    TRUE,
    TRUE,
    20000,
    '09:00 AM',
    '09:30 PM'
) ON CONFLICT DO NOTHING;

-- 2. CATEGORIES (Exclusively from Menu Posters)
INSERT INTO categories (name, slug, description, display_order) VALUES
('Regular Flavours', 'regular-flavours', 'Classic freshly baked bakery favorites made with rich fluffy sponge and cream.', 1),
('Fruit Flavours', 'fruit-flavours', 'Infused with premium fruit extracts and real seasonal fruits. (The final cost depends on the fruit market rate at the time of purchase).', 2),
('Special Flavours', 'special-flavours', 'Decadent gourmet creations, rich artisan chocolates and signature regional delicacies.', 3)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

-- 3. PRODUCTS & VARIANTS
WITH cake_menu(category_slug, name, slug, description, image_url, half_kg_paise, one_kg_paise, market_dependent, is_bestseller, is_featured) AS (
    VALUES
    -- REGULAR FLAVOURS
    ('regular-flavours', 'Vanilla', 'vanilla', 'Delicate Madagascar style vanilla sponge frosted with velvety vanilla cream.', '/images/cakes/vanilla.jpg', 30000, 50000, FALSE, FALSE, TRUE),
    ('regular-flavours', 'Chocolate', 'chocolate', 'Moist chocolate sponge layered with smooth chocolate fudge buttercream.', '/images/cakes/chocolate.jpg', 40000, 70000, FALSE, TRUE, TRUE),
    ('regular-flavours', 'Pista', 'pista', 'Rich pistachio flavored sponge decorated with chopped dry fruit shavings.', '/images/cakes/pista.jpg', 35000, 60000, FALSE, FALSE, FALSE),
    ('regular-flavours', 'Blackforest', 'blackforest', 'Traditional German classic with rich dark chocolate, sweet cherries and whipped dairy cream.', '/images/cakes/blackforest.jpg', 40000, 75000, FALSE, TRUE, TRUE),
    ('regular-flavours', 'White Forest', 'white-forest', 'Fluffy vanilla sponge dressed with Belgian white chocolate curls and red cherry compote.', '/images/cakes/white-forest.jpg', 45000, 80000, FALSE, FALSE, FALSE),
    ('regular-flavours', 'Butterscotch', 'butterscotch', 'Buttery caramel sponge studded with golden crunchy praline bits.', '/images/cakes/butterscotch.jpg', 45000, 80000, FALSE, TRUE, TRUE),
    ('regular-flavours', 'Choco Vanilla', 'choco-vanilla', 'Harmonious duo of rich dark chocolate and smooth vanilla swirl.', '/images/cakes/choco-vanilla.jpg', 45000, 80000, FALSE, FALSE, FALSE),

    -- FRUIT FLAVOURS
    ('fruit-flavours', 'Mango', 'mango', 'Luscious alphonso mango reduction glaze with silky mango mousse.', '/images/cakes/mango.jpg', 35000, 60000, TRUE, TRUE, TRUE),
    ('fruit-flavours', 'Pineapple', 'pineapple', 'Juicy candied pineapple chunks tucked inside refreshing vanilla creme.', '/images/cakes/pineapple.jpg', 40000, 70000, TRUE, FALSE, FALSE),
    ('fruit-flavours', 'Jack Fruit', 'jack-fruit', 'Authentic regional Jackfruit nectar infused cake with traditional aroma.', '/images/cakes/jack-fruit.jpg', 65000, 120000, TRUE, FALSE, TRUE),
    ('fruit-flavours', 'Strawberry', 'strawberry', 'Sweet summer strawberry preserve layered between soft sponge and whipped cream.', '/images/cakes/strawberry.jpg', 45000, 80000, TRUE, FALSE, FALSE),
    ('fruit-flavours', 'Blackcurrant', 'blackcurrant', 'Tart and sweet European blackcurrant compote with purple velvet cream.', '/images/cakes/blackcurrant.jpg', 45000, 80000, TRUE, TRUE, FALSE),
    ('fruit-flavours', 'Blueberry', 'blueberry', 'Wild blueberry filling with smooth cheese buttercream accents.', '/images/cakes/blueberry.jpg', 45000, 80000, TRUE, TRUE, TRUE),

    -- SPECIAL FLAVOURS
    ('special-flavours', 'Rose Milk', 'rose-milk', 'South India''s beloved rose milk essence with fragrant rose petals and light cream.', '/images/cakes/rose-milk.jpg', 45000, 80000, FALSE, TRUE, TRUE),
    ('special-flavours', 'Jamun', 'jamun', 'Soft syrup-soaked Gulab Jamuns embedded inside Cardamom infused cream sponge.', '/images/cakes/jamun.jpg', 50000, 90000, FALSE, TRUE, TRUE),
    ('special-flavours', 'Milk Chocolate Truffle', 'milk-chocolate-truffle', 'Silky Belgian milk chocolate ganache poured over dense chocolate crumb.', '/images/cakes/milk-chocolate-truffle.jpg', 75000, 140000, FALSE, FALSE, FALSE),
    ('special-flavours', 'Rasamalai', 'rasamalai', 'Exquisite royal dessert cake topped with saffron soaked Rasamalai and pistachios.', '/images/cakes/rasamalai.jpg', 65000, 120000, FALSE, TRUE, TRUE),
    ('special-flavours', 'White Chocolate Truffle', 'white-chocolate-truffle', 'Melt-in-mouth Swiss white chocolate ganache with velvety crumb.', '/images/cakes/white-chocolate-truffle.jpg', 75000, 140000, FALSE, FALSE, FALSE),
    ('special-flavours', 'Caramel Chocolate', 'caramel-chocolate', 'Deep salted caramel ribbons folded into dark chocolate ganache.', '/images/cakes/caramel-chocolate.jpg', 60000, 100000, FALSE, FALSE, FALSE),
    ('special-flavours', 'Chocolate Truffle', 'chocolate-truffle', 'Signature 55% cocoa dark chocolate truffle cake for pure chocolate purists.', '/images/cakes/chocolate-truffle.jpg', 65000, 120000, FALSE, TRUE, TRUE),
    ('special-flavours', 'Palkova', 'palkova', 'Traditional Srivilliputhur style sweetened condensed milk khoya fused with bakery sponge.', '/images/cakes/palkova.jpg', 65000, 120000, FALSE, TRUE, TRUE),
    ('special-flavours', 'Rose Milk Pistachio', 'rose-milk-pistachio', 'Delightful fusion of fragrant damask rose milk and royal Iranian pistachio cream.', '/images/cakes/rose-milk-pistachio.jpg', 65000, 120000, FALSE, FALSE, TRUE),
    ('special-flavours', 'Ferrero Rocher', 'ferrero-rocher', 'Whole roasted hazelnuts, Nutella hazelnut cream, and crunchy wafer pralines.', '/images/cakes/ferrero-rocher.jpg', 90000, 180000, FALSE, TRUE, TRUE),
    ('special-flavours', 'Triple Chocolate Mousse Cake', 'triple-chocolate-mousse', 'Three luxurious layers of dark, milk and white chocolate silk mousse.', '/images/cakes/triple-chocolate-mousse.jpg', 80000, 150000, FALSE, FALSE, TRUE),
    ('special-flavours', 'Hazelnut Chocolate', 'hazelnut-chocolate', 'Roasted Piedmont hazelnut paste whipped with smooth Dutch cocoa ganache.', '/images/cakes/hazelnut-chocolate.jpg', 80000, 150000, FALSE, FALSE, FALSE),
    ('special-flavours', 'Death by Chocolate', 'death-by-chocolate', 'Extreme chocolate overload with fudge brownie base, truffle layer and dark chocolate glaze.', '/images/cakes/death-by-chocolate.jpg', 80000, 150000, FALSE, TRUE, TRUE),
    ('special-flavours', 'Nutella Chocolate Cake', 'nutella-chocolate', 'Decadent cake generously layered with original Italian Nutella spread.', '/images/cakes/nutella-chocolate.jpg', 80000, 150000, FALSE, TRUE, TRUE),
    ('special-flavours', 'Lotus Biscoff', 'lotus-biscoff', 'Spiced Belgian caramelized speculoos cookie butter spread and crunchy biscuit crown.', '/images/cakes/lotus-biscoff.jpg', 95000, 180000, FALSE, TRUE, TRUE),
    ('special-flavours', 'Kunafa Truffle Cake', 'kunafa-truffle', 'Middle Eastern crisp buttered kataifi pastry layered with chocolate truffle and pistachios.', '/images/cakes/kunafa-truffle.jpg', 95000, 180000, FALSE, TRUE, TRUE),
    ('special-flavours', 'Vancho Cake', 'vancho-cake', 'Kerala''s renowned twin-sponge masterpiece uniting vanilla and chocolate in one bite.', '/images/cakes/vancho-cake.jpg', 60000, 100000, FALSE, FALSE, TRUE)
),
inserted_products AS (
    INSERT INTO products (
        category_id, name, slug, description, image_url,
        is_eggless_available, eggless_extra_paise, is_price_market_dependent,
        is_available, is_bestseller, is_featured
    )
    SELECT 
        c.id, m.name, m.slug, m.description, m.image_url,
        TRUE, 20000, m.market_dependent,
        TRUE, m.is_bestseller, m.is_featured
    FROM cake_menu m
    JOIN categories c ON c.slug = m.category_slug
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        is_price_market_dependent = EXCLUDED.is_price_market_dependent,
        is_bestseller = EXCLUDED.is_bestseller,
        is_featured = EXCLUDED.is_featured
    RETURNING id, slug
)
INSERT INTO product_variants (product_id, weight_kg, price_paise, is_available)
SELECT p.id, v.weight_kg, v.price_paise, TRUE
FROM cake_menu m
JOIN products p ON p.slug = m.slug
CROSS JOIN LATERAL (
    VALUES (0.5::NUMERIC, m.half_kg_paise),
           (1.0::NUMERIC, m.one_kg_paise)
) AS v(weight_kg, price_paise)
ON CONFLICT (product_id, weight_kg) DO UPDATE SET
    price_paise = EXCLUDED.price_paise;

-- 4. DELIVERY ZONES FOR THENI DISTRICT
INSERT INTO delivery_zones (pincode, area_name, delivery_charge_paise, minimum_order_paise, is_serviceable) VALUES
('625531', 'Theni Town & Main Bazaar', 4000, 30000, TRUE),
('625512', 'Allinagaram & Collectorate Area', 5000, 30000, TRUE),
('625534', 'Periyakulam Town', 8000, 50000, TRUE),
('625516', 'Bodinayakanur (Bodi)', 9000, 50000, TRUE),
('625513', 'Chinnamanur', 10000, 60000, TRUE),
('625517', 'Cumbum Valley', 12000, 70000, TRUE),
('625530', 'Uthamapalayam', 11000, 60000, TRUE),
('625562', 'Kombai', 13000, 70000, TRUE),
('625528', 'Thevaram', 14000, 80000, TRUE),
('625539', 'Gudalur', 15000, 80000, TRUE)
ON CONFLICT (pincode) DO UPDATE SET
    area_name = EXCLUDED.area_name,
    delivery_charge_paise = EXCLUDED.delivery_charge_paise,
    minimum_order_paise = EXCLUDED.minimum_order_paise,
    is_serviceable = EXCLUDED.is_serviceable;

-- 5. COUPONS
INSERT INTO coupons (code, discount_type, discount_value, minimum_order_paise, maximum_discount_paise, is_active) VALUES
('NILA100', 'fixed', 100, 50000, 10000, TRUE),
('FRESH10', 'percentage', 10, 40000, 15000, TRUE),
('THENIFREESHIP', 'fixed', 40, 60000, 4000, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 6. INITIAL ADMIN USER (Email: admin@nilastreat.com, Phone: 9344597833, Role: admin)
-- Password hash generated with PBKDF2/SHA256 (Password: NilasAdmin@2026)
INSERT INTO users (
    full_name, email, phone, password_hash, role, is_active
) VALUES (
    'Nila''s Treat Owner',
    'admin@nilastreat.com',
    '9344597833',
    'pbkdf2:sha256:10000$c2FsdF9uaWxhcw==$7136c1baee93e36e053a9486c4a45a2c2069bce0550d9c4c23cbf7e17926715f',
    'admin',
    TRUE
) ON CONFLICT (phone) DO UPDATE SET
    role = 'admin',
    is_active = TRUE;

-- 7. CUSTOMER REVIEWS
INSERT INTO reviews (product_id, customer_name, rating, comment)
SELECT id, 'Karthik Raja', 5, 'Ordered the Rose Milk cake for my sister''s birthday in Theni. Unbelievable aroma and freshness! Everyone loved it.'
FROM products WHERE slug = 'rose-milk' LIMIT 1;

INSERT INTO reviews (product_id, customer_name, rating, comment)
SELECT id, 'Deepa Sundaram', 5, 'The Kunafa Truffle cake was next level! Crunchy kataifi with rich chocolate. Best bakery in Theni district.'
FROM products WHERE slug = 'kunafa-truffle' LIMIT 1;

INSERT INTO reviews (product_id, customer_name, rating, comment)
SELECT id, 'Anand V.', 5, 'Rasmalai cake was so authentic and juicy. Delivered right on time in Bodinayakanur with neat packaging.'
FROM products WHERE slug = 'rasamalai' LIMIT 1;

