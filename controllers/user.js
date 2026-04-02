import jwt from "jsonwebtoken";
import { User } from "../models/user.js";
import bcrypt from "bcryptjs";
import { verifyEmail } from "../emailVerification/verifyEmail.js";
import { Session } from "../models/sessionSchema.js";
import { sendOTPMail } from "../emailVerification/sendOtpMail.js";
import { uploadToCloudinary } from "../utils/UploadImage.js";
import cloudinary from "../utils/cloudinary.js";

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email?.trim() ||
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
    const { email } = req.body;

    if (!email?.trim()) {
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
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User does not exist",
      });
    }

    const isPassValid = await bcrypt.compare(password, user.password);
    if (!isPassValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your account first",
      });
    }

    const accessToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "10d",
    });

    const refreshToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "20d",
    });

    user.isLoggedIn = true;
    await user.save();

    await Session.deleteMany({ userId: user._id });
    await Session.create({ userId: user._id });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true in production (HTTPS)
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 20 * 24 * 60 * 60 * 1000, // 20 days
    });

    return res.status(200).json({
      success: true,
      message: `Welcome back ${user.firstName}`,
      user,
      accessToken,
      refreshToken,
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
    const userId = req.user._id;

    await Session.deleteMany({ userId });

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
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
    const { email } = req.body;

    if (!email?.trim()) {
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    res.status(200).json({
      success: true,
      message: "6 digit OTP has been sent",
    });

    sendOTPMail(otp, user).catch((err) => {
      console.error("OTP Mail Error:", err);
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
    const { email } = req.params;

    if (!otp?.trim() || !email?.trim()) {
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
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (otp !== user.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.otp = null;
    user.otpExpiry = null;
    user.isOtpVerified = true;

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
    const { email } = req.params;

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
        message: "User not found",
      });
    }

    if (!user.isOtpVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify OTP first",
      });
    }

    user.password = await bcrypt.hash(trimmedPassword, 10);

    user.isOtpVerified = false;

    await user.save();

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

    const users = await User.find({});
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
    const user = await User.findById({ _id: userId }).select(
      "-otp -password -otpExpiry -token -isOtpVerified",
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
      "-password -token -otp -isOtpVerified ",
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
    console.log(error);
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

    if (user.profilePicPublicId) {
      await cloudinary.uploader.destroy(user.profilePicPublicId);
    }

    const cloudinaryResult = await uploadToCloudinary(
      req.file.buffer,
      "profile_pics",
    );

    user.profilePic = cloudinaryResult.secure_url;
    user.profilePicPublicId = cloudinaryResult.public_id;

    await user.save();

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
