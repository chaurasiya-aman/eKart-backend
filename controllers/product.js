import { Product } from "../models/product.js";
import { uploadToCloudinary } from "../utils/UploadImage.js";

export const addProduct = async (req, res) => {
  try {
    const { productName, productDescription, productPrice, category, brand } =
      req.body;
    const userId = req.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (
      !productName?.trim() ||
      !productDescription?.trim() ||
      !productPrice?.trim() ||
      !category?.trim() ||
      !brand?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const priceNumber = Number(productPrice);
    if (isNaN(priceNumber) || priceNumber <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product price" });
    }

    // upload multiple images of product;
    const images = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer);
        images.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "At least one product image is required",
      });
    }

    const product = await Product.create({
      userId,
      productName,
      productDescription,
      productPrice: Number(productPrice),
      category,
      brand,
      productImage: images,
    });

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllProduct = async (_, res) => {
  try {
    const products = await Product.find({});

    if (!products) {
      return res.status(404).json({
        success: false,
        message: "No product available",
        products: [],
      });
    }

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
