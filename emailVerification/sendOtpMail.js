import sgMail from "@sendgrid/mail";
import "dotenv/config";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendOTPMail = async (otp, user) => {
  try {
    const msg = {
      to: user.email,
      from: "amanchaurasiya2207@gmail.com",
      subject: "OTP for Password Reset",
      html: `
        <p>Hello ${user.firstName},</p>
        <p>We received a request to reset your eKart account password.</p>
        <p>Your One-Time Password (OTP) is:
           <strong style="font-size:18px;">${otp}</strong></p>
        <p>This OTP is valid for <b>10 minutes</b>.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <p>Thanks,<br/><b>eKart Security Team</b></p>
      `,
    };

    await sgMail.send(msg);
    console.log(`OTP email sent to ${user.email}`);
  } catch (error) {
    console.error("SendGrid OTP Error:", error.response?.body || error.message);
    throw new Error("Unable to send OTP email at the moment.");
  }
};
