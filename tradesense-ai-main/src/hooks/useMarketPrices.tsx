import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MarketPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  lastUpdated: Date;
}

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

interface MoroccoStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  lastUpdated: string;
}

// Mapping between our symbols and CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
  "BTC/USD": "bitcoin",
  "ETH/USD": "ethereum",
};

// Static assets that don't have real-time data (simulated)
const STATIC_ASSETS = [
  { symbol: "AAPL", name: "Apple Inc", basePrice: 178.45 },
  { symbol: "TSLA", name: "Tesla Inc", basePrice: 245.67 },
];

// Fallback prices for Moroccan stocks
const MOROCCO_FALLBACK = [
  { symbol: "IAM", name: "Maroc Telecom", basePrice: 114.00 },
  { symbol: "ATW", name: "Attijariwafa Bank", basePrice: 752.00 },
  { symbol: "BCP", name: "Banque Centrale Populaire", basePrice: 285.00 },
  { symbol: "CIH", name: "CIH Bank", basePrice: 420.00 },
  { symbol: "MNG", name: "Managem", basePrice: 1850.00 },
];

const CRYPTO_NAMES: Record<string, string> = {
  "BTC/USD": "Bitcoin",
  "ETH/USD": "Ethereum",
};

export const useMarketPrices = (refreshInterval = 30000) => {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moroccoStocksCache, setMoroccoStocksCache] = useState<MarketPrice[]>([]);
  const [lastMoroccoFetch, setLastMoroccoFetch] = useState<Date | null>(null);

  const fetchCryptoPrices = useCallback(async (): Promise<MarketPrice[]> => {
    try {
      const ids = Object.values(COINGECKO_IDS).join(",");
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch crypto prices");
      }

      const data: CoinGeckoResponse = await response.json();

      const cryptoPrices: MarketPrice[] = Object.entries(COINGECKO_IDS).map(
        ([symbol, geckoId]) => ({
          symbol,
          name: CRYPTO_NAMES[symbol] || symbol,
          price: data[geckoId]?.usd || 0,
          change24h: data[geckoId]?.usd_24h_change || 0,
          lastUpdated: new Date(),
        })
      );

      return cryptoPrices;
    } catch (err) {
      console.error("Error fetching crypto prices:", err);
      // Return fallback prices if API fails
      return [
        { symbol: "BTC/USD", name: "Bitcoin", price: 67432.50, change24h: 2.34, lastUpdated: new Date() },
        { symbol: "ETH/USD", name: "Ethereum", price: 3456.78, change24h: -1.23, lastUpdated: new Date() },
      ];
    }
  }, []);

  const fetchMoroccoStocks = useCallback(async (): Promise<MarketPrice[]> => {
    try {
      // Only fetch Morocco stocks every 60 seconds to avoid rate limits
      if (lastMoroccoFetch && moroccoStocksCache.length > 0) {
        const timeSinceLastFetch = Date.now() - lastMoroccoFetch.getTime();
        if (timeSinceLastFetch < 60000) {
          console.log("Using cached Morocco stock data");
          return moroccoStocksCache;
        }
      }

      console.log("Fetching real Morocco stock data...");
      const { data, error } = await supabase.functions.invoke('scrape-morocco-stocks');

      if (error) {
        console.error("Error fetching Morocco stocks:", error);
        throw error;
      }

      if (data?.success && data?.data?.length > 0) {
        const moroccoStocks: MarketPrice[] = data.data.map((stock: MoroccoStockData) => ({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          change24h: stock.change,
          lastUpdated: new Date(stock.lastUpdated),
        }));

        console.log("Fetched real Morocco stocks:", moroccoStocks);
        setMoroccoStocksCache(moroccoStocks);
        setLastMoroccoFetch(new Date());
        return moroccoStocks;
      }

      throw new Error("No Morocco stock data returned");
    } catch (err) {
      console.error("Error fetching Morocco stocks, using fallback:", err);
      // Return fallback prices with small random variation
      return MOROCCO_FALLBACK.map((asset) => {
        const variation = (Math.random() - 0.5) * asset.basePrice * 0.002;
        return {
          symbol: asset.symbol,
          name: asset.name,
          price: asset.basePrice + variation,
          change24h: (Math.random() - 0.5) * 3,
          lastUpdated: new Date(),
        };
      });
    }
  }, [lastMoroccoFetch, moroccoStocksCache]);

  const generateStaticPrices = useCallback((): MarketPrice[] => {
    return STATIC_ASSETS.map((asset) => {
      // Add small random variation to simulate price movement
      const variation = (Math.random() - 0.5) * asset.basePrice * 0.002;
      return {
        symbol: asset.symbol,
        name: asset.name,
        price: asset.basePrice + variation,
        change24h: (Math.random() - 0.5) * 5,
        lastUpdated: new Date(),
      };
    });
  }, []);

  const fetchAllPrices = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch all prices in parallel
      const [cryptoPrices, moroccoStocks, staticPrices] = await Promise.all([
        fetchCryptoPrices(),
        fetchMoroccoStocks(),
        Promise.resolve(generateStaticPrices()),
      ]);
      
      // Combine all prices
      const allPrices = [...cryptoPrices, ...moroccoStocks, ...staticPrices];
      setPrices(allPrices);
    } catch (err) {
      setError("Failed to fetch market prices");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchCryptoPrices, fetchMoroccoStocks, generateStaticPrices]);

  useEffect(() => {
    // Initial fetch
    fetchAllPrices();

    // Set up interval for periodic updates
    const interval = setInterval(fetchAllPrices, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchAllPrices, refreshInterval]);

  const getPrice = useCallback(
    (symbol: string): MarketPrice | undefined => {
      return prices.find((p) => p.symbol === symbol);
    },
    [prices]
  );

  return {
    prices,
    loading,
    error,
    refetch: fetchAllPrices,
    getPrice,
  };
};

export default useMarketPrices;
