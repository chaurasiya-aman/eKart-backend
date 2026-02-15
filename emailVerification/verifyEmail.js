import nodemailer from "nodemailer";
import "dotenv/config";

export const verifyEmail = async (token, user) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER_KEY,
        pass: process.env.MAIL_PASS,
      },
      connectionTimeout: 10000,
    });

    const mailOptions = {
      from: `"eKart Support" <${process.env.MAIL_FROM}>`,
      to: user.email,
      subject: "Verify Your Email Address",
      html: `
        <p>Hello ${user.firstName},</p>

        <p>Thank you for registering with <b>eKart</b>.</p>

        <p>Please verify your email address by clicking the link below:</p>

        <p>
          <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/verify/${token}">
            Verify Email
          </a>
        </p>

        <p>This link will expire in <b>10 minutes</b>.</p>

        <p>If you did not create this account, please ignore this email.</p>

        <p>
          Thanks,<br/>
          <b>eKart Team</b>
        </p>
      `,
      replyTo: process.env.MAIL_FROM,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${user.email} | Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("Failed to send verification email (ignored):", err.message || err);
    throw new Error(err.message || "Failed to send verification email");
  }
};
