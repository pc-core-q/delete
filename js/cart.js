/* ==========================================================================
   cart.js
   منطق صفحة السلة (cart.html) فقط — محمي بالتحقق من وجود #cartItems حتى
   يمكن تضمين الملف بأمان دون أن يؤثر على صفحات أخرى.
   تم التحديث: إضافة رسائل توست (Toasts) ديناميكية ملونة لتجربة مستخدم أفضل.
   ========================================================================== */

// صورة سطر السلة: صورة اللون المحدد إن وُجدت، وإلا صورة الخيار النصي القديم، وإلا صورة المنتج
function cartLineMediaUrl(line, product) {
  if (line.color && product.colors && product.colors.length) {
    const c = product.colors.find(function (cc) { return cc.name === line.color; });
    if (c && c.image) return c.image;
  }
  if (line.variant && product.variantImages && product.variantImages[line.variant]) {
    return product.variantImages[line.variant];
  }
  return product.image || null;
}

// نص وصف الخيار المعروض بجانب اسم المنتج في السلة (لون/مقاس أو خيار نصي قديم)
function cartLineVariantLabel(line) {
  const parts = [];
  if (line.color) parts.push(line.color);
  if (line.size) parts.push(line.size);
  if (!parts.length && line.variant) parts.push(line.variant);
  return parts.join(" / ");
}

function cartLineHtml(line, product, unavailable) {
  const mediaUrl = cartLineMediaUrl(line, product);
  const media = mediaUrl
    ? '<img src="' + escapeHtml(mediaUrl) + '" alt="' + escapeHtml(product.name) + '">'
    : '<div class="placeholder-icon-wrap">' + iconSvg(
        (Store.getCategories().find(function (c) { return c.id === product.categoryId; }) || {}).icon || "box"
      ) + "</div>";

  const variantLabel = cartLineVariantLabel(line);
  const displayName = escapeHtml(product.name) + (variantLabel ? ' <span style="color:var(--olive-600); font-size: 0.85em;">(' + escapeHtml(variantLabel) + ')</span>' : '');
  const unavailableHtml = unavailable
    ? '<div style="color:var(--danger);font-size:.85rem;font-weight:700;margin-bottom:4px;">غير متوفر حاليًا — لن يُضاف إلى الطلب</div>'
    : '';
  const maxStock = Math.max(1, Store.getVariantStock(product, line.color, line.size));

  return (
    '<div class="cart-item" data-id="' + escapeHtml(line.itemKey) + '">' +
      media +
      '<div>' +
        "<h4>" + displayName + "</h4>" +
        unavailableHtml +
        '<div class="unit-price">' + formatPrice(product.price) + " / قطعة</div>" +
        '<button type="button" class="remove-btn" onclick="removeCartLine(' + jsStr(line.itemKey) + ')">إزالة من السلة</button>' +
      "</div>" +
      '<div class="qty-stepper">' +
        '<button type="button" onclick="stepCartQty(' + jsStr(line.itemKey) + ', -1)">−</button>' +
        '<input type="number" min="1" max="' + maxStock + '" value="' + line.qty + '" ' +
          'onchange="setCartQty(' + jsStr(line.itemKey) + ', this.value)">' +
        '<button type="button" onclick="stepCartQty(' + jsStr(line.itemKey) + ', 1)">+</button>' +
      "</div>" +
      '<div class="price">' + formatPrice(product.price * line.qty) + "</div>" +
    "</div>"
  );
}

function renderCartPage() {
  const listEl = document.getElementById("cartItems");
  if (!listEl) return;

  const cart = Store.getCart();
  const products = Store.getProducts();

  const rows = [];
  let subtotal = 0;
  let itemCount = 0;
  let hasUnavailable = false;
  let orderableCount = 0;

  cart.forEach(function (line) {
    const product = products.find(function (p) { return p.id === line.productId; });
    if (!product) return;
    const variantStock = Store.getVariantStock(product, line.color, line.size);
    const unavailable = !product.available || variantStock <= 0;
    if (unavailable) {
      // لا يدخل في المجموع ولا في الطلب (يتطابق مع getOrderableCartLines في whatsapp.js)
      hasUnavailable = true;
      rows.push(cartLineHtml(line, product, true));
      return;
    }
    const qty = Math.min(line.qty, variantStock);
    subtotal += product.price * qty;
    itemCount += qty;
    orderableCount++;
    rows.push(cartLineHtml(Object.assign({}, line, { qty: qty }), product, false));
  });

  if (!rows.length) {
    listEl.innerHTML = '<div class="empty-state">' + iconSvg("cart") +
      "<p>سلتك فارغة حاليًا.</p>" +
      '<a href="products.html" class="btn btn-primary">تصفح المنتجات</a></div>';
  } else {
    listEl.innerHTML = rows.join("");
  }

  const subtotalEl = document.getElementById("cartSubtotal");
  const totalEl = document.getElementById("cartTotal");
  const countEl = document.getElementById("cartItemCount");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const warningEl = document.getElementById("cartWarning");

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (totalEl) totalEl.textContent = formatPrice(subtotal);
  if (countEl) countEl.textContent = itemCount;
  if (checkoutBtn) checkoutBtn.disabled = orderableCount === 0;
  if (warningEl) {
    warningEl.style.display = hasUnavailable ? "block" : "none";
  }

  const deliveryNoteEl = document.getElementById("cartDeliveryNote");
  if (deliveryNoteEl) {
    const deliveryInfo = (Store.getSettings().deliveryInfo || "").trim();
    deliveryNoteEl.innerHTML = "<strong>ملاحظة: سعر المنتج غير شامل أجور التوصيل</strong>" +
      (deliveryInfo ? "<br>" + deliveryInfo : "");
  }
}

function stepCartQty(itemKey, delta) {
  const cart = Store.getCart();
  const line = cart.find(function (l) { return l.itemKey === itemKey; });
  if (!line) return;
  const product = Store.getProduct(line.productId);
  if (!product) return;
  
  const maxStock = Store.getVariantStock(product, line.color, line.size);
  const next = line.qty + delta;
  
  if (next > maxStock) {
      if (typeof showToast === "function") showToast("عذراً، هذه هي الكمية القصوى المتوفرة.", "error");
      return;
  }
  if (next < 1) return;

  Store.setQty(itemKey, next);
  renderCartPage();
}

function setCartQty(itemKey, value) {
  const cart = Store.getCart();
  const line = cart.find(function (l) { return l.itemKey === itemKey; });
  if (!line) return;
  const product = Store.getProduct(line.productId);
  if (!product) return;
  
  const maxStock = Store.getVariantStock(product, line.color, line.size);
  let qty = parseInt(value, 10) || 1;
  
  if (qty > maxStock) {
      qty = maxStock;
      if (typeof showToast === "function") showToast("تم ضبط الكمية إلى الحد الأقصى المتوفر (" + maxStock + ").", "error");
  } else if (qty < 1) {
      qty = 1;
  }
  
  Store.setQty(itemKey, qty);
  renderCartPage();
}

function removeCartLine(itemKey) {
  Store.removeFromCart(itemKey);
  renderCartPage();
  if (typeof showToast === "function") showToast("تم إزالة المنتج من السلة", "success");
}

async function initCartPage() {
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (!checkoutBtn) return;

  // السلة لا تحتاج كل المنتجات؛ نجلب فقط المنتجات الموجودة فعليًا في السلة.
  const cartLines = Store.getCart();
  if (cartLines.length && typeof Store.loadProductById === "function") {
    await Promise.all(cartLines.map(function(line) { return Store.loadProductById(line.productId); }));
  }
  checkoutBtn.addEventListener("click", function () {
    if (!Store.getCart().length) return;
    if (!isWhatsAppConfigured()) {
      if (typeof showToast === "function") showToast("لم يتم إعداد رقم واتساب بعد. الرجاء إضافته من لوحة التحكم ← الإعدادات.", "error");
      return;
    }
    orderCartViaWhatsApp();
    setTimeout(renderCartPage, 300);
  });
  renderCartPage();
}

document.addEventListener("DOMContentLoaded", initCartPage);
document.addEventListener("cart:updated", renderCartPage);
