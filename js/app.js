/* ==========================================================================
   app.js
   منطق مشترك بين كل صفحات المتجر: رسم الهيدر والفوتر ديناميكيًا من الإعدادات
   المخزّنة، القائمة على الجوال، عداد السلة، ورسائل التوست.
   ========================================================================== */

const NAV_LINKS = [
  { href: "index.html", label: "الرئيسية", key: "home", icon: "home" },
  { href: "products.html", label: "المنتجات", key: "products", icon: "box" },
  { href: "categories.html", label: "الأقسام", key: "categories", icon: "layers" }, // صفحة الأقسام المستقلة
  { href: "about.html", label: "من نحن", key: "about", icon: "info" },
  { href: "contact.html", label: "تواصل معنا", key: "contact", icon: "phone" }
];

function initSidebarDOM() {
  // إنشاء الخلفية الشفافة والقائمة الجانبية مباشرة في الـ body لتجنب مشاكل الطبقات (z-index)
  if (!document.getElementById("mainSidebarOverlay")) {
      const overlay = document.createElement("div");
      overlay.id = "mainSidebarOverlay";
      overlay.className = "sidebar-overlay";
      overlay.onclick = toggleSidebar;
      document.body.appendChild(overlay);
  }
  if (!document.getElementById("sidebarNav")) {
      const sidebar = document.createElement("nav");
      sidebar.id = "sidebarNav";
      sidebar.className = "sidebar-nav";
      document.body.appendChild(sidebar);
  }
}

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

  initSidebarDOM();
  renderSidebarNav(active);
  initMobileNav();
  initGlobalSearch();
}

function renderSidebarNav(activeKey) {
  const sidebar = document.getElementById("sidebarNav");
  if (!sidebar) return;

  let html = '<div class="sidebar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--line); padding-bottom:15px;">';
  html += '<h3 style="margin:0; font-size:1.1rem; color:var(--olive-800);">القائمة</h3>';
  html += '<button class="btn-icon btn-sm" onclick="toggleSidebar()" aria-label="إغلاق" style="background:var(--olive-50); border:none;">' + iconSvg("close") + '</button>';
  html += '</div>';

  html += '<ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;">';
  NAV_LINKS.forEach(link => {
      const isActive = link.key === activeKey ? "color:var(--olive-700); font-weight:bold; background:var(--olive-50);" : "color:var(--ink-700);";
      html += '<li><a href="' + link.href + '" style="display:flex; align-items:center; gap:10px; padding:12px; border-radius:10px; text-decoration:none; transition:0.2s; ' + isActive + '">' + iconSvg(link.icon || "box") + link.label + '</a></li>';
  });

  const allCategories = Store.getCategories();
  const mainCategories = allCategories.filter(c => !c.parentId);

  // التحقق إن كان المستخدم حالياً داخل صفحة المتجر products.html
  const isShopPage = window.location.pathname.endsWith("products.html");

  if (mainCategories.length > 0) {
      html += '<li style="margin-top:15px; border-top:1px solid var(--line); padding-top:15px;">';
      html += '<div style="font-weight:bold; color:var(--ink-400); font-size:0.85rem; margin-bottom:10px; padding:0 12px;">تصفح الأقسام</div>';
      
      mainCategories.forEach(mainCat => {
          const subCategories = allCategories.filter(c => c.parentId === mainCat.id);
          const hasSub = subCategories.length > 0;
          
          html += '<div style="margin-bottom:5px;">';
          if (hasSub) {
              html += '<button onclick="toggleSubmenu(this)" style="width:100%; display:flex; align-items:center; justify-content:space-between; background:transparent; border:none; padding:12px; color:var(--ink-700); font-weight:600; text-align:right; border-radius:10px; cursor:pointer;">';
              html += '<span style="display:flex; align-items:center; gap:10px;">' + iconSvg(mainCat.icon || "box") + mainCat.name + '</span>';
              html += '<span class="arrow" style="transition:0.3s; transform:rotate(90deg); display:inline-block;">&#10095;</span>';
              html += '</button>';
              
              html += '<div class="sidebar-submenu" style="padding-right:35px; margin-top:5px; display:none;">';
              
              const allLink = isShopPage ? `javascript:updateCategory('${mainCat.id}');toggleSidebar();` : `products.html?cat=${mainCat.id}`;
              html += '<a href="' + allLink + '" style="display:block; padding:8px; color:var(--olive-600); text-decoration:none; font-size:0.9rem; margin-bottom:4px;">عرض الكل (' + mainCat.name + ')</a>';
              
              subCategories.forEach(subCat => {
                  const subLink = isShopPage ? `javascript:updateCategory('${subCat.id}');toggleSidebar();` : `products.html?cat=${subCat.id}`;
                  html += '<a href="' + subLink + '" style="display:block; padding:8px; color:var(--ink-600); text-decoration:none; font-size:0.9rem; margin-bottom:4px;">- ' + subCat.name + '</a>';
              });
              html += '</div>';
          } else {
              const link = isShopPage ? `javascript:updateCategory('${mainCat.id}');toggleSidebar();` : `products.html?cat=${mainCat.id}`;
              html += '<a href="' + link + '" style="display:flex; align-items:center; gap:10px; padding:12px; border-radius:10px; color:var(--ink-700); font-weight:600; text-decoration:none;">' + iconSvg(mainCat.icon || "box") + mainCat.name + '</a>';
          }
          html += '</div>';
      });
      html += '</li>';
  }
  
  html += '</ul>';
  sidebar.innerHTML = html;
}

window.toggleSidebar = function() {
  const sidebar = document.getElementById("sidebarNav");
  const overlay = document.getElementById("mainSidebarOverlay");
  
  if (sidebar) sidebar.classList.toggle("active");
  if (overlay) overlay.classList.toggle("active");
};

window.toggleSubmenu = function(btnElement) {
  const submenu = btnElement.nextElementSibling;
  const arrow = btnElement.querySelector('.arrow');
  
  if (submenu) {
      if (submenu.style.display === "none") {
          submenu.style.display = "block";
          if(arrow) arrow.style.transform = "rotate(-90deg)"; 
      } else {
          submenu.style.display = "none";
          if(arrow) arrow.style.transform = "rotate(90deg)"; 
      }
  }
};

function initGlobalSearch() {
  const openBtn = document.getElementById("openGlobalSearch");
  const closeBtn = document.getElementById("closeGlobalSearch");
  const overlay = document.getElementById("globalSearchOverlay");
  const input = document.getElementById("globalSearchInput");
  const resultsBox = document.getElementById("globalSearchResults");

  if(!openBtn || !overlay) return;

  openBtn.addEventListener("click", function() {
      overlay.classList.add("open");
      input.value = "";
      resultsBox.innerHTML = '<div class="empty-search">اكتب اسم المنتج للبحث...</div>';
      setTimeout(() => input.focus(), 100); 
  });

  closeBtn.addEventListener("click", function() {
      overlay.classList.remove("open");
  });

  overlay.addEventListener("click", function(e) {
      if(e.target === overlay) overlay.classList.remove("open");
  });

  input.addEventListener("input", async function() {
      const query = input.value.trim().toLowerCase();
      if(query.length === 0) {
          resultsBox.innerHTML = '<div class="empty-search">اكتب اسم المنتج للبحث...</div>';
          return;
      }

      resultsBox.innerHTML = '<div class="empty-search">جاري البحث...</div>';
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
            '<li><a href="index.html">الرئيسية</a></li><li><a href="products.html">المنتجات</a></li><li><a href="categories.html">الأقسام</a></li><li><a href="about.html">من نحن</a></li><li><a href="contact.html">تواصل معنا</a></li>' +
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
        '<div class="footer-bottom" style="margin-top: 25px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; font-size: 0.82rem; color: rgba(255,255,255,0.6); display: flex; flex-direction: column; gap: 6px; align-items: center;">' +
          '<div>© ' + new Date().getFullYear() + ' ' + settings.storeName + ' — جميع الحقوق محفوظة.</div>' +
          '<div style="display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap;">' +
            '<span>برمجة وتصميم: <strong style="color: #fff;">م. أمير أحمد</strong></span>' +
            '<span style="opacity: 0.35;">•</span>' +
            '<a href="https://instagram.com/az_6ui" target="_blank" rel="noopener" style="color: rgba(255,255,255,0.85); text-decoration: underline;">انستغرام: @az_6ui</a>' +
            '<span style="opacity: 0.35;">•</span>' +
            '<a href="tel:07813623682" dir="ltr" style="color: rgba(255,255,255,0.85); text-decoration: underline;">07813623682</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</footer>';
}

function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  if (!toggle) return;
  toggle.addEventListener("click", function () {
    toggleSidebar();
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
