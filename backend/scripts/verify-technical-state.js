import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;
const LOGIN_EMAIL = "admin@talabia.com";
const LOGIN_PASSWORD = "Admin12345";

async function log(message, type = "INFO") {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
}

async function runVerification() {
    log("🚀 Starting Technical State Verification...", "START");
    const report = {
        serverStatus: "UNKNOWN",
        endpoints: {},
        synonymSystem: {},
        adminAccess: "UNKNOWN"
    };

    try {
        // 1. Check Health/Base
        log(`Checking Base URL: ${BASE_URL}`);
        try {
            const healthRes = await fetch(`${BASE_URL}/api/health`);
            if (healthRes.ok) {
                report.serverStatus = "STABLE";
                report.endpoints.health = "PASS";
                log("✅ Server is reachable and healthy.");
            } else {
                report.serverStatus = "UNSTABLE";
                report.endpoints.health = `FAIL (${healthRes.status})`;
                log(`❌ Server returned ${healthRes.status} on /api/health`, "ERROR");
            }
        } catch (e) {
            report.serverStatus = "DOWN";
            log(`❌ Could not connect to server: ${e.message}`, "FATAL");
            // Cannot proceed if server is down
            console.log(JSON.stringify(report, null, 2));
            process.exit(1);
        }

        // 2. Login to get Admin Token
        let token = null;
        log(`Attempting Admin Login with ${LOGIN_EMAIL}...`);
        try {
            const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD })
            });

            if (loginRes.ok) {
                const data = await loginRes.json();
                token = data.token;
                report.adminAccess = "PASS";
                log("✅ Admin Login Successful.");
            } else {
                report.adminAccess = `FAIL (${loginRes.status})`;
                const errData = await loginRes.text();
                log(`❌ Admin Login Failed: ${errData}`, "ERROR");
            }
        } catch (e) {
            report.adminAccess = "ERROR";
            log(`❌ Login Exception: ${e.message}`, "ERROR");
        }

        // 3. Public Endpoints Check
        const publicEndpoints = ["/api/products", "/api/categories"];
        for (const ep of publicEndpoints) {
            try {
                const res = await fetch(`${BASE_URL}${ep}`);
                report.endpoints[ep] = res.ok ? "PASS" : `FAIL (${res.status})`;
                log(`${res.ok ? "✅" : "❌"} Checked ${ep}: ${res.status}`);
            } catch (e) {
                report.endpoints[ep] = "ERROR";
                log(`❌ Error checking ${ep}: ${e.message}`, "ERROR");
            }
        }

        // 4. Protected Synonym Routes Check
        if (token) {
            const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

            // A. Get Synonyms
            log("Testing Synonym Fetch (Protected)...");
            try {
                const synRes = await fetch(`${BASE_URL}/api/synonyms`, { headers });
                if (synRes.ok) {
                    report.synonymSystem.fetch = "PASS";
                    log("✅ Synonyms Fetch Successful.");
                } else {
                    report.synonymSystem.fetch = `FAIL (${synRes.status})`;
                    log("❌ Synonyms Fetch Failed.", "ERROR");
                }
            } catch (e) {
                report.synonymSystem.fetch = "ERROR";
            }

            // B. CRUD Stress Test (Add -> Update -> Delete)
            log("Testing Synonym CRUD & Stress...");
            const testTerm = `test_auto_${Date.now()}`;
            let createdId = null;

            // CREATE
            try {
                const createRes = await fetch(`${BASE_URL}/api/synonyms`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ term: testTerm, synonyms: ["test1", "test2"], notes: "Auto Test" })
                });
                if (createRes.ok) {
                    const data = await createRes.json();
                    createdId = data._id;
                    report.synonymSystem.create = "PASS";
                    log("✅ Synonym Create Successful.");
                } else {
                    const txt = await createRes.text();
                    report.synonymSystem.create = `FAIL (${createRes.status}) - ${txt}`;
                    log(`❌ Synonym Create Failed: ${txt}`, "ERROR");
                }
            } catch (e) { report.synonymSystem.create = "ERROR"; }

            // UPDATE (Stress: Call immediately after create)
            if (createdId) {
                try {
                    const updateRes = await fetch(`${BASE_URL}/api/synonyms/${createdId}`, {
                        method: "PUT",
                        headers,
                        body: JSON.stringify({ synonyms: ["test1", "test2", "test3"] })
                    });
                    if (updateRes.ok) {
                        report.synonymSystem.update = "PASS";
                        log("✅ Synonym Update Successful.");
                    } else {
                        report.synonymSystem.update = `FAIL (${updateRes.status})`;
                    }
                } catch (e) { report.synonymSystem.update = "ERROR"; }

                // DELETE
                try {
                    const delRes = await fetch(`${BASE_URL}/api/synonyms/${createdId}`, {
                        method: "DELETE",
                        headers
                    });
                    if (delRes.ok) {
                        report.synonymSystem.delete = "PASS";
                        log("✅ Synonym Delete Successful.");
                    } else {
                        report.synonymSystem.delete = `FAIL (${delRes.status})`;
                    }
                } catch (e) { report.synonymSystem.delete = "ERROR"; }
            }
        } else {
            log("⚠️ Skipping Protected Route tests due to login failure.", "WARN");
            report.synonymSystem.protectedTests = "SKIPPED";
        }

        // 5. Stress Test: Reload Synonyms directly?
        // We can't call the function directly from outside, but we can infer stability if the CRUD ops above didn't crash the server.
        // We will do a final health check to ensure server is still up after CRUD.
        log("Final Liveness Check...");
        try {
            const finalHealth = await fetch(`${BASE_URL}/api/health`);
            if (finalHealth.ok) {
                report.synonymSystem.stability = "PASS";
                log("✅ Server survived CRUD operations.");
            } else {
                report.synonymSystem.stability = "FAIL";
                log("❌ Server unstable after CRUD operations.", "ERROR");
            }
        } catch (e) {
            report.synonymSystem.stability = "CRASHED";
            log("❌ Server CRASHED after CRUD operations.", "FATAL");
        }

    } catch (error) {
        log(`UNEXPECTED ERROR: ${error.message}`, "FATAL");
    }

    console.log("\n--- VERIFICATION REPORT ---");
    console.log(JSON.stringify(report, null, 2));
}

runVerification();
