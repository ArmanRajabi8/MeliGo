(() => {
  if (globalThis.__meligoContentInitialized) {
    return;
  }

  globalThis.__meligoContentInitialized = true;

  const TITLE_SELECTORS = [
    "#productTitle",
    "[data-testid*='product-title']",
    "[data-testid*='title']",
    "h1[itemprop='name']",
    "main h1",
    "h1"
  ];

  const PRICE_SELECTORS = [
    "#corePrice_feature_div .a-offscreen",
    "#price_inside_buybox",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    "[data-testid*='price']",
    "[itemprop='price']",
    ".price",
    ".product-price",
    ".sale-price"
  ];

  const BRAND_SELECTORS = [
    "#bylineInfo",
    "[itemprop='brand']",
    "[data-testid*='brand']",
    "[class*='brand']"
  ];

  const DESCRIPTION_SELECTORS = [
    "#productDescription",
    "[itemprop='description']",
    "[data-testid*='description']"
  ];

  const IMAGE_SELECTORS = [
    "#landingImage",
    "#imgTagWrapperId img",
    "[data-testid*='hero'] img",
    "[data-testid*='image'] img",
    "[itemprop='image']",
    "[class*='gallery'] img",
    "[class*='carousel'] img",
    "[class*='product-image'] img",
    "[class*='productImage'] img",
    "main img"
  ];

  const THUMBNAIL_SELECTORS = [
    "#altImages img",
    "[data-testid*='thumbnail'] img",
    "[class*='thumbnail'] img",
    "[class*='thumb'] img"
  ];

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data?.type) {
      return;
    }

    if (event.data.type === "MELIGO_TOKEN" && typeof event.data.token === "string") {
      chrome.storage.local.set({ token: event.data.token });
      return;
    }

    if (event.data.type === "MELIGO_TOKEN_CLEAR") {
      chrome.storage.local.remove("token");
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
      sendResponse({ ok: true });
      return false;
    }

    if (request.action === "getProductInfo") {
      sendResponse({ productInfo: extractProductInfo() });
      return false;
    }

    return false;
  });

  function extractProductInfo() {
    const jsonLdEntries = parseJsonLdEntries();
    const productSchemas = jsonLdEntries.filter((entry) => hasSchemaType(entry, "Product"));
    const offerSchemas = getOfferSchemas(productSchemas, jsonLdEntries);
    const primaryProduct = productSchemas[0] ?? null;
    const primaryOffer = offerSchemas[0] ?? null;

    const canonicalUrl = getCanonicalUrl();
    const title = firstNonEmpty(
      getJsonLdTitle(primaryProduct),
      getMetaContent("meta[property='og:title']"),
      getMetaContent("meta[name='twitter:title']"),
      getTextFromSelectors(TITLE_SELECTORS),
      cleanDocumentTitle(document.title)
    );

    const currency = firstNonEmpty(
      readString(primaryOffer?.priceCurrency),
      getMetaContent("meta[property='product:price:currency']"),
      getMetaContent("meta[itemprop='priceCurrency']")
    );

    const price = firstNonNull(
      parsePriceValue(primaryOffer?.price),
      parsePriceValue(primaryOffer?.lowPrice),
      parsePriceValue(getMetaContent("meta[property='product:price:amount']")),
      parsePriceValue(getValueFromSelectors(PRICE_SELECTORS))
    );

    const priceText = firstNonEmpty(
      getTextFromSelectors(PRICE_SELECTORS),
      readString(primaryOffer?.price),
      readString(primaryOffer?.priceSpecification?.price),
      getMetaContent("meta[property='product:price:amount']"),
      formatPrice(price, currency)
    );

    const brand = firstNonEmpty(
      getJsonLdBrand(primaryProduct),
      getMetaContent("meta[property='product:brand']"),
      cleanupBrand(getTextFromSelectors(BRAND_SELECTORS))
    );

    const description = firstNonEmpty(
      readString(primaryProduct?.description),
      getMetaContent("meta[name='description']"),
      getTextFromSelectors(DESCRIPTION_SELECTORS)
    );

    const availability = normalizeAvailability(firstNonEmpty(
      readString(primaryOffer?.availability),
      readString(primaryProduct?.offers?.availability),
      getMetaContent("meta[property='product:availability']")
    ));

    const sku = firstNonEmpty(
      readString(primaryProduct?.sku),
      readString(primaryProduct?.mpn),
      readString(primaryProduct?.gtin13),
      readString(primaryProduct?.gtin14),
      getMetaContent("meta[itemprop='sku']")
    );

    const galleryImages = collectImageUrls(primaryProduct);
    const imageUrl = galleryImages[0] ?? null;
    const link = canonicalUrl ?? window.location.href;

    return {
      title,
      price,
      priceText,
      currency,
      brand,
      description,
      availability,
      sku,
      imageUrl,
      imageUrls: galleryImages,
      link,
      canonicalUrl,
      sourceHost: window.location.hostname,
      pageTitle: document.title,
      hasProductSchema: productSchemas.length > 0,
      extractedAt: new Date().toISOString()
    };
  }

  function parseJsonLdEntries() {
    const entries = [];
    const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));

    for (const script of scripts) {
      const rawText = script.textContent?.trim();

      if (!rawText) {
        continue;
      }

      try {
        const parsed = JSON.parse(rawText);
        flattenJsonLd(parsed, entries);
      } catch (error) {
        try {
          const cleaned = rawText
            .replace(/[\u0000-\u001F]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          const parsed = JSON.parse(cleaned);
          flattenJsonLd(parsed, entries);
        } catch {
        }
      }
    }

    return entries;
  }

  function flattenJsonLd(value, entries) {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        flattenJsonLd(item, entries);
      }
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    entries.push(value);

    if (Array.isArray(value["@graph"])) {
      flattenJsonLd(value["@graph"], entries);
    }
  }

  function hasSchemaType(entry, expectedType) {
    const schemaType = entry?.["@type"];

    if (Array.isArray(schemaType)) {
      return schemaType.some((value) => String(value).toLowerCase() === expectedType.toLowerCase());
    }

    return String(schemaType ?? "").toLowerCase() === expectedType.toLowerCase();
  }

  function getOfferSchemas(productSchemas, jsonLdEntries) {
    const offers = [];

    for (const product of productSchemas) {
      const productOffers = toArray(product?.offers);
      for (const offer of productOffers) {
        if (offer && typeof offer === "object") {
          offers.push(offer);
        }
      }
    }

    for (const entry of jsonLdEntries) {
      if (hasSchemaType(entry, "Offer")) {
        offers.push(entry);
      }
    }

    return offers;
  }

  function getJsonLdTitle(product) {
    return firstNonEmpty(
      readString(product?.name),
      readString(product?.headline)
    );
  }

  function getJsonLdBrand(product) {
    const brand = product?.brand;

    if (!brand) {
      return null;
    }

    if (typeof brand === "string") {
      return cleanupBrand(brand);
    }

    return cleanupBrand(readString(brand?.name));
  }

  function collectImageUrls(product) {
    const candidates = new Map();

    const addCandidate = (rawUrl, score) => {
      const normalized = normalizeUrl(rawUrl);

      if (!normalized || !looksLikeImageUrl(normalized)) {
        return;
      }

      const existing = candidates.get(normalized) ?? 0;
      candidates.set(normalized, Math.max(existing, score));
    };

    const addFromElement = (element, baseScore) => {
      if (!element) {
        return;
      }

      const directSources = [
        element.getAttribute?.("data-old-hires"),
        element.getAttribute?.("data-zoom-image"),
        element.getAttribute?.("data-large-image"),
        element.getAttribute?.("data-src"),
        element.getAttribute?.("data-original"),
        element.currentSrc,
        element.src,
        element.getAttribute?.("content")
      ];

      for (const source of directSources) {
        addCandidate(source, baseScore);
      }

      const srcset = element.getAttribute?.("srcset");
      for (const source of parseSrcSet(srcset)) {
        addCandidate(source, baseScore - 5);
      }

      const dynamicAmazonImages = element.getAttribute?.("data-a-dynamic-image");
      if (dynamicAmazonImages) {
        try {
          const parsed = JSON.parse(dynamicAmazonImages);
          for (const source of Object.keys(parsed)) {
            addCandidate(source, baseScore + 10);
          }
        } catch {
        }
      }
    };

    for (const image of extractImageField(product?.image)) {
      addCandidate(image, 160);
    }

    for (const selector of [
      "meta[property='og:image']",
      "meta[name='twitter:image']",
      "meta[itemprop='image']",
      "link[rel='image_src']"
    ]) {
      addCandidate(getMetaContent(selector), 140);
    }

    for (const selector of IMAGE_SELECTORS) {
      const elements = Array.from(document.querySelectorAll(selector));
      for (const element of elements) {
        addFromElement(element, 120);
      }
    }

    for (const selector of THUMBNAIL_SELECTORS) {
      const elements = Array.from(document.querySelectorAll(selector));
      for (const element of elements) {
        addFromElement(element, 90);
      }
    }

    for (const image of Array.from(document.images)) {
      if (!isPotentialProductImage(image)) {
        continue;
      }

      const areaScore = Math.min(Math.round((image.naturalWidth * image.naturalHeight) / 2500), 40);
      addFromElement(image, 60 + areaScore);
    }

    return Array.from(candidates.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([url]) => url)
      .slice(0, 20);
  }

  function extractImageField(value) {
    if (!value) {
      return [];
    }

    if (typeof value === "string") {
      return [value];
    }

    if (Array.isArray(value)) {
      return value.flatMap((entry) => extractImageField(entry));
    }

    if (typeof value === "object") {
      return [
        readString(value.url),
        readString(value.contentUrl),
        readString(value.thumbnailUrl),
        ...extractImageField(value.image)
      ].filter(Boolean);
    }

    return [];
  }

  function getCanonicalUrl() {
    const canonical = document.querySelector("link[rel='canonical']")?.getAttribute("href");
    return normalizeUrl(canonical);
  }

  function getMetaContent(selector) {
    const element = document.querySelector(selector);
    const rawValue = element?.getAttribute("content") ?? element?.getAttribute("href");
    return cleanupText(rawValue);
  }

  function getTextFromSelectors(selectors) {
    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      for (const element of elements) {
        const text = cleanupText(element.textContent);
        if (text) {
          return text;
        }
      }
    }

    return null;
  }

  function getValueFromSelectors(selectors) {
    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      for (const element of elements) {
        const attributeValue = cleanupText(
          element.getAttribute?.("content") ??
          element.getAttribute?.("value") ??
          element.textContent
        );

        if (attributeValue) {
          return attributeValue;
        }
      }
    }

    return null;
  }

  function isPotentialProductImage(image) {
    const normalized = normalizeUrl(image.currentSrc || image.src);
    if (!normalized || !looksLikeImageUrl(normalized)) {
      return false;
    }

    const altText = `${image.alt ?? ""} ${image.className ?? ""} ${image.id ?? ""}`.toLowerCase();
    const blacklist = ["logo", "icon", "sprite", "avatar", "badge", "rating", "flag"];

    if (blacklist.some((term) => altText.includes(term))) {
      return false;
    }

    return image.naturalWidth >= 120 && image.naturalHeight >= 120;
  }

  function looksLikeImageUrl(url) {
    if (!url) {
      return false;
    }

    if (!/^https?:\/\//i.test(url)) {
      return false;
    }

    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("sprite") || lowerUrl.includes("icon")) {
      return false;
    }

    return true;
  }

  function parseSrcSet(srcSet) {
    if (!srcSet) {
      return [];
    }

    return srcSet
      .split(",")
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter(Boolean);
  }

  function cleanupText(value) {
    if (typeof value !== "string") {
      return null;
    }

    const cleaned = value.replace(/\s+/g, " ").trim();
    return cleaned || null;
  }

  function cleanupBrand(value) {
    const cleaned = cleanupText(value);

    if (!cleaned) {
      return null;
    }

    return cleaned
      .replace(/^brand:\s*/i, "")
      .replace(/^visit the\s+/i, "")
      .replace(/\s+store$/i, "")
      .trim() || null;
  }

  function cleanDocumentTitle(title) {
    const cleaned = cleanupText(title);

    if (!cleaned) {
      return null;
    }

    const separators = [" | ", " - ", " : "];
    for (const separator of separators) {
      const parts = cleaned.split(separator);
      if (parts.length > 1 && parts[0].trim().length >= 10) {
        return parts[0].trim();
      }
    }

    return cleaned;
  }

  function readString(value) {
    if (typeof value === "string") {
      return cleanupText(value);
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    return null;
  }

  function parsePriceValue(rawValue) {
    if (rawValue == null) {
      return null;
    }

    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      return rawValue;
    }

    const stringValue = String(rawValue).trim();
    if (!stringValue) {
      return null;
    }

    let cleaned = stringValue.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "");
    if (!cleaned) {
      return null;
    }

    const commaCount = (cleaned.match(/,/g) ?? []).length;
    const dotCount = (cleaned.match(/\./g) ?? []).length;
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    if (commaCount > 0 && dotCount > 0) {
      const decimalSeparator = lastComma > lastDot ? "," : ".";
      const thousandsSeparator = decimalSeparator === "," ? "." : ",";
      cleaned = cleaned.split(thousandsSeparator).join("");
      if (decimalSeparator === ",") {
        cleaned = cleaned.replace(",", ".");
      }
    } else if (commaCount > 1) {
      const parts = cleaned.split(",");
      const last = parts.pop();
      cleaned = `${parts.join("")}.${last}`;
    } else if (dotCount > 1) {
      const parts = cleaned.split(".");
      const last = parts.pop();
      cleaned = `${parts.join("")}.${last}`;
    } else if (commaCount === 1 && dotCount === 0) {
      const decimalDigits = cleaned.length - lastComma - 1;
      cleaned = decimalDigits === 2 ? cleaned.replace(",", ".") : cleaned.replace(",", "");
    }

    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatPrice(price, currency) {
    if (price == null) {
      return null;
    }

    if (currency) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency
        }).format(price);
      } catch {
      }
    }

    return String(price);
  }

  function normalizeAvailability(value) {
    const cleaned = cleanupText(value);
    if (!cleaned) {
      return null;
    }

    if (cleaned.includes("/")) {
      const lastSegment = cleaned.split("/").pop();
      return lastSegment
        ?.replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim() ?? null;
    }

    return cleaned;
  }

  function normalizeUrl(rawUrl) {
    if (!rawUrl) {
      return null;
    }

    try {
      return new URL(rawUrl, window.location.href).href.split("#")[0];
    } catch {
      return null;
    }
  }

  function firstNonEmpty(...values) {
    return values.find((value) => typeof value === "string" && value.trim().length > 0) ?? null;
  }

  function firstNonNull(...values) {
    return values.find((value) => value != null) ?? null;
  }

  function toArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (value == null) {
      return [];
    }

    return [value];
  }
})();
