import express from "express";
import { isAdmin, isAuthenticated } from "../middleware/isAuthenticate.js";
import {
  changePassword,
  deleteProfilePic,
  forgotPassword,
  getAllUser,
  getUserById,
  login,
  logout,
  register,
  reVerify,
  updateProfilePic,
  updateUserDetails,
  verify,
  verifyOTP,
} from "../controllers/user.js";
import { singleUpload } from "../middleware/multer.js";

const router = express.Router();

router.post("/register", register);

router.post("/verify/:token", verify);

router.post("/reVerify", reVerify);
router.post("/login", login);
router.post("/logout", isAuthenticated, logout);

// Forgot password
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp/:email", verifyOTP);

// change password in case of forgot password
router.put("/change-password/:email", changePassword);
 
// // change password for logged-in user
// router.post("/change-password", isAuthenticated, changePassword);

router.get("/get-all", isAuthenticated, isAdmin, getAllUser);
router.get("/get-user/:userId", getUserById);

// update profile route
router.put("/profile/:id", isAuthenticated, updateUserDetails);
router.put("/profile/:id/update-profile", isAuthenticated, singleUpload ,updateProfilePic);

router.delete("/profile/:id/delete-profile-pic", isAuthenticated, deleteProfilePic);

export default router;
