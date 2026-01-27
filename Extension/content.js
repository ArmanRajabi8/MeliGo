// 🔄 Listen for token from Angular app and store it in extension storage
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.type === "MELIGO_TOKEN" && event.data.token) {
    chrome.storage.local.set({ token: event.data.token }, () => {
      console.log("[content.js] Token received and stored:", event.data.token);
    });
  }
});

// 🛒 Listen for product info request from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProductInfo') {
    console.log('[content.js] Received getProductInfo request');

    // Extract product name
    const productName = document.querySelector('h1')?.innerText?.trim() || null;

    // Extract price (adjust selector for specific sites)
    const productPrice = document.querySelector('.price')?.innerText?.trim() || null;

    // 🖼️ Enhanced image scraping logic
    let productImage = null;

    // Try common image selectors
    const imgSelectors = [
      'img.primary-image',
      'img#main-product-image',
      'img.product-image',
      'img.featured-image',
      'img[src*="amazon"]',
      'img[src*="bestbuy"]',
      'img[src*="cdn"]'
    ];

    for (const sel of imgSelectors) {
      const imgEl = document.querySelector(sel);
      if (imgEl?.src) {
        productImage = imgEl.src;
        break;
      }
    }

    // Fallback to Open Graph image
    if (!productImage) {
      const ogImage = document.querySelector('meta[property="og:image"]')?.content;
      if (ogImage) {
        productImage = ogImage;
      }
    }

    // Final fallback: largest visible image on the page
    if (!productImage) {
      const allImages = Array.from(document.images)
        .filter(img => img.width > 100 && img.height > 100 && img.src)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));

      if (allImages.length > 0) {
        productImage = allImages[0].src;
      }
    }

    const productLink = window.location.href;

    const productInfo = {
      name: productName,
      price: productPrice,
      imageUrl: productImage,
      link: productLink
    };

    console.log('[content.js] Product info extracted:', productInfo);
    console.log("Scraped image URL:", productImage);

    sendResponse({ productInfo });
    return true; // ✅ Required for async response
  }
});