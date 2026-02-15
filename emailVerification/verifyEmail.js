import nodemailer from "nodemailer";
import "dotenv/config";

export const verifyEmail = async (token, user) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,       
        pass: process.env.MAIL_PASSWORD,   
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000, 
    });

    const mailOptions = {
      from: `"eKart Support" <${process.env.MAIL_USER}>`,
      to: user.email,
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
      replyTo: process.env.MAIL_USER, 
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${user.email}`);
  } catch (err) {
    console.error("Error sending verification email:", err);
    throw new Error(err.message || "Failed to send verification email");
  }
};
