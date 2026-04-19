import { request } from "./apiClient";

export async function fetchApis() {
  const list = await request("/dev/apis");
  return Array.isArray(list) ? list : [];
}

export async function fetchApiByKey(apiKey) {
  return request(`/dev/api/${encodeURIComponent(apiKey)}`);
}

export async function createApi(payload) {
  return request("/dev/api", {
    method: "POST",
    body: payload
  });
}

export async function updateApi(apiKey, payload) {
  return request(`/dev/api/${encodeURIComponent(apiKey)}`, {
    method: "PUT",
    body: payload
  });
}

export async function deleteApi(apiKey) {
  return request(`/dev/api/${encodeURIComponent(apiKey)}`, {
    method: "DELETE"
  });
}
