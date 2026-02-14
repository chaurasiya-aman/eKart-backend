import nodemailer from "nodemailer";
import "dotenv/config";

/**
 * User registers
        ↓
   Token generated (jwt.sign)
        ↓
   verifyEmail(token, email) → EMAIL SENT
        ↓
   User clicks link
        ↓
   /api/users/verify/:token
        ↓
   verify controller runs
        ↓
   User verified in DB
 */

export const verifyEmail = async (token, user) => {
  try {
    
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const mailConfiguration = {
      from: `"eKart Support" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "Verify Your Email Address",
      text: `Hello ${user.firstName},

      Thank you for registering with eKart.
      Please verify your email address by clicking the link below:
      ${process.env.CLIENT_URL || "http://localhost:5173"}/verify/${token}
      This link will expire in 10 minutes.
      If you did not create this account, please ignore this email.

      Thanks,
      eKart Team`,
    };

    const info = await transporter.sendMail(mailConfiguration);
    console.log("Email sent successfully");
    console.log(info);
  } catch (error) {
    console.log("Error occurred in verifyEmail.js");
    console.log(error);
  }
};
