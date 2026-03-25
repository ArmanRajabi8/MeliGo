const sendButton = document.getElementById("sendButton");
const error = document.getElementById("error");
const result = document.getElementById("result");
const stateCard = document.getElementById("stateCard");
const stateLabel = document.getElementById("stateLabel");
const statusMessage = document.getElementById("statusMessage");

let isSending = false;

sendButton.addEventListener("click", async () => {
  if (isSending) {
    return;
  }

  isSending = true;
  sendButton.disabled = true;
  sendButton.textContent = "Saving...";
  setInterfaceState("loading", {
    label: "Capturing product",
    message: "Running the extension fallbacks on this page and preparing the save request."
  });
  renderPlaceholder(
    "Working on it",
    "Extracting the strongest product details we can find from the current page."
  );

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
    sendButton.textContent = "Save Another Product";
    setInterfaceState("success", {
      label: "Saved to MeliGo",
      message: "This product is now in your cart and ready to refine from the dashboard."
    });
    renderSavedProduct(message.item, message.product);
  }

  if (message.status === "error") {
    setError(message.message || "Unknown error");
  }
});

function setError(message) {
  isSending = false;
  sendButton.disabled = false;
  sendButton.textContent = "Try Again";
  setInterfaceState("error", {
    label: "Could not save this page",
    message: "Check that you are logged in and that the current tab is a product page, then try again.",
    errorMessage: message
  });
  renderPlaceholder(
    "Nothing was saved yet",
    "You can retry once the page exposes enough product data or your MeliGo session is active again."
  );
}

function setInterfaceState(mode, { label, message, errorMessage = "" }) {
  stateCard.dataset.state = mode;
  stateLabel.textContent = label;
  statusMessage.textContent = message;

  if (errorMessage) {
    error.hidden = false;
    error.textContent = errorMessage;
    return;
  }

  error.hidden = true;
  error.textContent = "";
}

function renderPlaceholder(title, message) {
  result.replaceChildren();

  const card = document.createElement("div");
  card.className = "placeholder-card";

  const heading = document.createElement("h2");
  heading.className = "placeholder-card__title";
  heading.textContent = title;

  const copy = document.createElement("p");
  copy.className = "placeholder-card__copy";
  copy.textContent = message;

  card.append(heading, copy);
  result.append(card);
}

function renderSavedProduct(item, product) {
  result.replaceChildren();

  const imageCount = Array.isArray(product?.imageUrls) ? product.imageUrls.length : 0;
  const metaValues = [
    product?.priceText || null,
    product?.brand || null,
    product?.sourceHost || null,
    imageCount > 0 ? `${imageCount} image${imageCount === 1 ? "" : "s"}` : null
  ].filter(Boolean);

  const card = document.createElement("div");
  card.className = "saved-card";

  const image = document.createElement("img");
  image.className = "saved-card__image";
  image.src = item?.imageUrl || product?.imageUrl || "Meligo.png";
  image.alt = item?.name || product?.title || "Saved product";
  image.onerror = () => {
    image.src = "Meligo.png";
  };

  const body = document.createElement("div");
  body.className = "saved-card__body";

  const eyebrow = document.createElement("p");
  eyebrow.className = "saved-card__eyebrow";
  eyebrow.textContent = "Captured now";

  const title = document.createElement("h2");
  title.className = "saved-card__title";
  title.textContent = item?.name || product?.title || "Saved product";

  const meta = document.createElement("div");
  meta.className = "saved-card__meta";

  metaValues.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "saved-chip";
    chip.textContent = value;
    meta.append(chip);
  });

  const copy = document.createElement("p");
  copy.className = "saved-card__copy";
  copy.textContent = product?.description
    ? product.description.slice(0, 140)
    : "Your cart now has the strongest product details the extension could extract from this page.";

  const link = document.createElement("a");
  link.className = "saved-card__link";
  link.href = item?.link || product?.link || product?.canonicalUrl || "#";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open source page";
  link.hidden = !link.href || link.href === "#";

  body.append(eyebrow, title, meta, copy, link);
  card.append(image, body);
  result.append(card);
}

renderPlaceholder(
  "Ready for your next find",
  "Use this popup on a product page to capture the cleanest title, price, image, and store link MeliGo can detect."
);
