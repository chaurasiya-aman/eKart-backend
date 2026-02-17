import sgMail from "@sendgrid/mail";
import "dotenv/config";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const verifyEmail = async (token, user) => {
  try {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const msg = {
      to: user.email,
      from: "amanchaurasiya2207@gmail.com",
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

          const response = await sgMail.send(msg);
          console.log(`Verification email sent to ${user.email}`);
          return response;
        } catch (error) {
          console.error(
            "SendGrid Verification Error:",
            error.response?.body || error.message,
          );
          throw new Error(error);
        }
      };
