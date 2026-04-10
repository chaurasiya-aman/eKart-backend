import { Cart } from "../models/cart.js";
import { Product } from "../models/product.js";

export const getCartProducts = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId }).populate("items.productId");

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: [],
      });
    }

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "No such product exists",
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [{ productId, quantity: 1, price: product.productPrice }],
        totalPrice: product.productPrice,
      });
    } else {
      const itemIdx = cart.items.findIndex(
        (item) => item.productId.toString() === productId,
      );

      if (itemIdx > -1) {
        cart.items[itemIdx].quantity++;
      } else {
        cart.items.push({
          productId,
          quantity: 1,
          price: product.productPrice,
        });
      }

      cart.totalPrice = cart.items.reduce(
        (price, item) => price + item.price * item.quantity,
        0,
      );
    }

    await cart.save();

    await cart.populate("items.productId");

    return res.status(200).json({
      success: true,
      message: "Product Added to cart",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, type } = req.body;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const cartItem = cart.items.find(
      (item) => item.productId.toString() === productId,
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "No such item",
      });
    }

    if (type === "increase") {
      cartItem.quantity++;
    } else if (type === "decrease" && cartItem.quantity > 1) {
      cartItem.quantity--;
    }

    cart.totalPrice = cart.items.reduce(
      (price, item) => price + item.price * item.quantity,
      0,
    );

    await cart.save();

    await cart.populate("items.productId");

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: null,
      });
    }

    // remove item
    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );

    // recalculate total price
    cart.totalPrice = cart.items.reduce(
      (price, item) => price + item.price * item.quantity,
      0
    );

    await cart.save();

    await cart.populate("items.productId");

    return res.status(200).json({
      success: true,
      message: "Item removed",
      cart,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
 