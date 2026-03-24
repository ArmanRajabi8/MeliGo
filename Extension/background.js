const API_BASE_URL = "http://localhost:5207";

chrome.runtime.onMessage.addListener((message) => {
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
