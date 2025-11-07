import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import StockRow from './models/StockRow.js';

// Load environment variables
dotenv.config();

/**
 * Main function to import XLSX data into MongoDB
 */
async function importXlsxToMongoDB() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://harshupadhyayupps_db_user:DA8EnWzzfHx2Fhdo@cluster0.wk2tykh.mongodb.net/';
    
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    // Connection options for better reliability
    const connectionOptions = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, connectionOptions);
    console.log('MongoDB Connected');

    // Read XLSX file
    const workbook = XLSX.readFile('./RKCP2.xlsx');
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert sheet to JSON (array of objects)
    // Each row becomes an object with column headers as keys
    const rows = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`${rows.length} rows found`);

    if (rows.length === 0) {
      console.log('No data to import. Exiting...');
      await mongoose.disconnect();
      return;
    }

    // Insert all rows into MongoDB
    const result = await StockRow.insertMany(rows);
    
    console.log(`${result.length} records inserted successfully`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');

  } catch (error) {
    console.error('\n❌ Error importing XLSX to MongoDB:');
    
    // Provide helpful error messages
    if (error.name === 'MongooseServerSelectionError') {
      console.error('\n📌 Connection Error Details:');
      console.error('   - Could not connect to MongoDB Atlas cluster');
      console.error('   - Common causes:');
      console.error('     1. IP address not whitelisted in Atlas');
      console.error('     2. Network/firewall blocking connection');
      console.error('     3. Incorrect connection string');
      console.error('\n💡 Solution:');
      console.error('   - Go to MongoDB Atlas → Network Access');
      console.error('   - Add your current IP address (or 0.0.0.0/0 for all IPs)');
      console.error('   - Wait 1-2 minutes for changes to propagate');
    } else if (error.code === 'ENOENT') {
      console.error(`\n📌 File Error: XLSX file not found`);
      console.error('   - Make sure RKCP2.xlsx exists in the current directory');
    } else {
      console.error(`\n📌 Error: ${error.message}`);
    }
    
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the import
importXlsxToMongoDB();

