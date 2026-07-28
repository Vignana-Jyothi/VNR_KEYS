import mongoose from 'mongoose';
import { connectDB } from '../db/connectDB.js';
import User from '../models/user.model.js';
import Key from '../models/key.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function inspectKeys() {
  try {
    await connectDB();
    console.log('--- ALL UNRETURNED KEYS ---');
    const unreturned = await Key.find({
      status: 'unavailable',
      'takenBy.userId': { $ne: null }
    }).populate('takenBy.userId');
    console.log(JSON.stringify(unreturned, null, 2));

    console.log('--- KEYS GROUPED BY STATUS ---');
    const keys = await Key.find({});
    const summary = {};
    keys.forEach(k => {
      const key = `${k.status} (dept: ${k.department})`;
      summary[key] = (summary[key] || 0) + 1;
    });
    console.log(summary);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.connection.close();
  }
}

inspectKeys();
