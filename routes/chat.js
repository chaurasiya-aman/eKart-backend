import express from "express";
import { Product } from "../models/product.js";
import axios from "axios";

const router = express.Router();

const isShoppingQuery = (text) => {
  return /mobile|phone|smartphone|laptop|notebook|tablet|ipad|buy|show|find|suggest|recommend|budget|price|under|above|cheap|brand|compare|vs|which/i.test(text);
};

const filterProducts = (products, fullText) => {
  const text = fullText.toLowerCase().trim();
  let filtered = [...products];

  const wantsMobile = /mobile|phone|smartphone/.test(text);
  const wantsLaptop = /laptop|notebook|computer/.test(text);
  const wantsTab = /tab|tablet|ipad|tablets/.test(text);

  if (wantsMobile) {
    filtered = filtered.filter((p) => p.category?.toLowerCase().includes("mobile"));
  } else if (wantsLaptop) {
    filtered = filtered.filter((p) => p.category?.toLowerCase().includes("laptop"));
  } else if (wantsTab) {
    filtered = filtered.filter((p) => p.category?.toLowerCase().includes("tab"));
  }

  const brands = [...new Set(products.map((p) => p.brand?.toLowerCase()))].filter(Boolean);
  const foundBrand = brands.find((brand) => text.includes(brand));
  if (foundBrand) {
    filtered = filtered.filter((p) => p.brand?.toLowerCase().includes(foundBrand));
  }

  const rangeMatch = text.match(/(\d[\d,]*)\s*(to|-)\s*(\d[\d,]*)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1].replace(/,/g, ""));
    const max = parseInt(rangeMatch[3].replace(/,/g, ""));
    filtered = filtered.filter((p) => {
      const price = Number(p.productPrice);
      return !isNaN(price) && price >= min && price <= max;
    });
  }

  const underMatch = text.match(/under\s*₹?\s*(\d[\d,]*)/);
  if (underMatch) {
    const max = parseInt(underMatch[1].replace(/,/g, ""));
    filtered = filtered.filter((p) => {
      const price = Number(p.productPrice);
      return !isNaN(price) && price <= max;
    });
  }

  const aboveMatch = text.match(/above\s*₹?\s*(\d[\d,]*)/);
  if (aboveMatch) {
    const min = parseInt(aboveMatch[1].replace(/,/g, ""));
    filtered = filtered.filter((p) => {
      const price = Number(p.productPrice);
      return !isNaN(price) && price >= min;
    });
  }

  if (/my budget|within budget|affordable|cheapest/.test(text) && !underMatch && !rangeMatch) {
    filtered = filtered
      .sort((a, b) => Number(a.productPrice) - Number(b.productPrice))
      .slice(0, 3);
  }

  return filtered;
};

const buildHistoryString = (messages = []) => {
  if (!messages.length) return "";
  return messages
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Customer" : "Nova"}: ${m.content}`)
    .join("\n");
};

const getAIResponse = async (prompt, products, conversationHistory = []) => {
  try {
    const history = buildHistoryString(conversationHistory);
    const isFirstMessage = conversationHistory.length === 0;

    let productContext = "";
    if (products.length > 0) {
      productContext = products
        .map((p, i) => `${i + 1}. ${p.productName} — ₹${p.productPrice} (${p.category}, ${p.brand})`)
        .join("\n");
    }

    const finalPrompt = `
You are Nova, a sales assistant at a tech store. Think of yourself as a real, helpful store employee — not a chatbot. You're friendly, knowledgeable, and genuinely interested in helping the customer find what's right for them.

HOW YOU BEHAVE:
- Talk like a real person, naturally and warmly. No bullet points. No lists. No robotic structure.
- Keep replies short — 2 to 3 sentences max, unless the customer asks something detailed.
- On the first message, greet them casually and ask how you can help. Don't overwhelm them.
- When they ask for a product, tell them what's available in a natural way — "We've got a few good options for you" — and guide them by use-case, not just specs.
- If they seem confused, ask ONE simple question to understand what they need.
- If they want a recommendation, give ONE confident pick with a short reason. Don't give them a list to choose from.
- If they're comparing, be honest and clear — "For gaming, the pricier one is worth it. For everyday use, the cheaper one is totally fine."
- If they have a complaint or return request, be empathetic: "Oh no, I'm sorry to hear that! Let me connect you with our support team."
- If we don't have what they're looking for, be honest: "Honestly, we don't have that exact thing right now — but here's what's close..."
- Never mention brand names like Apple, Samsung, OnePlus unless they're actually in our product list.
- The product cards are already shown in the UI — don't repeat the names or prices in your reply unless it really adds value.
- Never sound like you're reading from a script. Sound like yourself.

${productContext ? `PRODUCTS AVAILABLE FOR THIS QUERY:\n${productContext}\n` : "NO PRODUCTS MATCHED — be honest and helpful anyway."}

${history ? `CONVERSATION SO FAR:\n${history}\n` : ""}
Customer: ${prompt}
Nova:`;

    const response = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: "meta/llama3-70b-instruct",
        messages: [
          {
            role: "system",
            content: "You are Nova, a friendly and natural-sounding store assistant. Never repeat product names or prices unless needed. Keep replies under 3 sentences. Sound human, not robotic.",
          },
          {
            role: "user",
            content: finalPrompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 250,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("AI Error:", error.response?.data || error.message);
    return "Sorry, I ran into a small issue! Give me a second and try again.";
  }
};

router.post("/ai", async (req, res) => {
  try {
    const { prompt, conversationHistory = [] } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, error: "Prompt is required" });
    }

    const shouldFilter = isShoppingQuery(prompt);

    let filteredProducts = [];

    if (shouldFilter) {
      const fullContext = [...conversationHistory.map((m) => m.content), prompt].join(" ");
      const allProducts = await Product.find();
      filteredProducts = filterProducts(allProducts, fullContext);
    }

    const aiReply = await getAIResponse(prompt, filteredProducts, conversationHistory);

    return res.json({
      success: true,
      reply: aiReply,
      products: filteredProducts,
    });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;