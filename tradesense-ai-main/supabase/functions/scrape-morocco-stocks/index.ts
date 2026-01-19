const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  source: string;
}

// Moroccan stocks configuration with TradingView URLs
const MOROCCO_STOCKS = [
  { 
    symbol: 'IAM', 
    name: 'Maroc Telecom',
    tradingViewUrl: 'https://fr.tradingview.com/symbols/CSEMA-IAM/',
    priceRange: { min: 80, max: 200 },
    basePrice: 114
  },
  { 
    symbol: 'ATW', 
    name: 'Attijariwafa Bank',
    tradingViewUrl: 'https://fr.tradingview.com/symbols/CSEMA-ATW/',
    priceRange: { min: 500, max: 900 },
    basePrice: 752
  },
  { 
    symbol: 'BCP', 
    name: 'Banque Centrale Populaire',
    tradingViewUrl: 'https://fr.tradingview.com/symbols/CSEMA-BCP/',
    priceRange: { min: 200, max: 400 },
    basePrice: 285
  },
  { 
    symbol: 'CIH', 
    name: 'CIH Bank',
    tradingViewUrl: 'https://fr.tradingview.com/symbols/CSEMA-CIH/',
    priceRange: { min: 300, max: 550 },
    basePrice: 420
  },
  { 
    symbol: 'MNG', 
    name: 'Managem',
    tradingViewUrl: 'https://fr.tradingview.com/symbols/CSEMA-MNG/',
    priceRange: { min: 1000, max: 2500 },
    basePrice: 1850
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Morocco stock data from TradingView via Firecrawl...');

    const stocks: StockData[] = [];

    // Fetch all stocks from TradingView in parallel
    const fetchPromises = MOROCCO_STOCKS.map(async (stockConfig) => {
      try {
        console.log(`Fetching ${stockConfig.symbol} from TradingView...`);
        
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: stockConfig.tradingViewUrl,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        const data = await response.json();
        
        if (data.success && data.data?.markdown) {
          console.log(`TradingView ${stockConfig.symbol} markdown (first 600 chars):`, data.data.markdown.substring(0, 600));
          
          const extractedStock = extractTradingViewData(data.data.markdown, stockConfig);
          if (extractedStock) {
            console.log(`✅ Extracted ${stockConfig.symbol}:`, extractedStock.price, 'MAD', `(${extractedStock.changePercent}%)`);
            return extractedStock;
          }
        }
        
        console.log(`⚠️ Could not extract ${stockConfig.symbol} from TradingView, using simulated data`);
        return createSimulatedStock(stockConfig);
        
      } catch (error) {
        console.error(`Error fetching ${stockConfig.symbol}:`, error);
        return createSimulatedStock(stockConfig);
      }
    });

    const results = await Promise.all(fetchPromises);
    stocks.push(...results.filter(Boolean));

    console.log(`Successfully fetched ${stocks.length} Moroccan stocks:`, 
      stocks.map(s => `${s.symbol}: ${s.price} MAD (${s.source})`).join(', ')
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: stocks,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching Morocco stocks:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch Morocco stocks' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract stock data from TradingView markdown
function extractTradingViewData(
  markdown: string, 
  config: typeof MOROCCO_STOCKS[0]
): StockData | null {
  try {
    // TradingView format varies: "114,00DMAD", "752,0DMAD", "1 850,00DMAD" (with space for thousands)
    // Also handles formats like "1850,00MAD" or "1 850MAD"
    
    // Remove spaces in numbers (French format uses space as thousand separator)
    const cleanedMarkdown = markdown.replace(/(\d)\s+(\d)/g, '$1$2');
    
    // Pattern for prices with DMAD/MAD suffix
    const pricePatterns = [
      /(\d{1,4}[,\.]\d{1,2})\s*D?MAD/i,
      /(\d{3,4})\s*D?MAD/i, // For prices without decimals
    ];

    let price = 0;
    
    for (const pattern of pricePatterns) {
      const matches = cleanedMarkdown.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        const rawPrice = match[1].replace(',', '.').replace(/\s/g, '');
        const candidate = parseFloat(rawPrice);
        if (isValidPrice(candidate, config)) {
          price = candidate;
          break;
        }
      }
      if (price > 0) break;
    }

    // Extract change percentage - TradingView shows it like "+2,30+2,06%" or "−12,5−1,64%"
    const changePatterns = [
      /([+−-]?\d+[,\.]\d{1,2})[+−-]?(\d+[,\.]\d{1,2})%/,
      /([+−-]?\d+[,\.]\d{1,2})\s*%/,
    ];

    let change = 0;
    let changePercent = 0;

    for (const pattern of changePatterns) {
      const match = cleanedMarkdown.match(pattern);
      if (match) {
        if (match[2]) {
          // Pattern with both absolute and percent change
          change = parseFloat(match[1].replace(',', '.').replace('−', '-'));
          changePercent = parseFloat(match[2].replace(',', '.'));
          // Check if the original had a minus sign
          if (match[0].includes('−') || match[0].startsWith('-')) {
            changePercent = -Math.abs(changePercent);
            change = -Math.abs(change);
          }
        } else {
          // Just percentage
          changePercent = parseFloat(match[1].replace(',', '.').replace('−', '-'));
          change = price * (changePercent / 100);
        }
        
        if (Math.abs(changePercent) < 15) break;
      }
    }

    if (isValidPrice(price, config)) {
      return {
        symbol: config.symbol,
        name: config.name,
        price: price,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        lastUpdated: new Date().toISOString(),
        source: 'tradingview',
      };
    }

    return null;
  } catch (e) {
    console.error(`Error parsing ${config.symbol} from TradingView:`, e);
    return null;
  }
}

// Validate if price is in expected range for the stock
function isValidPrice(price: number, config: typeof MOROCCO_STOCKS[0]): boolean {
  return price >= config.priceRange.min && price <= config.priceRange.max;
}

// Create simulated stock data as fallback
function createSimulatedStock(config: typeof MOROCCO_STOCKS[0]): StockData {
  const variation = (Math.random() - 0.5) * (config.basePrice * 0.04); // ±2% variation
  const price = parseFloat((config.basePrice + variation).toFixed(2));
  const changePercent = parseFloat(((variation / config.basePrice) * 100).toFixed(2));
  
  return {
    symbol: config.symbol,
    name: config.name,
    price,
    change: parseFloat(variation.toFixed(2)),
    changePercent,
    lastUpdated: new Date().toISOString(),
    source: 'simulated',
  };
}
