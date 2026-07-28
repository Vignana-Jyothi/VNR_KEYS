import mongoose from 'mongoose';
import { connectDB } from '../db/connectDB.js';
import User from '../models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function setSreejaHod() {
  try {
    await connectDB();
    const result = await User.updateOne(
      { email: '25075a0525@vnrvjiet.in' },
      { $set: { role: 'hod' } }
    );
    console.log('Update result:', result);
    const updated = await User.findOne({ email: '25075a0525@vnrvjiet.in' });
    console.log('Updated user:', updated);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.connection.close();
  }
}

setSreejaHod();
