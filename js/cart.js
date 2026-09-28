/* ==========================================================================
   cart.js
   منطق صفحة السلة (cart.html) فقط — محمي بالتحقق من وجود #cartItems حتى
   يمكن تضمين الملف بأمان دون أن يؤثر على صفحات أخرى.
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

function cartLineHtml(line, product) {
  const mediaUrl = cartLineMediaUrl(line, product);
  const media = mediaUrl
    ? '<img src="' + mediaUrl + '" alt="' + product.name + '">'
    : '<div class="placeholder-icon-wrap">' + iconSvg(
        (Store.getCategories().find(function (c) { return c.id === product.categoryId; }) || {}).icon || "box"
      ) + "</div>";

  const variantLabel = cartLineVariantLabel(line);
  const displayName = product.name + (variantLabel ? ' <span style="color:var(--olive-600); font-size: 0.85em;">(' + variantLabel + ')</span>' : '');
  const maxStock = Math.max(1, Store.getVariantStock(product, line.color, line.size));

  return (
    '<div class="cart-item" data-id="' + line.itemKey + '">' +
      media +
      '<div>' +
        "<h4>" + displayName + "</h4>" +
        '<div class="unit-price">' + formatPrice(product.price) + " / قطعة</div>" +
        '<button type="button" class="remove-btn" onclick="removeCartLine(\'' + line.itemKey + '\')">إزالة من السلة</button>' +
      "</div>" +
      '<div class="qty-stepper">' +
        '<button type="button" onclick="stepCartQty(\'' + line.itemKey + '\', -1)">−</button>' +
        '<input type="number" min="1" max="' + maxStock + '" value="' + line.qty + '" ' +
          'onchange="setCartQty(\'' + line.itemKey + '\', this.value)">' +
        '<button type="button" onclick="stepCartQty(\'' + line.itemKey + '\', 1)">+</button>' +
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

  cart.forEach(function (line) {
    const product = products.find(function (p) { return p.id === line.productId; });
    if (!product) return;
    const variantStock = Store.getVariantStock(product, line.color, line.size);
    if (!product.available || variantStock <= 0) hasUnavailable = true;
    const qty = Math.min(line.qty, Math.max(variantStock, 1));
    subtotal += product.price * qty;
    itemCount += qty;
    rows.push(cartLineHtml(Object.assign({}, line, { qty: qty }), product));
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
  if (checkoutBtn) checkoutBtn.disabled = rows.length === 0;
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
  const next = Math.max(1, Math.min(maxStock, line.qty + delta));
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
  qty = Math.max(1, Math.min(maxStock, qty));
  Store.setQty(itemKey, qty);
  renderCartPage();
}

function removeCartLine(itemKey) {
  Store.removeFromCart(itemKey);
  renderCartPage();
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
      showToast("لم يتم إعداد رقم واتساب بعد. الرجاء إضافته من لوحة التحكم ← الإعدادات.");
      return;
    }
    orderCartViaWhatsApp();
    setTimeout(renderCartPage, 300);
  });
  renderCartPage();
}

document.addEventListener("DOMContentLoaded", initCartPage);
document.addEventListener("cart:updated", renderCartPage);
