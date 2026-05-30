import nodemailer from "nodemailer";
import { google } from "googleapis";
import "dotenv/config";

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
  console.log("ENV CHECK:", {
    user: process.env.EMAIL_USER,
    clientId: process.env.GMAIL_CLIENT_ID ? "✅ loaded" : "❌ missing",
    clientSecret: process.env.GMAIL_CLIENT_SECRET ? "✅ loaded" : "❌ missing",
    refreshToken: process.env.GMAIL_REFRESH_TOKEN ? "✅ loaded" : "❌ missing",
  });

  const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  try {
    const accessToken = await oauth2Client.getAccessToken();
    console.log("Access Token:", accessToken.token ? "✅ generated" : "❌ failed");

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });
  } catch (err) {
    console.error("OAuth2 Error:", err.message);
    throw new Error("Failed to create email transporter: " + err.message);
  }
};

export default createTransporter;