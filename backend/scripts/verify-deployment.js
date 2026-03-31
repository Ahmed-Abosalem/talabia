import https from 'https';
import fs from 'fs';
import path from 'path';

console.log("==================================================");
console.log("🔍 Enterprise Verification Engine (Talabia)");
console.log("==================================================\n");

const TARGET_DOMAIN = "talabia.net";
const hashPath = path.join(process.cwd(), ".deploy_hash");

if (!fs.existsSync(hashPath)) {
  console.log("❌ CRITICAL: `.deploy_hash` file not found! Deployment script failed to stamp the version.");
  process.exit(1);
}

const expectedHash = fs.readFileSync(hashPath, "utf-8").trim();
console.log(`📌 Expected Target Signature (Git Hash): ${expectedHash}\n`);

let hasErrors = false;
let completedTests = 0;
const totalTests = 2; // Frontend + Backend

const printReport = () => {
  console.log("==================================================");
  if (hasErrors) {
    console.log("🚨 نظام التأكيد الماسي (Red Alert): فشل العبور!");
    console.log("لم تتطابق البصمات بين الكود المرفوع والنسخة العاملة. تحقق من انهيار السيرفر أو مشكلات الكاش.");
    process.exit(1);
  } else {
    console.log("💎 نظام التأكيد الماسي (Green Light): عبور آمن!");
    console.log("كافة التعديلات (أمامية/خلفية) متطابقة بنسبة 100% وتعمل بكفاءة تامة على الإنتاج.");
    process.exit(0);
  }
};

const verifyBackend = () => {
  const options = {
    hostname: TARGET_DOMAIN,
    path: "/api/health/parity",
    method: "GET",
    headers: { "User-Agent": "Talabia-Verification-Engine/2.0" }
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    // Server is completely dead or 502 Bad Gateway (PM2 Crash)
    if (res.statusCode >= 500) {
      console.log(`[❌] Backend Server Check: 502/500 Error - السيرفر انهار (PM2 Crash) ولا يعمل أبدًا!`);
      hasErrors = true;
      completedTests++;
      if (completedTests === totalTests) printReport();
      return;
    }

    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.parityHash === expectedHash) {
          console.log(`[✅] Backend Server Check: متطابق (B-${json.parityHash.substring(0,7)})`);
        } else {
          console.log(`[❌] Backend Server Check: غير متطابق!`);
          console.log(`    Expected: ${expectedHash}`);
          console.log(`    Running:  ${json.parityHash || "None (Old Code)"}`);
          hasErrors = true;
        }
      } catch (e) {
        console.log(`[❌] Backend Server Check: استجابة غير صالحة من السيرفر، قد يكون السيرفر أقدم من إصدار المراجعة.`);
        hasErrors = true;
      }
      completedTests++;
      if (completedTests === totalTests) printReport();
    });
  });

  req.on("error", (e) => {
    console.log(`[❌] Backend Server Check: فشل الاتصال - ${e.message}`);
    hasErrors = true;
    completedTests++;
    if (completedTests === totalTests) printReport();
  });
  req.end();
};

const verifyFrontend = () => {
  const options = {
    hostname: TARGET_DOMAIN,
    path: "/",
    method: "GET",
    headers: { "User-Agent": "Talabia-Verification-Engine/2.0" }
  };

  const req = https.request(options, (res) => {
    let html = '';
    res.on('data', chunk => html += chunk);
    res.on('end', () => {
        // البحث عن <meta name="deployment-hash" content="...">
        const match = html.match(/<meta\s+name="deployment-hash"\s+content="([^"]+)"/);
        const liveHash = match ? match[1] : null;

        if (liveHash === expectedHash) {
          console.log(`[✅] Frontend Client Check: متطابق (F-${liveHash.substring(0,7)})`);
        } else {
          console.log(`[❌] Frontend Client Check: غير متطابق أو مخبأ (Cached)!`);
          console.log(`    Expected: ${expectedHash}`);
          console.log(`    Running:  ${liveHash || "Missing Tag"}`);
          hasErrors = true;
        }

        completedTests++;
        if (completedTests === totalTests) printReport();
    });
  });

  req.on("error", (e) => {
    console.log(`[❌] Frontend Client Check: فشل الاتصال - ${e.message}`);
    hasErrors = true;
    completedTests++;
    if (completedTests === totalTests) printReport();
  });
  req.end();
};

console.log("جارِ فحص بصمات النظام بين بيئة التطوير والتشغيل...\n");
verifyBackend();
verifyFrontend();
