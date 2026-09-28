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
let firebaseAuth = null;

(function initFirebaseIfConfigured() {
  const url = (typeof STORE_CONFIG !== "undefined" && STORE_CONFIG.firebaseDatabaseURL || "").trim();
  if (!url) return; // لا رابط = لا اتصال، الموقع يعمل بالكامل محليًا عبر localStorage
  if (typeof firebase === "undefined") return; // مكتبة فايربيس غير محمّلة
  try {
    const cfg = STORE_CONFIG || {};
    const authReady = [cfg.firebaseApiKey, cfg.firebaseAuthDomain, cfg.firebaseProjectId, cfg.firebaseAppId].every(v => String(v || "").trim());
    const appConfig = { databaseURL: url };
    if (authReady) {
      Object.assign(appConfig, {
        apiKey: String(cfg.firebaseApiKey).trim(),
        authDomain: String(cfg.firebaseAuthDomain).trim(),
        projectId: String(cfg.firebaseProjectId).trim(),
        storageBucket: String(cfg.firebaseStorageBucket || "").trim(),
        messagingSenderId: String(cfg.firebaseMessagingSenderId || "").trim(),
        appId: String(cfg.firebaseAppId).trim()
      });
    }
    firebase.initializeApp(appConfig);
    database = firebase.database();
    if (authReady && typeof firebase.auth === "function") firebaseAuth = firebase.auth();
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
  if (!firebaseEnabled) return;
  try {
    // مهم: لا نسحب /products هنا. المتجر العام يجلب المنتجات حسب القسم عند الحاجة.
   const lastSync = localStorage.getItem("last_meta_pull_time");
   const now = Date.now();
  //  const cooldownMs = 15 * 60 * 1000;

    if (lastSync && (now - parseInt(lastSync)) < cooldownMs) {
      const notifySync = () => document.dispatchEvent(new CustomEvent("store:synced"));
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", notifySync, { once: true });
      else notifySync();
      return;
    }

    // الأقسام والإعدادات والإعلانات صغيرة نسبيًا، لذلك تبقى مزامنتها عامة.
    const [categories, settings, ads] = await Promise.all([
      fetchNode(DB_KEYS.categories),
      fetchNode(DB_KEYS.settings),
      fetchNode(DB_KEYS.ads)
    ]);

    if (categories !== null) localStorage.setItem(DB_KEYS.categories, JSON.stringify(categories || []));
    if (settings !== null) localStorage.setItem(DB_KEYS.settings, JSON.stringify(settings || {}));
    if (ads !== null) localStorage.setItem(DB_KEYS.ads, JSON.stringify(ads || []));

    // الطلبات لا تُسحب إلا من جلسة الأدمن.
    if (sessionStorage.getItem(DB_KEYS.session) === "1") {
      const orders = await fetchNode(DB_KEYS.orders);
      if (orders !== null) localStorage.setItem(DB_KEYS.orders, JSON.stringify(orders || []));
    }

    localStorage.setItem("last_meta_pull_time", now.toString());
    const notifySync = () => document.dispatchEvent(new CustomEvent("store:synced"));
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", notifySync, { once: true });
    else notifySync();
  } catch (e) {
    console.error("Firebase metadata pull error:", e);
  }
}

// تحويل نتيجة Firebase (قد تكون Array أو Object) إلى مصفوفة منتجات.
function firebaseValueToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return Object.keys(value).map(function (key) { return value[key]; }).filter(Boolean);
}

async function fetchProductsByFieldFromFirebase(field, value) {
  if (!firebaseEnabled) return [];
  try {
    const snapshot = await database.ref(DB_KEYS.products)
      .orderByChild(field)
      .equalTo(value)
      .get();
    return snapshot.exists() ? firebaseValueToArray(snapshot.val()) : [];
  } catch (error) {
    console.error("Firebase filtered products fetch error:", error);
    return [];
  }
}

async function fetchProductsPageByCategoryFromFirebase(categoryId, pageSize, cursorKey) {
  if (!firebaseEnabled || !categoryId || categoryId === "all") return { products: [], nextCursor: null, done: true };
  try {
    let query = database.ref(DB_KEYS.products).orderByChild("categoryId");

    // The Firebase child key is the tie-breaker for products sharing the same category.
    // Request one extra row when a cursor exists so the cursor item itself can be skipped.
    query = cursorKey ? query.startAt(categoryId, cursorKey) : query.equalTo(categoryId);
    if (cursorKey) query = query.endAt(categoryId);
    query = query.limitToFirst(pageSize + (cursorKey ? 1 : 0));

    const snapshot = await query.get();
    if (!snapshot.exists()) return { products: [], nextCursor: null, done: true };

    const products = [];
    let first = true;
    let lastKey = null;
    snapshot.forEach(function(child) {
      if (cursorKey && first && child.key === cursorKey) {
        first = false;
        return;
      }
      first = false;
      products.push(child.val());
      lastKey = child.key;
    });

    const done = products.length < pageSize;
    return { products: products.slice(0, pageSize), nextCursor: done ? null : lastKey, done: done };
  } catch (error) {
    console.error("Firebase category page fetch error:", error);
    return { products: [], nextCursor: null, done: true };
  }
}

async function fetchProductsPageByFieldFromFirebase(field, value, pageSize, cursorKey) {
  if (!firebaseEnabled) return { products: [], nextCursor: null, done: true };
  try {
    let query = database.ref(DB_KEYS.products).orderByChild(field);
    query = cursorKey ? query.startAt(value, cursorKey).endAt(value) : query.equalTo(value);
    query = query.limitToFirst(pageSize + (cursorKey ? 1 : 0));

    const snapshot = await query.get();
    if (!snapshot.exists()) return { products: [], nextCursor: null, done: true };

    const products = [];
    let first = true;
    let lastKey = null;
    snapshot.forEach(function(child) {
      if (cursorKey && first && child.key === cursorKey) {
        first = false;
        return;
      }
      first = false;
      products.push(child.val());
      lastKey = child.key;
    });
    const done = products.length < pageSize;
    return { products: products.slice(0, pageSize), nextCursor: done ? null : lastKey, done: done };
  } catch (error) {
    console.error("Firebase filtered page fetch error:", error);
    return { products: [], nextCursor: null, done: true };
  }
}

async function fetchProductsPageFromFirebase(pageSize, cursorKey) {
  if (!firebaseEnabled) return { products: [], nextCursor: null, done: true };
  try {
    let query = database.ref(DB_KEYS.products).orderByKey();
    if (cursorKey) query = query.startAt(cursorKey);
    query = query.limitToFirst(pageSize + (cursorKey ? 1 : 0));
    const snapshot = await query.get();
    if (!snapshot.exists()) return { products: [], nextCursor: null, done: true };

    const products = [];
    let first = true;
    let lastKey = null;
    snapshot.forEach(function(child) {
      if (cursorKey && first && child.key === cursorKey) {
        first = false;
        return;
      }
      first = false;
      products.push(child.val());
      lastKey = child.key;
    });
    const done = products.length < pageSize;
    return { products: products.slice(0, pageSize), nextCursor: done ? null : lastKey, done: done };
  } catch (error) {
    console.error("Firebase products page fetch error:", error);
    return { products: [], nextCursor: null, done: true };
  }
}

async function fetchProductByIdFromFirebase(productId) {
  if (!firebaseEnabled || !productId) return null;
  try {
    const snapshot = await database.ref(DB_KEYS.products)
      .orderByChild("id")
      .equalTo(productId)
      .get();
    const list = snapshot.exists() ? firebaseValueToArray(snapshot.val()) : [];
    return list[0] || null;
  } catch (error) {
    console.error("Firebase product fetch error:", error);
    return null;
  }
}

async function fetchAllProductsFromFirebase() {
  if (!firebaseEnabled) return null;
  try {
    const value = await fetchNode(DB_KEYS.products);
    return value === null ? [] : firebaseValueToArray(value);
  } catch (error) {
    console.error("Firebase all-products fetch error:", error);
    return null;
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

  // تحميل منتجات قسم واحد فقط. النتيجة تُحفظ محليًا كذاكرة مؤقتة.
  // Pagination APIs below هي المسار المفضل للواجهة العامة؛ الدوال القديمة تبقى للتوافق.
  async loadProductsByField(field, value, cacheName, forceRefresh) {
    const cacheKey = "ws_products_filter_" + cacheName;
    const cacheTimeKey = cacheKey + "_time";
    const now = Date.now();
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "[]");
    const cachedAt = Number(localStorage.getItem(cacheTimeKey) || 0);
    if (!forceRefresh && cached.length && now - cachedAt < 15 * 60 * 1000) return cached;
    if (!firebaseEnabled) {
      return this.getProducts().filter(function(p) { return p[field] === value; });
    }
    const products = await fetchProductsByFieldFromFirebase(field, value);
    localStorage.setItem(cacheKey, JSON.stringify(products));
    localStorage.setItem(cacheTimeKey, String(now));
    return products;
  },

  async loadProductsPageByCategory(categoryId, pageSize, cursorKey) {
    pageSize = Number(pageSize) || 20;
    if (!categoryId || categoryId === "all") return { products: [], nextCursor: null, done: true };
    if (!firebaseEnabled) {
      const all = this.getProducts().filter(function(p) { return p.categoryId === categoryId; });
      const start = cursorKey ? Math.max(0, all.findIndex(function(p) { return p.id === cursorKey; }) + 1) : 0;
      const products = all.slice(start, start + pageSize);
      const done = start + products.length >= all.length;
      return { products: products, nextCursor: done ? null : products[products.length - 1].id, done: done };
    }
    const result = await fetchProductsPageByCategoryFromFirebase(categoryId, pageSize, cursorKey);
    this._cacheLoadedProducts(result.products);
    return result;
  },

  async loadProductsPageByField(field, value, pageSize, cursorKey) {
    pageSize = Number(pageSize) || 20;
    if (!firebaseEnabled) {
      const all = this.getProducts().filter(function(p) { return p[field] === value; });
      const start = cursorKey ? Math.max(0, all.findIndex(function(p) { return p.id === cursorKey; }) + 1) : 0;
      const products = all.slice(start, start + pageSize);
      const done = start + products.length >= all.length;
      return { products: products, nextCursor: done ? null : products[products.length - 1].id, done: done };
    }
    const result = await fetchProductsPageByFieldFromFirebase(field, value, pageSize, cursorKey);
    this._cacheLoadedProducts(result.products);
    return result;
  },

  async loadProductsPage(pageSize, cursorKey) {
    pageSize = Number(pageSize) || 20;
    if (!firebaseEnabled) {
      const all = this.getProducts();
      const start = cursorKey ? Math.max(0, all.findIndex(function(p) { return p.id === cursorKey; }) + 1) : 0;
      const products = all.slice(start, start + pageSize);
      const done = start + products.length >= all.length;
      return { products: products, nextCursor: done ? null : products[products.length - 1].id, done: done };
    }
    const result = await fetchProductsPageFromFirebase(pageSize, cursorKey);
    this._cacheLoadedProducts(result.products);
    return result;
  },

  _cacheLoadedProducts(products) {
    if (!products || !products.length) return;
    const current = this.getProducts();
    const byId = new Map(current.map(function(p) { return [p.id, p]; }));
    products.forEach(function(p) { if (p && p.id) byId.set(p.id, p); });
    localStorage.setItem(DB_KEYS.products, JSON.stringify(Array.from(byId.values())));
  },

  async loadProductsByCategory(categoryId, forceRefresh) {
    if (!categoryId || categoryId === "all") return this.getProducts();
    const cacheKey = "ws_products_category_" + categoryId;
    const cacheTimeKey = cacheKey + "_time";
    const now = Date.now();
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "[]");
    const cachedAt = Number(localStorage.getItem(cacheTimeKey) || 0);
    if (!forceRefresh && cached.length && now - cachedAt < 15 * 60 * 1000) {
      return cached;
    }

    if (!firebaseEnabled) {
      return this.getProducts().filter(function(p) { return p.categoryId === categoryId; });
    }
    const products = await fetchProductsByCategoryFromFirebase(categoryId);
    localStorage.setItem(cacheKey, JSON.stringify(products));
    localStorage.setItem(cacheTimeKey, String(now));

    // نحتفظ بما تم تحميله فقط في الذاكرة المحلية، ولا نطلب بقية المنتجات.
    const current = this.getProducts();
    const ids = new Set(products.map(function(p) { return p.id; }));
    const withoutOldCategory = current.filter(function(p) { return !ids.has(p.id); });
    localStorage.setItem(DB_KEYS.products, JSON.stringify(withoutOldCategory.concat(products)));
    return products;
  },

  async loadProductById(id, forceRefresh) {
    const local = this.getProduct(id);
    if (local && !forceRefresh) return local;
    const fetched = await fetchProductByIdFromFirebase(id);
    if (!fetched) return local || null;
    const list = this.getProducts().filter(function(p) { return p.id !== id; });
    list.push(fetched);
    localStorage.setItem(DB_KEYS.products, JSON.stringify(list));
    return fetched;
  },

  async loadAllProductsFromFirebase(forceRefresh) {
    if (!firebaseEnabled) return this.getProducts();
    if (!forceRefresh) {
      const cachedAt = Number(localStorage.getItem("ws_products_all_time") || 0);
      const cached = this.getProducts();
      if (cached.length && Date.now() - cachedAt < 5 * 60 * 1000) return cached;
    }
    const products = await fetchAllProductsFromFirebase();
    if (products === null) return this.getProducts();
    localStorage.setItem(DB_KEYS.products, JSON.stringify(products));
    localStorage.setItem("ws_products_all_time", String(Date.now()));
    return products;
  },

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

  async login(email, password) {
    if (!firebaseAuth) throw new Error("Firebase Authentication غير مهيأ. أكمل إعدادات Firebase Web App أولًا.");
    const result = await firebaseAuth.signInWithEmailAndPassword(email.trim(), password);
    const allowed = Array.isArray(STORE_CONFIG.adminEmails) && STORE_CONFIG.adminEmails.length > 0
      ? STORE_CONFIG.adminEmails.map(e => String(e).trim().toLowerCase()).includes((result.user.email || "").toLowerCase())
      : false;
    if (!allowed) {
      await firebaseAuth.signOut();
      throw new Error("هذا الحساب مصادق عليه في Firebase لكنه ليس ضمن حسابات الأدمن المسموح بها.");
    }
    sessionStorage.setItem(DB_KEYS.session, "1");
    return result.user;
  },
  isLoggedIn() { return !!(firebaseAuth && firebaseAuth.currentUser); },
  logout() {
    sessionStorage.removeItem(DB_KEYS.session);
    return firebaseAuth ? firebaseAuth.signOut() : Promise.resolve();
  }
};
