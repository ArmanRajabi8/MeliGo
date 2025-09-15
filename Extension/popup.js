// popup.js
const sendBtn = document.getElementById("sendButton");
const status  = document.getElementById("status");
const error   = document.getElementById("error");
const result  = document.getElementById("result");

sendBtn.addEventListener("click", () => {
  status.textContent = "";
  error.textContent  = "";
  result.innerHTML   = `<span class="spinner"></span> Sending…`;

  // Tell the background script to fire off the save
  chrome.runtime.sendMessage({ action: "saveLink" });
});

// Listen for background.js messages
chrome.runtime.onMessage.addListener(msg => {
  if (msg.status === "saved") {
    status.textContent = "Product saved!";
    result.innerHTML   = `
      <img src="${msg.item.imageUrl}" width="60" />
      <span>${msg.item.name}</span>
    `;
  }
  if (msg.status === "error") {
    error.textContent = `Error: ${msg.message}`;
    result.textContent = "";
  }
});
