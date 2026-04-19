import { request } from "./apiClient";

export async function fetchLogs() {
  const data = await request("/logs");
  return Array.isArray(data) ? data : [];
}

export async function fetchStats() {
  return request("/logs/stats");
}

export async function fetchUsersDirectory() {
  const data = await request("/logs/users");
  return Array.isArray(data) ? data : [];
}
