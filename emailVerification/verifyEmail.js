import nodemailer from "nodemailer";
import "dotenv/config";

export const verifyEmail = async (token, user) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const mailOptions = {
      from: `"eKart Support" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "Verify Your Email Address",
      text: `Hello ${user.firstName},

      Thank you for registering with eKart.
      Please verify your email address by clicking the link below:
      ${clientUrl}/verify/${token}

      This link will expire in 10 minutes.
      If you did not create this account, please ignore this email.

      Thanks,
      eKart Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${user.email}`);
    return info;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("Unable to send verification email at the moment.");
  }
};
