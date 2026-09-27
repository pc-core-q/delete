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
  
  // الحماية: جلب الإعدادات أو وضع قيم افتراضية لمنع توقف الكود
  const rawSettings = Store.getSettings() || {};
  const settings = {
      storeName: rawSettings.storeName || "متجرك الإلكتروني",
      storeTagline: rawSettings.storeTagline || ""
  };

  const navHtml = NAV_LINKS.map(function (link) {
    const isActive = link.key === active ? " active" : "";
    return '<a href="' + link.href + '" class="' + isActive.trim() + '">' + link.label + "</a>";
  }).join("");

  // تضمين الـ CSS الخاص بالبحث مباشرة هنا
  const searchStyles = `
  <style>
    .global-search-overlay { position: fixed; inset: 0; background: rgba(34,36,29,0.8); backdrop-filter: blur(4px); z-index: 1000; display: none; padding: 20px; }
    .global-search-overlay.open { display: flex; justify-content: center; align-items: flex-start; animation: fadeIn 0.2s ease; }
    .global-search-container { background: var(--white); border-radius: var(--radius-lg); width: 100%; max-width: 600px; margin-top: 40px; padding: 20px; box-shadow: var(--shadow-lift); display: flex; flex-direction: column; max-height: 80vh; }
    .global-search-header { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
    .global-search-results { overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-inline-end: 5px; }
    .global-search-results::-webkit-scrollbar { width: 6px; }
    .global-search-results::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 4px; }
    .search-result-item { display: flex; gap: 15px; align-items: center; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--line); transition: all 0.2s; background: var(--cream); text-decoration: none; }
    .search-result-item:hover { border-color: var(--olive-400); background: var(--olive-50); transform: translateY(-2px); }
    .search-item-img { width: 60px; height: 60px; border-radius: var(--radius-sm); overflow: hidden; background: var(--white); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--line); }
    .search-item-img img { width: 100%; height: 100%; object-fit: cover; }
    .search-item-img .search-img-placeholder { color: var(--olive-400); width: 60%; }
    .search-item-img .search-img-placeholder svg { width: 100%; height: 100%; }
    .search-item-info h4 { font-size: 0.95rem; margin: 0 0 6px; color: var(--ink-900); font-weight: 700; line-height: 1.3;}
    .search-item-info span { font-size: 0.9rem; font-weight: 700; color: var(--olive-700); font-family: var(--font-display);}
    .empty-search { text-align: center; padding: 40px 20px; color: var(--ink-300); font-size: 0.95rem; font-weight: 600; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 768px) { .global-search-container { margin-top: 15px; max-height: 90vh; padding: 15px;} .search-result-item { padding: 10px; gap: 10px;} .search-item-img { width: 50px; height: 50px; } .search-item-info h4 { font-size: 0.85rem;} }
  </style>
  `;

  mount.innerHTML =
    searchStyles +
    '<header class="site-header">' +
      '<div class="container header-inner">' +
        '<a href="index.html" class="brand">' +
          '<img src="assets/logo/logo.svg" alt="' + settings.storeName + '">' +
          '<span class="brand-name">' + settings.storeName + '<span>' + settings.storeTagline + "</span></span>" +
        "</a>" +
        '<nav class="main-nav" id="mainNav">' + navHtml + "</nav>" +
        '<div class="header-actions">' +
          
          // --- زر البحث السريع ---
          '<button type="button" class="btn-icon" id="openGlobalSearch" aria-label="بحث" title="بحث">' +
            iconSvg("search") +
          "</button>" +
          // ------------------------

          '<a href="cart.html" class="btn-icon cart-link" aria-label="السلة" title="السلة">' +
            iconSvg("cart") +
            '<span class="cart-count" id="cartCount">0</span>' +
          "</a>" +
          '<button class="btn-icon nav-toggle" id="navToggle" aria-label="القائمة">' + iconSvg("menu") + "</button>" +
        "</div>" +
      "</div>" +
    "</header>" +
    
    // --- نافذة البحث المنبثقة (Live Search Overlay) ---
    '<div class="global-search-overlay" id="globalSearchOverlay">' +
      '<div class="global-search-container">' +
        '<div class="global-search-header">' +
          '<div class="search-box" style="flex:1; margin:0;">' +
            '<input type="text" id="globalSearchInput" placeholder="ابحث عن منتج، نكهة، أو قسم..." autocomplete="off">' +
            '<span>' + iconSvg("search") + '</span>' +
          '</div>' +
          '<button type="button" class="btn-icon" id="closeGlobalSearch" style="background:var(--danger-bg); color:var(--danger);">' + iconSvg("close") + '</button>' +
        '</div>' +
        '<div class="global-search-results" id="globalSearchResults"></div>' +
      '</div>' +
    '</div>';

  fixRelativePaths(mount);
  initMobileNav();
  initGlobalSearch(); // تفعيل برمجة البحث
}

// === دالة برمجة البحث المباشر ===
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
  input.addEventListener("input", function() {
      const query = input.value.trim().toLowerCase();
      if(query.length === 0) {
          resultsBox.innerHTML = '<div class="empty-search">اكتب اسم المنتج للبحث...</div>';
          return;
      }

      const allProducts = Store.getProducts() || []; // حماية إضافية
      // البحث في الاسم، الوصف، والخيارات/النكهات
      const matched = allProducts.filter(p => 
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
  
  // الحماية للإعدادات والأقسام في الفوتر
  const rawSettings = Store.getSettings() || {};
  const settings = {
      storeName: rawSettings.storeName || "متجرك الإلكتروني",
      storeDescription: rawSettings.storeDescription || "",
      phone: rawSettings.phone || "",
      whatsapp: rawSettings.whatsapp || "",
      instagram: rawSettings.instagram || "",
      address: rawSettings.address || ""
  };
  
  const categories = (Store.getCategories() || []).slice(0, 5);

  const catLinks = categories.map(function (c) {
    return '<li><a href="products.html?cat=' + c.id + '">' + c.name + "</a></li>";
  }).join("");

  mount.innerHTML =
    '<footer class="site-footer">' +
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div>' +
            '<div class="footer-brand"><img src="assets/logo/logo.svg" alt="' + settings.storeName + '"><strong>' + settings.storeName + "</strong></div>" +
            "<p>" + settings.storeDescription + "</p>" +
          "</div>" +
          '<div><h4>روابط سريعة</h4><ul>' +
            '<li><a href="index.html">الرئيسية</a></li>' +
            '<li><a href="products.html">المنتجات</a></li>' +
            '<li><a href="about.html">من نحن</a></li>' +
            '<li><a href="contact.html">تواصل معنا</a></li>' +
          "</ul></div>" +
          '<div><h4>الأقسام</h4><ul>' + (catLinks || "<li>لا توجد أقسام بعد</li>") + "</ul></div>" +
          '<div><h4>تواصل معنا</h4><ul>' +
            (settings.phone ? '<li><a href="tel:' + settings.phone + '">' + settings.phone + "</a></li>" : "") +
            (settings.whatsapp ? '<li><a href="https://wa.me/' + whatsappDigitsOnly(settings.whatsapp) + '" target="_blank" rel="noopener">واتساب</a></li>' : "") +
            (settings.instagram ? '<li><a href="' + settings.instagram + '" target="_blank" rel="noopener">انستغرام</a></li>' : "") +
            (settings.address ? "<li>" + settings.address + "</li>" : "") +
          "</ul></div>" +
        "</div>" +
        "<div class='footer-bottom' style='text-align: center; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); margin-top: 30px; color: #a1a1aa; line-height: 1.8; font-size: 0.9rem;'>" +
          "<div>&copy; " + new Date().getFullYear() + " " + settings.storeName + " - جميع الحقوق محفوظة.</div>" +
        "</div>" +
      "</div>" +
    "</footer>";
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
