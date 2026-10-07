import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          default: null,
        },
        productName: { type: String, required: true },
        productImage: { type: String, default: "" },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        lineTotal: { type: Number, required: true, min: 0 },
      },
    ],
    shippingAddress: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phoneNo: { type: String, default: "" },
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      zipCode: { type: String, default: "" },
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Credit or debit card", "Net banking", "Cash on delivery"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["simulated"],
      default: "simulated",
    },
    status: {
      type: String,
      enum: ["placed", "processing", "shipped", "delivered", "cancelled"],
      default: "placed",
      index: true,
    },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);
