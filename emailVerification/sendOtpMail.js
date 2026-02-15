import sgMail from "@sendgrid/mail";
import "dotenv/config";

sgMail.setApiKey(process.env.MAIL_PASS);

export const sendOTPMail = async (otp, user) => {
  try {
    const msg = {
      to: user.email,
      from: process.env.MAIL_FROM,
      subject: "OTP for Password Reset",
      html: `
        <p>Hello ${user.firstName},</p>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>This OTP is valid for <b>10 minutes</b>.</p>
      `,
    };

    await sgMail.send(msg);
    console.log(`OTP email sent to ${user.email}`);
  } catch (err) {
    console.error("Failed to send OTP email (ignored):", err.message || err);
    throw new Error(err.message || "Failed to send OTP email");
  }
};

