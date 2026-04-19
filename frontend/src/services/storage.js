const TOKEN_KEY = "token";
const AUTH_USER_KEY = "authUser";

function parseJwtPayload(token) {
  try {
    const payloadPart = token.split(".")[1];
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch (error) {
    return null;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function setAuthUser(user) {
  if (!user) {
    localStorage.removeItem(AUTH_USER_KEY);
    return;
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getUserFromToken() {
  const token = getToken();
  if (!token) {
    return null;
  }
  const payload = parseJwtPayload(token);
  if (!payload) {
    return null;
  }
  const authUser = getAuthUser();
  return {
    userId: payload.userId || null,
    role: authUser?.role || "dev",
    email: authUser?.email || null
  };
}

function getUserScopedKey(prefix) {
  const user = getUserFromToken();
  if (!user?.userId) {
    return null;
  }
  return `${prefix}:${user.userId}`;
}

export function getStoredApiKeys() {
  const key = getUserScopedKey("apiKeys");
  if (!key) {
    return [];
  }
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export function setStoredApiKeys(apiKeys) {
  const key = getUserScopedKey("apiKeys");
  if (!key) {
    return;
  }
  const unique = [...new Set((apiKeys || []).filter(Boolean))];
  localStorage.setItem(key, JSON.stringify(unique));
}

export function getSelectedApiKey() {
  const key = getUserScopedKey("selectedApiKey");
  if (!key) {
    return "";
  }
  return localStorage.getItem(key) || "";
}

export function setSelectedApiKey(apiKey) {
  const key = getUserScopedKey("selectedApiKey");
  if (!key) {
    return;
  }
  if (apiKey) {
    localStorage.setItem(key, apiKey);
  } else {
    localStorage.removeItem(key);
  }
}

export function getApiNameMap() {
  const key = getUserScopedKey("apiNameMap");
  if (!key) {
    return {};
  }

  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

export function setApiNameForKey(apiKey, name) {
  const key = getUserScopedKey("apiNameMap");
  if (!key || !apiKey) {
    return;
  }

  const current = getApiNameMap();
  current[apiKey] = name;
  localStorage.setItem(key, JSON.stringify(current));
}

export function removeApiNameForKey(apiKey) {
  const key = getUserScopedKey("apiNameMap");
  if (!key || !apiKey) {
    return;
  }

  const current = getApiNameMap();
  delete current[apiKey];
  localStorage.setItem(key, JSON.stringify(current));
}
