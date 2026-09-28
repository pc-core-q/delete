/* ==========================================================================
   products.js (النسخة 3.0 - تنقل سلس وفصل كامل للأقسام)
   ========================================================================== */

function productMediaHtml(product) {
  if (product.image) {
    return '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy">';
  }
  const cat = Store.getCategories().find(function (c) { return c.id === product.categoryId; });
  const key = cat ? cat.icon : "box";
  return '<div class="placeholder-icon">' + iconSvg(key) + "</div>";
}

function renderProductCard(product) {
  const outOfStock = !Store.isProductAvailable(product);
  const badges = [];
  
  if (product.isOffer) badges.push('<span class="badge badge-offer" style="background:var(--danger); color:white;">عرض🔥</span>');
  else if (product.isNew) badges.push('<span class="badge badge-new">جديد</span>');
  else if (product.featured) badges.push('<span class="badge badge-featured">مميز</span>');
  if (outOfStock) badges.push('<span class="badge badge-out-abs">غير متوفر</span>');
  const optionsCount = (product.colors && product.colors.length) || (product.variants && product.variants.length) || 0;
  if (optionsCount > 1) {
    badges.push('<span class="badge badge-variants">' + iconSvg("layers") + optionsCount + ' خيارات</span>');
  }

  return (
    '<article class="product-card">' +
      '<a href="product.html?id=' + product.id + '" class="product-media">' +
        productMediaHtml(product) +
        badges.join("") +
      "</a>" +
      '<div class="product-body">' +
        '<span class="product-cat">' + Store.getCategoryName(product.categoryId) + "</span>" +
        '<h3 class="product-name"><a href="product.html?id=' + product.id + '">' + product.name + "</a></h3>" +
        '<div class="product-foot">' +
          '<span class="price">' + formatPrice(product.price) + "</span>" +
          '<div class="product-actions">' +
            '<button class="btn btn-primary" ' + (outOfStock ? "disabled" : "") +
              ' title="' + (outOfStock ? "غير متوفر" : "أضف للسلة") + '"' +
              ' onclick="quickAddToCart(\'' + product.id + '\')">' +
              iconSvg("cart") +
            "</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</article>"
  );
}

function quickAddToCart(productId) {
  const product = Store.getProduct(productId);
  if (!product || !Store.isProductAvailable(product)) return;
  const hasOptions = (product.variants && product.variants.length > 0) || Store.hasVariantMatrix(product);
  if (hasOptions) {
      window.location.href = 'product.html?id=' + productId;
      return;
  }
  Store.addToCart(productId, 1);
  showToast(product.name + " أُضيف إلى السلة");
}

function renderGridInto(containerId, products, emptyMessage) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!products.length) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">' + iconSvg("box") + "<p>" + (emptyMessage || "لا توجد منتجات لعرضها حاليًا.") + "</p></div>";
    return;
  }
  el.innerHTML = products.map(renderProductCard).join("");
}

const SHOP_PAGE_SIZE = 20;
const shopState = {
  search: "", categoryId: "all", sort: "default", minPrice: "", maxPrice: "", filterMode: "",
  pagination: { token: 0, loading: false, done: false, cursors: {}, sources: [], products: [] }
};

function resetShopPagination() {
  shopState.pagination = {
    token: shopState.pagination.token + 1,
    loading: false,
    done: false,
    cursors: {},
    sources: [],
    products: []
  };
}

function showShopLoading(show) {
  const el = document.getElementById("shopLoading");
  if (el) el.style.display = show ? "flex" : "none";
}

function ensureShopPaginationUI() {
  const grid = document.getElementById("shopGrid");
  if (!grid || document.getElementById("shopLoadMoreSentinel")) return;

  const wrap = document.createElement("div");
  wrap.id = "shopLoadMoreWrap";
  wrap.style.cssText = "grid-column:1/-1;text-align:center;padding:14px 0;";
  wrap.innerHTML =
    '<div id="shopLoading" style="display:none;align-items:center;justify-content:center;gap:8px;color:var(--ink-500);font-size:.9rem;">جاري تحميل المزيد…</div>' +
    '<div id="shopLoadMoreSentinel" aria-hidden="true" style="height:2px;"></div>';
  grid.parentNode.insertBefore(wrap, grid.nextSibling);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(function(entries) {
      if (entries.some(function(entry) { return entry.isIntersecting; })) loadNextShopPage();
    }, { rootMargin: "500px 0px" });
    observer.observe(document.getElementById("shopLoadMoreSentinel"));
  }
}

function initShopPage() {
  const grid = document.getElementById("shopGrid");
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  if (params.get("cat")) shopState.categoryId = params.get("cat");
  if (params.get("q")) shopState.search = params.get("q");
  if (params.get("filter")) shopState.filterMode = params.get("filter");

  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  if (searchInput) {
    searchInput.value = shopState.search;
    searchInput.addEventListener("input", function () {
      shopState.search = searchInput.value.trim();
      renderShopResults({ reset: true });
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      shopState.sort = sortSelect.value;
      renderShopResults({ reset: true });
    });
  }

  renderCategoryFilterPanel();
  renderShopResults();
}

window.updateCategory = function(catId) {
    const grid = document.getElementById("shopGrid");
    if (grid) grid.classList.add("is-updating");

    shopState.categoryId = catId;
    shopState.filterMode = "";
    renderCategoryFilterPanel();
    renderShopResults({ reset: true });

    setTimeout(() => {
        if (grid) grid.classList.remove("is-updating");
    }, 200);
};

function renderCategoryFilterPanel() {
  const panel = document.getElementById("filterCategories");
  if (!panel) return;
  const categories = Store.getCategories();
  const mainCats = categories.filter(function(c) { return !c.parentId; });

  let html = '';
  // الأزرار الافتراضية
  html += '<button data-cat="all" class="shop-tab-btn ' + (shopState.categoryId === "all" && !shopState.filterMode ? "active" : "") + '">الكل</button>';
  html += '<button data-filter="featured" class="shop-tab-btn ' + (shopState.filterMode === "featured" ? "active" : "") + '">⭐ المميزة</button>';
  html += '<button data-filter="offer" class="shop-tab-btn ' + (shopState.filterMode === "offer" ? "active" : "") + '">🔥 العروض</button>';
  html += '<button data-filter="new" class="shop-tab-btn ' + (shopState.filterMode === "new" ? "active" : "") + '">✨ وصل حديثاً</button>';
  
  mainCats.forEach(function(main) {
    const isMainActive = shopState.categoryId === main.id && !shopState.filterMode;
    const isChildActive = categories.some(c => c.parentId === main.id && c.id === shopState.categoryId);
    const isActive = isMainActive || (isChildActive && !shopState.filterMode);

    html += '<button data-cat="' + main.id + '" class="shop-tab-btn ' + (isActive ? "active" : "") + '">' + main.name + '</button>';
  });
  
  panel.innerHTML = html;

  panel.querySelectorAll("button[data-cat], button[data-filter]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const grid = document.getElementById("shopGrid");
      if (grid) grid.classList.add("is-updating");

      if (btn.dataset.filter) { shopState.filterMode = btn.dataset.filter; shopState.categoryId = "all"; } 
      else { shopState.filterMode = ""; shopState.categoryId = btn.dataset.cat; }
      
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({path:newUrl}, '', newUrl);
      
      renderCategoryFilterPanel();
      renderShopResults({ reset: true });

      setTimeout(() => {
        if (grid) grid.classList.remove("is-updating");
      }, 200);
    });
  });
}

async function fetchNextShopBatch(token) {
  const page = shopState.pagination;
  if (page.loading || page.done || token !== page.token) return;
  page.loading = true;
  showShopLoading(true);

  try {
    if (shopState.search || shopState.sort !== "default") {
      if (!page.products.length) {
        const all = await Store.loadAllProductsFromFirebase();
        if (token !== page.token) return;
        page.products = all.slice();
      }
      page.done = true;
      return;
    }

    let added = [];

    if (shopState.filterMode === "featured" || shopState.filterMode === "offer" || shopState.filterMode === "new") {
      const map = { featured: ["featured", true], offer: ["isOffer", true], new: ["isNew", true] };
      const cfg = map[shopState.filterMode];
      const sourceKey = "field:" + cfg[0] + ":" + cfg[1];
      const cursor = page.cursors[sourceKey] || null;
      const result = await Store.loadProductsPageByField(cfg[0], cfg[1], SHOP_PAGE_SIZE, cursor);
      if (token !== page.token) return;
      added = result.products;
      page.cursors[sourceKey] = result.nextCursor;
      page.done = result.done;
    } else if (shopState.categoryId === "all") {
      const sourceKey = "all";
      const result = await Store.loadProductsPage(SHOP_PAGE_SIZE, page.cursors[sourceKey] || null);
      if (token !== page.token) return;
      added = result.products;
      page.cursors[sourceKey] = result.nextCursor;
      page.done = result.done;
    } else {
      const categories = Store.getCategories();
      const selected = categories.find(function(c) { return c.id === shopState.categoryId; });
      const ids = [shopState.categoryId];
      if (selected && !selected.parentId) {
        categories.filter(function(c) { return c.parentId === selected.id; }).forEach(function(c) { ids.push(c.id); });
      }

      for (let i = 0; i < ids.length && added.length < SHOP_PAGE_SIZE; i++) {
        const categoryId = ids[i];
        const sourceKey = "cat:" + categoryId;
        if (page.cursors[sourceKey] === "__done__") continue;
        const remaining = SHOP_PAGE_SIZE - added.length;
        const result = await Store.loadProductsPageByCategory(categoryId, remaining, page.cursors[sourceKey] || null);
        if (token !== page.token) return;
        added = added.concat(result.products);
        page.cursors[sourceKey] = result.done ? "__done__" : result.nextCursor;
      }

      page.done = ids.every(function(id) { return page.cursors["cat:" + id] === "__done__"; });
    }

    const seen = new Set(page.products.map(function(p) { return p.id; }));
    added.forEach(function(p) {
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        page.products.push(p);
      }
    });

    if (!added.length && !page.done) page.done = true;
  } catch (error) {
    console.error("Shop pagination error:", error);
    page.done = true;
  } finally {
    if (token === shopState.pagination.token) {
      page.loading = false;
      showShopLoading(false);
    }
  }
}

async function renderShopResults(options) {
  options = options || {};
  ensureShopPaginationUI();
  const token = shopState.pagination.token;

  if (options.reset) {
    resetShopPagination();
    ensureShopPaginationUI();
  }

  await fetchNextShopBatch(shopState.pagination.token);
  if (token !== shopState.pagination.token && !options.reset) return;

  let list = shopState.pagination.products.slice();

  if (shopState.search) {
    const q = shopState.search.toLowerCase();
    list = list.filter(function (p) { return (p.name || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q); });
  }

  switch (shopState.sort) {
    case "price-asc": list.sort(function (a, b) { return a.price - b.price; }); break;
    case "price-desc": list.sort(function (a, b) { return b.price - a.price; }); break;
    case "name": list.sort(function (a, b) { return (a.name || "").localeCompare((b.name || ""), "ar"); }); break;
    default: break;
  }

  // إظهار الأقسام الفرعية بشكل شريط رقائق ناعم أسفل التبويبات مباشرة
  const subCatContainerId = "subCategoryScroller";
  let subCatContainer = document.getElementById(subCatContainerId);
  if (shopState.categoryId !== "all" && !shopState.filterMode) {
    const currentCat = Store.getCategories().find(function(c) { return c.id === shopState.categoryId; });
    const parentId = currentCat ? (currentCat.parentId || currentCat.id) : null;
    if (parentId) {
      const subCats = Store.getCategories().filter(function(c) { return c.parentId === parentId; });
      if (subCats.length > 0) {
        if (!subCatContainer) {
          subCatContainer = document.createElement("div");
          subCatContainer.id = subCatContainerId;
          subCatContainer.style.cssText = "display:flex;gap:8px;overflow-x:auto;padding-bottom:12px;margin-bottom:15px;scrollbar-width:none;";
          const grid = document.getElementById("shopGrid");
          if (grid && grid.parentNode) grid.parentNode.insertBefore(subCatContainer, grid);
        }
        let subHtml = '<button class="cat-sub-chip ' + (shopState.categoryId === parentId ? 'active' : '') + '" style="' + (shopState.categoryId === parentId ? 'background:var(--olive-700);color:#fff;' : '') + '" onclick="updateCategory(\'' + parentId + '\')">كل التفرعات</button>';
        subHtml += subCats.map(function(sub) { 
          const isAct = shopState.categoryId === sub.id;
          return '<button class="cat-sub-chip ' + (isAct ? 'active' : '') + '" style="' + (isAct ? 'background:var(--olive-700);color:#fff;' : '') + '" onclick="updateCategory(\'' + sub.id + '\')">' + sub.name + '</button>'; 
        }).join('');
        subCatContainer.innerHTML = subHtml;
        subCatContainer.style.display = "flex";
      } else if (subCatContainer) subCatContainer.style.display = "none";
    }
  } else if (subCatContainer) subCatContainer.style.display = "none";

  let emptyMsg = "لا توجد منتجات مطابقة لهذا القسم حاليًا.";
  if (shopState.filterMode === "featured") emptyMsg = "عذراً، لا توجد منتجات مميزة في المتجر حالياً.";
  else if (shopState.filterMode === "offer") emptyMsg = "عذراً، لا توجد عروض وتخفيضات حالياً.";
  else if (shopState.filterMode === "new") emptyMsg = "عذراً، لا توجد منتجات جديدة في المتجر حالياً.";

  renderGridInto("shopGrid", list, emptyMsg);
  const countEl = document.getElementById("resultCount");
  if (countEl) countEl.textContent = (shopState.pagination.done ? list.length : list.length + "+") + " منتج";

  const sentinel = document.getElementById("shopLoadMoreSentinel");
  if (sentinel) sentinel.style.display = shopState.pagination.done ? "none" : "block";
}

async function loadNextShopPage() {
  if (shopState.pagination.loading || shopState.pagination.done) return;
  await renderShopResults();
}

async function initHomeCollections() {
  const featuredEl = document.getElementById("featuredGrid");
  const offerEl = document.getElementById("offerGrid"); 
  const newEl = document.getElementById("newGrid");
  const catEl = document.getElementById("homeCategories");

  const results = await Promise.all([
    Store.loadProductsPageByField("featured", true, 4, null),
    Store.loadProductsPageByField("isOffer", true, 4, null),
    Store.loadProductsPageByField("isNew", true, 4, null)
  ]);
  if (featuredEl) renderGridInto("featuredGrid", results[0].products, "لا توجد منتجات مميزة حاليًا.");
  if (offerEl) renderGridInto("offerGrid", results[1].products, "لا توجد عروض حاليًا.");
  if (newEl) renderGridInto("newGrid", results[2].products, "لا توجد منتجات جديدة حاليًا.");
  
  if (catEl) {
    const categories = Store.getCategories();
    const mainCategories = categories.filter(function(c) { return !c.parentId; });
    catEl.innerHTML = mainCategories.map(function (c) {
      const media = c.image ? '<img src="' + c.image + '" alt="' + c.name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : iconSvg(c.icon || "box");
      return '<a href="products.html?cat=' + c.id + '" class="cat-chip"><span class="cat-icon" style="padding:0;overflow:hidden;display:flex;align-items:center;justify-content:center;">' + media + '</span><span class="name">' + c.name + "</span></a>";
    }).join("");
  }
}

async function initProductDetailPage() {
  const mount = document.getElementById("productDetail");
  if (!mount) return;

  const id = new URLSearchParams(location.search).get("id");
  const product = id ? await Store.loadProductById(id) : null;

  if (!product) {
    mount.innerHTML = '<div class="empty-state">' + iconSvg("box") + "<p>هذا المنتج غير موجود أو تم حذفه.</p>" + '<a href="products.html" class="btn btn-outline">العودة إلى المتجر</a></div>';
    return;
  }

  document.title = product.name + " — " + (Store.getSettings().storeName || "متجرك الإلكتروني");

  const hasColors = !!(product.colors && product.colors.length);
  const hasSizes = !!(product.sizes && product.sizes.length);
  const hasMatrix = hasColors || hasSizes;
  const hasLegacyVariants = !hasMatrix && product.variants && product.variants.length > 0;
  const productAvailable = !!product.available;

  let matrixHtml = "";
  if (hasColors) {
    matrixHtml +=
      '<div class="field" style="margin-bottom:16px;">' +
        '<label style="display:block;margin-bottom:8px;font-weight:600;">اللون:</label>' +
        '<div id="colorSwatches" style="display:flex;flex-wrap:wrap;gap:10px;">' +
          product.colors.map(function (c, i) {
            const bg = c.hex || "#ccc";
            return '<button type="button" class="color-swatch" data-color="' + c.name + '" title="' + c.name + '" ' +
              'style="width:36px;height:36px;border-radius:50%;border:2px solid ' + (i === 0 ? "var(--olive-700)" : "var(--line-strong)") + ';background:' + bg + ';cursor:pointer;"></button>';
          }).join('') +
        '</div>' +
        '<div id="selectedColorLabel" style="margin-top:6px;font-size:.85rem;color:var(--ink-600);">' + (product.colors[0] ? product.colors[0].name : "") + '</div>' +
      '</div>';
  }
  if (hasSizes) {
    matrixHtml +=
      '<div class="field" style="margin-bottom:16px;">' +
        '<label style="display:block;margin-bottom:8px;font-weight:600;">المقاس:</label>' +
        '<div id="sizeButtons" style="display:flex;flex-wrap:wrap;gap:8px;">' +
          product.sizes.map(function (sz, i) {
            return '<button type="button" class="size-btn" data-size="' + sz + '" ' +
              'style="padding:8px 16px;border-radius:8px;border:1px solid ' + (i === 0 ? "var(--olive-700)" : "var(--line-strong)") + ';background:' + (i === 0 ? "var(--olive-50)" : "var(--white)") + ';cursor:pointer;font-weight:600;">' + sz + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  let legacyVariantsHtml = "";
  if (hasLegacyVariants) {
      legacyVariantsHtml =
        '<div class="field" style="margin-bottom:20px;">' +
          '<label class="variant-label" style="display:block;margin-bottom:8px;font-weight:600;">الخيارات المتوفرة:</label>' +
          '<div id="customDropdown" style="position:relative;">' +
            '<button type="button" id="dropdownBtn" style="width:100%;padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--line-strong);background:var(--white);font-family:var(--font-body);font-size:1rem;color:var(--ink-900);cursor:pointer;display:flex;justify-content:space-between;align-items:center;text-align:right;">' +
              '<span id="dropdownSelected">' + product.variants[0] + '</span>' +
              '<span id="dropdownArrow" style="transition:transform 0.3s;">&#9660;</span>' +
            '</button>' +
            '<ul id="dropdownList" style="display:none;position:absolute;top:calc(100% + 4px);right:0;left:0;background:var(--white);border:1px solid var(--line-strong);border-radius:var(--radius-sm);z-index:999;list-style:none;margin:0;padding:0;box-shadow:0 8px 24px rgba(0,0,0,0.12);max-height:220px;overflow-y:auto;">' +
              product.variants.map(function (v, i) {
                return '<li data-variant="' + v + '" style="padding:12px 16px;cursor:pointer;font-family:var(--font-body);font-size:1rem;color:var(--ink-900);border-bottom:1px solid var(--line-soft);text-align:right;' + (i === 0 ? 'font-weight:700;' : '') + '">' + v + '</li>';
              }).join('') +
            '</ul>' +
          '</div>' +
        '</div>';
  }

  const initialStock = hasMatrix
    ? Store.getVariantStock(product, hasColors ? product.colors[0].name : null, hasSizes ? product.sizes[0] : null)
    : Store.getTotalStock(product);
  const initiallyOutOfStock = !productAvailable || initialStock <= 0;

  mount.innerHTML =
    '<div class="detail-grid"><div class="detail-media">' + productMediaHtml(product) + "</div>" +
      '<div class="detail-info">' +
        '<span class="product-cat">' + Store.getCategoryName(product.categoryId) + "</span>" +
        "<h1>" + product.name + "</h1>" +
        '<div class="stock-line" id="stockLine"><span class="dot' + (initiallyOutOfStock ? " dot-out" : "") + '"></span><span id="stockLineText">' + (initiallyOutOfStock ? "غير متوفر حاليًا" : "متوفر — الكمية " + initialStock) + "</span></div>" +
        '<div class="detail-price">' + formatPrice(product.price) + "</div>" +
        '<div id="descWrapper" style="position:relative; overflow:hidden; max-height:80px; transition: max-height 0.4s ease;">' +
          '<p style="margin:0;">' + (product.description || "") + '</p>' +
          '<div id="descFade" style="position:absolute; bottom:0; left:0; right:0; height:40px; background:linear-gradient(transparent, var(--cream));"></div>' +
        '</div>' +
        '<button id="descToggle" style="background:none; border:none; color:var(--olive-700); font-weight:700; font-size:0.9rem; padding:4px 0; margin-bottom:12px; cursor:pointer;">قراءة المزيد ↓</button>' +
        matrixHtml +
        legacyVariantsHtml +
        '<div class="qty-stepper" id="qtyStepperWrap" style="' + (initiallyOutOfStock ? "display:none;" : "") + '"><button type="button" id="qtyMinus">−</button><input type="number" id="qtyInput" value="1" min="1" max="' + Math.max(initialStock, 1) + '"><button type="button" id="qtyPlus">+</button></div>' +
        '<div class="detail-actions" id="detailActions">' +
          (initiallyOutOfStock
            ? '<button class="btn btn-outline" disabled>غير متوفر حاليًا</button>'
            : '<button class="btn btn-primary" id="addToCartBtn">' + iconSvg("cart") + "أضف للسلة</button>" + '<button class="btn btn-whatsapp" id="orderNowBtn">' + iconSvg("whatsapp") + "طلب عبر واتساب</button>"
          ) +
        "</div>" +
        '<div class="detail-meta"><span>القسم: ' + Store.getCategoryName(product.categoryId) + '</span><span id="availabilityMeta">حالة التوفر: ' + (initiallyOutOfStock ? "غير متوفر" : "متوفر") + '</span></div>' +
      "</div></div>";

  let selectedColor = hasColors ? product.colors[0].name : null;
  let selectedSize = hasSizes ? product.sizes[0] : null;
  let selectedVariant = hasLegacyVariants ? product.variants[0] : null;

  function refreshAvailabilityUI() {
    const stock = hasMatrix ? Store.getVariantStock(product, selectedColor, selectedSize) : Store.getTotalStock(product);
    const outOfStock = !productAvailable || stock <= 0;

    const stockLine = document.getElementById("stockLine");
    const stockLineText = document.getElementById("stockLineText");
    if (stockLine && stockLineText) {
      stockLine.querySelector(".dot").classList.toggle("dot-out", outOfStock);
      stockLineText.textContent = outOfStock ? "غير متوفر حاليًا" : "متوفر — الكمية " + stock;
    }
    const availabilityMeta = document.getElementById("availabilityMeta");
    if (availabilityMeta) availabilityMeta.textContent = "حالة التوفر: " + (outOfStock ? "غير متوفر" : "متوفر");

    const qtyWrap = document.getElementById("qtyStepperWrap");
    const qtyInput = document.getElementById("qtyInput");
    if (qtyWrap) qtyWrap.style.display = outOfStock ? "none" : "";
    if (qtyInput) {
      qtyInput.max = Math.max(stock, 1);
      if (Number(qtyInput.value) > stock) qtyInput.value = Math.max(stock, 1);
    }

    const actions = document.getElementById("detailActions");
    if (actions) {
      actions.innerHTML = outOfStock
        ? '<button class="btn btn-outline" disabled>غير متوفر حاليًا</button>'
        : '<button class="btn btn-primary" id="addToCartBtn">' + iconSvg("cart") + "أضف للسلة</button>" + '<button class="btn btn-whatsapp" id="orderNowBtn">' + iconSvg("whatsapp") + "طلب عبر واتساب</button>";
      wireActionButtons();
    }
    return outOfStock;
  }

  function wireActionButtons() {
    const addBtn = document.getElementById("addToCartBtn");
    const orderBtn = document.getElementById("orderNowBtn");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        const qtyInput = document.getElementById("qtyInput");
        const qty = Number(qtyInput ? qtyInput.value : 1) || 1;
        const meta = { color: selectedColor, size: selectedSize, variant: selectedVariant };
        const itemKey = buildCartItemKey(product.id, meta);
        Store.addToCart(itemKey, qty, meta);
        showToast(product.name + " أُضيف إلى السلة");
      });
    }
    if (orderBtn) {
      orderBtn.addEventListener("click", function () {
        const qtyInput = document.getElementById("qtyInput");
        const qty = Number(qtyInput ? qtyInput.value : 1) || 1;
        orderSingleProductViaWhatsApp(product, qty, { color: selectedColor, size: selectedSize, variant: selectedVariant });
      });
    }
  }

  const colorSwatches = document.getElementById("colorSwatches");
  if (colorSwatches) {
    colorSwatches.querySelectorAll(".color-swatch").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectedColor = btn.dataset.color;
        colorSwatches.querySelectorAll(".color-swatch").forEach(function (b) { b.style.borderColor = "var(--line-strong)"; });
        btn.style.borderColor = "var(--olive-700)";
        const label = document.getElementById("selectedColorLabel");
        if (label) label.textContent = selectedColor;
        const colorObj = product.colors.find(function (c) { return c.name === selectedColor; });
        const mediaContainer = document.querySelector(".detail-media");
        if (mediaContainer) {
          mediaContainer.innerHTML = (colorObj && colorObj.image)
            ? '<img src="' + colorObj.image + '" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">'
            : productMediaHtml(product);
        }
        refreshAvailabilityUI();
      });
    });
  }

  const sizeButtons = document.getElementById("sizeButtons");
  if (sizeButtons) {
    sizeButtons.querySelectorAll(".size-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectedSize = btn.dataset.size;
        sizeButtons.querySelectorAll(".size-btn").forEach(function (b) {
          b.style.borderColor = "var(--line-strong)";
          b.style.background = "var(--white)";
        });
        btn.style.borderColor = "var(--olive-700)";
        btn.style.background = "var(--olive-50)";
        refreshAvailabilityUI();
      });
    });
  }

  const customDropdown = document.getElementById("customDropdown");
  const dropdownBtn = document.getElementById("dropdownBtn");
  const dropdownList = document.getElementById("dropdownList");
  const dropdownSelected = document.getElementById("dropdownSelected");
  const dropdownArrow = document.getElementById("dropdownArrow");

  if (customDropdown && dropdownBtn) {
    dropdownBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = dropdownList.style.display === "block";
      dropdownList.style.display = isOpen ? "none" : "block";
      dropdownArrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
    });

    dropdownList.querySelectorAll("li").forEach(function (li) {
      li.addEventListener("mouseover", function () { li.style.background = "var(--cream)"; });
      li.addEventListener("mouseout", function () { li.style.background = ""; });
      li.addEventListener("click", function () {
        selectedVariant = li.dataset.variant;
        dropdownSelected.textContent = selectedVariant;
        dropdownList.style.display = "none";
        dropdownArrow.style.transform = "rotate(0deg)";
        dropdownList.querySelectorAll("li").forEach(function (el) { el.style.fontWeight = ""; });
        li.style.fontWeight = "700";
        const mediaContainer = document.querySelector(".detail-media");
        if (product.variantImages && product.variantImages[selectedVariant]) {
          mediaContainer.innerHTML = '<img src="' + product.variantImages[selectedVariant] + '" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">';
        } else {
          mediaContainer.innerHTML = productMediaHtml(product);
        }
      });
    });

    document.addEventListener("click", function () {
      dropdownList.style.display = "none";
      dropdownArrow.style.transform = "rotate(0deg)";
    });
  }

  if (!initiallyOutOfStock) {
    wireActionButtons();
  }

  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");
  if (qtyMinus) qtyMinus.addEventListener("click", function () {
    const qtyInput = document.getElementById("qtyInput");
    qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
  });
  if (qtyPlus) qtyPlus.addEventListener("click", function () {
    const qtyInput = document.getElementById("qtyInput");
    qtyInput.value = Math.min(Number(qtyInput.max) || 1, Number(qtyInput.value) + 1);
  });

  const descWrapper = document.getElementById("descWrapper");
  const descToggle = document.getElementById("descToggle");
  const descFade = document.getElementById("descFade");
  if (descToggle && descWrapper) {
    let expanded = false;
    descToggle.addEventListener("click", function () {
      expanded = !expanded;
      descWrapper.style.maxHeight = expanded ? descWrapper.scrollHeight + "px" : "80px";
      descFade.style.display = expanded ? "none" : "block";
      descToggle.textContent = expanded ? "إخفاء ↑" : "قراءة المزيد ↓";
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initHomeCollections();
  initShopPage();
  initProductDetailPage();
});
document.addEventListener("store:synced", function () {
  initHomeCollections();
  if (document.getElementById("shopGrid")) {
    renderCategoryFilterPanel();
    renderShopResults({ reset: true });
  }
  if (document.getElementById("productDetail")) initProductDetailPage();
});