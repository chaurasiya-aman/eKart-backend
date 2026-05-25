import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,

  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },

  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

transporter.verify((error) => {
  if (error) {
    console.error("SMTP Connection Failed:", error);
  } else {
    console.log("SMTP Server Ready");
  }
});

export const sendOTPMail = async (user, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `"eKart" <${process.env.BREVO_USER}>`,
      to: user.email,
      subject: "Your OTP Code",

      text: `Your OTP is ${otp}. This OTP will expire in 5 minutes.`,

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>OTP Verification</h2>

          <p>Your OTP code is:</p>

          <div style="
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #111827;
            margin: 20px 0;
          ">
            ${otp}
          </div>

          <p>This OTP will expire in 5 minutes.</p>

          <p>If you did not request this OTP, please ignore this email.</p>

          <p>Thanks,<br/>eKart Team</p>
        </div>
      `,
    });

    console.log("OTP Email Sent:", info.messageId);

    return info;
  } catch (error) {
    console.error("SMTP ERROR (OTP MAIL FULL):", error);

    throw new Error(error?.message || "Unable to send OTP email");
  }
};