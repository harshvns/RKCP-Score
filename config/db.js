import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Connect to MongoDB
 * Reusable connection function for API server
 */
export async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://harshupadhyayupps_db_user:DA8EnWzzfHx2Fhdo@cluster0.wk2tykh.mongodb.net/';
    
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    const connectionOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoUri, connectionOptions);
    console.log('✅ MongoDB Connected');
    
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

