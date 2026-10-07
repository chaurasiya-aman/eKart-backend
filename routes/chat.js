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
      let filteredProducts = [];

      const shoppingQuery =
        isShoppingQuery(trimmedPrompt);

      if (shoppingQuery) {
        const allProducts =
          await Product.find().lean();

        filteredProducts = filterProducts(
          allProducts,
          trimmedPrompt
        );

      }

      const aiReply = await getAIResponse(
        trimmedPrompt,
        filteredProducts,
        conversationHistory
      );

      return res.json({
        success: true,
        reply: aiReply,
        products: filteredProducts,
      });

    } catch (error) {
      console.error("Chat route error:", error.message);

      if (error.code === "AI_CONFIGURATION_ERROR") {
        return res.status(503).json({
          success: false,
          error: "AI assistant is not configured. Set GROQ_API_KEY in the backend environment.",
        });
      }

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
