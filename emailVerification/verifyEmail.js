import sgMail from "@sendgrid/mail";
import "dotenv/config";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const verifyEmail = async (token, user) => {
  try {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const msg = {
      to: user.email,
      from: "ekartsupports@gmail.com",
      subject: "Verify Your Email Address",
      text: `Hello ${user.firstName},

Thank you for registering with eKart.
Please verify your email address by visiting the following link:
${clientUrl}/verify/${token}

This link will expire in 10 minutes.
If you did not create this account, please ignore this email.

Thanks,
eKart Team`,
      html: `<p>Hello ${user.firstName},</p>
<p>Thank you for registering with eKart.</p>
<p>Please verify your email address by clicking the button below:</p>
<p>
  <a href="${clientUrl}/verify/${token}" style="
    display: inline-block;
    padding: 10px 20px;
    background-color: #1a1a1a;
    color: #fff;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    text-align: center;
  ">Verify Email</a>
</p>
<p>This link will expire in 10 minutes.<br/>
If you did not create this account, please ignore this email.</p>
<p>Thanks,<br/>eKart Team</p>`,
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