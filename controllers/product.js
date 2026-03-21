import { Product } from "../models/product.js";
import cloudinary from "../utils/cloudinary.js";
import { uploadToCloudinary } from "../utils/UploadImage.js";

export const addProduct = async (req, res) => {
  try {
    const { productName, productDescription, productPrice, category, brand } =
      req.body;
    const userId = req.user._id;

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

    if (products.length === 0) {
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

export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.find({ _id: productId });

    if (!product) {
      return res.status(400).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.productImage && product.productImage.length > 0) {
      for (const image of product.productImage) {
        await cloudinary.uploader.destroy(image.public_id);
      }
    }

    await Product.findByIdAndDelete(productId);

    return res.status(200).json({
      success: true,
      message: "Product has been deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const { productName, productDescription, productPrice, category, brand } =
      req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.productName = productName?.trim() || product.productName;
    product.productDescription =
      productDescription?.trim() || product.productDescription;
    product.category = category?.trim() || product.category;
    product.brand = brand?.trim() || product.brand;

    if (productPrice) {
      const priceNumber = Number(productPrice);
      if (isNaN(priceNumber) || priceNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid product price, and price must be greater than 0",
        });
      }
      product.productPrice = priceNumber;
    }

    if (req.files && req.files.length > 0) {
      if (product.productImage?.length > 0) {
        await Promise.all(
          product.productImage.map((img) =>
            cloudinary.uploader.destroy(img.public_id),
          ),
        );
      }

      const uploadedImages = await Promise.all(
        req.files.map(async (file) => {
          const result = await uploadToCloudinary(file.buffer);
          return {
            url: result.secure_url,
            public_id: result.public_id,
          };
        }),
      );

      product.productImage = uploadedImages;
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get Single Product Error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};