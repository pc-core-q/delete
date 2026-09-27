/* ==========================================================================
   auth.js
   يُحمَّل في login.html (نموذج الدخول) وفي admin.html (كحارس مسار يمنع أي
   زائر غير مسجّل دخوله من رؤية لوحة التحكم). التحقق هنا من جهة العميل فقط
   داخل موقع ثابت — راجع ملاحظة الأمان في README المرفق مع المشروع.
   ========================================================================== */

function initLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  // لو كان الأدمن مسجّل دخوله مسبقًا في هذه الجلسة، انتقل مباشرة للوحة التحكم
  if (Store.isLoggedIn()) {
    window.location.href = "admin.html";
    return;
  }

  const errorBox = document.getElementById("loginError");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (Store.login(username, password)) {
      window.location.href = "admin.html";
    } else if (errorBox) {
      errorBox.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة.";
      errorBox.style.display = "block";
    }
  });
}

// حارس المسار — يُستدعى في بداية admin.html قبل رسم أي محتوى حسّاس
function requireAdminAuth() {
  if (!Store.isLoggedIn()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function handleAdminLogout() {
  Store.logout();
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", initLoginPage);
