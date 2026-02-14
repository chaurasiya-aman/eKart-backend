import express from "express";
import { addProduct, getAllProduct } from "../controllers/product.js";
import { isAdmin, isAuthenticated } from "../middleware/isAuthenticate.js";
import { multiUpload } from "../middleware/multer.js";

const router = express.Router();

router.post("/add", isAuthenticated, isAdmin, multiUpload, addProduct);
router.get("/all-products", getAllProduct);

export default router;
