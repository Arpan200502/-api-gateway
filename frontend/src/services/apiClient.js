import { getToken } from "./storage";

function toErrorMessage(payload) {
  if (!payload) {
    return "Request failed";
  }
  if (typeof payload === "string") {
    return payload;
  }
  if (payload.error) {
    return payload.error;
  }
  if (payload.message) {
    return payload.message;
  }
  try {
    return JSON.stringify(payload);
  } catch (error) {
    return "Request failed";
  }
}

export async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (auth) {
    const token = getToken();
    if (!token) {
      throw new Error("Missing auth token");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(toErrorMessage(payload));
  }

  return payload;
}
