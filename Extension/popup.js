const sendButton = document.getElementById("sendButton");
const status = document.getElementById("status");
const error = document.getElementById("error");
const result = document.getElementById("result");

let isSending = false;

sendButton.addEventListener("click", async () => {
  if (isSending) {
    return;
  }

  isSending = true;
  sendButton.disabled = true;
  sendButton.textContent = "Saving...";

  status.textContent = "";
  error.textContent = "";
  result.replaceChildren();

  try {
    await chrome.runtime.sendMessage({ action: "saveLink" });
  } catch (sendError) {
    setError("The extension could not start the save flow.");
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.status === "saved") {
    isSending = false;
    sendButton.disabled = false;
    sendButton.textContent = "Save this product";
    status.textContent = "Product saved.";
    error.textContent = "";
    renderSavedProduct(message.item, message.product);
  }

  if (message.status === "error") {
    setError(message.message || "Unknown error");
  }
});

function setError(message) {
  isSending = false;
  sendButton.disabled = false;
  sendButton.textContent = "Save this product";
  status.textContent = "";
  error.textContent = `Error: ${message}`;
  result.replaceChildren();
}

function renderSavedProduct(item, product) {
  result.replaceChildren();

  const card = document.createElement("div");
  card.className = "product-preview";

  const image = document.createElement("img");
  image.className = "product-preview__image";
  image.src = item?.imageUrl || product?.imageUrl || "Meligo.png";
  image.alt = item?.name || product?.title || "Saved product";
  image.onerror = () => {
    image.src = "Meligo.png";
  };

  const body = document.createElement("div");
  body.className = "product-preview__body";

  const title = document.createElement("div");
  title.className = "product-preview__title";
  title.textContent = item?.name || product?.title || "Saved product";

  const subtitle = document.createElement("div");
  subtitle.className = "product-preview__meta";
  subtitle.textContent = [
    product?.priceText || null,
    product?.brand || null,
    product?.sourceHost || null
  ].filter(Boolean).join(" | ");

  const galleryCount = document.createElement("div");
  galleryCount.className = "product-preview__meta";
  const imageCount = Array.isArray(product?.imageUrls) ? product.imageUrls.length : 0;
  galleryCount.textContent = imageCount > 0 ? `${imageCount} images detected` : "Main image saved";

  body.append(title, subtitle, galleryCount);
  card.append(image, body);
  result.append(card);
}
