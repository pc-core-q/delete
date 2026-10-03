/* ==========================================================================
   api/bootstrap.js — دالة Vercel تُرجع لقطة بيانات المتجر في طلب واحد.
   - تقرأ من Firebase Realtime Database عبر REST (بدون SDK وبدون اتصال دائم).
   - النتيجة تُخزَّن في كاش الـCDN (s-maxage)، فآلاف الزوار = قراءة واحدة
     من Firebase كل بضع دقائق، لا تستهلك الباقة ولا حد الاتصالات المتزامنة.
   - الإعداد: متغير بيئة FIREBASE_DATABASE_URL في Vercel (لكل عميل رابطه).
   ========================================================================== */

// قيمة احتياطية إن لم يُضبط متغير البيئة (غيّرها لكل عميل أو استخدم متغير البيئة)
const DEFAULT_DB_URL = "https://test3-2a6de-default-rtdb.europe-west1.firebasedatabase.app";

const NODES = ["ws_categories", "ws_settings", "ws_ads", "ws_products"];

async function readNode(base, node, signal) {
  const res = await fetch(base + "/" + node + ".json", { signal });
  if (!res.ok) throw new Error(node + " HTTP " + res.status);
  return res.json();
}

module.exports = async function handler(req, res) {
  const base = String(process.env.FIREBASE_DATABASE_URL || DEFAULT_DB_URL).trim().replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 8000);
  try {
    const values = await Promise.all(NODES.map(function (n) { return readNode(base, n, controller.signal); }));
    const body = {
      generatedAt: Date.now(),
      categories: values[0],
      settings: values[1],
      ads: values[2],
      products: values[3]
    };
    // المتصفح: دقيقة | الـCDN: 5 دقائق، ثم يخدم النسخة القديمة ويحدّث في الخلفية حتى يوم
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=86400");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).send(JSON.stringify(body));
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "bootstrap_failed" });
  } finally {
    clearTimeout(timer);
  }
};
