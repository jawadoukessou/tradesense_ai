import { useEffect, useRef, useState, useCallback } from "react";
import { TimeFrame } from "@/components/TradingChart";
import { CandlestickData, Time } from "lightweight-charts";

interface BinanceKline {
  t: number;  // Kline start time
  T: number;  // Kline close time
  s: string;  // Symbol
  i: string;  // Interval
  o: string;  // Open price
  c: string;  // Close price
  h: string;  // High price
  l: string;  // Low price
  v: string;  // Base asset volume
  n: number;  // Number of trades
  x: boolean; // Is this kline closed?
}

interface BinanceWsMessage {
  e: string;  // Event type
  E: number;  // Event time
  s: string;  // Symbol
  k: BinanceKline;
}

const timeframeToInterval: Record<TimeFrame, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1D": "1d",
};

export const useBinanceWebSocket = (
  symbol: string = "btcusdt",
  timeframe: TimeFrame = "1m"
) => {
  const [data, setData] = useState<CandlestickData<Time>[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch historical klines first
  const fetchHistoricalData = useCallback(async () => {
    try {
      const interval = timeframeToInterval[timeframe];
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=100`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch historical data");
      }

      const klines = await response.json();
      
      const historicalData: CandlestickData<Time>[] = klines.map((kline: any[]) => ({
        time: Math.floor(kline[0] / 1000) as Time,
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
      }));

      setData(historicalData);
      
      if (historicalData.length > 0) {
        setCurrentPrice(historicalData[historicalData.length - 1].close);
      }

      return historicalData;
    } catch (err) {
      console.error("Error fetching historical data:", err);
      setError("Failed to fetch historical data");
      return [];
    }
  }, [symbol, timeframe]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const interval = timeframeToInterval[timeframe];
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
    
    console.log("Connecting to Binance WebSocket:", wsUrl);
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Binance WebSocket connected");
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message: BinanceWsMessage = JSON.parse(event.data);
        
        if (message.e === "kline") {
          const kline = message.k;
          const newCandle: CandlestickData<Time> = {
            time: Math.floor(kline.t / 1000) as Time,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
          };

          setCurrentPrice(newCandle.close);

          setData((prevData) => {
            if (prevData.length === 0) return [newCandle];

            const lastCandle = prevData[prevData.length - 1];
            
            // If same timestamp, update the last candle
            if (lastCandle.time === newCandle.time) {
              return [...prevData.slice(0, -1), newCandle];
            }
            
            // If new candle, add it and keep last 100
            if (newCandle.time > lastCandle.time) {
              const newData = [...prevData, newCandle];
              return newData.slice(-100);
            }

            return prevData;
          });
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = (event) => {
      console.error("Binance WebSocket error:", event);
      setError("WebSocket connection error");
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log("Binance WebSocket closed:", event.code, event.reason);
      setIsConnected(false);
      
      // Reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("Attempting to reconnect...");
        connect();
      }, 5000);
    };

    wsRef.current = ws;
  }, [symbol, timeframe]);

  // Initialize connection
  useEffect(() => {
    const init = async () => {
      await fetchHistoricalData();
      connect();
    };

    init();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchHistoricalData, connect]);

  return {
    data,
    currentPrice,
    isConnected,
    error,
  };
};

export default useBinanceWebSocket;
