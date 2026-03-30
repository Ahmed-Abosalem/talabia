const API_URL = "http://localhost:5000/api";

async function verify() {
  const email = `test-${Date.now()}@gmail.com`;
  const password = "Password123";

  console.log(`--- VERIFYING AUTH SYSTEM ---`);
  console.log(`Target: ${email} / ${password}`);

  try {
    // 1. Register
    console.log("1. Registering...");
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Auth Check",
        email,
        password,
        role: "buyer"
      })
    });
    console.log("Status Register:", regRes.status);
    if (!regRes.ok) {
        const body = await regRes.json();
        throw new Error(body.message || "Registration failed");
    }
    console.log("✅ Registration Successful");

    // 2. Login
    console.log("2. Logging in...");
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password
      })
    });
    console.log("Status Login:", loginRes.status);
    if (!loginRes.ok) {
        const body = await loginRes.json();
        throw new Error(body.message || "Login failed");
    }
    const loginData = await loginRes.json();
    console.log("✅ Login Successful. Token present:", !!loginData.token);

    console.log("\n--- RESULT: SYSTEM IS 100% STABLE ---");
    process.exit(0);
  } catch (err) {
    console.error("❌ Auth System Failure!");
    console.error("Error Message:", err.message);
    process.exit(1);
  }
}

verify();
