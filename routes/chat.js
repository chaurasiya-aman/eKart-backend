import express from "express";
import { Product } from "../models/product.js";
import axios from "axios";

const router = express.Router();

/* ═══════════════════════════════════════════════
   FILTER LOGIC — runs on full conversation context
═══════════════════════════════════════════════ */
const filterProducts = (products, fullText) => {
  const text = fullText.toLowerCase().trim();
  let filtered = [...products];

  console.log("🔍 FILTER INPUT:", text);
  console.log("🟡 TOTAL PRODUCTS:", filtered.length);

  /* ── CATEGORY ── */
  const wantsMobile = /mobile|phone|smartphone/.test(text);
  const wantsLaptop = /laptop|notebook|computer/.test(text);
  const wantsTab    = /tab|tablet|ipad/.test(text);

  if (wantsMobile) {
    filtered = filtered.filter((p) =>
      p.category?.toLowerCase().includes("mobile")
    );
    console.log("📱 After mobile filter:", filtered.length);
  } else if (wantsLaptop) {
    filtered = filtered.filter((p) =>
      p.category?.toLowerCase().includes("laptop")
    );
    console.log("💻 After laptop filter:", filtered.length);
  } else if (wantsTab) {
    filtered = filtered.filter((p) =>
      p.category?.toLowerCase().includes("tab")
    );
    console.log("📟 After tab filter:", filtered.length);
  }

  /* ── BRAND ── */
  const brands = [...new Set(products.map((p) => p.brand?.toLowerCase()))].filter(Boolean);
  const foundBrand = brands.find((brand) => text.includes(brand));
  if (foundBrand) {
    filtered = filtered.filter((p) =>
      p.brand?.toLowerCase().includes(foundBrand)
    );
    console.log("🏷️ After brand filter:", filtered.length);
  }

  /* ── PRICE RANGE (10000 to 20000 OR 10000-20000) ── */
  const rangeMatch = text.match(/(\d[\d,]*)\s*(to|-)\s*(\d[\d,]*)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1].replace(/,/g, ""));
    const max = parseInt(rangeMatch[3].replace(/,/g, ""));
    filtered = filtered.filter((p) => {
      const price = Number(p.productPrice);
      return !isNaN(price) && price >= min && price <= max;
    });
    console.log("💰 After range filter:", filtered.length);
  }

  /* ── UNDER PRICE ── */
  const underMatch = text.match(/under\s*₹?\s*(\d[\d,]*)/);
  if (underMatch) {
    const max = parseInt(underMatch[1].replace(/,/g, ""));
    filtered = filtered.filter((p) => {
      const price = Number(p.productPrice);
      return !isNaN(price) && price <= max;
    });
    console.log("💰 After under filter:", filtered.length);
  }

  /* ── ABOVE PRICE ── */
  const aboveMatch = text.match(/above\s*₹?\s*(\d[\d,]*)/);
  if (aboveMatch) {
    const min = parseInt(aboveMatch[1].replace(/,/g, ""));
    filtered = filtered.filter((p) => {
      const price = Number(p.productPrice);
      return !isNaN(price) && price >= min;
    });
    console.log("💰 After above filter:", filtered.length);
  }

  /* ── BUDGET keyword with no number → show cheapest 3 ── */
  if (
    /my budget|within budget|affordable|cheapest/.test(text) &&
    !underMatch &&
    !rangeMatch
  ) {
    filtered = filtered
      .sort((a, b) => Number(a.productPrice) - Number(b.productPrice))
      .slice(0, 3);
    console.log("💸 After budget sort:", filtered.length);
  }

  console.log("✅ FINAL FILTERED:", filtered.length);
  return filtered;
};

/* ═══════════════════════════════════════════════
   INTENT DETECTION
═══════════════════════════════════════════════ */
const detectIntent = (prompt = "", history = []) => {
  const allText = [...history.map((m) => m.content), prompt]
    .join(" ")
    .toLowerCase();

  if (/return|refund|exchange|broken|damage|complaint/.test(allText)) return "support";
  if (/gift|surprise|birthday|anniversary|present/.test(allText))       return "gifting";
  if (/compare|difference|vs |better|which one|which is/.test(allText)) return "comparison";
  if (/budget|cheap|affordable|under|low.?price/.test(allText))         return "budget";
  if (/confused|not sure|don.?t know|help me|suggest|recommend|best|top/.test(allText))
    return "recommendation";

  return "general";
};

/* ═══════════════════════════════════════════════
   INTENT HINTS
═══════════════════════════════════════════════ */
const getIntentHint = (intent) => {
  const hints = {
    budget: `
INTENT: Customer is budget-conscious.
→ Highlight value-for-money from the available list.
→ Use: "great value", "solid pick for the price".
→ If no budget amount mentioned, ask once: "What's your rough budget?"`,

    comparison: `
INTENT: Customer wants to compare options.
→ Compare by use-case, performance, value — not names/prices.
→ Be honest: "For heavy use, the pricier one edges ahead."
→ Give one clear winner or clear trade-off.`,

    support: `
INTENT: Customer has a support/return issue.
→ Be empathetic. Don't push products.
→ Say: "I'm sorry about that! Please reach out to our support team for help."`,

    gifting: `
INTENT: Customer is buying a gift.
→ Ask ONE question: who is it for or what's the occasion?
→ Suggest based on recipient's likely needs.
→ Tone: warm, enthusiastic.`,

    recommendation: `
INTENT: Customer wants a recommendation.
→ Give ONE confident suggestion with a short reason.
→ Use: "Honestly, I'd go with..." or "Most people in your situation love..."`,

    general: `
INTENT: General conversation or browsing.
→ Be welcoming, don't push products unless asked.
→ Let them lead — just be helpful and present.`,
  };

  return hints[intent] || hints.general;
};

/* ═══════════════════════════════════════════════
   BUILD CONVERSATION HISTORY STRING
═══════════════════════════════════════════════ */
const buildHistoryString = (messages = []) => {
  if (!messages.length) return "This is the start of the conversation.";
  return messages
    .slice(-8) // last 8 to stay within token limits
    .map((m) => `${m.role === "user" ? "Customer" : "Nova"}: ${m.content}`)
    .join("\n");
};

/* ═══════════════════════════════════════════════
   AI RESPONSE
═══════════════════════════════════════════════ */
const getAIResponse = async (prompt, products, conversationHistory = []) => {
  try {
    const intent     = detectIntent(prompt, conversationHistory);
    const intentHint = getIntentHint(intent);
    const history    = buildHistoryString(conversationHistory);

    let finalPrompt = "";

    if (products.length > 0) {
      const productContext = products
        .map((p, i) => `${i + 1}. ${p.productName} — ₹${p.productPrice} (${p.category})`)
        .join("\n");

      finalPrompt = `
You are "Nova" — a friendly, smart shopping assistant for this store.

════════════════════════════════════════
IDENTITY & STRICT RULES
════════════════════════════════════════
- You ONLY work with this store's products listed below
- NEVER mention outside brands (Samsung, Apple, OnePlus, etc.)
- Products and prices are already displayed in the UI — do NOT repeat them
- You are a human-like assistant, NOT a robotic chatbot

════════════════════════════════════════
TONE & STYLE
════════════════════════════════════════
- Warm, friendly, concise — max 2–3 sentences per reply
- Sound like a knowledgeable friend helping someone shop
- Natural phrases: "Honestly,", "You'd love this if...", "Great choice!"
- NO bullet points or numbered lists in replies
- NO robotic, stiff, or overly formal language
- Ask only ONE question at a time when needed

════════════════════════════════════════
BEHAVIOR GUIDELINES
════════════════════════════════════════
1. GREET warmly on first message — no bombardment of questions
2. LISTEN — let the customer lead the conversation
3. SUGGEST only when they ask for recommendations
4. GUIDE by use-case, value, performance — avoid repeating names/prices
5. COMPARE honestly if asked ("For heavy use, the higher-end one is better")
6. BUDGET — if not mentioned, ask once: "What's your rough budget?"
7. ADMIT if nothing fits: "We may not have exactly that right now, sorry!"
8. SUPPORT issues → direct kindly to support team, don't push products

════════════════════════════════════════
AVAILABLE PRODUCTS (shown in UI — do NOT restate names/prices)
════════════════════════════════════════
${productContext}

════════════════════════════════════════
CURRENT INTENT HINT
════════════════════════════════════════
${intentHint}

════════════════════════════════════════
CONVERSATION SO FAR
════════════════════════════════════════
${history}

════════════════════════════════════════
CUSTOMER JUST SAID
════════════════════════════════════════
Customer: ${prompt}

Nova:`;

    } else {
      finalPrompt = `
You are "Nova" — a friendly shopping assistant for this store.
No products matched the customer's request right now.
Be warm and honest. You may mention general popular brands as a fallback.
Keep it to 2–3 natural sentences.

Conversation so far:
${buildHistoryString(conversationHistory)}

Customer: ${prompt}

Nova:`;
    }

    const response = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: "meta/llama3-70b-instruct",
        messages: [
          {
            role: "system",
            content:
              "You are Nova, a friendly shopping assistant. Only use the store's product data provided. Never hallucinate brands or products not in the list.",
          },
          {
            role: "user",
            content: finalPrompt,
          },
        ],
        temperature: 0.45,
        max_tokens: 300,
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
    console.error("❌ AI Error:", error.response?.data || error.message);
    return "Oops, something went wrong on my end! Please try again.";
  }
};

/* ═══════════════════════════════════════════════
   ROUTE  POST /api/ai
═══════════════════════════════════════════════ */
router.post("/ai", async (req, res) => {
  try {
    const { prompt, conversationHistory = [] } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, error: "Prompt is required" });
    }

    /* ── Build full context for smarter filtering ── */
    const fullContext = [
      ...conversationHistory.map((m) => m.content),
      prompt,
    ].join(" ");

    const allProducts      = await Product.find();
    console.log("🟢 DB PRODUCTS:", allProducts.length);

    const filteredProducts = filterProducts(allProducts, fullContext);

    /* ── No match — friendly reply, zero hallucination ── */
    if (filteredProducts.length === 0) {
      return res.json({
        success : true,
        reply   : "Hmm, I couldn't find anything matching that in our store right now. Could you share your budget or tell me more about what you need?",
        products: [],
      });
    }

    const aiReply = await getAIResponse(prompt, filteredProducts, conversationHistory);

    return res.json({
      success : true,
      reply   : aiReply,
      products: filteredProducts,
    });

  } catch (error) {
    console.error("❌ Server Error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;