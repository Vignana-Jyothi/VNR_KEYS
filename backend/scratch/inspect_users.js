import mongoose from 'mongoose';
import { connectDB } from '../db/connectDB.js';
import User from '../models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function inspectUsers() {
  try {
    await connectDB();
    console.log('--- ALL USERS ---');
    const users = await User.find({});
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.connection.close();
  }
}

inspectUsers();
