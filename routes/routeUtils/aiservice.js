import axios from "axios";
import { AI_CONFIG } from "./constants.js";

const buildHistoryString = (messages = []) => {
  if (!messages.length) return "";
  return messages
    .slice(-AI_CONFIG.history_limit)
    .map((m) => `${m.role === "user" ? "Customer" : "Nova"}: ${m.content}`)
    .join("\n");
};

const buildProductContext = (products = []) => {
  if (!products.length) return "NO PRODUCTS MATCHED — be honest and helpful anyway.";
  const list = products
    .map(
      (p, i) =>
        `${i + 1}. ${p.productName} — ₹${p.productPrice} (${p.category}, ${p.brand})`
    )
    .join("\n");
  return `PRODUCTS AVAILABLE FOR THIS QUERY:\n${list}`;
};

const buildUserPrompt = (prompt, products, history) => {
  return `
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

${buildProductContext(products)}

${history ? `CONVERSATION SO FAR:\n${history}\n` : ""}
Customer: ${prompt}
Nova:`.trim();
};

export const getAIResponse = async (
  prompt,
  products = [],
  conversationHistory = []
) => {
  const history = buildHistoryString(conversationHistory);
  const userPrompt = buildUserPrompt(prompt, products, history);

  try {
    const response = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: AI_CONFIG.model,
        messages: [
          {
            role: "system",
            content:
              "You are Nova, a friendly and natural-sounding store assistant. Never repeat product names or prices unless needed. Keep replies under 3 sentences. Sound human, not robotic.",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.max_tokens,
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
    console.error("AI API Error:", error.response?.data || error.message);
    throw new Error("AI service unavailable");
  }
};