# قالب متجر إلكتروني عام (Reusable Ecommerce Template)

موقع متجر إلكتروني كامل بدون أي إطار عمل (لا React ولا Next.js) — HTML5 و CSS3 و
JavaScript خالص، يعمل مباشرة بفتح الملفات في المتصفح أو برفعه على أي استضافة
عادية (بما فيها استضافة ملفات ثابتة مجانية). القالب عام وقابل لإعادة الاستخدام
لأي نوع متجر، ويدعم بشكل خاص متاجر الملابس عبر نظام الألوان + المقاسات + المخزون.

للشرح التقني الكامل (بنية المشروع، تدفّق البيانات، Firebase/ImgBB/ImageKit،
نظام المتغيرات، كيفية إنشاء متجر جديد من هذا القالب...) راجع
**`PROJECT_REFERENCE.md`** — هذا الملف مخصص لنظرة سريعة فقط.

## هيكل المشروع

```
/index.html         الرئيسية
/products.html       المتجر (بحث + فلاتر + ترتيب)
/product.html        تفاصيل منتج واحد (?id=...)
/cart.html           السلة وإتمام الطلب عبر واتساب
/about.html          من نحن
/contact.html        تواصل معنا
/login.html          تسجيل دخول الأدمن
/admin.html          لوحة تحكم الأدمن

/css/style.css       كل التنسيقات

/js/config.js        ⭐ الإعدادات المركزية: واتساب، انستغرام، Firebase/ImgBB/ImageKit، بيانات الأدمن
/js/icons.js         أيقونات SVG المستخدمة في كل الموقع
/js/store.js         طبقة تخزين البيانات (localStorage + مزامنة Firebase اختيارية)
/js/whatsapp.js      تنسيق العملة وبناء روابط واتساب
/js/app.js           الهيدر والفوتر المشتركين وعداد السلة
/js/products.js      شبكة المنتجات، البحث، الفلاتر، صفحة التفاصيل (ألوان/مقاسات)
/js/cart.js          منطق صفحة السلة
/js/auth.js          تسجيل دخول الأدمن وحماية لوحة التحكم
/js/admin.js         لوحة التحكم بالكامل (منتجات/أقسام/ألوان/مقاسات/طلبات/إعدادات)

/assets/logo/logo.png   شعار عام مؤقت — استبدله بشعار متجرك
```

## كيف تشغّل الموقع

- **الأسهل:** افتح `index.html` مباشرة في المتصفح (يعمل بدون خادم، بدون أي إعداد).
- **للنشر:** ارفع كل الملفات كما هي إلى أي استضافة ثابتة (GitHub Pages, Netlify,
  Vercel، أو استضافة مشتركة عادية). لا حاجة لخادم أو قاعدة بيانات إن اكتفيت
  بوضع localStorage المحلي.

## أول خطوة: إعداد متجرك

1. عدّل `js/config.js` وعبّئ اسم المتجر، رقم واتساب، وسائل التواصل (كلها فارغة
   افتراضيًا في هذا القالب).
2. سجّل دخول الأدمن من `login.html` بالبيانات الافتراضية:
   - اسم المستخدم: `admin`
   - كلمة المرور: `ChangeMe@123`
   **غيّرها فورًا** من تبويب "الإعدادات" بعد أول دخول.
3. أضف أقسامك ومنتجاتك من لوحة التحكم — القالب يبدأ بدون أي بيانات وهمية.
4. (اختياري) لتفعيل المزامنة السحابية أو رفع الصور، عبّئ `firebaseDatabaseURL`
   و/أو `imgbbApiKey` و/أو `imageKitEndpoint` في `js/config.js`. التفاصيل
   الكاملة لكل خيار موجودة في `PROJECT_REFERENCE.md`.

## ⚠️ ملاحظة أمان مهمة

- تسجيل دخول الأدمن هو تحقق من جهة العميل (JavaScript) عند عدم استخدام Firebase،
  وهو مناسب كنموذج عملي (demo/MVP) وللاختبار والعرض، وليس كحماية إنتاجية صارمة.
- بدون `firebaseDatabaseURL`، البيانات محلية في `localStorage` الخاص بكل متصفح
  ولا تُشارك تلقائيًا بين الزوار. لمتجر حقيقي متعدد الزوار، فعّل Firebase من
  `config.js` — راجع `PROJECT_REFERENCE.md` لمزيد من التفاصيل.

## العملة

جميع الأسعار مخزّنة كأرقام صحيحة وتُنسَّق تلقائيًا عند العرض. رمز العملة
(`currencySymbol`) قابل للتغيير من الإعدادات، الافتراضي `د.ع`.

## Firebase Authentication (Admin)

The admin login now uses Firebase Authentication (Email/Password) instead of storing an admin username/password in localStorage.

### One-time setup per store
1. In Firebase Console, open the store's Firebase project.
2. Go to **Authentication → Sign-in method → Email/Password** and enable it.
3. Go to **Project settings → Your apps → Web app**. If a Web app does not exist, create one.
4. Copy the Web app configuration into `js/config.js` (`firebaseApiKey`, `firebaseAuthDomain`, `firebaseProjectId`, `firebaseStorageBucket`, `firebaseMessagingSenderId`, `firebaseAppId`).
5. Create the admin user under **Authentication → Users**.
6. Put that exact email in `STORE_CONFIG.adminEmails`.
7. Test `login.html`.

Important: `adminEmails` is only a client-side UI allow-list in this phase. It is **not** the final authorization boundary. Firebase Realtime Database Security Rules will be added in the next phase and must enforce admin permissions server-side.

If the Web App/Auth values are still empty, the public store can continue using Realtime Database, but the admin login will not work until Authentication is configured.
