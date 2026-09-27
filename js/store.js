/* ==========================================================================
   store.js — طبقة البيانات المركزية للقالب (localStorage + Firebase اختياري)
   كل القراءة والكتابة تمر حصرًا عبر كائن Store في هذا الملف. للترقية لاحقًا
   إلى قاعدة بيانات حقيقية (Supabase مثلاً) يكفي استبدال محتوى دوال هذا الملف
   بنداءات API حقيقية دون تعديل أي صفحة أو ملف آخر. راجع PROJECT_REFERENCE.md.
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/* Firebase Realtime Database — اختياري تمامًا                           */
/* يُفعَّل فقط إذا كان STORE_CONFIG.firebaseDatabaseURL معبّأً في config.js */
/* ---------------------------------------------------------------------- */

let firebaseEnabled = false;
let database = null;

(function initFirebaseIfConfigured() {
  const url = (typeof STORE_CONFIG !== "undefined" && STORE_CONFIG.firebaseDatabaseURL || "").trim();
  if (!url) return; // لا رابط = لا اتصال، الموقع يعمل بالكامل محليًا عبر localStorage
  if (typeof firebase === "undefined") return; // مكتبة فايربيس غير محمّلة
  try {
    firebase.initializeApp({ databaseURL: url });
    database = firebase.database();
    firebaseEnabled = true;
  } catch (e) {
    console.error("Firebase init error:", e);
    firebaseEnabled = false;
  }
})();

const DB_KEYS = {
  categories: "ws_categories",
  products: "ws_products",
  settings: "ws_settings",
  cart: "ws_cart",
  orders: "ws_orders",
  session: "ws_admin_session",
  seeded: "ws_seeded_v1",
  ads: "ws_ads"
};

function uid(prefix) {
  return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// مفتاح سطر سلة فريد لكل تركيبة منتج + لون + مقاس (أو + خيار نصي قديم).
// يضمن أن "أسود + وسط" و"أسود + كبير" يُعاملان كسطرين مختلفين في السلة.
function buildCartItemKey(productId, meta) {
  meta = meta || {};
  const parts = [productId];
  if (meta.color) parts.push("c:" + meta.color);
  if (meta.size) parts.push("s:" + meta.size);
  if (meta.variant) parts.push("v:" + meta.variant);
  return parts.join("|");
}

/* --- رفع الجزء المعدل فقط إلى فايربيس (لا شيء يحدث إن كان معطّلًا) --- */
function syncNodeToFirebase(nodeKey, data) {
  if (!firebaseEnabled) return;
  database.ref(nodeKey).set(data).catch(error => {
    console.error(`Firebase Sync Error for ${nodeKey}:`, error);
  });
}

async function fetchNode(nodeKey) {
  if (!firebaseEnabled) return null;
  try {
    const snapshot = await database.ref(nodeKey).get();
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error(`Firebase Fetch Error for ${nodeKey}:`, error);
    return null;
  }
}

async function pullFromFirebase() {
  if (!firebaseEnabled) return; // وضع محلي بالكامل — لا شيء لجلبه
  try {
    // نظام تخزين مؤقت (15 دقيقة) لتوفير قراءات قاعدة البيانات
    const lastSync = localStorage.getItem("last_pull_time");
    const hasData = localStorage.getItem(DB_KEYS.products) !== null && localStorage.getItem(DB_KEYS.products) !== "[]";
    const now = Date.now();
    const cooldownMs = 15 * 60 * 1000;

    if (lastSync && (now - parseInt(lastSync)) < cooldownMs && hasData) {
      const notifySync = () => document.dispatchEvent(new CustomEvent("store:synced"));
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", notifySync, { once: true });
      } else {
        notifySync();
      }
      return;
    }

    const [products, categories, settings, ads] = await Promise.all([
      fetchNode(DB_KEYS.products),
      fetchNode(DB_KEYS.categories),
      fetchNode(DB_KEYS.settings),
      fetchNode(DB_KEYS.ads)
    ]);

    if (products === null && categories === null) {
      syncNodeToFirebase(DB_KEYS.products, JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]"));
      syncNodeToFirebase(DB_KEYS.categories, JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]"));
      syncNodeToFirebase(DB_KEYS.settings, JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}"));
      syncNodeToFirebase(DB_KEYS.ads, JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]"));
      return;
    }

    localStorage.setItem(DB_KEYS.products, JSON.stringify(products || []));
    localStorage.setItem(DB_KEYS.categories, JSON.stringify(categories || []));
    localStorage.setItem(DB_KEYS.settings, JSON.stringify(settings || {}));
    localStorage.setItem(DB_KEYS.ads, JSON.stringify(ads || []));

    if (sessionStorage.getItem(DB_KEYS.session) === "1") {
      const orders = await fetchNode(DB_KEYS.orders);
      localStorage.setItem(DB_KEYS.orders, JSON.stringify(orders || []));
    }

    localStorage.setItem("last_pull_time", now.toString());

    const notifySync = () => document.dispatchEvent(new CustomEvent("store:synced"));
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", notifySync, { once: true });
    } else {
      notifySync();
    }
  } catch (e) {
    console.error("Firebase Pull Error:", e);
  }
}

pullFromFirebase();

/* ---------------------------------------------------------------------- */
/* التهيئة الأولى — القالب يبدأ بدون أي منتجات أو أقسام أو إعلانات حقيقية */
/* ---------------------------------------------------------------------- */

function seedIfNeeded() {
  if (localStorage.getItem(DB_KEYS.seeded)) return;

  localStorage.setItem(DB_KEYS.categories, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.products, JSON.stringify([]));

  const cfg = (typeof STORE_CONFIG !== "undefined") ? STORE_CONFIG : {};
  localStorage.setItem(DB_KEYS.settings, JSON.stringify({
    storeName: cfg.storeName || "",
    storeTagline: cfg.storeTagline || "",
    storeDescription: cfg.storeDescription || "",
    whatsapp: cfg.whatsappNumber || "",
    instagram: cfg.instagram || "",
    tiktok: cfg.tiktok || "",
    phone: cfg.phone || "",
    address: cfg.address || "",
    workingHours: cfg.workingHours || "",
    deliveryInfo: cfg.deliveryInfo || "",
    currencySymbol: cfg.currencySymbol || "د.ع",
    adminUsername: cfg.adminUsername || "admin",
    adminPassword: cfg.adminPassword || "ChangeMe@123"
  }));

  localStorage.setItem(DB_KEYS.cart, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.orders, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.ads, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.seeded, "1");
}
seedIfNeeded();

/* ---------------------------------------------------------------------- */
/* أدوات المتغيرات (الألوان/المقاسات/المخزون)                            */
/* ---------------------------------------------------------------------- */

// مفتاح موحّد لخانة المخزون حسب اللون والمقاس (أيّ منهما قد يكون فارغًا)
function inventoryKey(color, size) {
  return (color || "_") + "||" + (size || "_");
}

// مجموع كل كميات المخزون عبر كل تركيبات اللون/المقاس لمنتج معيّن
function sumInventory(inventory) {
  if (!inventory) return 0;
  return Object.values(inventory).reduce(function (sum, n) { return sum + (Number(n) || 0); }, 0);
}

/* ---------------------------------------------------------------------- */
/* Store API                                                              */
/* ---------------------------------------------------------------------- */

const Store = {
  getCategories() { return JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]"); },
  saveCategories(list) {
    localStorage.setItem(DB_KEYS.categories, JSON.stringify(list));
    syncNodeToFirebase(DB_KEYS.categories, list);
  },
  addCategory(cat) {
    const list = this.getCategories();
    list.push(Object.assign({ id: uid("cat"), icon: "box" }, cat));
    this.saveCategories(list);
  },
  updateCategory(id, patch) {
    const list = this.getCategories().map(c => c.id === id ? Object.assign({}, c, patch) : c);
    this.saveCategories(list);
  },
  deleteCategory(id) { this.saveCategories(this.getCategories().filter(c => c.id !== id)); },
  getCategoryName(id) {
    const c = this.getCategories().find(c => c.id === id);
    return c ? c.name : "";
  },

  getProducts() { return JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]"); },
  saveProducts(list) {
    localStorage.setItem(DB_KEYS.products, JSON.stringify(list));
    syncNodeToFirebase(DB_KEYS.products, list);
  },
  getProduct(id) { return this.getProducts().find(p => p.id === id) || null; },

  // نموذج المنتج العام (يدعم الأقسام، الخيارات النصية البسيطة، وأيضًا نظام
  // الألوان + المقاسات + المخزون لكل تركيبة — مناسب لأي نوع متجر، والملابس
  // بشكل خاص). راجع PROJECT_REFERENCE.md لشرح كل حقل.
  addProduct(prod) {
    const list = this.getProducts();
    const item = Object.assign({
      id: uid("prd"),
      description: "",
      images: [],
      stock: 0,
      available: true,
      featured: false,
      isNew: false,
      isOffer: false,
      image: null,
      variants: [],       // خيارات نصية بسيطة (مثال: نكهات) — لمنتجات بدون ألوان/مقاسات
      variantImages: {},
      colors: [],         // [{ name, hex, image }]
      sizes: [],          // ["S", "M", "L", ...]
      inventory: {}        // { "لون||مقاس": كمية }
    }, prod);
    list.unshift(item);
    this.saveProducts(list);
    return item;
  },
  updateProduct(id, patch) {
    const list = this.getProducts().map(p => p.id === id ? Object.assign({}, p, patch) : p);
    this.saveProducts(list);
  },
  deleteProduct(id) { this.saveProducts(this.getProducts().filter(p => p.id !== id)); },

  // هل للمنتج نظام ألوان/مقاسات مفعّل؟
  hasVariantMatrix(product) {
    return !!(product && ((product.colors && product.colors.length) || (product.sizes && product.sizes.length)));
  },
  // إجمالي المخزون: من مصفوفة المخزون إن وُجد نظام ألوان/مقاسات، وإلا من stock العام
  getTotalStock(product) {
    if (!product) return 0;
    return this.hasVariantMatrix(product) ? sumInventory(product.inventory) : (Number(product.stock) || 0);
  },
  // مخزون تركيبة لون/مقاس محددة
  getVariantStock(product, color, size) {
    if (!product) return 0;
    if (!this.hasVariantMatrix(product)) return Number(product.stock) || 0;
    const key = inventoryKey(color, size);
    return Number((product.inventory || {})[key]) || 0;
  },
  isProductAvailable(product) {
    return !!(product && product.available && this.getTotalStock(product) > 0);
  },

  getSettings() { return JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}"); },
  saveSettings(patch) {
    const current = this.getSettings();
    const updated = Object.assign(current, patch);
    localStorage.setItem(DB_KEYS.settings, JSON.stringify(updated));
    syncNodeToFirebase(DB_KEYS.settings, updated);
  },

  getAds() { return JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]"); },
  saveAds(list) {
    localStorage.setItem(DB_KEYS.ads, JSON.stringify(list));
    syncNodeToFirebase(DB_KEYS.ads, list);
  },
  addAd(adData) {
    const list = this.getAds();
    list.push(Object.assign({ id: uid("ad") }, adData));
    this.saveAds(list);
  },
  deleteAd(id) { this.saveAds(this.getAds().filter(a => a.id !== id)); },

  getCart() { return JSON.parse(localStorage.getItem(DB_KEYS.cart) || "[]"); },
  saveCart(cart) {
    localStorage.setItem(DB_KEYS.cart, JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent("cart:updated"));
  },
  // itemKey يجب أن يكون فريدًا لكل تركيبة منتج+لون+مقاس (أو +خيار نصي قديم)
  // meta: { color, size, variant }
  addToCart(itemKey, qty, meta) {
    meta = meta || {};
    const cart = this.getCart();
    const line = cart.find(l => l.itemKey === itemKey);
    if (line) {
      line.qty += qty;
    } else {
      const productId = itemKey.split('|')[0];
      cart.push({
        itemKey: itemKey,
        productId: productId,
        qty: qty,
        color: meta.color || null,
        size: meta.size || null,
        variant: meta.variant || null
      });
    }
    this.saveCart(cart);
  },
  setQty(itemKey, qty) {
    let cart = this.getCart();
    if (qty <= 0) cart = cart.filter(l => l.itemKey !== itemKey);
    else cart.forEach(l => { if (l.itemKey === itemKey) l.qty = qty; });
    this.saveCart(cart);
  },
  removeFromCart(itemKey) { this.saveCart(this.getCart().filter(l => l.itemKey !== itemKey)); },
  clearCart() { this.saveCart([]); },
  cartCount() { return this.getCart().reduce((sum, l) => sum + l.qty, 0); },

  getOrders() { return JSON.parse(localStorage.getItem(DB_KEYS.orders) || "[]"); },
  logOrder(order) {
    const list = this.getOrders();
    const newOrder = Object.assign({ id: uid("ord"), date: new Date().toISOString() }, order);
    list.unshift(newOrder);
    localStorage.setItem(DB_KEYS.orders, JSON.stringify(list));
    syncNodeToFirebase(DB_KEYS.orders, list);
  },

  login(username, password) {
    const s = this.getSettings();
    if (username === s.adminUsername && password === s.adminPassword) {
      sessionStorage.setItem(DB_KEYS.session, "1");
      return true;
    }
    return false;
  },
  isLoggedIn() { return sessionStorage.getItem(DB_KEYS.session) === "1"; },
  logout() { sessionStorage.removeItem(DB_KEYS.session); }
};
