import mongoose from "mongoose";
import 'dotenv/config';

const mongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB connection is successfull");
  } catch (error) {
    console.log(
      "Error in db.js************************************************",
    );
    console.error("Database connection failed:", error.message);
    throw error;
  }
};

export { mongoDB };
