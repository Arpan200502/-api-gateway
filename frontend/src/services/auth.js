import { request } from "./apiClient";

export function extractToken(payload) {
  return payload?.token || payload?.jwt || payload?.accessToken || payload?.data?.token || null;
}

export async function signup(email, password) {
  return request("/auth/signup", {
    method: "POST",
    body: { email, password },
    auth: false
  });
}

export async function signin(email, password) {
  return request("/auth/signin", {
    method: "POST",
    body: { email, password },
    auth: false
  });
}
