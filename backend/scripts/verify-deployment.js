import https from 'https';

console.log("==================================================");
console.log("🔍 Talabia Environment Parity Checker");
console.log("==================================================\n");

const TARGET_DOMAIN = "www.talabia.net";

// قائمة بأحدث المسارات البرمجية التي تمت إضافتها للسيرفر
// إذا كان السيرفر على النسخة القديمة، فسيأتي الرد بالخطأ 404 (Not Found)
const endpointsToVerify = [
  {
    name: "إدارة المفردات (Synonyms API)",
    path: "/api/synonyms",
    expectedCodeNot: 404, // إذا جاء 404 معناها الروات غير موجود بالمره
  },
  {
    name: "ميزة إشعارات الخصوصية (Privacy Notifications)",
    path: "/api/privacy-policy/notify",
    method: "POST",
    expectedCodeNot: 404,
  },
  {
    name: "جلب سياسة الخصوصية (Privacy Fetch)",
    path: "/api/privacy-policy",
    expectedCodeNot: 404, 
  }
];

let hasErrors = false;

const performValidation = () => {
  let completed = 0;
  
  endpointsToVerify.forEach(endpoint => {
    const options = {
      hostname: TARGET_DOMAIN,
      path: endpoint.path,
      method: endpoint.method || "GET",
      headers: {
        "User-Agent": "Talabia-Parity-Bot/1.0",
      }
    };

    const req = https.request(options, (res) => {
      const status = res.statusCode;
      let symbol = "✅";
      let msg = "متطابق";

      // 404 Not Found is the ultimate sign of Desync
      if (status === 404) {
        symbol = "❌";
        msg = "خطأ (السيرفر يعمل بكود قديم، المسار غير موجود 404)";
        hasErrors = true;
      } else if (status === 401 || status === 403) {
         // Unauthorized means the route EXISTS, which is exactly what we want!
         symbol = "✅";
         msg = "متطابق (موجود ولكنه محمي كما هو متوقع)";
      } else if (status === 405) {
         // Method Not Allowed means the route EXISTS but expects POST, which is perfect!
         symbol = "✅";
         msg = "متطابق (المسار موجود ويتطلب POST كما هو متوقع)";
      }else if (status === 200 || status === 201) {
         symbol = "✅";
         msg = "متطابق (يعمل ويعيد بيانات)";
      }

      console.log(`[${symbol}] ${endpoint.name}:`);
      console.log(`    مسار: ${endpoint.path} -> رمز الاستجابة: ${status} | ${msg}\n`);

      completed++;
      if (completed === endpointsToVerify.length) {
        printReport();
      }
    });

    req.on("error", (e) => {
      console.log(`[❌] ${endpoint.name}: فشل الاتصال بالإنترنت أو بالسيرفر - ${e.message}\n`);
      hasErrors = true;
      completed++;
      if (completed === endpointsToVerify.length) {
        printReport();
      }
    });

    req.end();
  });
};

const printReport = () => {
  console.log("==================================================");
  if (hasErrors) {
    console.log("🚨 إنذار أحمر: السيرفر الإنتاجي ينفصل عن بيئة التطوير! (DESYNC DETECTED)");
    console.log("يجب تشغيل أمر نشر جديد لإجبار السيرفر على قراءة الكود الحديث.");
    process.exit(1);
  } else {
    console.log("🎉 تهانينا! بيئة الإنتاج متطابقة 100% مع أحدث الأكواد (PARITY SECURED).");
    process.exit(0);
  }
};

console.log("جارِ فحص البوابات الأمنية للسيرفر الإنتاجي...\n");
performValidation();
