# PROJECT_REFERENCE.md

Technical reference for this reusable ecommerce template. Written against the
actual code in this repository (not a generic template) — if you rename or
restructure files, please keep this document in sync. UI text is Arabic (RTL);
this document is in English for wider developer accessibility.

---

## 1. What this project is

A dependency-free, framework-free storefront: plain HTML5 + CSS3 + vanilla
JavaScript. No build step, no bundler, no npm install required to run it.
`localStorage` is the primary data store; an optional Firebase Realtime
Database integration can be switched on for cross-device sync. Optional
ImgBB (image hosting) + ImageKit (CDN/transform) integrations power image
uploads from the admin panel.

The product model supports both simple products and products with a full
**color + size + per-combination inventory** matrix, making the template
suitable out of the box for a clothing store (its first intended use case)
while remaining generic enough for any product-based store.

This template ships with **no real products, categories, orders, or
advertisements** — it starts empty and is configured entirely through
`js/config.js` (first-run defaults) and the admin panel (everything after).

---

## 2. Project structure

```
project/
├── index.html          Homepage — hero, categories, featured/new/offers rails
├── products.html        Full catalog — search, category filter, sort
├── product.html          Single product detail — color/size selection, add to cart
├── cart.html             Cart — quantities, WhatsApp checkout
├── about.html            About page (store name/description pulled from settings)
├── contact.html          Contact page (phone/WhatsApp/Instagram/TikTok/address)
├── login.html            Admin login form
├── admin.html            Admin dashboard (single page, panel-based nav)
├── README.md             Quickstart
├── PROJECT_REFERENCE.md  This file
│
├── css/
│   └── style.css        All styling (CSS variables, RTL layout, components)
│
├── js/
│   ├── config.js        Central config — store info + integration keys (all empty by default)
│   ├── icons.js          Inline SVG icon library (iconSvg(key) helper)
│   ├── store.js          Data layer: localStorage + optional Firebase sync, Store API
│   ├── whatsapp.js       WhatsApp message building + delivery-info modal
│   ├── app.js            Shared header/footer rendering, cart badge count
│   ├── products.js       Product grid, filters, sorting, product detail page logic
│   ├── cart.js           Cart page rendering and quantity/removal logic
│   ├── auth.js           Admin session guard + login form handling
│   └── admin.js          Admin dashboard: products, categories, colors/sizes/
│                         inventory, ads, orders, settings
│
└── assets/
    └── logo/
        └── logo.png      Store logo used by the current design
```

Notes on structure:
- There are **no JS modules/bundling** — every `<script>` tag is loaded in a
  fixed order on every page (see section 4). Functions are all in global
  scope, on purpose, so any file can call any other file's helpers.
- `index.html` contains a **duplicate, inline copy** of some of `products.js`'s
  rendering functions (`renderHomeProductCard`, `quickAddToCart`,
  `productMediaHtml`) inside a `<script>` tag at the bottom of the file. This
  was already the case in the source project and has been preserved; if you
  change product-card rendering or the "quick add to cart" logic, **update
  both places** (`js/products.js` and the inline script in `index.html`).

---

## 3. Script load order (every page)

```html
<script src="js/config.js"></script>
<script src="js/icons.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>
<script src="js/store.js"></script>
<script src="js/whatsapp.js"></script>
<script src="js/app.js"></script>
<!-- page-specific: js/products.js, js/cart.js, js/auth.js, js/admin.js -->
```

`config.js` must load before `store.js` (which reads `STORE_CONFIG` at parse
time to decide whether to initialize Firebase, and to seed first-run data).
The Firebase SDK `<script>` tags are always present; `store.js` only calls
`firebase.initializeApp(...)` when `STORE_CONFIG.firebaseDatabaseURL` is a
non-empty string, so having the SDK loaded is harmless when Firebase is
unconfigured.

---

## 4. Data flow / architecture

All reads and writes to persisted data go through the **`Store` object**
defined in `js/store.js`. No other file touches `localStorage` directly.
This is intentional so the whole app can later be pointed at a real backend
(e.g. Supabase) by rewriting the bodies of `Store`'s methods only — no page
or other JS file needs to change.

```
UI (index/products/product/cart/admin .html + their .js)
        │  calls
        ▼
   Store  (js/store.js)
        │  reads/writes
        ▼
  localStorage  ──optionally mirrors to──▶  Firebase Realtime Database
```

### 4.1 localStorage keys (`DB_KEYS` in `store.js`)

| Key              | Contents                                            |
|------------------|------------------------------------------------------|
| `ws_categories`  | Array of category objects                            |
| `ws_products`    | Array of product objects                              |
| `ws_settings`    | Store settings object (name, contact info, admin creds) |
| `ws_cart`        | Array of cart line objects                            |
| `ws_orders`      | Array of logged WhatsApp orders (local history)       |
| `ws_ads`         | Array of homepage advertisement banner objects        |
| `ws_admin_session` | `sessionStorage` flag set on successful admin login |
| `ws_seeded_v1`   | Flag preventing re-seeding on every page load         |
| `last_meta_pull_time` | Firebase metadata pull cooldown timestamp (15 min cache) |
| `ws_products_category_*` | Cached products for an individual category |
| `ws_products_filter_*` | Cached featured/offer/new product results |
| `ws_products_all_time` | Timestamp for full-catalog cache (admin/search) |

### 4.2 First-run seeding (`seedIfNeeded()` in `store.js`)

Runs once per browser (guarded by `ws_seeded_v1`). It writes:
- `ws_categories` → `[]` (empty — no default categories)
- `ws_products` → `[]` (empty — no default products)
- `ws_settings` → built from `STORE_CONFIG` in `config.js` (all fields empty
  by default except `currencySymbol` = `"د.ع"` and the placeholder admin
  credentials)
- `ws_cart`, `ws_orders`, `ws_ads` → `[]`

**Nothing in this template ships with real store data.** A brand-new store
starts completely empty and is populated entirely from the admin panel.

### 4.3 Firebase sync (optional, off by default)

- `store.js` checks `STORE_CONFIG.firebaseDatabaseURL` at load time. If
  empty (the default), `firebaseEnabled` stays `false` and every sync
  function becomes a safe no-op. The site runs 100% on `localStorage` in this mode.
- If a URL is provided, `firebase.initializeApp({ databaseURL: ... })` runs.
- During normal public storefront page loads, `pullFromFirebase()` pulls only
  lightweight metadata: `categories`, `settings`, and `ads`. **It does not
  download the complete `/products` node.**
- Products are loaded on demand:
  - category pages query `/products` with `orderByChild("categoryId").equalTo(...)`;
  - a product-detail page queries only the requested product by its `id`;
  - featured/offers/new sections query only products matching their respective
    boolean field;
  - the cart fetches only product records currently present in the cart.
- The complete `/products` node is loaded only when the admin dashboard needs
  the full catalog, when the visitor explicitly chooses “all products”, or when
  the visitor explicitly performs a global search.
- Public product queries are cached locally for 15 minutes, reducing repeated
  reads while preserving the section-based loading behavior.
- Every `Store.save*()` method also calls `syncNodeToFirebase(...)` to push
  updated data.
- **Important:** Firebase access is client-side; configure appropriate
  Realtime Database security rules before production use.

### 4.4 Product loading strategy (important for Firebase bandwidth)

The storefront is intentionally **section-based** rather than downloading every
product when the visitor opens the site. Opening a category loads only that
category (and its direct subcategories when applicable). The homepage requests
only featured, offer, and new products. The cart requests only its own product
records.

The “all products” view, admin dashboard, and explicit global search are
intentional exceptions because they require access to the complete catalog.

### 4.5 Cart data flow

`Store.addToCart(itemKey, qty, meta)` → `Store.getCart()` /
`Store.setQty()` / `Store.removeFromCart()` → `cart:updated` custom event →
`js/app.js` updates the header cart-count badge, `js/cart.js` re-renders
`cart.html` if open. See section 7 for the cart line shape.

---

## 5. Product system

### 5.1 Product object shape

```js
{
  id: "prd_...",
  name: "",
  description: "",
  price: 0,
  categoryId: "cat_...",
  stock: 0,            // total stock — auto-computed when colors/sizes are used
  available: true,     // manual on/off switch, independent of stock
  featured: false,
  isNew: false,
  isOffer: false,
  image: null,          // cover image URL
  images: [],           // reserved for a future gallery of extra photos
  variants: [],         // legacy simple text options (e.g. flavors) — see 5.2
  variantImages: {},    // { variantName: imageUrl } for the legacy system
  colors: [],           // [{ name, hex, image }] — see 5.3
  sizes: [],            // ["S", "M", "L", ...] — see 5.3
  inventory: {}          // { "colorName||sizeName": qty } — see 5.3
}
```

`Store.addProduct()` fills in all of the above as defaults, so admin code
only needs to pass the fields it actually collected.

### 5.2 Legacy "variants" (simple text options)

Kept from the original project for products that need a lightweight, single
list of named options with **no separate inventory tracking** (e.g. flavors,
scents, bundle sizes) — a single shared `stock` number covers all of them.
Each variant may optionally have its own image (`variantImages`). This
system is only used in the UI when a product has **no** colors and **no**
sizes (see 5.3) — colors/sizes take priority when present.

### 5.3 Colors + sizes + per-combination inventory (new in this template)

This is the system to use for clothing (or any product needing real
per-variant stock tracking):

- `colors`: array of `{ name, hex, image }`. `image` is optional — if set,
  selecting that color swaps the main product photo on the detail page.
- `sizes`: array of plain strings (e.g. `["XS","S","M","L","XL","XXL"]`).
- `inventory`: a flat map keyed by `"<colorName>||<sizeName>"`, e.g.
  `"Black||M": 5`. If a product has colors but no sizes, the key is
  `"Black||_"`. If it has sizes but no colors, the key is `"_||M"`.
  Helper: `inventoryKey(color, size)` in `store.js` builds this key
  consistently; always use it rather than concatenating strings manually.
- `Store.hasVariantMatrix(product)` → true if the product has any colors or
  sizes defined.
- `Store.getVariantStock(product, color, size)` → stock for one specific
  combination (falls back to `product.stock` for products with no matrix).
- `Store.getTotalStock(product)` → sum of all inventory entries (or
  `product.stock` for non-matrix products). This is what product cards and
  "is this in stock at all" checks use.
- `Store.isProductAvailable(product)` → `product.available && totalStock >
  0`. Use this everywhere instead of checking `product.available` and
  `product.stock` separately — several places in the original code did the
  latter and have been updated to call this helper instead.

The **total `stock` field is auto-computed** from the inventory grid
whenever a product has colors or sizes (both in the admin form and in
`Store`); admins only enter per-combination quantities, never a manual
total, once the matrix is in use.

### 5.4 Categories

Simple flat-or-one-level-nested list (`parentId` optional) with a `name`,
an `icon` (a key into `js/icons.js`'s icon set), and an optional `image`.
`Store.getCategoryName(id)` is the standard lookup helper.

---

## 6. Admin panel (`admin.html` + `js/admin.js`)

Single-page dashboard, sections toggled via `wireSidebarNav()` reading
`data-panel` attributes — no page reloads. Panels: Dashboard (stats),
Products, Categories, Ads, Orders, Settings.

### 6.1 Product form

Alongside name/description/price/category/flags, the product modal now
includes:
- The legacy "options" text field (`#productVariants`) + per-option image
  uploader (unchanged from the source project) — for simple flavor-style
  products.
- A **Colors** builder (`#colorsList` / "+ إضافة لون"): each row is a name
  input, an `<input type="color">` swatch picker, and an optional per-color
  image upload (goes through the same `uploadToImgBB()` pipeline as the
  main product photo).
- A **Sizes** field (`#productSizes`): comma-separated list, e.g. `S, M, L`.
- An **Inventory grid** (`#inventoryGrid`), auto-generated from the current
  colors × sizes whenever either changes: one numeric input per
  color/size combination. The total stock field becomes read-only and is
  recalculated live as the grid is edited.

When a product has no colors and no sizes, the inventory grid stays hidden
and the total-stock field is a normal, manually-editable number — fully
backward compatible with simple products.

### 6.2 Image uploads (ImgBB / ImageKit)

`uploadToImgBB(file, isBanner)` in `admin.js`:
1. Reads `STORE_CONFIG.imgbbApiKey`. If empty, throws immediately with a
   clear Arabic error message (surfaced via `showToast`) — **no network
   call is attempted** and nothing crashes.
2. Uploads to `https://api.imgbb.com/1/upload` and gets back a raw
   `i.ibb.co` URL.
3. Reads `STORE_CONFIG.imageKitEndpoint`. If empty, the raw ImgBB URL is
   returned as-is (fully functional, just without CDN transforms). If set,
   the URL is rewritten to `<imageKitEndpoint>/tr:w-###,q-##,f-auto/<path>`
   for automatic resizing/format optimization.

This function is shared by the product cover image, per-color images,
per-variant images, category images, and ad banner images.

### 6.3 Orders log

`Store.logOrder()` is called right before a WhatsApp order link is opened
(both single-product and full-cart checkout). Order line items now carry
`color`/`size`/`variant` (whichever applies) so the admin Orders table and
the WhatsApp message text both show the selected option, not just the
product name.

### 6.4 Settings panel

Maps 1:1 to the `ws_settings` object: store name/tagline/description,
WhatsApp number, Instagram link, **TikTok link** (new field, added
alongside Instagram), phone, address, working hours, delivery info,
currency symbol, and admin username/password. Firebase/ImgBB/ImageKit
credentials are **not** editable from here by design — they live only in
`js/config.js` (a code-level, per-deployment setting, not a per-session
store setting), consistent with the original project's separation.

---

## 7. Shopping cart

### 7.1 Cart line shape

```js
{
  itemKey: "prd_123|c:Black|s:M",  // unique per product+color+size(+variant)
  productId: "prd_123",
  qty: 2,
  color: "Black" | null,
  size: "M" | null,
  variant: "Chicken" | null         // legacy option name, mutually exclusive with color/size
}
```

`buildCartItemKey(productId, meta)` in `store.js` builds `itemKey`
consistently: `productId` plus `|c:<color>` / `|s:<size>` / `|v:<variant>`
for whichever fields are present. **Black + M** and **Black + L** therefore
always produce different `itemKey`s and are tracked as separate cart lines,
as required. A plain product with no options at all just gets `itemKey =
productId`.

### 7.2 Adding to cart

- `Store.addToCart(itemKey, qty, meta)` — increments an existing line's
  `qty` if the exact `itemKey` already exists, otherwise pushes a new line.
- Product-detail add-to-cart (`js/products.js`) always passes the currently
  selected `{ color, size, variant }` and the matching `itemKey`.
- "Quick add" from a product card / homepage grid only works for products
  with **no** options (no colors, sizes, or legacy variants) — otherwise
  the click routes to the product detail page so the shopper must choose a
  color/size first (mirrors the original variant-flavor behavior).

### 7.3 Per-line stock limits

`js/cart.js` computes each line's max quantity via
`Store.getVariantStock(product, line.color, line.size)`, not the product's
flat `stock` field — so the +/- steppers and the manual quantity input are
capped correctly per color/size combination, not by total product stock.

---

## 8. WhatsApp ordering

`js/whatsapp.js` builds a prefilled `https://wa.me/<number>?text=...` link.

- `isWhatsAppConfigured()` checks that `Store.getSettings().whatsapp` is
  non-empty (after stripping to digits). Both `orderSingleProductViaWhatsApp`
  and `orderCartViaWhatsApp`, plus the cart page's checkout button, call
  this **before** opening the delivery-info modal. If unconfigured, a toast
  ("لم يتم إعداد رقم واتساب بعد...") is shown instead and no broken
  `wa.me/` link (with an empty phone number) is ever generated.
- Delivery info (governorate/area/landmark/phone) is still collected via a
  small modal (`showDeliveryModal`) before the WhatsApp link opens — this
  part of the flow is unchanged from the source project.
- Order messages now include a color/size (or legacy variant) line per item
  when applicable, via `variantLineText()`.

---

## 9. Firebase / ImgBB / ImageKit setup

All three are **optional** and empty by default. The site is fully
functional with all three empty (localStorage-only, ImgBB upload disabled
with a clear error, no CDN transform).

### Firebase Realtime Database
1. Create a Firebase project → Realtime Database (start in test mode for
   evaluation, then lock down rules before going live).
2. Copy the database URL (e.g. `https://your-project-default-rtdb.firebaseio.com`).
3. Paste it into `STORE_CONFIG.firebaseDatabaseURL` in `js/config.js`.
4. **Security:** this template's Firebase access is entirely client-side —
   there is no server validating writes. At minimum, set Realtime Database
   rules to require Firebase Authentication for writes if you go to
   production, or otherwise restrict write access; the current admin
   "login" is a client-side check only (see section 10) and does not by
   itself protect a public Firebase database from writes by anyone who
   opens the browser console.

### ImgBB
1. Get a free API key at `https://api.imgbb.com/`.
2. Paste it into `STORE_CONFIG.imgbbApiKey`.
3. Image uploads in the admin panel (product cover, color images, variant
   images, category images, ad banners) will start working immediately.

### ImageKit (optional CDN layer on top of ImgBB)
1. Create an ImageKit account and note your endpoint (e.g.
   `https://ik.imagekit.io/your_id`).
2. Paste it into `STORE_CONFIG.imageKitEndpoint`.
3. Uploaded images are then served through ImageKit with automatic
   resizing/format optimization. Leaving this empty just serves the raw
   ImgBB URL — everything still works, just without CDN transforms.

---

## 10. Authentication

`js/auth.js` guards `admin.html` (`requireAdminAuth()` redirects to
`login.html` if no session flag is present) and handles the login form on
`login.html` (`Store.login(username, password)`).

**This is client-side-only authentication**, appropriate for a low-stakes,
single-operator admin panel or a demo/MVP — not a hardened auth system:
- Credentials are compared in the browser against the `adminUsername` /
  `adminPassword` fields of `ws_settings` (which come from `js/config.js`
  on first run, then whatever was last saved from the Settings panel).
- The "session" is just a `sessionStorage` flag; nothing is signed or
  verified by a server.
- If you enable Firebase, anyone with the database URL can still read/write
  it directly (via the REST API or SDK) regardless of this login screen,
  unless you configure real Firebase Authentication + security rules.
- **Change the default admin password (`ChangeMe@123`) immediately** after
  first deployment, and treat this auth layer as a convenience gate, not a
  security boundary, until/unless you replace it with real backend auth.

---

## 11. Image uploading pipeline (summary)

`<input type="file">` → `uploadToImgBB(file, isBanner)` → ImgBB → (optional)
ImageKit URL rewrite → resulting URL stored directly on the relevant object
(`product.image`, `product.colors[i].image`, `product.variantImages[name]`,
`category.image`, `ad.image`) → persisted via the matching `Store.save*()`
call, which also mirrors to Firebase if configured.

---

## 12. SEO

Each page has its own static `<title>` and (on `index.html`) a `<meta
name="description">`. These are now generic placeholders (e.g. "الرئيسية |
متجرك الإلكتروني") rather than store-specific — **update them per-page** to
match your real store name/description once configured, since they are not
currently wired to read from `Store.getSettings()` at runtime (this matches
the original project's approach — titles are static HTML, not JS-generated,
except where noted, e.g. `product.html`'s `<title>` is set dynamically by
`js/products.js` to the product name).

---

## 13. How to create a new store from this template

1. Copy the whole project folder.
2. Edit `js/config.js`: store name/tagline/description, contact info, and
   (optionally) Firebase/ImgBB/ImageKit credentials.
3. Replace `assets/logo/logo.png` with your real logo (keep the same
   filename to avoid touching every HTML file, or update all
   `assets/logo/logo.png` references if you rename it).
4. Update the static `<title>` / meta description in each HTML file's
   `<head>` (see section 12).
5. Deploy the folder as-is to any static host (see README.md).
6. Open `login.html`, log in with the default admin credentials, and
   **immediately** change the password from the Settings tab.
7. Add your categories, then your products (with colors/sizes/inventory if
   it's a clothing-style catalog), from the admin panel.
8. Set your real WhatsApp number, Instagram, TikTok, phone, address,
   working hours, and delivery info from the Settings tab.

---

## 14. Where to modify each feature

| Feature                          | File(s) |
|-----------------------------------|---------|
| Store name/contact defaults       | `js/config.js` |
| Data layer / Firebase sync        | `js/store.js` |
| Product card / grid rendering     | `js/products.js` (and the duplicated inline copy in `index.html`) |
| Product detail page (colors/sizes)| `js/products.js` → `initProductDetailPage()` |
| Admin product form (colors/sizes) | `admin.html` (`#productModal`) + `js/admin.js` (`renderColorsList`, `renderInventoryGrid`, `saveProductForm`) |
| Cart logic                        | `js/cart.js`, `Store.addToCart/setQty/removeFromCart` in `store.js` |
| WhatsApp message format           | `js/whatsapp.js` |
| Header/footer                     | `js/app.js` |
| Icons                             | `js/icons.js` (`iconSvg(key)`) |
| Styling / theme colors            | `css/style.css` (CSS custom properties near the top) |
| Admin auth                        | `js/auth.js`, `Store.login/isLoggedIn/logout` in `store.js` |

---

## 15. Current limitations

- Client-side-only authentication (see section 10) — not production-grade
  security on its own.
- No pagination in the admin products/orders tables — fine for small-to-
  medium catalogs, may need adding for very large ones.
- `images` (plural gallery) field exists on the product model for future
  use but has no dedicated multi-image admin UI yet — only the single
  cover `image`, per-color images, and per-legacy-variant images are
  editable from the admin panel today.
- No real payment integration — checkout ends at a WhatsApp message, by
  design (matches the original project's ordering model).
- `index.html` duplicates some product-card/quick-add logic inline instead
  of only depending on `js/products.js` (inherited from the source
  project — see section 2).
- SEO titles/descriptions are static per page, not settings-driven (see
  section 12).

## 16. Possible future improvements

- Multi-image gallery UI in the admin product form (using the existing
  `images` array field).
- Server-side/Firebase-Authentication-backed admin login.
- Pagination/virtualization for large product or order lists.
- A real payment gateway integration alongside (or instead of) WhatsApp
  checkout.
- Dynamic, settings-driven `<title>`/meta tags on every page instead of
  static per-page text.

### Public product pagination (Firebase)
- The public storefront does not download `/products` in one request during normal browsing.
- Category/product listings use Firebase pagination with a default page size of 20 products.
- More products are fetched automatically with `IntersectionObserver` when the visitor approaches the end of the grid.
- Main categories with subcategories keep a separate Firebase cursor per category so pagination does not require downloading the entire catalog.
- The homepage requests only a small first batch (4) for Featured, Offers, and New Products.
- Product detail requests only the requested product when it is not already cached locally.
- Full-catalog loading remains available for the admin dashboard and for explicit catalog-wide operations such as search/advanced filtering, because Realtime Database cannot perform arbitrary substring search efficiently.
- `SHOP_PAGE_SIZE` in `js/products.js` controls the public page size and can be changed from 20 to 30 if desired.
