import express from "express";
import "dotenv/config";
import cors from "cors";
import { mongoDB } from "./database/db.js";
import userRoute from "./routes/user.js";
import productRoute from "./routes/product.js";
import chatRoute from "./routes/chat.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// Routes
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
 
const startServer = async () => {
  try {
    await mongoDB();
    app.listen(PORT, () => {
      console.log(`Server listening at port ${PORT}`);
    });
  } catch (err) {
    console.error("Server failed to start:", err);
  }
};

startServer();