// ────────────────────────────────────────────────
// 📁 backend/middleware/errorMiddleware.js
// إدارة الأخطاء العامة في نظام طلبية (Talabia) - Production Ready
// ────────────────────────────────────────────────

// 🧭 المسار غير موجود
export const notFound = (req, res, next) => {
  const error = new Error(`المسار غير موجود - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// ⚠️ معالج الأخطاء العام
export const errorHandler = (err, req, res, next) => {
  // لو تم تمرير statusCode صراحة على الخطأ نأخذه
  let statusCode =
    err?.statusCode ||
    (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  // ✅ أخطاء Mongo/Mongoose الشائعة
  // 1) ObjectId غير صحيح (CastError)
  if (err?.name === "CastError") {
    statusCode = 400;
    err.message = "معرّف غير صالح";
  }

  // 2) ValidationError
  if (err?.name === "ValidationError") {
    statusCode = 400;
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    err.message = messages.length ? messages.join(" | ") : "بيانات غير صالحة";
  }

  // 3) Duplicate Key (11000)
  if (err?.code === 11000) {
    statusCode = 400;
    const fields = err.keyValue
      ? Object.keys(err.keyValue).join(", ")
      : "قيمة مكررة";
    err.message = `قيمة مكررة في الحقول: ${fields}`;
  }

  // ✅ أخطاء JWT الشائعة
  if (err?.name === "JsonWebTokenError") {
    statusCode = 401;
    err.message = "جلسة غير صالحة";
  }
  if (err?.name === "TokenExpiredError") {
    statusCode = 401;
    err.message = "انتهت صلاحية الجلسة، الرجاء تسجيل الدخول مجددًا";
  }

  // ✅ JSON غير صالح (مثلاً body فيه JSON مكسور)
  // Express يرمي SyntaxError مع status=400 عادة
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    err.message = "صيغة JSON غير صحيحة في الطلب";
  }

  // ✅ حجم الطلب كبير (Body/Payload)
  if (err?.type === "entity.too.large" || err?.status === 413) {
    statusCode = 413;
    err.message = "حجم الطلب كبير جدًا";
  }

  // ✅ CORS (إن وصل الخطأ هنا)
  if (err?.message === "Not allowed by CORS") {
    statusCode = 403;
    err.message = "CORS: Origin غير مسموح به.";
  }

  const isProd = process.env.NODE_ENV === "production";

  // ✅ في الإنتاج: لا تعرض تفاصيل حساسة عند أخطاء السيرفر (5xx)
  const safeMessage =
    isProd && statusCode >= 500
      ? "حدث خطأ في الخادم. حاول مرة أخرى لاحقًا."
      : err?.message || "حدث خطأ غير متوقع";

  res.status(statusCode).json({
    message: safeMessage,
    stack: isProd ? null : err?.stack,
  });
};
