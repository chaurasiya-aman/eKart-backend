import { randomBytes } from "node:crypto";
import { Cart } from "../models/cart.js";
import { Order } from "../models/order.js";

const DEMO_PAYMENT_METHODS = new Set([
  "UPI",
  "Credit or debit card",
  "Net banking",
  "Cash on delivery",
]);

export const createDemoOrder = async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    if (!DEMO_PAYMENT_METHODS.has(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid demo payment method",
      });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate("items.productId");
    const items = (cart?.items || []).filter((item) => item?.productId);

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    const orderItems = items.map((item) => {
      const product = item.productId;
      const unitPrice = Number(item.price ?? product.productPrice);
      const quantity = Number(item.quantity);
      return {
        productId: product._id,
        productName: product.productName,
        productImage: product.productImage?.[0]?.url || "",
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
      };
    });
    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = Math.round(subtotal * 0.18);

    const order = await Order.create({
      user: req.user._id,
      orderNumber: `DEMO-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`,
      items: orderItems,
      shippingAddress: {
        name: [req.user.firstName, req.user.lastName].filter(Boolean).join(" "),
        email: req.user.email,
        phoneNo: req.user.phoneNo || "",
        address: req.user.address || "",
        city: req.user.city || "",
        zipCode: req.user.zipCode || "",
      },
      subtotal,
      tax,
      total: subtotal + tax,
      paymentMethod,
      paymentStatus: "simulated",
      status: "placed",
    });

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    return res.status(201).json({
      success: true,
      message: "Demo order placed",
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not place the demo order",
    });
  }
};

export const getAdminOrders = async (_req, res) => {
  try {
    const orders = await Order.find({})
      .populate("user", "firstName lastName email phoneNo")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load orders",
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const allowedStatuses = ["placed", "processing", "shipped", "delivered", "cancelled"];
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid order status",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { $set: { status } },
      { new: true, runValidators: true },
    ).populate("user", "firstName lastName email phoneNo");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated",
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not update order status",
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load your orders",
    });
  }
};
