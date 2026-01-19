import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useMarketPrices } from "@/hooks/useMarketPrices";

// Additional static prices for forex and gold
const additionalPrices = [
  { symbol: "EUR/USD", price: 1.0892, change: 0.15 },
  { symbol: "XAU/USD", price: 2345.30, change: 0.67 },
];

const PriceTicker = () => {
  const { prices, loading } = useMarketPrices(30000); // Update every 30s

  // Combine real prices with additional static ones
  const allPrices = [
    ...prices.map((p) => ({
      symbol: p.symbol,
      price: p.price,
      change: p.change24h,
    })),
    ...additionalPrices,
  ];

  // Duplicate for seamless scrolling
  const items = [...allPrices, ...allPrices];

  if (loading && prices.length === 0) {
    return (
      <div className="w-full overflow-hidden bg-card/50 border-y border-border/50 py-3">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading prices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-card/50 border-y border-border/50 py-3">
      <div className="flex animate-ticker">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 px-6 border-r border-border/30 whitespace-nowrap"
          >
            <span className="font-mono font-semibold text-foreground">{item.symbol}</span>
            <span className="font-mono text-muted-foreground">
              ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`flex items-center gap-1 font-mono text-sm ${
                item.change >= 0 ? "text-profit" : "text-loss"
              }`}
            >
              {item.change >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {item.change >= 0 ? "+" : ""}
              {item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PriceTicker;
