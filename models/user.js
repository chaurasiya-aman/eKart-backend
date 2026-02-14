import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      required: true,
    }, 

    // cloudinary image url
    profilePic: {
      type: String,
      default: "",
    },

    // cloudinary public_id for deletion of image
    profilePicPublicId: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    token: { 
      type: String,
      default: null,
    },

    isLoggedIn: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,
      default: null,
    },

    isOtpVerified: {
      type: Boolean,
      default: false,
    },

    otpExpiry: {
      type: Date,
      default: null,
    },

    address: {
      type: String,
    },

    city: {
      type: String,
    },

    zipCode: {
      type: String,
    },

    phoneNo: {
      type: String,
    },

    about: {
      type: String,
      default:"",
    }
  },
  { timestamps: true },
);

//timestamps-> MongoDb will automatically create 2 extra fields createdAt, updatedAt(2 extra fields)

export const User = mongoose.model("User", userSchema);
