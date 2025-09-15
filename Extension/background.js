// background.js

chrome.action.onClicked.addListener((tab) => {
  // Ask content.js to scrape product info
  chrome.tabs.sendMessage(tab.id, { action: 'getProductInfo' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting product info:', chrome.runtime.lastError);
      return;
    }
    const product = response?.productInfo;
    if (product && product.name && product.link) {
      // Send product to your API
      fetch('https://localhost:7066/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(product)
})

      .then(res => res.json())
      .then(data => {
        console.log('Product saved:', data);
        // Optionally show notification or badge update
      })
      .catch(err => {
        console.error('Error sending product:', err);
      });
    } else {
      console.log('No product info found on this page');
    }
  });
});
