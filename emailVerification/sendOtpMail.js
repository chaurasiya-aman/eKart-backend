import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTPMail = async (user, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `"eKart" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your OTP Code",

      text: `Your OTP is ${otp}. This OTP will expire in 5 minutes.`,

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Email Verification</h2>

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

          <p>
            This OTP will expire in 5 minutes.
          </p>

          <p>
            If you did not request this OTP, please ignore this email.
          </p>

          <p>
            Thanks,<br/>
            eKart Team
          </p>
        </div>
      `,
    });

    console.log("OTP Email Sent:", info.messageId);

    return info;
  } catch (error) {
    console.log("SMTP Error:", error);
    throw new Error("Unable to send OTP email");
  }
};