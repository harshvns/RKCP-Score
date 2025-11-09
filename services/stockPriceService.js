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
  // Comprehensive mappings for Indian stocks
  // Format: 'SYMBOL.NS' for NSE or 'SYMBOL.BO' for BSE
  const tickerMap = {
    // A
    'ABB India Ltd': 'ABB.NS',
    'ABB India': 'ABB.NS',
    'ABB': 'ABB.NS',
    'Adani Enterprises Ltd': 'ADANIENT.NS',
    'Adani Enterprises': 'ADANIENT.NS',
    'Adani Energy Solutions Ltd': 'ADANIENSOL.NS',
    'Adani Energy Solutions': 'ADANIENSOL.NS',
    'Adani Green Energy Ltd': 'ADANIGREEN.NS',
    'Adani Green Energy': 'ADANIGREEN.NS',
    'Adani Ports': 'ADANIPORTS.NS',
    'Adani Power Ltd': 'ADANIPOWER.NS',
    'Adani Power': 'ADANIPOWER.NS',
    'Adani Total Gas Ltd': 'ATGL.NS',
    'Adani Total Gas': 'ATGL.NS',
    'Aditya Birla Capital Ltd': 'ABCAPITAL.NS',
    'Aditya Birla Capital': 'ABCAPITAL.NS',
    'Alkem Laboratories Ltd': 'ALKEM.NS',
    'Alkem Laboratories': 'ALKEM.NS',
    'Ambuja Cements Ltd': 'AMBUJACEM.NS',
    'Ambuja Cements': 'AMBUJACEM.NS',
    'Apollo Hospitals Enterprise Ltd': 'APOLLOHOSP.NS',
    'Apollo Hospitals': 'APOLLOHOSP.NS',
    'Ashok Leyland Ltd': 'ASHOKLEY.NS',
    'Ashok Leyland': 'ASHOKLEY.NS',
    'Asian Paints Ltd': 'ASIANPAINT.NS',
    'Asian Paints': 'ASIANPAINT.NS',
    'AU Small Finance Bank Ltd': 'AUBANK.NS',
    'AU Small Finance Bank': 'AUBANK.NS',
    'Aurobindo Pharma Ltd': 'AUROPHARMA.NS',
    'Aurobindo Pharma': 'AUROPHARMA.NS',
    'Avenue Supermarts Ltd': 'DMART.NS',
    'Avenue Supermarts': 'DMART.NS',
    'Axis Bank Ltd': 'AXISBANK.NS',
    'Axis Bank': 'AXISBANK.NS',
    
    // B
    'Bajaj Auto Ltd': 'BAJAJ-AUTO.NS',
    'Bajaj Auto': 'BAJAJ-AUTO.NS',
    'Bajaj Finance Ltd': 'BAJFINANCE.NS',
    'Bajaj Finance': 'BAJFINANCE.NS',
    'Bajaj Finserv Ltd': 'BAJAJFINSV.NS',
    'Bajaj Finserv': 'BAJAJFINSV.NS',
    'Bajaj Holdings & Investment Ltd': 'BAJAJHLDNG.NS',
    'Bajaj Holdings': 'BAJAJHLDNG.NS',
    'Bajaj Housing Finance Ltd': 'BAJAJHFL.NS',
    'Bajaj Housing Finance': 'BAJAJHFL.NS',
    'Bank of Baroda': 'BANKBARODA.NS',
    'Bank of India': 'BANKINDIA.NS',
    'Berger Paints India Ltd': 'BERGEPAINT.NS',
    'Berger Paints': 'BERGEPAINT.NS',
    'Bharat Dynamics Ltd': 'BDL.NS',
    'Bharat Dynamics': 'BDL.NS',
    'Bharat Electronics Ltd': 'BEL.NS',
    'Bharat Electronics': 'BEL.NS',
    'Bharat Forge Ltd': 'BHARATFORG.NS',
    'Bharat Forge': 'BHARATFORG.NS',
    'Bharat Heavy Electricals Ltd': 'BHEL.NS',
    'Bharat Heavy Electricals': 'BHEL.NS',
    'Bharat Petroleum Corporation Ltd': 'BPCL.NS',
    'Bharat Petroleum': 'BPCL.NS',
    'Bharti Airtel Ltd': 'BHARTIARTL.NS',
    'Bharti Airtel': 'BHARTIARTL.NS',
    'Bharti Hexacom Ltd': 'BHARTIHEXA.NS',
    'Bharti Hexacom': 'BHARTIHEXA.NS',
    'Bosch Ltd': 'BOSCHLTD.NS',
    'Bosch': 'BOSCHLTD.NS',
    'Britannia Industries Ltd': 'BRITANNIA.NS',
    'Britannia Industries': 'BRITANNIA.NS',
    'BSE Ltd': 'BSE.NS',
    'BSE': 'BSE.NS',
    
    // C
    'Canara Bank': 'CANBK.NS',
    'CG Power & Industrial Solutions Ltd': 'CGPOWER.NS',
    'CG Power': 'CGPOWER.NS',
    'Cholamandalam Investment & Finance Company Ltd': 'CHOLAFIN.NS',
    'Cholamandalam Investment': 'CHOLAFIN.NS',
    'Cipla Ltd': 'CIPLA.NS',
    'Cipla': 'CIPLA.NS',
    'Coal India Ltd': 'COALINDIA.NS',
    'Coal India': 'COALINDIA.NS',
    'Coforge Ltd': 'COFORGE.NS',
    'Coforge': 'COFORGE.NS',
    'Colgate-Palmolive (India) Ltd': 'COLPAL.NS',
    'Colgate-Palmolive': 'COLPAL.NS',
    'Coromandel International Ltd': 'COROMANDEL.NS',
    'Coromandel International': 'COROMANDEL.NS',
    'Cummins India Ltd': 'CUMMINSIND.NS',
    'Cummins India': 'CUMMINSIND.NS',
    
    // D
    'Dabur India Ltd': 'DABUR.NS',
    'Dabur India': 'DABUR.NS',
    'Dixon Technologies (India) Ltd': 'DIXON.NS',
    'Dixon Technologies': 'DIXON.NS',
    'DLF Ltd': 'DLF.NS',
    'DLF': 'DLF.NS',
    'Dr Reddys Laboratories Ltd': 'DRREDDY.NS',
    'Dr Reddys Laboratories': 'DRREDDY.NS',
    'Dr Reddys Labs': 'DRREDDY.NS',
    
    // E
    'Eicher Motors Ltd': 'EICHERMOT.NS',
    'Eicher Motors': 'EICHERMOT.NS',
    'Eternal Ltd': 'ETERNAL.NS',
    'Eternal': 'ETERNAL.NS',
    
    // F
    'F A C T Fertilizers & Chemicals Travancore Ltd': 'FACT.NS',
    'FACT': 'FACT.NS',
    'Federal Bank Ltd': 'FEDERALBNK.NS',
    'Federal Bank': 'FEDERALBNK.NS',
    'FSN E-Commerce Ventures Ltd': 'NYKAA.NS',
    'FSN E-Commerce': 'NYKAA.NS',
    'Nykaa': 'NYKAA.NS',
    
    // G
    'GAIL (India) Ltd': 'GAIL.NS',
    'GAIL': 'GAIL.NS',
    'General Insurance Corp. of India': 'GICRE.NS',
    'General Insurance Corp': 'GICRE.NS',
    'GICRE': 'GICRE.NS',
    'Glenmark Pharmaceuticals Ltd': 'GLENMARK.NS',
    'Glenmark Pharmaceuticals': 'GLENMARK.NS',
    'GMR Airports Ltd': 'GMRAIRPORT.NS',
    'GMR Airports': 'GMRAIRPORT.NS',
    'Godrej Consumer Products Ltd': 'GODREJCP.NS',
    'Godrej Consumer Products': 'GODREJCP.NS',
    'Godrej Properties Ltd': 'GODREJPROP.NS',
    'Godrej Properties': 'GODREJPROP.NS',
    'Grasim Industries Ltd': 'GRASIM.NS',
    'Grasim Industries': 'GRASIM.NS',
    'GE Vernova T&D India Ltd': 'GVT&D.NS',
    'GE Vernova T&D India': 'GVT&D.NS',
    
    // H
    'Havells India Ltd': 'HAVELLS.NS',
    'Havells India': 'HAVELLS.NS',
    'HCL Technologies Ltd': 'HCLTECH.NS',
    'HCL Technologies': 'HCLTECH.NS',
    'HDFC AMC Ltd': 'HDFCAMC.NS',
    'HDFC AMC': 'HDFCAMC.NS',
    'HDFC Bank Ltd': 'HDFCBANK.NS',
    'HDFC Bank': 'HDFCBANK.NS',
    'HDFC Life Insurance Company Ltd': 'HDFCLIFE.NS',
    'HDFC Life Insurance': 'HDFCLIFE.NS',
    'Hero MotoCorp Ltd': 'HEROMOTOCO.NS',
    'Hero MotoCorp': 'HEROMOTOCO.NS',
    'Hindustan Aeronautics Ltd': 'HAL.NS',
    'Hindustan Aeronautics': 'HAL.NS',
    'Hindustan Petroleum Corporation Ltd': 'HINDPETRO.NS',
    'Hindustan Petroleum': 'HINDPETRO.NS',
    'Hindustan Unilever Ltd': 'HINDUNILVR.NS',
    'Hindustan Unilever': 'HINDUNILVR.NS',
    'Hindustan Zinc Ltd': 'HINDZINC.NS',
    'Hindustan Zinc': 'HINDZINC.NS',
    'Hitachi Energy India Ltd': 'POWERINDIA.NS',
    'Hitachi Energy India': 'POWERINDIA.NS',
    'Hyundai Motor India Ltd': 'HYUNDAI.NS',
    'Hyundai Motor India': 'HYUNDAI.NS',
    
    // I
    'ICICI Bank Ltd': 'ICICIBANK.NS',
    'ICICI Bank': 'ICICIBANK.NS',
    'ICICI Lombard': 'ICICIGI.NS',
    'ICICI Prudential Life Insurance Company Ltd': 'ICICIPRULI.NS',
    'ICICI Prudential Life Insurance': 'ICICIPRULI.NS',
    'IDBI Bank Ltd': 'IDBI.NS',
    'IDBI Bank': 'IDBI.NS',
    'IDFC First Bank Ltd': 'IDFCFIRSTB.NS',
    'IDFC First Bank': 'IDFCFIRSTB.NS',
    'Indian Bank': 'INDIANB.NS',
    'Indian Hotels Co Ltd': 'INDHOTEL.NS',
    'Indian Hotels': 'INDHOTEL.NS',
    'Indian Oil Corporation Ltd': 'IOC.NS',
    'Indian Oil Corporation': 'IOC.NS',
    'Indian Oil': 'IOC.NS',
    'Indian Overseas Bank': 'IOB.NS',
    'Indian Railway Catering & Tourism Corporation Ltd': 'IRCTC.NS',
    'Indian Railway Catering': 'IRCTC.NS',
    'Indian Railway Finance Corporation Ltd': 'IRFC.NS',
    'Indian Railway Finance Corporation': 'IRFC.NS',
    'Indus Towers Ltd': 'INDUSTOWER.NS',
    'Indus Towers': 'INDUSTOWER.NS',
    'IndusInd Bank Ltd': 'INDUSINDBK.NS',
    'IndusInd Bank': 'INDUSINDBK.NS',
    'Infosys Ltd': 'INFY.NS',
    'Infosys': 'INFY.NS',
    'Info Edge (India) Ltd': 'NAUKRI.NS',
    'Info Edge': 'NAUKRI.NS',
    'ITC Ltd': 'ITC.NS',
    'ITC': 'ITC.NS',
    
    // J
    'Jindal Stainless Ltd': 'JSL.NS',
    'Jindal Stainless': 'JSL.NS',
    'Jindal Steel Ltd': 'JINDALSTEL.NS',
    'Jindal Steel': 'JINDALSTEL.NS',
    'Jio Financial Services Ltd': 'JOFIN.NS',
    'Jio Financial Services': 'JOFIN.NS',
    'JSW Energy Ltd': 'JSWENERGY.NS',
    'JSW Energy': 'JSWENERGY.NS',
    'JSW Infrastructure Ltd': 'JSWINFRA.NS',
    'JSW Infrastructure': 'JSWINFRA.NS',
    'JSW Steel Ltd': 'JSWSTEEL.NS',
    'JSW Steel': 'JSWSTEEL.NS',
    
    // K
    'Kalyan Jewellers Ltd': 'KALYANKJIL.NS',
    'Kotak Mahindra Bank Ltd': 'KOTAKBANK.NS',
    'Kotak Mahindra Bank': 'KOTAKBANK.NS',
    
    // L
    'L&T Finance Ltd': 'LTF.NS',
    'L&T Finance': 'LTF.NS',
    'Larsen & Toubro Ltd': 'LT.NS',
    'Larsen & Toubro': 'LT.NS',
    'Life Insurance Corporation of India': 'LICI.NS',
    'LIC': 'LICI.NS',
    'Linde India Ltd': 'LINDEINDIA.NS',
    'Linde India': 'LINDEINDIA.NS',
    'Lloyds Metals & Energy Ltd': 'LLOYDSME.NS',
    'Lloyds Metals & Energy': 'LLOYDSME.NS',
    'Lodha Developers Ltd': 'LODHA.NS',
    'Lodha Developers': 'LODHA.NS',
    'Lupin Ltd': 'LUPIN.NS',
    'Lupin': 'LUPIN.NS',
    'LTIMindtree Ltd': 'LTIM.NS',
    'LTIMindtree': 'LTIM.NS',
    
    // M
    'Mahindra & Mahindra Ltd': 'M&M.NS',
    'Mahindra & Mahindra': 'M&M.NS',
    'Mankind Pharma Ltd': 'MANKIND.NS',
    'Mankind Pharma': 'MANKIND.NS',
    'Marico Ltd': 'MARICO.NS',
    'Marico': 'MARICO.NS',
    'Maruti Suzuki India Ltd': 'MARUTI.NS',
    'Maruti Suzuki': 'MARUTI.NS',
    'Max Financial Services Ltd': 'MFSL.NS',
    'Max Financial Services': 'MFSL.NS',
    'Max Healthcare Institute Ltd': 'MAXHEALTH.NS',
    'Max Healthcare': 'MAXHEALTH.NS',
    'Mazagon Dock Shipbuilders Ltd': 'MAZDOCK.NS',
    'Mazagon Dock Shipbuilders': 'MAZDOCK.NS',
    'Mphasis Ltd': 'MPHASIS.NS',
    'Mphasis': 'MPHASIS.NS',
    'MRF Ltd': 'MRF.NS',
    'MRF': 'MRF.NS',
    'Motilal Oswal Financial Services Ltd': 'MOTILALOFS.NS',
    'Motilal Oswal Financial Services': 'MOTILALOFS.NS',
    'Muthoot Finance Ltd': 'MUTHOOTFIN.NS',
    'Muthoot Finance': 'MUTHOOTFIN.NS',
    
    // N
    'Nestle India Ltd': 'NESTLEIND.NS',
    'Nestle India': 'NESTLEIND.NS',
    'NHPC Ltd': 'NHPC.NS',
    'NHPC': 'NHPC.NS',
    'Nippon Life India Asset Management Ltd': 'NAM-INDIA.NS',
    'Nippon Life India Asset Management': 'NAM-INDIA.NS',
    'NMDC Ltd': 'NMDC.NS',
    'NMDC': 'NMDC.NS',
    'NTPC Green Energy Ltd': 'NTPCGREEN.NS',
    'NTPC Green Energy': 'NTPCGREEN.NS',
    'NTPC Ltd': 'NTPC.NS',
    'NTPC': 'NTPC.NS',
    
    // O
    'Oberoi Realty Ltd': 'OBEROIRLTY.NS',
    'Oberoi Realty': 'OBEROIRLTY.NS',
    'Oil & Natural Gas Corpn Ltd': 'ONGC.NS',
    'Oil & Natural Gas Corpn': 'ONGC.NS',
    'ONGC': 'ONGC.NS',
    'Oil India Ltd': 'OIL.NS',
    'Oil India': 'OIL.NS',
    'One 97 Communications Ltd': 'PAYTM.NS',
    'One 97 Communications': 'PAYTM.NS',
    'Paytm': 'PAYTM.NS',
    'Oracle Financial Services Software Ltd': 'OFSS.NS',
    'Oracle Financial Services Software': 'OFSS.NS',
    
    // P
    'PB Fintech Ltd': 'POLICYBZR.NS',
    'PB Fintech': 'POLICYBZR.NS',
    'Persistent Systems Ltd': 'PERSISTENT.NS',
    'Persistent Systems': 'PERSISTENT.NS',
    'P I Industries Ltd': 'PIIND.NS',
    'P I Industries': 'PIIND.NS',
    'Phoenix Mills Ltd': 'PHOENIXLTD.NS',
    'Phoenix Mills': 'PHOENIXLTD.NS',
    'Pidilite Industries Ltd': 'PIDILITIND.NS',
    'Pidilite Industries': 'PIDILITIND.NS',
    'Polycab India Ltd': 'POLYCAB.NS',
    'Polycab India': 'POLYCAB.NS',
    'Power Finance Corporation Ltd': 'PFC.NS',
    'Power Finance Corporation': 'PFC.NS',
    'Power Grid Corporation of India Ltd': 'POWERGRID.NS',
    'Power Grid': 'POWERGRID.NS',
    'Prestige Estates Projects Ltd': 'PRESTIGE.NS',
    'Prestige Estates Projects': 'PRESTIGE.NS',
    'Punjab National Bank': 'PNB.NS',
    'PNB': 'PNB.NS',
    
    // R
    'Rail Vikas Nigam Ltd': 'RVNL.NS',
    'Rail Vikas Nigam': 'RVNL.NS',
    'REC Ltd': 'RECLTD.NS',
    'REC': 'RECLTD.NS',
    'Reliance Industries Ltd': 'RELIANCE.NS',
    'Reliance Industries': 'RELIANCE.NS',
    
    // S
    'Samvardhana Motherson International Ltd': 'MOTHERSON.NS',
    'Samvardhana Motherson International': 'MOTHERSON.NS',
    'SBI Cards & Payment Services Ltd': 'SBICARD.NS',
    'SBI Cards & Payment Services': 'SBICARD.NS',
    'SBI Life Insurance Company Ltd': 'SBILIFE.NS',
    'SBI Life Insurance': 'SBILIFE.NS',
    'Schaeffler India Ltd': 'SCHAEFFLER.NS',
    'Schaeffler India': 'SCHAEFFLER.NS',
    'Shree Cement Ltd': 'SHREECEM.NS',
    'Shree Cement': 'SHREECEM.NS',
    'Shriram Finance Ltd': 'SHRIRAMFIN.NS',
    'Shriram Finance': 'SHRIRAMFIN.NS',
    'Siemens Ltd': 'SIEMENS.NS',
    'Siemens': 'SIEMENS.NS',
    'Solar Industries India Ltd': 'SOLARINDS.NS',
    'Solar Industries India': 'SOLARINDS.NS',
    'SRF Ltd': 'SRF.NS',
    'SRF': 'SRF.NS',
    'State Bank of India': 'SBIN.NS',
    'SBI': 'SBIN.NS',
    'Steel Authority of India Ltd': 'SAIL.NS',
    'Steel Authority of India': 'SAIL.NS',
    'SAIL': 'SAIL.NS',
    'Sun Pharmaceutical Industries Ltd': 'SUNPHARMA.NS',
    'Sun Pharmaceutical Industries': 'SUNPHARMA.NS',
    'Sun Pharmaceutical': 'SUNPHARMA.NS',
    'Suzlon Energy Ltd': 'SUZLON.NS',
    'Suzlon Energy': 'SUZLON.NS',
    'Swiggy Ltd': 'SWIGGY.NS',
    'Swiggy': 'SWIGGY.NS',
    
    // T
    'Tata Capital Ltd': 'TATACAP.NS',
    'Tata Capital': 'TATACAP.NS',
    'Tata Communications Ltd': 'TATACOMM.NS',
    'Tata Communications': 'TATACOMM.NS',
    'Tata Consultancy Services Ltd': 'TCS.NS',
    'Tata Consultancy Services': 'TCS.NS',
    'TCS': 'TCS.NS',
    'Tata Consumer Products Ltd': 'TATACONSUM.NS',
    'Tata Consumer Products': 'TATACONSUM.NS',
    'Tata Motors Passenger Vehicles Ltd': 'TMPV.NS',
    'Tata Motors': 'TATAMOTORS.NS',
    'Tata Power Company Ltd': 'TATAPOWER.NS',
    'Tata Power Company': 'TATAPOWER.NS',
    'Tata Power': 'TATAPOWER.NS',
    'Tata Steel Ltd': 'TATASTEEL.NS',
    'Tata Steel': 'TATASTEEL.NS',
    'Tech Mahindra Ltd.': 'TECHM.NS',
    'Tech Mahindra': 'TECHM.NS',
    'Titan Company Ltd': 'TITAN.NS',
    'Titan Company': 'TITAN.NS',
    'Titan': 'TITAN.NS',
    'Torrent Pharmaceuticals Ltd': 'TORNTPHARM.NS',
    'Torrent Pharmaceuticals': 'TORNTPHARM.NS',
    'Torrent Power Ltd': 'TORNTPOWER.NS',
    'Torrent Power': 'TORNTPOWER.NS',
    'Trent Ltd': 'TRENT.NS',
    'Trent': 'TRENT.NS',
    'Tube Investments of India Ltd': 'TIINDIA.NS',
    'Tube Investments of India': 'TIINDIA.NS',
    'TVS Motor Company Ltd': 'TVSMOTOR.NS',
    'TVS Motor Company': 'TVSMOTOR.NS',
    'TVS Motor': 'TVSMOTOR.NS',
    
    // U
    'UltraTech Cement Ltd': 'ULTRACEMCO.NS',
    'UltraTech Cement': 'ULTRACEMCO.NS',
    'Union Bank of India': 'UNIONBANK.NS',
    'Union Bank of India': 'UNIONBANK.NS',
    'United Spirits Ltd': 'UNTIDSPR.NS',
    'United Spirits': 'UNTIDSPR.NS',
    'Uno Minda Ltd': 'UNOMINDA.NS',
    'Uno Minda': 'UNOMINDA.NS',
    'UPL Ltd': 'UPL.NS',
    'UPL': 'UPL.NS',
    
    // V
    'Varun Beverages Ltd': 'VBL.NS',
    'Varun Beverages': 'VBL.NS',
    'Vedanta Ltd': 'VEDL.NS',
    'Vedanta': 'VEDL.NS',
    'Vishal Mega Mart Ltd': 'VMM.NS',
    'Vishal Mega Mart': 'VMM.NS',
    'Vodafone Idea Ltd': 'IDEA.NS',
    'Vodafone Idea': 'IDEA.NS',
    
    // W
    'Waaree Energies Ltd': 'WAAREEENER.NS',
    'Waaree Energies': 'WAAREEENER.NS',
    'Wipro Ltd': 'WIPRO.NS',
    'Wipro': 'WIPRO.NS',
    
    // Y
    'Yes Bank Ltd': 'YESBANK.NS',
    'Yes Bank': 'YESBANK.NS',
    
    // Z
    'Zydus Lifesciences Ltd': 'ZYDUSLIFE.NS',
    'Zydus Lifesciences': 'ZYDUSLIFE.NS',
  };
  
  // Try exact match first
  if (tickerMap[companyName]) {
    return tickerMap[companyName];
  }
  
  // Try case-insensitive match
  const lowerName = companyName.toLowerCase().trim();
  for (const [key, value] of Object.entries(tickerMap)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // Try partial match (remove common suffixes)
  const normalizedName = companyName
    .replace(/\s*(Ltd|Limited|Inc|Incorporated|Corp|Corporation|Private|Pvt|Company|Co)\s*\.?$/gi, '')
    .trim();
  
  for (const [key, value] of Object.entries(tickerMap)) {
    const normalizedKey = key
      .replace(/\s*(Ltd|Limited|Inc|Incorporated|Corp|Corporation|Private|Pvt|Company|Co)\s*\.?$/gi, '')
      .trim();
    
    if (normalizedName.toLowerCase() === normalizedKey.toLowerCase()) {
      return value;
    }
  }
  
  // If no mapping found, try to generate from company name
  // Remove common suffixes and convert to uppercase
  let ticker = companyName
    .replace(/\s*(Ltd|Limited|Inc|Incorporated|Corp|Corporation|Private|Pvt|Company|Co)\s*\.?$/gi, '')
    .replace(/\s+/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  
  // Add .NS suffix for NSE
  return `${ticker}.NS`;
}

