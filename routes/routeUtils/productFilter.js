import { CATEGORY_MAP } from "./constants.js";

export const isShoppingQuery = (text) => {
  return /\b(mobile|phone|smartphone|tab|laptop|notebook|tablet|ipad|buy|show|find|suggest|recommend|budget|price|under|above|cheap|brand|compare|vs|which|gaming)\b/i.test(
    text
  );
};

export const filterProducts = (products, inputText) => {
  const text = inputText.toLowerCase().trim();

  let filtered = [...products];

  for (const [category, pattern] of Object.entries(CATEGORY_MAP)) {
    if (pattern.test(text)) {
      filtered = filtered.filter(
        (p) => p.category?.toLowerCase() === category
      );
      break;
    }
  }

  const brands = [
    ...new Set(
      products
        .map((p) => p.brand?.toLowerCase().trim())
        .filter(Boolean)
    ),
  ];

  const matchedBrand = brands.find((brand) =>
    text.includes(brand)
  );

  if (matchedBrand) {
    filtered = filtered.filter(
      (p) => p.brand?.toLowerCase().trim() === matchedBrand
    );
  }

  const rangeMatch = text.match(
    /(\d[\d,]*)\s*(to|-)\s*(\d[\d,]*)/
  );

  if (rangeMatch) {
    const min = parseInt(
      rangeMatch[1].replace(/,/g, "")
    );

    const max = parseInt(
      rangeMatch[3].replace(/,/g, "")
    );

    filtered = filtered.filter((p) => {
      const price = Number(p.productPrice);

      return !isNaN(price) && price >= min && price <= max;
    });
  }

  const underMatch = text.match(
    /under\s*₹?\s*(\d[\d,]*)/
  );

  if (underMatch) {
    const max = parseInt(
      underMatch[1].replace(/,/g, "")
    );

    filtered = filtered.filter((p) => {
      const price = Number(p.productPrice);

      return !isNaN(price) && price <= max;
    });
  }

  const aboveMatch = text.match(
    /above\s*₹?\s*(\d[\d,]*)/
  );

  if (aboveMatch) {
    const min = parseInt(
      aboveMatch[1].replace(/,/g, "")
    );

    filtered = filtered.filter((p) => {
      const price = Number(p.productPrice);

      return !isNaN(price) && price >= min;
    });
  }

  if (
    /my budget|within budget|affordable|cheapest|cheap/.test(text) &&
    !underMatch &&
    !rangeMatch &&
    !aboveMatch
  ) {
    filtered = filtered.sort(
      (a, b) => Number(a.productPrice) - Number(b.productPrice)
    );
  }

  filtered = filtered.filter(
    (p, index, self) =>
      index ===
      self.findIndex(
        (item) =>
          item.productName === p.productName &&
          item.productPrice === p.productPrice
      )
  );

  return filtered.slice(0, 6);
};