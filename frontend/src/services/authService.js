import { api } from "./api";

export async function loginRequest({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });
  return data; // نتوقع: { token, user }
}

export async function registerRequest(payload) {
  const { data } = await api.post("/auth/register", payload);
  return data; // مثلاً: { message, user? }
}

export async function getCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data; // نتوقع: { user }
}

export async function logoutRequest() {
  const { data } = await api.post("/auth/logout");
  return data; // مثلاً: { message: "تم تسجيل الخروج بنجاح" }
}
