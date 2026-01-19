import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useBinanceWebSocket } from "@/hooks/useBinanceWebSocket";

export type TimeFrame = "1m" | "5m" | "15m" | "1h" | "4h" | "1D";

interface TradingChartProps {
  timeframe?: TimeFrame;
  symbol?: string;
}

const TradingChart = ({ timeframe = "1m", symbol = "btcusdt" }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { data, currentPrice, isConnected, error } = useBinanceWebSocket(symbol, timeframe);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#13151a" },
        textColor: "#7a8599",
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#22d3ee",
          width: 1,
          style: 2,
          labelBackgroundColor: "#22d3ee",
        },
        horzLine: {
          color: "#22d3ee",
          width: 1,
          style: 2,
          labelBackgroundColor: "#22d3ee",
        },
      },
      rightPriceScale: {
        borderColor: "#2d3748",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "#2d3748",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
      handleScroll: {
        vertTouchDrag: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update chart data when data changes
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  // Update last candle in real-time
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const lastCandle = data[data.length - 1];
      seriesRef.current.update(lastCandle);
    }
  }, [data]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-border/50 relative">
      {/* Connection status indicator */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <div 
          className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
        />
        <span className="text-xs text-muted-foreground font-mono">
          {isConnected ? "LIVE" : error ? "OFFLINE" : "CONNECTING..."}
        </span>
        {currentPrice && (
          <span className="text-xs text-primary font-mono font-bold">
            ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      
      <div
        ref={chartContainerRef}
        className="w-full h-full"
        style={{ minHeight: "300px" }}
      />
    </div>
  );
};

export default TradingChart;
