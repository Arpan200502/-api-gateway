const BASE_URL = "";
const TOKEN_KEY = "token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

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

function getUserIdFromToken() {
  const token = getToken();
  if (!token) {
    return null;
  }

  const payload = parseJwtPayload(token);
  return payload?.userId || null;
}

function getApiKeysStorageKey() {
  const userId = getUserIdFromToken();
  return userId ? `apiKeys:${userId}` : null;
}

function getSelectedApiKeyStorageKey() {
  const userId = getUserIdFromToken();
  return userId ? `selectedApiKey:${userId}` : null;
}

function getStoredApiKeys() {
  const storageKey = getApiKeysStorageKey();
  if (!storageKey) {
    return [];
  }

  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function setStoredApiKeys(apiKeys) {
  const storageKey = getApiKeysStorageKey();
  if (!storageKey) {
    return;
  }

  const unique = [...new Set((apiKeys || []).filter(Boolean))];
  localStorage.setItem(storageKey, JSON.stringify(unique));
}

function getSelectedApiKey() {
  const storageKey = getSelectedApiKeyStorageKey();
  if (!storageKey) {
    return "";
  }
  return localStorage.getItem(storageKey) || "";
}

function setSelectedApiKey(apiKey) {
  const storageKey = getSelectedApiKeyStorageKey();
  if (!storageKey) {
    return;
  }
  if (apiKey) {
    localStorage.setItem(storageKey, apiKey);
  } else {
    localStorage.removeItem(storageKey);
  }
}

function saveApiKeyForUser(apiKey) {
  if (!apiKey) {
    return;
  }

  const keys = getStoredApiKeys();
  keys.push(apiKey);
  setStoredApiKeys(keys);
  setSelectedApiKey(apiKey);
}

function removeApiKeyForUser(apiKey) {
  const keys = getStoredApiKeys().filter((item) => item !== apiKey);
  setStoredApiKeys(keys);

  const selected = getSelectedApiKey();
  if (selected === apiKey) {
    setSelectedApiKey(keys[0] || "");
  }
}

function parseJsonInput(raw) {
  if (!raw || !raw.trim()) {
    return null;
  }

  return JSON.parse(raw);
}

function formatOutput(data) {
  if (typeof data === "string") {
    return data;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return String(data);
  }
}

function setResponse(targetId, payload) {
  const el = document.getElementById(targetId);
  if (!el) {
    return;
  }

  el.textContent = formatOutput(payload);
}

function getAuthHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token
  };
}

async function request(path, method, body, authRequired = true, extraHeaders = {}) {
  const options = {
    method
  };

  if (authRequired) {
    const token = getToken();
    if (!token) {
      window.location.href = "login.html";
      throw new Error("Missing token. Please login first.");
    }
    options.headers = { ...getAuthHeaders(), ...extraHeaders };
  } else {
    options.headers = {
      "Content-Type": "application/json",
      ...extraHeaders
    };
  }

  if (body !== null && body !== undefined) {
    options.body = JSON.stringify(body);
  }

  console.log("TOKEN:", localStorage.getItem("token"));
  const res = await fetch(`${BASE_URL}${path}`, options);

  let data;
  try {
    data = await res.json();
  } catch (error) {
    data = { message: await res.text() };
  }

  if (!res.ok) {
    throw new Error(formatOutput(data));
  }

  return data;
}

function extractToken(data) {
  return data?.token || data?.jwt || data?.accessToken || data?.data?.token || null;
}

function renderApiKeyOptions() {
  const select = document.getElementById("api-key-select");
  const selectedDisplay = document.getElementById("selected-key-display");

  if (!select) {
    return;
  }

  const keys = getStoredApiKeys();
  const selected = getSelectedApiKey();

  select.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = keys.length ? "Select a gateway" : "No gateway found yet";
  select.appendChild(defaultOption);

  keys.forEach((apiKey) => {
    const option = document.createElement("option");
    option.value = apiKey;
    option.textContent = apiKey;
    select.appendChild(option);
  });

  if (selected && keys.includes(selected)) {
    select.value = selected;
  }

  if (selectedDisplay) {
    selectedDisplay.textContent = select.value || "None";
  }
}

async function refreshApiKeysFromBackend(responseId) {
  const configs = await request("/dev/apis", "GET", null, true);
  const apiKeysFromBackend = Array.isArray(configs)
    ? configs.map((entry) => entry?.apikey).filter(Boolean)
    : [];

  setStoredApiKeys(apiKeysFromBackend);

  const selected = getSelectedApiKey();
  const keys = getStoredApiKeys();
  if (selected && !keys.includes(selected)) {
    setSelectedApiKey(keys[0] || "");
  } else if (!selected && keys.length > 0) {
    setSelectedApiKey(keys[0]);
  }

  renderApiKeyOptions();

  if (responseId) {
    setResponse(responseId, {
      message: "Gateway list refreshed",
      count: getStoredApiKeys().length,
      apiKeys: getStoredApiKeys()
    });
  }
}

function getSelectedApiPath() {
  const apiKey = getSelectedApiKey().trim();
  if (!apiKey) {
    throw new Error("No gateway selected. Select a gateway from Your Gateways.");
  }

  return `/dev/api/${encodeURIComponent(apiKey)}`;
}

function initLoginPage() {
  const form = document.getElementById("login-form");
  const messageEl = document.getElementById("login-message");

  if (!form || !messageEl) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    messageEl.textContent = "Signing in...";

    try {
      const data = await request("/auth/signin", "POST", { email, password }, false);
      const token = extractToken(data);

      if (!token) {
        messageEl.textContent = "Login succeeded but token was not found in response.";
        return;
      }

      setToken(token);
      window.location.href = "dashboard.html";
    } catch (error) {
      messageEl.textContent = `Login failed: ${error.message}`;
    }
  });
}

function initSignupPage() {
  const form = document.getElementById("signup-form");
  const messageEl = document.getElementById("signup-message");

  if (!form || !messageEl) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    messageEl.textContent = "Creating account...";

    try {
      await request("/auth/signup", "POST", { email, password }, false);
      messageEl.innerHTML = 'Signup successful. <a href="login.html">Go to login</a>';
      form.reset();
    } catch (error) {
      messageEl.textContent = `Signup failed: ${error.message}`;
    }
  });
}

function bindApiAction(buttonId, responseId, method, bodyInputId, pathResolver) {
  const button = document.getElementById(buttonId);
  if (!button) {
    return;
  }

  button.addEventListener("click", async () => {
    setResponse(responseId, { status: "loading" });

    try {
      const bodyInput = bodyInputId ? document.getElementById(bodyInputId) : null;
      const body = bodyInput ? parseJsonInput(bodyInput.value) : null;

      const path = pathResolver();
      const data = await request(path, method, body, true);

      if (path === "/dev/api" && method === "POST" && data?.apikey) {
        saveApiKeyForUser(data.apikey);
        await refreshApiKeysFromBackend();
        renderApiKeyOptions();
      }

      if (method === "DELETE" && path.startsWith("/dev/api/")) {
        const deletedKey = decodeURIComponent(path.split("/").pop() || "");
        removeApiKeyForUser(deletedKey);
        await refreshApiKeysFromBackend();
        renderApiKeyOptions();
      }

      setResponse(responseId, data);
    } catch (error) {
      setResponse(responseId, { error: error.message });
    }
  });
}

function initDashboardPage() {
  if (!getToken()) {
    window.location.href = "login.html";
    return;
  }

  renderApiKeyOptions();

  const apiKeySelect = document.getElementById("api-key-select");
  const selectedDisplay = document.getElementById("selected-key-display");
  if (apiKeySelect) {
    apiKeySelect.addEventListener("change", () => {
      const selected = apiKeySelect.value;
      setSelectedApiKey(selected);
      if (selectedDisplay) {
        selectedDisplay.textContent = selected || "None";
      }
    });
  }

  const refreshKeysBtn = document.getElementById("refresh-keys-btn");
  if (refreshKeysBtn) {
    refreshKeysBtn.addEventListener("click", async () => {
      try {
        await refreshApiKeysFromBackend("fetch-response");
      } catch (error) {
        setResponse("fetch-response", { error: error.message });
      }
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearToken();
      window.location.href = "login.html";
    });
  }

  bindApiAction("create-btn", "create-response", "POST", "create-body", () => "/dev/api");
  bindApiAction("fetch-btn", "fetch-response", "GET", null, getSelectedApiPath);
  bindApiAction("update-btn", "update-response", "PUT", "update-body", getSelectedApiPath);
  bindApiAction("delete-btn", "delete-response", "DELETE", "delete-body", getSelectedApiPath);
  bindApiAction("logs-btn", "logs-response", "GET", null, () => "/logs");
  bindApiAction("stats-btn", "stats-response", "GET", null, () => "/logs/stats");

  refreshApiKeysFromBackend().catch(() => {
    renderApiKeyOptions();
  });
}

function init() {
  const page = document.body.dataset.page;

  if (page === "login") {
    initLoginPage();
  } else if (page === "signup") {
    initSignupPage();
  } else if (page === "dashboard") {
    initDashboardPage();
  }
}

document.addEventListener("DOMContentLoaded", init);
