import express from "express";
import { Product } from "../models/product.js";
import {
  isShoppingQuery,
  filterProducts,
} from "./routeUtils/productFilter.js";
import { getAIResponse } from "./routeUtils/aiservice.js";
import { validateChatRequest } from "./routeUtils/validators.js";

const router = express.Router();

router.post(
  "/ai",
  validateChatRequest,
  async (req, res) => {
    const {
      prompt,
      conversationHistory = [],
    } = req.body;

    const trimmedPrompt = prompt.trim();

    try {
      console.log("====================================");
      console.log("1. Chat request received");
      console.log("Prompt:", trimmedPrompt);

      const fullContext = [
        ...conversationHistory.map(
          (m) => m.content
        ),
        trimmedPrompt,
      ].join(" ");

      console.log("2. Full context created");

      let filteredProducts = [];

      const shoppingQuery =
        isShoppingQuery(trimmedPrompt);

      console.log(
        "3. Is shopping query:",
        shoppingQuery
      );

      if (shoppingQuery) {
        console.log("4. Fetching products from MongoDB...");

        const allProducts =
          await Product.find().lean();

        console.log(
          "5. Products fetched:",
          allProducts.length
        );

        console.log("6. Filtering products...");

        filteredProducts = filterProducts(
          allProducts,
          trimmedPrompt
        );

        console.log(
          "7. Products after filtering:",
          filteredProducts.length
        );

        console.log(
          "Filtered products:",
          filteredProducts
        );
      }

      console.log("8. Calling AI service...");

      const aiReply = await getAIResponse(
        trimmedPrompt,
        filteredProducts,
        conversationHistory
      );

      console.log("9. AI response received");
      console.log("AI reply:", aiReply);

      console.log("10. Sending response to frontend");

      return res.json({
        success: true,
        reply: aiReply,
        products: filteredProducts,
      });

    } catch (error) {
      console.error(
        "===================================="
      );

      console.error(
        "Chat route error:",
        error
      );

      console.error(
        "Error message:",
        error.message
      );

      if (
        error.message ===
        "AI service unavailable"
      ) {
        return res.status(503).json({
          success: false,
          error:
            "Our assistant is having a moment. Please try again shortly.",
        });
      }

      return res.status(500).json({
        success: false,
        error:
          "Something went wrong on our end.",
      });
    }
  }
);

export default router;