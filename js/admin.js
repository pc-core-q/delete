/* ---------------------------------------------------------------------- */
/* رفع الصور ومعالجتها الذكية بدقة عالية عبر ImageKit CDN                 */
/* ---------------------------------------------------------------------- */

async function uploadToImgBB(file, isBanner = false) {
  const apiKey = (typeof STORE_CONFIG !== "undefined" && STORE_CONFIG.imgbbApiKey || "").trim();
  if (!apiKey) {
    throw new Error("لم يتم إعداد مفتاح ImgBB بعد. أضِف imgbbApiKey في js/config.js لتفعيل رفع الصور.");
  }

  const formData = new FormData();
  formData.append("image", file);

  // 1. الرفع الفعلي لـ ImgBB
  const response = await fetch("https://api.imgbb.com/1/upload?key=" + encodeURIComponent(apiKey), {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error((data.error && data.error.message) || "فشل رفع الصورة إلى ImgBB.");
  }

  const rawUrl = data.data.url;
  const imageKitEndpoint = (typeof STORE_CONFIG !== "undefined" && STORE_CONFIG.imageKitEndpoint || "").trim().replace(/\/+$/, "");

  // إن لم يتم إعداد ImageKit، نستخدم رابط ImgBB مباشرة
  if (!imageKitEndpoint) {
    return rawUrl;
  }

  // 2. مطابقة رابط ImgBB
  const match = rawUrl.match(/^https?:\/\/i\.ibb\.co\/(.+)$/);
  if (!match) {
    return rawUrl;
  }

  const transform = isBanner
    ? "tr:w-1200,q-90,f-auto"
    : "tr:w-800,q-85,f-auto";
  
  // 4. بناء الرابط النهائي عبر ImageKit CDN
  return imageKitEndpoint + "/" + transform + "/" + match[1];
}
