import sendMail from "../config/mailer.js";

export const sendOTPMail = async (user, otp) => {
  try {
    const info = await sendMail({
      to: user.email,
      subject: "Your OTP Code",
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

    console.log("OTP Email Sent:", info.id);
    return info;
  } catch (error) {
    console.error("OTP Mail Error:", error.message);
    throw new Error(error?.message || "Unable to send OTP email");
  }
};