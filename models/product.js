import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    productName: {
      type: String,
      required: true, 
    },
    productDescription: {
      type: String,
      required: true,
    }, 
    productImage: [{
        url: {
            type: String,
            required: true,
        },
        public_id: {
            type: String,
            required: true,
        }
    }],
    productPrice: {
        type: Number,
        required: true,
    },
    category: {
        type: String,
    },
    brand: {
        type: String,
    }
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", productSchema);
 