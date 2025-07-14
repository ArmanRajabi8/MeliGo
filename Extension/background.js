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
      fetch('https://your-server-url/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Add auth header here if needed
        },
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
