/**
 * Stock Price Service
 * Fetches historical stock price data for DMA calculations
 * Uses Yahoo Finance API (free, no API key required)
 */

// Get fetch function (Node.js 18+ has native fetch, otherwise use node-fetch)
async function getFetch() {
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  try {
    const nodeFetch = await import('node-fetch');
    return nodeFetch.default;
  } catch (error) {
    throw new Error('Fetch is not available. Please install node-fetch: npm install node-fetch');
  }
}

/**
 * Fetch historical stock price data
 * @param {string} symbol - Stock ticker symbol (e.g., 'RELIANCE.NS' for NSE, 'RELIANCE.BO' for BSE)
 * @param {number} days - Number of days of historical data needed
 * @returns {Promise<Array>} Array of price data with date and close price
 */
export async function fetchHistoricalPrices(symbol, days = 250) {
  try {
    // For Indian stocks, add .NS suffix for NSE or .BO for BSE
    // If symbol doesn't have suffix, assume NSE
    const formattedSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    
    // Yahoo Finance API endpoint
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}?interval=1d&range=${days}d`;
    
    // Get fetch function
    const fetchFn = await getFetch();
    const response = await fetchFn(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch price data: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error('No price data available');
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    
    // Combine timestamps and closes into array of {date, close}
    const priceData = timestamps.map((timestamp, index) => ({
      date: new Date(timestamp * 1000),
      close: closes[index] || null
    })).filter(item => item.close !== null && !isNaN(item.close));
    
    return priceData;
  } catch (error) {
    console.error(`Error fetching price data for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * Calculate DMA (Daily Moving Average)
 * @param {Array} priceData - Array of {date, close} objects
 * @param {number} period - Number of days for moving average (e.g., 50, 200)
 * @returns {number|null} DMA value or null if insufficient data
 */
export function calculateDMA(priceData, period) {
  if (!priceData || priceData.length < period) {
    return null;
  }
  
  // Get the last 'period' days of data
  const recentPrices = priceData.slice(-period);
  const sum = recentPrices.reduce((acc, item) => acc + item.close, 0);
  
  return sum / period;
}

/**
 * Get trend analysis based on DMA
 * @param {number} dma50 - 50-day moving average
 * @param {number} dma200 - 200-day moving average
 * @param {number} currentPrice - Current stock price
 * @returns {Object} Trend analysis object
 */
export function getTrendAnalysis(dma50, dma200, currentPrice) {
  if (!dma50 || !dma200 || !currentPrice) {
    return {
      trend: 'unknown',
      signal: 'insufficient_data',
      dma50,
      dma200,
      currentPrice,
      dma50Above200: null,
      priceAbove50: null,
      priceAbove200: null
    };
  }
  
  const dma50Above200 = dma50 > dma200;
  const priceAbove50 = currentPrice > dma50;
  const priceAbove200 = currentPrice > dma200;
  
  // Determine trend
  let trend = 'neutral';
  let signal = 'hold';
  
  if (dma50Above200 && priceAbove50 && priceAbove200) {
    // Golden cross: 50 DMA above 200 DMA, price above both
    trend = 'bullish';
    signal = 'strong_buy';
  } else if (dma50Above200 && priceAbove200) {
    // 50 DMA above 200 DMA, price above 200 DMA
    trend = 'bullish';
    signal = 'buy';
  } else if (dma50Above200) {
    // 50 DMA above 200 DMA but price below
    trend = 'bullish';
    signal = 'weak_buy';
  } else if (!dma50Above200 && !priceAbove50 && !priceAbove200) {
    // Death cross: 50 DMA below 200 DMA, price below both
    trend = 'bearish';
    signal = 'strong_sell';
  } else if (!dma50Above200 && !priceAbove200) {
    // 50 DMA below 200 DMA, price below 200 DMA
    trend = 'bearish';
    signal = 'sell';
  } else if (!dma50Above200) {
    // 50 DMA below 200 DMA but price above
    trend = 'bearish';
    signal = 'weak_sell';
  }
  
  return {
    trend,
    signal,
    dma50: parseFloat(dma50.toFixed(2)),
    dma200: parseFloat(dma200.toFixed(2)),
    currentPrice: parseFloat(currentPrice.toFixed(2)),
    dma50Above200,
    priceAbove50,
    priceAbove200,
    // Calculate percentage differences
    dma50PercentDiff: parseFloat(((dma50 - dma200) / dma200 * 100).toFixed(2)),
    priceVs50Percent: parseFloat(((currentPrice - dma50) / dma50 * 100).toFixed(2)),
    priceVs200Percent: parseFloat(((currentPrice - dma200) / dma200 * 100).toFixed(2))
  };
}

/**
 * Get stock ticker symbol for API
 * Maps company names to ticker symbols for Yahoo Finance
 * @param {string} companyName - Company name
 * @returns {string} Ticker symbol
 */
export function getTickerSymbol(companyName) {
  // Common mappings for Indian stocks
  // Format: 'SYMBOL.NS' for NSE or 'SYMBOL.BO' for BSE
  const tickerMap = {
    'Reliance Industries': 'RELIANCE.NS',
    'Tata Consultancy Services': 'TCS.NS',
    'HDFC Bank': 'HDFCBANK.NS',
    'ICICI Bank': 'ICICIBANK.NS',
    'Infosys': 'INFY.NS',
    'Hindustan Unilever': 'HINDUNILVR.NS',
    'ITC': 'ITC.NS',
    'State Bank of India': 'SBIN.NS',
    'Bharti Airtel': 'BHARTIARTL.NS',
    'Axis Bank': 'AXISBANK.NS',
    // Add more mappings as needed
  };
  
  // Try exact match first
  if (tickerMap[companyName]) {
    return tickerMap[companyName];
  }
  
  // Try case-insensitive match
  const lowerName = companyName.toLowerCase();
  for (const [key, value] of Object.entries(tickerMap)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // If no mapping found, try to generate from company name
  // Remove common suffixes and convert to uppercase
  let ticker = companyName
    .replace(/\s*(Ltd|Limited|Inc|Incorporated|Corp|Corporation|Private|Pvt)\s*/gi, '')
    .replace(/\s+/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  
  // Add .NS suffix for NSE
  return `${ticker}.NS`;
}

