import mongoose from 'mongoose';

export async function connectDB(uri) {
  if (!uri) {
    console.warn('MONGODB_URI not provided. Skipping DB connection.');
    return;
  }
  try {
    await mongoose.connect(uri, {
      // modern Mongoose no longer needs many legacy flags
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}
