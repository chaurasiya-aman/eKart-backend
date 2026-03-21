import express from "express";
import { addProduct, deleteProduct, getAllProduct, getSingleProduct, updateProduct } from "../controllers/product.js";
import { isAdmin, isAuthenticated } from "../middleware/isAuthenticate.js";
import { multiUpload } from "../middleware/multer.js";

const router = express.Router();

router.post("/add", isAuthenticated, isAdmin, multiUpload, addProduct);
router.get("/all-products", getAllProduct);
router.delete("/delete/:productId", isAuthenticated, isAdmin, deleteProduct);
router.put("/edit/:productId", isAuthenticated, isAdmin, multiUpload, updateProduct);
router.get("/:id", getSingleProduct);

export default router;
