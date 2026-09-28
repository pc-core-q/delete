/* ==========================================================================
   app.js
   منطق مشترك بين كل صفحات المتجر: رسم الهيدر والفوتر ديناميكيًا من الإعدادات
   المخزّنة، القائمة على الجوال، عداد السلة، ورسائل التوست.
   ========================================================================== */

const NAV_LINKS = [
  { href: "index.html", label: "الرئيسية", key: "home" },
  { href: "products.html", label: "المنتجات", key: "products" },
  { href: "products.html#categories", label: "الأقسام", key: "categories" },
  { href: "about.html", label: "من نحن", key: "about" },
  { href: "contact.html", label: "تواصل معنا", key: "contact" }
];

function renderHeader() {
  const mount = document.getElementById("site-header");
  if (!mount) return;
  const active = mount.dataset.active || "";
  const rawSettings = Store.getSettings() || {};
  const settings = {
    storeName: rawSettings.storeName || "متجرك الإلكتروني",
    storeTagline: rawSettings.storeTagline || "تسوّق بسهولة وثقة"
  };

  const navHtml = NAV_LINKS.map(function (link) {
    const isActive = link.key === active ? " active" : "";
    return '<a href="' + link.href + '" class="' + isActive.trim() + '">' + link.label + '</a>';
  }).join("");

  mount.innerHTML =
    '<header class="site-header">' +
      '<div class="container header-inner">' +
        '<a href="index.html" class="brand" aria-label="' + settings.storeName + '">' +
          '<img src="assets/logo/logo.png" alt="' + settings.storeName + '">' +
          '<span class="brand-name">' + settings.storeName + '<span>' + settings.storeTagline + '</span></span>' +
        '</a>' +
        '<nav class="main-nav" id="mainNav" aria-label="التنقل الرئيسي">' + navHtml + '</nav>' +
        '<div class="header-actions">' +
          '<button type="button" class="btn-icon" id="openGlobalSearch" aria-label="بحث" title="بحث">' + iconSvg("search") + '</button>' +
          '<a href="cart.html" class="btn-icon cart-link" aria-label="السلة" title="السلة">' + iconSvg("cart") + '<span class="cart-count" id="cartCount">0</span></a>' +
          '<button class="btn-icon nav-toggle" id="navToggle" aria-label="القائمة">' + iconSvg("menu") + '</button>' +
        '</div>' +
      '</div>' +
    '</header>' +
    '<div class="global-search-overlay" id="globalSearchOverlay">' +
      '<div class="global-search-container">' +
        '<div class="global-search-header">' +
          '<div class="search-box" style="flex:1;margin:0;">' +
            '<input type="text" id="globalSearchInput" placeholder="ابحث عن منتج..." autocomplete="off">' +
            '<span>' + iconSvg("search") + '</span>' +
          '</div>' +
          '<button type="button" class="btn-icon" id="closeGlobalSearch" aria-label="إغلاق">' + iconSvg("close") + '</button>' +
        '</div>' +
        '<div class="global-search-results" id="globalSearchResults"></div>' +
      '</div>' +
    '</div>';

  initMobileNav();
  initGlobalSearch();
}

function initGlobalSearch() {
  const openBtn = document.getElementById("openGlobalSearch");
  const closeBtn = document.getElementById("closeGlobalSearch");
  const overlay = document.getElementById("globalSearchOverlay");
  const input = document.getElementById("globalSearchInput");
  const resultsBox = document.getElementById("globalSearchResults");

  if(!openBtn || !overlay) return;

  // فتح نافذة البحث
  openBtn.addEventListener("click", function() {
      overlay.classList.add("open");
      input.value = "";
      resultsBox.innerHTML = '<div class="empty-search">اكتب اسم المنتج للبحث...</div>';
      setTimeout(() => input.focus(), 100); 
  });

  // إغلاق النافذة
  closeBtn.addEventListener("click", function() {
      overlay.classList.remove("open");
  });

  // إغلاق عند الضغط خارج المربع
  overlay.addEventListener("click", function(e) {
      if(e.target === overlay) overlay.classList.remove("open");
  });

  // عملية البحث المباشر أثناء الكتابة
  input.addEventListener("input", async function() {
      const query = input.value.trim().toLowerCase();
      if(query.length === 0) {
          resultsBox.innerHTML = '<div class="empty-search">اكتب اسم المنتج للبحث...</div>';
          return;
      }

      resultsBox.innerHTML = '<div class="empty-search">جاري البحث...</div>';
      // البحث العام يحتاج معرفة الأسماء عبر الأقسام، لذلك يتم تحميل القائمة الكاملة
      // فقط بعد أن يطلب الزائر البحث صراحةً، وليس عند فتح الموقع.
      const allProducts = await Store.loadAllProductsFromFirebase();
      const matched = (allProducts || []).filter(p => 
          p.name.toLowerCase().includes(query) || 
          (p.description && p.description.toLowerCase().includes(query)) ||
          (p.variants && p.variants.some(v => v.toLowerCase().includes(query)))
      );

      if(matched.length === 0) {
          resultsBox.innerHTML = '<div class="empty-search">لا توجد منتجات مطابقة لـ "'+query+'"</div>';
          return;
      }

      // رسم النتائج
      resultsBox.innerHTML = matched.map(p => {
          const img = p.image ? `<img src="${p.image}">` : `<div class="search-img-placeholder">${iconSvg("box")}</div>`;
          return `
              <a href="product.html?id=${p.id}" class="search-result-item">
                  <div class="search-item-img">${img}</div>
                  <div class="search-item-info">
                      <h4>${p.name}</h4>
                      <span>${formatPrice(p.price)}</span>
                  </div>
              </a>
          `;
      }).join("");
  });
}

function renderFooter() {
  const mount = document.getElementById("site-footer");
  if (!mount) return;
  const rawSettings = Store.getSettings() || {};
  const settings = {
    storeName: rawSettings.storeName || "متجرك الإلكتروني",
    storeDescription: rawSettings.storeDescription || "تجربة تسوق بسيطة، واضحة ومباشرة.",
    phone: rawSettings.phone || "",
    whatsapp: rawSettings.whatsapp || "",
    instagram: rawSettings.instagram || "",
    tiktok: rawSettings.tiktok || "",
    address: rawSettings.address || ""
  };
  const categories = (Store.getCategories() || []).slice(0, 5);
  const catLinks = categories.map(function(c){ return '<li><a href="products.html?cat=' + c.id + '">' + c.name + '</a></li>'; }).join("");
  mount.innerHTML =
    '<footer class="site-footer">' +
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div>' +
            '<div class="footer-brand"><img src="assets/logo/logo.png" alt="' + settings.storeName + '"><strong>' + settings.storeName + '</strong></div>' +
            '<p>' + settings.storeDescription + '</p>' +
          '</div>' +
          '<div><h4>روابط سريعة</h4><ul>' +
            '<li><a href="index.html">الرئيسية</a></li><li><a href="products.html">المنتجات</a></li><li><a href="about.html">من نحن</a></li><li><a href="contact.html">تواصل معنا</a></li>' +
          '</ul></div>' +
          '<div><h4>الأقسام</h4><ul>' + (catLinks || '<li>لا توجد أقسام بعد</li>') + '</ul></div>' +
          '<div><h4>تواصل معنا</h4><ul>' +
            (settings.phone ? '<li><a href="tel:' + settings.phone + '">' + settings.phone + '</a></li>' : '') +
            (settings.whatsapp ? '<li><a href="https://wa.me/' + whatsappDigitsOnly(settings.whatsapp) + '" target="_blank" rel="noopener">واتساب</a></li>' : '') +
            (settings.instagram ? '<li><a href="' + settings.instagram + '" target="_blank" rel="noopener">انستغرام</a></li>' : '') +
            (settings.tiktok ? '<li><a href="' + settings.tiktok + '" target="_blank" rel="noopener">تيك توك</a></li>' : '') +
            (settings.address ? '<li>' + settings.address + '</li>' : '') +
          '</ul></div>' +
        '</div>' +
        '<div class="footer-bottom">© ' + new Date().getFullYear() + ' ' + settings.storeName + ' — جميع الحقوق محفوظة.</div>' +
      '</div>' +
    '</footer>';
}

function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", function () {
    nav.classList.toggle("open");
    toggle.innerHTML = nav.classList.contains("open") ? iconSvg("close") : iconSvg("menu");
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      nav.classList.remove("open");
      toggle.innerHTML = iconSvg("menu");
    });
  });
}

function updateCartBadge() {
  const el = document.getElementById("cartCount");
  if (!el) return;
  const count = Store.cartCount();
  el.textContent = count;
  el.style.display = count > 0 ? "flex" : "none";
}

function showToast(message) {
  let toast = document.getElementById("appToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
}

function fixRelativePaths(scope) { /* no-op: flat file structure */ }

document.addEventListener("DOMContentLoaded", function () {
  renderHeader();
  renderFooter();
  updateCartBadge();
});
document.addEventListener("cart:updated", updateCartBadge);
document.addEventListener("store:synced", function () {
  renderHeader();
  renderFooter();
  updateCartBadge();
});
