import nodemailer from "nodemailer";
import "dotenv/config";

export const sendOTPMail = async (otp, user) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"eKart Support" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "OTP for Password Reset",
      html: `
        <p>Hello ${user.firstName},</p>

        <p>We received a request to reset your eKart account password.</p>

        <p>
          Your One-Time Password (OTP) is:
          <strong style="font-size:18px;">${otp}</strong>
        </p>

        <p>This OTP is valid for <b>10 minutes</b>.</p>

        <p>If you did not request a password reset, please ignore this email.</p>

        <p>
          Thanks,<br/>
          <b>eKart Security Team</b>
        </p>
      `,
      replyTo: process.env.MAIL_USER,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${user.email}`);
  } catch (err) {
    console.error("Error sending OTP email:", err);
    throw new Error(err.message || "Failed to send OTP email");
  }
};
