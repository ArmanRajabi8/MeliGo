const API_BASE_URL = "https://meligo.onrender.com";
const MELIGO_APP_URL_PATTERNS = [
  `${API_BASE_URL}/*`,
  "http://localhost:4200/*",
  "http://127.0.0.1:4200/*"
];

chrome.runtime.onInstalled.addListener(({ reason }) => {
  void syncMeliGoTabs(reason === "install");
});

chrome.runtime.onStartup.addListener(() => {
  void syncMeliGoTabs(false);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "connectMeliGo") {
    void connectMeliGo(sendResponse);
    return true;
  }

  if (message.action !== "saveLink") {
    return false;
  }

  void handleSaveLink();
  return false;
});

async function handleSaveLink() {
  try {
    const activeTab = await getActiveTab();

    if (!activeTab?.id || !activeTab.url) {
      throw new Error("No active tab was found.");
    }

    if (!/^https?:\/\//i.test(activeTab.url)) {
      throw new Error("Open a product page on a regular website before saving.");
    }

    await ensureContentScript(activeTab.id);
    const response = await chrome.tabs.sendMessage(activeTab.id, { action: "getProductInfo" });
    const product = response?.productInfo;

    if (!product?.link) {
      throw new Error("This page did not expose enough product data to save.");
    }

    const { token } = await chrome.storage.local.get("token");
    if (!token) {
      throw new Error("Not authenticated with MeliGo. Open the app once and log in again.");
    }

    const payload = buildRequestPayload(product);
    const savedItem = await saveProduct(payload, token);

    await notifyPopup({
      status: "saved",
      item: savedItem,
      product: payload
    });
  } catch (error) {
    await notifyPopup({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function syncMeliGoTabs(openWhenMissing) {
  const appTabs = await getMeliGoTabs();

  for (const tab of appTabs) {
    if (tab.id) {
      try {
        await ensureContentScript(tab.id);
      } catch {
        // The tab may still be loading. The declared content script will retry on load.
      }
    }
  }

  if (openWhenMissing && appTabs.length === 0) {
    await chrome.tabs.create({ url: API_BASE_URL });
  }
}

async function connectMeliGo(sendResponse) {
  try {
    const appTabs = await getMeliGoTabs();
    let appTab = appTabs[0];

    if (!appTab) {
      appTab = await chrome.tabs.create({ url: API_BASE_URL });
    } else if (appTab.id) {
      await chrome.tabs.update(appTab.id, { active: true });
    }

    if (appTab?.id && appTab.status === "complete") {
      await ensureContentScript(appTab.id);
    }

    sendResponse({ ok: true });
  } catch (error) {
    sendResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Could not open MeliGo."
    });
  }
}

async function getMeliGoTabs() {
  return chrome.tabs.query({ url: MELIGO_APP_URL_PATTERNS });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "ping" });
    return;
  } catch {
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });
}

function buildRequestPayload(product) {
  const link = product.canonicalUrl || product.link;

  return {
    link,
    title: product.title,
    imageUrl: product.imageUrl,
    imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
    price: typeof product.price === "number" ? product.price : null,
    priceText: product.priceText,
    currency: product.currency,
    brand: product.brand,
    description: product.description,
    availability: product.availability,
    sku: product.sku,
    sourceHost: product.sourceHost,
    pageTitle: product.pageTitle,
    extractedAt: product.extractedAt
  };
}

async function saveProduct(payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/items/link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 401 || response.status === 403) {
      throw new Error("MeliGo rejected the request. Log in again to refresh your token.");
    }

    throw new Error(`Server error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function notifyPopup(message) {
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
  }
}
