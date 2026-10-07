import jwt from "jsonwebtoken";
import { User } from "../models/user.js";
import bcrypt from "bcryptjs";
import { verifyEmail } from "../emailVerification/verifyEmail.js";
import { Session } from "../models/sessionSchema.js";
import { sendOTPMail } from "../emailVerification/sendOtpMail.js";
import { uploadToCloudinary } from "../utils/UploadImage.js";
import cloudinary from "../utils/cloudinary.js";
import { randomInt } from "node:crypto";

const toSafeUser = (user) => {
  const safeUser = user.toObject ? user.toObject() : { ...user };
  for (const field of ["password", "otp", "otpExpiry", "otpRequestedAt", "otpAttempts", "otpVerifiedExpiry", "token"]) {
    delete safeUser[field];
  }
  return safeUser;
};

const PASSWORD_RESET_OTP_TTL_MS = 5 * 60 * 1000;
const PASSWORD_RESET_VERIFICATION_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export const register = async (req, res) => {
  try {
    const { firstName, lastName, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email ||
      !password?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.SECRET_KEY, {
      expiresIn: "10m",
    });

    newUser.token = token;
    await newUser.save();

    res.status(200).json({
      success: true,
      message: "User registered successfully",
    });

    verifyEmail(token, newUser).catch((err) => {
      console.error("Verify Email Error:", err);
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const verify = async (req, res) => {
  try {
    const { token } = req.params;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message:
          e.name === "TokenExpiredError"
            ? "Registration token has expired"
            : "Token verification failed",
      });
    }

    const user = await User.findOne({ _id: decoded.id, token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or already used verification token",
      });
    }

    user.isVerified = true;
    user.token = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verification successful",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const reVerify = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "10m",
    });

    user.token = token;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Verification email sent again",
    });

    verifyEmail(token, user).catch((err) => {
      console.error("ReVerify Email Error:", err);
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !password?.trim()) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account is registered with this email. Please sign up first.",
      });
    }

    const isPassValid = await bcrypt.compare(password, user.password);
    if (!isPassValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Please try again.",
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your account first",
      });
    }

    const accessTokenExpirySeconds = 10 * 24 * 60 * 60;
    const refreshTokenExpirySeconds = 20 * 24 * 60 * 60;

    await Session.deleteMany({ userId: user._id });
    const session = await Session.create({ userId: user._id });

    const accessToken = jwt.sign({ id: user._id, sid: session._id }, process.env.SECRET_KEY, {
      expiresIn: accessTokenExpirySeconds,
    });

    const refreshToken = jwt.sign({ id: user._id, sid: session._id }, process.env.SECRET_KEY, {
      expiresIn: refreshTokenExpirySeconds,
    });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: accessTokenExpirySeconds * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: refreshTokenExpirySeconds * 1000,
    });

    return res.status(200).json({
      success: true,
      message: `Welcome back ${user.firstName}`,
      user: toSafeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    if (req.user?._id) {
      await Session.deleteMany({ userId: req.user._id });
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (user) {
      const now = Date.now();
      if (user.otpRequestedAt && now - user.otpRequestedAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
        return res.status(200).json({
          success: true,
          message: "If the account exists, a reset code will be sent",
        });
      }

      const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
      user.otp = await bcrypt.hash(otp, 10);
      user.otpExpiry = new Date(now + PASSWORD_RESET_OTP_TTL_MS);
      user.otpRequestedAt = new Date(now);
      user.otpAttempts = 0;
      user.isOtpVerified = false;
      user.otpVerifiedExpiry = null;
      await user.save();

      sendOTPMail(user, otp).catch((err) => {
        console.error("OTP Mail Error:", err.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: "If the account exists, a reset code will be sent",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.params.email?.trim().toLowerCase();

    if (!/^\d{6}$/.test(otp || "") || !email) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP request",
      });
    }

    if (user.otpExpiry < new Date()) {
      user.otp = null;
      user.otpExpiry = null;
      user.otpAttempts = 0;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many invalid attempts. Request a new code.",
      });
    }

    if (!(await bcrypt.compare(otp, user.otp))) {
      user.otpAttempts += 1;
      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        user.otp = null;
        user.otpExpiry = null;
      }
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    user.isOtpVerified = true;
    user.otpVerifiedExpiry = new Date(Date.now() + PASSWORD_RESET_VERIFICATION_TTL_MS);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const email = req.params.email?.trim().toLowerCase();

    if (!newPassword?.trim() || !confirmPassword?.trim()) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const trimmedPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (trimmedPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset request",
      });
    }

    if (
      !user.isOtpVerified ||
      !user.otpVerifiedExpiry ||
      user.otpVerifiedExpiry < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please verify OTP first",
      });
    }

    user.password = await bcrypt.hash(trimmedPassword, 10);

    user.isOtpVerified = false;
    user.otpVerifiedExpiry = null;

    await user.save();
    await Session.deleteMany({ userId: user._id });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied, admins only",
      });
    }

    const users = await User.find({})
      .select("-password -otp -otpExpiry -otpRequestedAt -otpAttempts -otpVerifiedExpiry -token -isOtpVerified")
      .lean();
    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user._id.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have access to view this profile",
      });
    }

    const user = await User.findById(userId).select(
      "-otp -password -otpExpiry -otpRequestedAt -otpAttempts -otpVerifiedExpiry -token -isOtpVerified",
    );
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUserDetails = async (req, res) => {
  try {
    const userId = req.params.id;
    const currUser = req.user;

    const { firstName, lastName, about, phoneNo, address, city, zipCode } =
      req.body;

    const existingUser = await User.findOne({ _id: userId }).select(
      "-password -token -otp -otpExpiry -otpRequestedAt -otpAttempts -otpVerifiedExpiry -isOtpVerified",
    );

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!req.cookies.accessToken) {
      return res.status(400).json({
        success: false,
        message: "You must be logged in first",
      });
    }

    if (currUser._id.toString() !== userId && currUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have access to update the profile",
      });
    }

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !phoneNo?.trim() ||
      !address?.trim() ||
      !zipCode?.trim() ||
      !city?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill the required fields",
      });
    }

    existingUser.firstName = firstName || existingUser.firstName;
    existingUser.lastName = lastName || existingUser.lastName;
    existingUser.zipCode = zipCode;
    existingUser.phoneNo = phoneNo;
    existingUser.address = address;
    existingUser.city = city;
    if (about !== undefined) existingUser.about = about;

    await existingUser.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: existingUser,
    });
  } catch (error) {
    console.error("Profile update error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateProfilePic = async (req, res) => {
  try {
    const userId = req.params.id;
    const loggedInUser = req.user;

    if (!req.cookies.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Please log in to update profile photo",
      });
    }

    if (
      loggedInUser._id.toString() !== userId &&
      loggedInUser.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to update the profile",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    const cloudinaryResult = await uploadToCloudinary(
      req.file.buffer,
      "profile_pics",
    );

    const previousProfilePicPublicId = user.profilePicPublicId;
    user.profilePic = cloudinaryResult.secure_url;
    user.profilePicPublicId = cloudinaryResult.public_id;

    await user.save();

    if (previousProfilePicPublicId) {
      await cloudinary.uploader.destroy(previousProfilePicPublicId).catch((error) => {
        console.error("Previous profile image cleanup failed:", error.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      profilePic: user.profilePic,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteProfilePic = async (req, res) => {
  try {
    const userId = req.params.id;
    const loggedInUser = req.user;

    if (!req.cookies.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Please log in to update profile photo",
      });
    }

    if (
      loggedInUser._id.toString() !== userId &&
      loggedInUser.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to update the profile",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.profilePicPublicId === "") {
      return res.status(200).json({
        success: true,
        message: "Image is not uploaded or already deleted",
        profilePicPublicId: "",
        profilePic: "",
      });
    }

    if (user.profilePicPublicId) {
      await cloudinary.uploader.destroy(user.profilePicPublicId);
    }

    user.profilePic = "";
    user.profilePicPublicId = "";

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile Photo deleted successfully",
      profilePicPublicId: "",
      profilePic: "",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
