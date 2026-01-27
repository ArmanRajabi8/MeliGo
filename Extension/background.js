chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "saveLink") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;

      // Step 1: Inject content.js if needed
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }, () => {
        // Step 2: Send message to content.js to get product info
        chrome.tabs.sendMessage(tab.id, { action: "getProductInfo" }, async (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error getting product info:", chrome.runtime.lastError);
            chrome.runtime.sendMessage({ status: "error", message: "Could not scrape product info" });
            return;
          }

          const product = response?.productInfo;
          if (!product?.link) {
            chrome.runtime.sendMessage({ status: "error", message: "No product info found" });
            return;
          }

          // Step 3: Get token from extension storage
          const { token } = await chrome.storage.local.get("token");
          if (!token) {
            chrome.runtime.sendMessage({ status: "error", message: "Not authenticated" });
            return;
          }

          // Step 4: Send product link to backend
          fetch("https://localhost:7066/api/items/link", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
    body: JSON.stringify({
  link: product.link,
  title: product.name,
  imageUrl: product.imageUrl
})


          })
            .then(async res => {
              if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server error: ${res.status} - ${errorText}`);
              }
              return res.json();
            })
            .then(item => {
              console.log("Product saved:", item);
              chrome.runtime.sendMessage({ status: "saved", item });
            })
            .catch(err => {
              console.error("Error sending product:", err);
              chrome.runtime.sendMessage({ status: "error", message: err.message });
            });
        });
      });
    });
  }
});