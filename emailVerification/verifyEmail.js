import sgMail from "@sendgrid/mail";
import "dotenv/config";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const verifyEmail = async (token, user) => {
  try {
    const msg = {
      to: user.email,
      from: process.env.EMAIL_FROM, // e.g., "no-reply@ekart.com"
      subject: "Verify Your Email Address",
      html: `
        <p>Hello ${user.firstName},</p>

        <p>Thank you for registering with <b>eKart</b>.</p>

        <p>
          Please verify your email address by clicking the link below:
        </p>

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
    };

    // Send email asynchronously
    sgMail.send(msg)
      .then(() => console.log(`Verification email sent to ${user.email}`))
      .catch((err) => console.error("Error sending verification email:", err));

  } catch (error) {
    console.error("Unexpected error in verifyEmail:", error);
  }
};
