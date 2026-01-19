import { TrendingUp, TrendingDown, AlertCircle, Sparkles, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Signal {
  id: string;
  symbol: string;
  type: "BUY" | "SELL" | "STOP";
  confidence: number;
  price: string;
  target?: string;
  stopLoss?: string;
  reason: { en: string; fr: string; ar: string };
  timestamp: Date;
}



const AISignals = () => {
  const { language } = useLanguage();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Fetch real-time AI signals
  useEffect(() => {
    const fetchRealTimeSignals = async () => {
      try {
        setLoading(true);
        // This would connect to your Flask backend endpoint
        // Replace with your actual backend endpoint
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ai-signals`, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Transform API response to match Signal interface
          const transformedSignals: Signal[] = data.signals.map((signal: any) => ({
            id: signal.id,
            symbol: signal.symbol,
            type: signal.type,
            confidence: signal.confidence,
            price: signal.price,
            target: signal.target,
            stopLoss: signal.stop_loss || signal.stopLoss,
            reason: {
              en: signal.reason.en || signal.reason,
              fr: signal.reason.fr || signal.reason,
              ar: signal.reason.ar || signal.reason,
            },
            timestamp: new Date(signal.timestamp),
          }));
          
          setSignals(transformedSignals);
        } else {
          // Fallback to mock signals if API fails
          const fallbackSignals: Signal[] = [
            {
              id: "1",
              symbol: "BTC/USD",
              type: "BUY",
              confidence: 87,
              price: "94,567.25",
              target: "96,200.00",
              stopLoss: "93,800.00",
              reason: {
                en: "Resistance breakout with high volume",
                fr: "Breakout du niveau de résistance avec volume élevé",
                ar: "اختراق مستوى المقاومة مع حجم تداول مرتفع",
              },
              timestamp: new Date(Date.now() - 120000),
            },
            {
              id: "2",
              symbol: "ETH/USD",
              type: "SELL",
              confidence: 72,
              price: "3,456.78",
              target: "3,350.00",
              stopLoss: "3,520.00",
              reason: {
                en: "Double top formation detected",
                fr: "Double top formation détectée",
                ar: "تم اكتشاف نموذج القمة المزدوجة",
              },
              timestamp: new Date(Date.now() - 300000),
            },
            {
              id: "3",
              symbol: "AAPL",
              type: "STOP",
              confidence: 65,
              price: "178.45",
              reason: {
                en: "Consolidation zone, await confirmation",
                fr: "Zone de consolidation, attendre confirmation",
                ar: "منطقة تجميع، انتظر التأكيد",
              },
              timestamp: new Date(Date.now() - 600000),
            },
          ];
          setSignals(fallbackSignals);
        }
      } catch (error) {
        console.error('Error fetching real-time signals:', error);
        // Fallback to mock signals if API fails
        const fallbackSignals: Signal[] = [
          {
            id: "1",
            symbol: "BTC/USD",
            type: "BUY",
            confidence: 87,
            price: "94,567.25",
            target: "96,200.00",
            stopLoss: "93,800.00",
            reason: {
              en: "Resistance breakout with high volume",
              fr: "Breakout du niveau de résistance avec volume élevé",
              ar: "اختراق مستوى المقاومة مع حجم تداول مرتفع",
            },
            timestamp: new Date(Date.now() - 120000),
          },
          {
            id: "2",
            symbol: "ETH/USD",
            type: "SELL",
            confidence: 72,
            price: "3,456.78",
            target: "3,350.00",
            stopLoss: "3,520.00",
            reason: {
              en: "Double top formation detected",
              fr: "Double top formation détectée",
              ar: "تم اكتشاف نموذج القمة المزدوجة",
            },
            timestamp: new Date(Date.now() - 300000),
          },
          {
            id: "3",
            symbol: "AAPL",
            type: "STOP",
            confidence: 65,
            price: "178.45",
            reason: {
              en: "Consolidation zone, await confirmation",
              fr: "Zone de consolidation, attendre confirmation",
              ar: "منطقة تجميع، انتظر التأكيد",
            },
            timestamp: new Date(Date.now() - 600000),
          },
        ];
        setSignals(fallbackSignals);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRealTimeSignals();
    
    // Refresh signals every 30 seconds
    const interval = setInterval(fetchRealTimeSignals, 30000);
    
    return () => clearInterval(interval);
  }, [language]);


  const texts = {
    en: {
      title: "AI Signals",
      subtitle: "Real-time analysis",
      analyzing: "Analyzing...",
      price: "Price",
      target: "Target",
      stop: "Stop",
      disclaimer: "⚠️ AI signals are suggestions. Do your own analysis.",
      justNow: "Just now",
      minAgo: (n: number) => `${n}min ago`,
      hoursAgo: (n: number) => `${n}h ago`,
    },
    fr: {
      title: "Signaux IA",
      subtitle: "Analyse en temps réel",
      analyzing: "Analyse...",
      price: "Prix",
      target: "Cible",
      stop: "Stop",
      disclaimer: "⚠️ Les signaux IA sont des suggestions. Faites vos propres analyses.",
      justNow: "À l'instant",
      minAgo: (n: number) => `Il y a ${n}min`,
      hoursAgo: (n: number) => `Il y a ${n}h`,
    },
    ar: {
      title: "إشارات الذكاء الاصطناعي",
      subtitle: "تحليل في الوقت الفعلي",
      analyzing: "جاري التحليل...",
      price: "السعر",
      target: "الهدف",
      stop: "وقف الخسارة",
      disclaimer: "⚠️ إشارات الذكاء الاصطناعي هي اقتراحات. قم بتحليلك الخاص.",
      justNow: "الآن",
      minAgo: (n: number) => `منذ ${n} دقيقة`,
      hoursAgo: (n: number) => `منذ ${n} ساعة`,
    },
  };

  const txt = texts[language];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnalyzing(true);
      setTimeout(() => setIsAnalyzing(false), 2000);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getSignalColor = (type: Signal["type"]) => {
    switch (type) {
      case "BUY":
        return "bg-profit/20 text-profit border-profit/30";
      case "SELL":
        return "bg-loss/20 text-loss border-loss/30";
      case "STOP":
        return "bg-accent/20 text-accent border-accent/30";
    }
  };

  const getSignalIcon = (type: Signal["type"]) => {
    switch (type) {
      case "BUY":
        return <ArrowUpRight className="w-4 h-4" />;
      case "SELL":
        return <ArrowDownRight className="w-4 h-4" />;
      case "STOP":
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatTime = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1) return txt.justNow;
    if (diff < 60) return txt.minAgo(diff);
    return txt.hoursAgo(Math.floor(diff / 60));
  };

  return (
    <div className="glass-card rounded-2xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{txt.title}</h3>
            <p className="text-xs text-muted-foreground">{txt.subtitle}</p>
          </div>
        </div>
        {isAnalyzing && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {txt.analyzing}
          </div>
        )}
      </div>

      {/* Signals List */}
      <div className="flex-1 space-y-4 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{txt.analyzing}</p>
            </div>
          </div>
        ) : signals.length > 0 ? (
          signals.map((signal) => (
            <div
              key={signal.id}
              className={`p-4 rounded-xl border ${getSignalColor(signal.type)} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{signal.symbol}</span>
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getSignalColor(
                      signal.type
                    )}`}
                  >
                    {getSignalIcon(signal.type)}
                    {signal.type}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatTime(signal.timestamp)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div>
                  <span className="text-muted-foreground">{txt.price}</span>
                  <p className="font-mono font-medium">${signal.price}</p>
                </div>
                {signal.target && (
                  <div>
                    <span className="text-muted-foreground">{txt.target}</span>
                    <p className="font-mono font-medium text-profit">${signal.target}</p>
                  </div>
                )}
                {signal.stopLoss && (
                  <div>
                    <span className="text-muted-foreground">{txt.stop}</span>
                    <p className="font-mono font-medium text-loss">${signal.stopLoss}</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">{signal.reason[language]}</p>

              {/* Confidence */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      signal.confidence >= 80
                        ? "bg-profit"
                        : signal.confidence >= 60
                        ? "bg-accent"
                        : "bg-muted-foreground"
                    }`}
                    style={{ width: `${signal.confidence}%` }}
                  />
                </div>
                <span className="text-xs font-mono">{signal.confidence}%</span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">No signals available</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          {txt.disclaimer}
        </p>
      </div>
    </div>
  );
};

export default AISignals;
