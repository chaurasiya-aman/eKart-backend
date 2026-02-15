import nodemailer from "nodemailer";
import "dotenv/config";

export const sendOTPMail = async (otp, user) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtp.sendgrid.net",
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER_KEY || "apikey",
        pass: process.env.MAIL_PASS,
      },
      connectionTimeout: 10000,
    });

    const mailOptions = {
      from: process.env.MAIL_FROM || '"eKart Support" <no-reply@ekart.com>',
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
      replyTo: process.env.MAIL_FROM || "no-reply@ekart.com",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `OTP email sent to ${user.email} | Message ID: ${info.messageId}`,
    );
    return info;
  } catch (err) {
    console.error("Error sending OTP email:", err);
    throw new Error(err.message || "Failed to send OTP email");
  }
};
