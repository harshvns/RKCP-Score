import express from 'express';
import StockRow from '../models/StockRow.js';

const router = express.Router();

/**
 * GET /api/stock
 * Get all stocks (optional endpoint)
 */

/**
 * GET /api/stock/search?name=stockname
 * Search stocks by name with fuzzy/closest matching
 * 
 * Finds the stock whose name matches closest to the search query
 * Supports partial matches and case-insensitive search
 */


router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Name query parameter is required'
      });
    }

    const searchName = name.trim();
    
    // Create regex for case-insensitive partial matching
    const nameRegex = new RegExp(searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    // First, try to find exact match (case-insensitive)
    let stock = await StockRow.findOne({
      Name: new RegExp(`^${searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    });

    // If no exact match, try partial match
    if (!stock) {
      stock = await StockRow.findOne({
        Name: nameRegex
      });
    }

    // If still no match, try to find closest match using aggregation
    if (!stock) {
      // Get all stocks and find the closest match
      const allStocks = await StockRow.find({}).lean();
      
      // Calculate similarity score for each stock
      const stocksWithScore = allStocks.map(stockItem => {
        const stockName = stockItem.Name || '';
        const similarity = calculateSimilarity(searchName.toLowerCase(), stockName.toLowerCase());
        return { ...stockItem, similarity };
      });

      // Sort by similarity (highest first) and get the best match
      stocksWithScore.sort((a, b) => b.similarity - a.similarity);
      
      const bestMatch = stocksWithScore[0];
      
      // Only return if similarity is above threshold (at least 30% match)
      if (bestMatch && bestMatch.similarity > 0.3) {
        delete bestMatch.similarity;
        stock = bestMatch;
      }
    }

    if (!stock) {
      return res.status(404).json({
        success: false,
        error: `No stock found matching "${searchName}"`
      });
    }

    // Convert to plain object if it's a Mongoose document
    const stockData = stock.toObject ? stock.toObject() : stock;
    
    // Remove MongoDB internal fields
    delete stockData.__v;
    if (stockData.similarity !== undefined) {
      delete stockData.similarity;
    }

    res.json({
      success: true,
      data: stockData,
      searchQuery: searchName
    });

  } catch (error) {
    console.error('Error searching stock:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a score between 0 and 1 (1 = exact match)
 */
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  // Check if one string contains the other
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.8;
  }
  
  // Calculate Levenshtein distance
  const maxLen = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1, str2);
  const similarity = 1 - (distance / maxLen);
  
  // Boost score if words match
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  let wordMatches = 0;
  
  words1.forEach(word => {
    if (words2.some(w => w.includes(word) || word.includes(w))) {
      wordMatches++;
    }
  });
  
  const wordMatchBonus = wordMatches / Math.max(words1.length, words2.length) * 0.3;
  
  return Math.min(1, similarity + wordMatchBonus);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * GET /api/stock/:ticker
 * Fetch stock details by ticker symbol
 * 
 * Supports case-insensitive search for ticker field
 * Handles various field name variations (ticker, Ticker, SYMBOL, etc.)
 */
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    if (!ticker) {
      return res.status(400).json({
        success: false,
        error: 'Ticker parameter is required'
      });
    }

    // Case-insensitive search for ticker
    // Try common field name variations
    const tickerRegex = new RegExp(`^${ticker}$`, 'i');
    
    // Search in multiple possible field names
    const stock = await StockRow.findOne({
      $or: [
        { ticker: tickerRegex },
        { Ticker: tickerRegex },
        { TICKER: tickerRegex },
        { symbol: tickerRegex },
        { Symbol: tickerRegex },
        { SYMBOL: tickerRegex },
        { 'Stock Ticker': tickerRegex },
        { 'Stock Symbol': tickerRegex }
      ]
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        error: `Stock with ticker "${ticker}" not found`
      });
    }

    // Convert Mongoose document to plain object
    const stockData = stock.toObject();
    
    // Remove MongoDB internal fields
    delete stockData.__v;

    res.json({
      success: true,
      data: stockData
    });

  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

router.get('/', async (req, res) => {
    try {
      const { limit = 100, skip = 0 } = req.query;
      
      const stocks = await StockRow.find()
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean();
  
      res.json({
        success: true,
        count: stocks.length,
        data: stocks
      });
  
    } catch (error) {
      console.error('Error fetching stocks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
  

export default router;

