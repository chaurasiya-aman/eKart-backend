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
      const fullContext = [
        ...conversationHistory.map(
          (m) => m.content
        ),
        trimmedPrompt,
      ].join(" ");

      let filteredProducts = [];

      if (isShoppingQuery(trimmedPrompt)) {
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
      console.error(
        "Chat route error:",
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