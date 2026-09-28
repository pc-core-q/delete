/* ==========================================================================
   config.js
   الملف المركزي لإعدادات القالب. كل هذه القيم فارغة افتراضيًا وتُنسخ مرة
   واحدة فقط إلى localStorage عند أول تشغيل للموقع (انظر seedIfNeeded في
   js/store.js). بعد أول تشغيل، عدّل القيم من لوحة تحكم الأدمن مباشرة
   (تبويب "الإعدادات") — لا حاجة لتعديل هذا الملف مرة أخرى.

   بيانات الاتصال بـ Firebase / ImgBB / ImageKit عمدًا فارغة هنا؛ هذا القالب
   لا يتضمن أي بيانات اتصال خاصة بأي متجر سابق. الموقع يعمل بشكل كامل بدون
   أي من الثلاثة (وضع محلي عبر localStorage فقط) — عبّئها فقط إن رغبت
   بالمزامنة السحابية أو رفع الصور. راجع PROJECT_REFERENCE.md لتفاصيل كل حقل.
   ========================================================================== */

const STORE_CONFIG = {
  // اسم المتجر ووصفه — تظهر في الهيدر والفوتر وصفحة "من نحن"
  storeName: "",
  storeTagline: "",
  storeDescription: "",

  // بيانات التواصل — اتركها فارغة إن لم تكن متوفرة بعد
  whatsappNumber: "",   // بصيغة دولية بدون + وبدون مسافات، مثال: 9647xxxxxxxxx
  phone: "",
  instagram: "",
  tiktok: "",

  address: "",
  workingHours: "",
  deliveryInfo: "",

  currencySymbol: "د.ع",

// === Firebase Web App / Authentication ===
  // هذه القيم تُؤخذ من Firebase Console > Project settings > Your apps > Web app.
  firebaseApiKey: "AIzaSyAnAHTDxGlWwBfe9Ta8ttQ8QZWLA5ZNYw8",
  firebaseAuthDomain: "test3-2a6de.firebaseapp.com",
  firebaseProjectId: "test3-2a6de",
  firebaseStorageBucket: "test3-2a6de.firebasestorage.app",
  firebaseMessagingSenderId: "44087547093",
  firebaseAppId: "1:44087547093:web:91a03c47e7810869fbfe5c",
  // بريد/عناوين حسابات الأدمن المسموح لها بدخول الواجهة.
  // هذا ليس بديلًا عن Security Rules؛ سنضيفها في المرحلة التالية.
  adminEmails: ["a@email.com"],


  // === Firebase Realtime Database (اختياري) ===
  // اتركه فارغًا للعمل بدون مزامنة سحابية (localStorage فقط، مناسب كنسخة
  // تجريبية أو متجر بزائر واحد لكل جهاز). عبّئه برابط قاعدة بيانات Firebase
  // الخاصة بك لتفعيل المزامنة بين الأجهزة.
 firebaseDatabaseURL: "https://test3-2a6de-default-rtdb.europe-west1.firebasedatabase.app/",

  // === ImgBB (اختياري) — رفع صور المنتجات/الأقسام/الإعلانات من لوحة التحكم ===
  // احصل على مفتاح مجاني من https://api.imgbb.com/
  imgbbApiKey: "820a1a52d1b835874a9200fe7d3bb6b3",

  // === ImageKit (اختياري) — تحويل روابط ImgBB إلى CDN محسّن (WebP + تحجيم) ===
  // إن تُرك فارغًا، تُستخدم روابط ImgBB مباشرة بدون أي تحويل (يعمل بشكل طبيعي،
  // فقط بدون تحسينات CDN الإضافية).
  imageKitEndpoint: "https://ik.imagekit.io/test3wf"
};
