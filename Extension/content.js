chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getProductInfo') {
    console.log('[content.js] Received getProductInfo request');

    // Try to extract product data from the page:
    const productName = document.querySelector('h1')?.innerText || null;

    // This selector depends on the website, update it accordingly:
    const productPrice = document.querySelector('.price')?.innerText || null;

    // For image, try a few common selectors:
    let productImage = null;
    const imgSelectors = [
      'img.primary-image',   // example, adjust per site
      'img#main-product-image',
      'img.product-image',
      'img.featured-image'
    ];
    for (const sel of imgSelectors) {
      const imgEl = document.querySelector(sel);
      if (imgEl && imgEl.src) {
        productImage = imgEl.src;
        break;
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

    sendResponse({ productInfo });
    return true; // important for async response
  }
});
