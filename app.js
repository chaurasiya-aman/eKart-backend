import express from "express";
import "dotenv/config";
import { mongoDB } from "./database/db.js";
import userRoute from "./routes/user.js";
import productRoute from "./routes/product.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);

const startServer = async () => {
  await mongoDB();

  app.listen(PORT, () => {
    console.log(`Server listening at port ${PORT}`);
  });
};

startServer();
