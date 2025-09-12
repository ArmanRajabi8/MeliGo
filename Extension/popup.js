//popup.js
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('sendButton');
  const status = document.getElementById('status');

  sendBtn.addEventListener('click', async () => {
    status.textContent = 'Sending...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Inject content script if not already injected
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Now send the message
      chrome.tabs.sendMessage(tab.id, { action: 'getProductInfo' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('SendMessage error:', chrome.runtime.lastError.message);
          status.textContent = 'Failed to communicate with tab';
          return;
        }
        console.log('Got response:', response);

        if (!response || !response.productInfo) {
          status.textContent = 'No product data found';
          return;
        }

        // Process productInfo...
        status.textContent = 'Product info received!';
      });

    } catch (err) {
      console.error('Unexpected error:', err);
      status.textContent = 'Unexpected error';
    }
  });
});
