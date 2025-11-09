# Trend Analysis Feature - Top 10 Stocks by RKCP Score

## Overview

This feature provides trend analysis for the top 10 stocks ranked by RKCP score. The analysis is based on 50-day and 200-day Daily Moving Averages (DMA).

## Implementation

### Backend (Recommended)

✅ **Implemented in Backend** - This is the correct approach because:
- Data fetching from stock APIs (Yahoo Finance)
- DMA calculations require historical data processing
- Better performance (server-side processing)
- Security (API keys if needed)
- Caching capabilities

### Files Created/Modified

1. **`services/stockPriceService.js`** (NEW)
   - Fetches historical stock price data from Yahoo Finance API
   - Calculates 50-day and 200-day DMAs
   - Determines trend (bullish/bearish) based on DMA crossover
   - Maps company names to ticker symbols

2. **`routes/stockRoutes.js`** (MODIFIED)
   - Added new endpoint: `GET /api/stock/top10`
   - Fetches top 10 stocks by RKCP score
   - Adds trend analysis for each stock

## API Endpoint

### GET `/api/stock/top10`

Returns top 10 stocks by RKCP score with trend analysis.

**Response Format:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "Name": "Reliance Industries",
      "Total Mark out of 10": 8.5,
      "rkcpScore": 8.5,
      "trendAnalysis": {
        "trend": "bullish",
        "signal": "strong_buy",
        "dma50": 2450.50,
        "dma200": 2300.25,
        "currentPrice": 2500.00,
        "dma50Above200": true,
        "priceAbove50": true,
        "priceAbove200": true,
        "dma50PercentDiff": 6.52,
        "priceVs50Percent": 2.02,
        "priceVs200Percent": 8.68,
        "ticker": "RELIANCE.NS",
        "dataPoints": 250
      }
    }
  ]
}
```

**Trend Values:**
- `trend`: "bullish" | "bearish" | "neutral" | "unknown"
- `signal`: "strong_buy" | "buy" | "weak_buy" | "hold" | "weak_sell" | "sell" | "strong_sell" | "insufficient_data" | "error"

## Installation

### Required Dependencies

If using Node.js < 18, install `node-fetch`:
```bash
cd stock-backend-api-endpoint
npm install node-fetch
```

Node.js 18+ has native `fetch` support, so no additional package needed.

## How It Works

1. **Get Top 10 Stocks**
   - Fetches all stocks from database
   - Sorts by RKCP score (`Total Mark out of 10`)
   - Selects top 10

2. **Fetch Price Data**
   - For each stock, maps company name to ticker symbol
   - Fetches 250 days of historical price data from Yahoo Finance
   - Uses NSE format (`.NS` suffix) for Indian stocks

3. **Calculate DMAs**
   - Calculates 50-day moving average
   - Calculates 200-day moving average
   - Gets current price (last close price)

4. **Determine Trend**
   - **Bullish**: 50 DMA > 200 DMA (Golden Cross)
   - **Bearish**: 50 DMA < 200 DMA (Death Cross)
   - **Strong Buy**: 50 DMA > 200 DMA AND price > both DMAs
   - **Strong Sell**: 50 DMA < 200 DMA AND price < both DMAs

## Ticker Symbol Mapping

The system maps company names to Yahoo Finance ticker symbols:
- Example: "Reliance Industries" → "RELIANCE.NS"
- NSE stocks use `.NS` suffix
- BSE stocks use `.BO` suffix

**Note**: You may need to add more mappings in `getTickerSymbol()` function in `stockPriceService.js` for accurate ticker resolution.

## Frontend Integration

To use this in the frontend:

```javascript
// In frontend/src/services/api.js
export const getTop10StocksWithTrend = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stock/top10`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching top 10 stocks:', error);
    throw error;
  }
};
```

## Testing

Test the endpoint:
```bash
curl https://rkcp-score.vercel.app/api/stock/top10
```

Or in browser:
```
https://rkcp-score.vercel.app/api/stock/top10
```

## Limitations

1. **Ticker Mapping**: Not all company names may have accurate ticker mappings. You'll need to add more mappings as needed.

2. **Data Availability**: Some stocks may not have sufficient historical data (need at least 200 days for 200 DMA).

3. **API Rate Limits**: Yahoo Finance API may have rate limits. Consider caching results.

4. **Accuracy**: Ticker symbol generation from company name is approximate. Manual mapping is recommended for accuracy.

## Future Enhancements

- [ ] Add caching for price data (reduce API calls)
- [ ] Support for more stock exchanges (BSE, etc.)
- [ ] Add more technical indicators (RSI, MACD, etc.)
- [ ] Real-time price updates
- [ ] Historical trend charts

