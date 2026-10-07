import express from "express";
import { createDemoOrder, getAdminOrders, getMyOrders, updateOrderStatus } from "../controllers/order.js";
import { isAdmin, isAuthenticated } from "../middleware/isAuthenticate.js";

const router = express.Router();

router.post("/demo", isAuthenticated, createDemoOrder);
router.get("/mine", isAuthenticated, getMyOrders);
router.get("/admin", isAuthenticated, isAdmin, getAdminOrders);
router.patch("/admin/:orderId/status", isAuthenticated, isAdmin, updateOrderStatus);

export default router;
