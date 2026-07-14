import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/user.model.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({}).lean();
    console.log("=== USERS IN DATABASE ===");
    console.log(JSON.stringify(users, null, 2));
    console.log("=========================");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
  }
};

run();
