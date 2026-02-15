import "dotenv/config";
import sgMail from "@sendgrid/mail";

export const verifyEmail = async (token, user) => {
  try {
    const msg = {
      to: user.email,
      from: process.env.MAIL_FROM,
      subject: "Verify Your Email Address",
      html: `
        <p>Hello ${user.firstName},</p>
        <p>Please verify your email by clicking the link below:</p>
        <p>
          <a href="${process.env.CLIENT_URL}/verify/${token}">Verify Email</a>
        </p>
      `,
    };

    await sgMail.send(msg);
    console.log(`Verification email sent to ${user.email}`);
  } catch (err) {
    console.error("Failed to send verification email (ignored):", err.message || err);
    throw new Error(err.message || "Failed to send verification email");
  }
};



