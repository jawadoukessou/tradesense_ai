import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { TrendingUp, TrendingDown, DollarSign, Percent, X, Loader2, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChallenge } from "@/hooks/useChallenge";
import { useMarketPrices, MarketPrice } from "@/hooks/useMarketPrices";
import { useToast } from "@/hooks/use-toast";

interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

const TradePanel = () => {
  const { language } = useLanguage();
  const { challenge, openTrades, openTrade, closeTrade, loading: challengeLoading, calculateRealTimeEquity } = useChallenge();
  const { prices, loading: pricesLoading, refetch: refetchPrices } = useMarketPrices(15000); // Update every 15s
  const { toast } = useToast();
  
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC/USD");
  const [amount, setAmount] = useState<string>("100");
  const [leverage, setLeverage] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);

  // Convert market prices to assets format
  const assets: Asset[] = useMemo(() => {
    return prices.map((p) => ({
      symbol: p.symbol,
      name: p.name,
      price: p.price,
      change: p.change24h,
    }));
  }, [prices]);

  // Get selected asset from prices
  const selectedAsset = useMemo(() => {
    const found = assets.find((a) => a.symbol === selectedSymbol);
    return found || { symbol: selectedSymbol, name: "", price: 0, change: 0 };
  }, [assets, selectedSymbol]);

  // Calculate real-time equity
  const realTimeEquity = useMemo(() => {
    if (!challenge) return 0;
    
    const currentPrices = assets.reduce((acc, asset) => {
      acc[asset.symbol] = asset.price;
      return acc;
    }, {} as Record<string, number>);
    
    return calculateRealTimeEquity(currentPrices);
  }, [challenge, assets, calculateRealTimeEquity]);

  const texts = {
    en: {
      selectAsset: "Select Asset",
      amount: "Amount ($)",
      leverage: "Leverage",
      buy: "Buy",
      sell: "Sell",
      position: "Position",
      commission: "Commission",
      openPositions: "Open Positions",
      closePosition: "Close",
      noChallenge: "No active challenge",
      buyNow: "Purchase a challenge to start trading",
      entry: "Entry",
      current: "Current",
      pnl: "P&L",
    },
    fr: {
      selectAsset: "Sélectionner l'actif",
      amount: "Montant ($)",
      leverage: "Levier",
      buy: "Acheter",
      sell: "Vendre",
      position: "Position",
      commission: "Commission",
      openPositions: "Positions Ouvertes",
      closePosition: "Fermer",
      noChallenge: "Aucun challenge actif",
      buyNow: "Achetez un challenge pour commencer à trader",
      entry: "Entrée",
      current: "Actuel",
      pnl: "P&L",
    },
    ar: {
      selectAsset: "اختر الأصل",
      amount: "المبلغ ($)",
      leverage: "الرافعة المالية",
      buy: "شراء",
      sell: "بيع",
      position: "المركز",
      commission: "العمولة",
      openPositions: "المراكز المفتوحة",
      closePosition: "إغلاق",
      noChallenge: "لا يوجد تحدي نشط",
      buyNow: "اشترِ تحديًا لبدء التداول",
      entry: "الدخول",
      current: "الحالي",
      pnl: "الربح/الخسارة",
    },
  };

  const txt = texts[language];

  const handleTrade = async (type: "buy" | "sell") => {
    if (!challenge) return;
    
    const tradeAmount = parseFloat(amount) || 0;
    
    // Validate amount against real-time equity
    if (tradeAmount <= 0 || tradeAmount > realTimeEquity) {
      toast({
        title: 'Invalid Amount',
        description: `Trade amount must be positive and less than your available equity ($${realTimeEquity.toFixed(2)}).`,
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await openTrade({
        assetSymbol: selectedAsset.symbol,
        tradeType: type,
        amount: tradeAmount,
        entryPrice: selectedAsset.price,
        leverage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTrade = async (tradeId: string) => {
    // Find the trade to get its asset
    const trade = openTrades.find((t) => t.id === tradeId);
    if (!trade) return;

    // Get current price for this asset
    const asset = assets.find((a) => a.symbol === trade.asset_symbol);
    const exitPrice = asset?.price || trade.entry_price;

    setClosingTradeId(tradeId);
    try {
      await closeTrade(tradeId, exitPrice);
    } finally {
      setClosingTradeId(null);
    }
  };

  const calculateUnrealizedPnL = (trade: typeof openTrades[0]) => {
    const asset = assets.find((a) => a.symbol === trade.asset_symbol);
    if (!asset) return 0;

    const priceChange = asset.price - trade.entry_price;
    const direction = trade.trade_type === 'buy' ? 1 : -1;
    return (priceChange / trade.entry_price) * trade.amount * trade.leverage * direction;
  };

  if (!challenge) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="text-lg font-semibold mb-2">{txt.noChallenge}</p>
        <p className="text-muted-foreground text-sm">{txt.buyNow}</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Asset Selection */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">{txt.selectAsset}</label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {assets.map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => setSelectedSymbol(asset.symbol)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedSymbol === asset.symbol
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 bg-secondary/30"
              }`}
            >
              <p className="font-mono text-xs font-semibold truncate">{asset.symbol}</p>
              <p className={`text-xs font-mono ${asset.change >= 0 ? "text-profit" : "text-loss"}`}>
                {asset.change >= 0 ? "+" : ""}{asset.change.toFixed(2)}%
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Asset Info */}
      <div className="p-4 rounded-xl bg-secondary/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{selectedAsset.name}</p>
            <p className="text-2xl font-bold font-mono">${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-full ${
              selectedAsset.change >= 0 ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
            }`}
          >
            {selectedAsset.change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="font-mono text-sm">
              {selectedAsset.change >= 0 ? "+" : ""}{selectedAsset.change.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">{txt.amount}</label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono transition-all"
            placeholder="100"
            max={realTimeEquity}
          />
        </div>
        <div className="flex gap-2 mt-2">
          {[100, 250, 500, 1000].map((value) => (
            <button
              key={value}
              onClick={() => setAmount(Math.min(value, realTimeEquity).toString())}
              className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-mono transition-colors"
            >
              ${value}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Available: <span className="font-mono text-foreground">${realTimeEquity.toFixed(2)}</span>
        </p>
      </div>

      {/* Leverage */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
          <Percent className="w-4 h-4" />
          {txt.leverage}
        </label>
        <div className="flex gap-2">
          {[1, 2, 5, 10, 20].map((lev) => (
            <button
              key={lev}
              onClick={() => setLeverage(lev)}
              className={`flex-1 py-2 rounded-lg text-sm font-mono transition-all ${
                leverage === lev
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              x{lev}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Buttons */}
      <div className="grid grid-cols-2 gap-4 pt-4">
        <Button 
          variant="buy" 
          size="lg" 
          onClick={() => handleTrade("buy")} 
          className="h-14"
          disabled={isSubmitting || challengeLoading || challenge.status !== 'active' || realTimeEquity <= 0}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <TrendingUp className="w-5 h-5 mr-2" />
              {txt.buy}
            </>
          )}
        </Button>
        <Button 
          variant="sell" 
          size="lg" 
          onClick={() => handleTrade("sell")} 
          className="h-14"
          disabled={isSubmitting || challengeLoading || challenge.status !== 'active' || realTimeEquity <= 0}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <TrendingDown className="w-5 h-5 mr-2" />
              {txt.sell}
            </>
          )}
        </Button>
      </div>

      {/* Trade Info */}
      <div className="text-xs text-muted-foreground text-center pt-2">
        {txt.position}: ${(parseFloat(amount || "0") * leverage).toLocaleString()} • {txt.commission}: 0.1%
      </div>

      {/* Open Positions */}
      {openTrades.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-semibold mb-3">{txt.openPositions}</h4>
          <div className="space-y-2 max-h-48 overflow-auto">
            {openTrades.map((trade) => {
              const unrealizedPnL = calculateUnrealizedPnL(trade);
              const isProfit = unrealizedPnL >= 0;
              
              return (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        trade.trade_type === "buy"
                          ? "bg-profit/20 text-profit"
                          : "bg-loss/20 text-loss"
                      }`}
                    >
                      {trade.trade_type.toUpperCase()}
                    </span>
                    <div>
                      <p className="font-mono text-sm font-medium">{trade.asset_symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {txt.entry}: ${trade.entry_price.toFixed(2)} • x{trade.leverage}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-mono text-sm ${isProfit ? "text-profit" : "text-loss"}`}>
                        {isProfit ? "+" : ""}${unrealizedPnL.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">${trade.amount.toFixed(2)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCloseTrade(trade.id)}
                      disabled={closingTradeId === trade.id}
                      className="h-8 w-8 p-0"
                    >
                      {closingTradeId === trade.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradePanel;
