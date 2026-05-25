import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const verifyEmail = async (token, user) => {
  try {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const info = await transporter.sendMail({
      from: `"eKart" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Verify Your Email Address",

      text: `Hello ${user.firstName},

Thank you for registering with eKart.

Please verify your email address by visiting:
${clientUrl}/verify/${token}

This link will expire in 10 minutes.

Thanks,
eKart Team`,

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hello ${user.firstName},</h2>

          <p>Thank you for registering with eKart.</p>

          <p>Please verify your email address by clicking the button below:</p>

          <a 
            href="${clientUrl}/verify/${token}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background-color: #111827;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
            "
          >
            Verify Email
          </a>

          <p style="margin-top: 20px;">
            This link will expire in 10 minutes.
          </p>

          <p>
            If you did not create this account, please ignore this email.
          </p>

          <p>
            Thanks,<br/>
            eKart Team
          </p>
        </div>
      `,
    });

    console.log("Verification Email Sent:", info.messageId);

    return info;
  } catch (error) {
    console.log("SMTP Error:", error);
    throw new Error("Unable to send verification email");
  }
};