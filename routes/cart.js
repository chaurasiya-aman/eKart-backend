import express from "express";
import { isAuthenticated } from "../middleware/isAuthenticate.js";
import {
  addToCart,
  getCartProducts,
  removeCartItem,
  updateCartQuantity,
} from "../controllers/cart.js";

const router = express.Router();

router.get("/", isAuthenticated, getCartProducts);
router.post("/add", isAuthenticated, addToCart);
router.put("/update-qty", isAuthenticated, updateCartQuantity);
router.delete("/:productId", isAuthenticated, removeCartItem);

export default router;
