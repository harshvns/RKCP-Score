import mongoose from 'mongoose';

/**
 * StockRow Model
 * Dynamic schema that accepts any fields from the XLSX file
 * strict: false allows additional fields not defined in the schema
 */
const stockRowSchema = new mongoose.Schema({}, { strict: false });

const StockRow = mongoose.model('StockRow', stockRowSchema);

export default StockRow;

