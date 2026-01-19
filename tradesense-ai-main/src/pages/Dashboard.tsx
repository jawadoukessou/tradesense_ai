import Header from "@/components/Header";
import TradingChart, { type TimeFrame } from "@/components/TradingChart";
import ChallengeStatus from "@/components/ChallengeStatus";
import AISignals from "@/components/AISignals";
import TradePanel from "@/components/TradePanel";
import PriceAlerts from "@/components/PriceAlerts";
import { Activity, Clock, BarChart2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useChallenge } from "@/hooks/useChallenge";
import { useMarketPrices } from "@/hooks/useMarketPrices";

const Dashboard = () => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>("1m");
  const { trades, challenge } = useChallenge();
  const { prices, getPrice } = useMarketPrices(15000); // Refresh every 15 seconds
  
  // Get real BTC price
  const btcPrice = getPrice("BTC/USD");

  const texts = {
    en: {
      title: "Trading",
      titlePrefix: "Dashboard",
      welcome: "Welcome, Trader. Your challenge is active.",
      welcomeNoChallenge: "Welcome! Get started by purchasing a challenge.",
      session: "Session",
      marketsOpen: "Markets Open",
      recentTrades: "Recent Trades",
      noTrades: "No trades yet. Start trading!",
      date: "Date",
      asset: "Asset",
      type: "Type",
      price: "Price",
      amount: "Amount",
      pnl: "P&L",
      status: "Status",
      open: "Open",
      closed: "Closed",
    },
    fr: {
      title: "Trading",
      titlePrefix: "Dashboard",
      welcome: "Bienvenue, Trader. Votre challenge est actif.",
      welcomeNoChallenge: "Bienvenue ! Commencez par acheter un challenge.",
      session: "Session",
      marketsOpen: "Marchés Ouverts",
      recentTrades: "Trades Récents",
      noTrades: "Aucun trade encore. Commencez à trader !",
      date: "Date",
      asset: "Actif",
      type: "Type",
      price: "Prix",
      amount: "Montant",
      pnl: "P&L",
      status: "Statut",
      open: "Ouvert",
      closed: "Fermé",
    },
    ar: {
      title: "التداول",
      titlePrefix: "لوحة التحكم",
      welcome: "مرحباً، متداول. تحديك نشط.",
      welcomeNoChallenge: "مرحباً! ابدأ بشراء تحدي.",
      session: "الجلسة",
      marketsOpen: "الأسواق مفتوحة",
      recentTrades: "الصفقات الأخيرة",
      noTrades: "لا توجد صفقات بعد. ابدأ التداول!",
      date: "التاريخ",
      asset: "الأصل",
      type: "النوع",
      price: "السعر",
      amount: "المبلغ",
      pnl: "الربح/الخسارة",
      status: "الحالة",
      open: "مفتوح",
      closed: "مغلق",
    },
  };

  const txt = texts[language];

  // Handle PayPal return - capture the payment
  useEffect(() => {
    const capturePayment = async () => {
      const paymentStatus = searchParams.get('payment');
      const token = searchParams.get('token'); // PayPal order ID

      if (paymentStatus === 'success' && token && !isCapturing) {
        setIsCapturing(true);
        
        try {
          const { data, error } = await supabase.functions.invoke('capture-paypal-order', {
            body: { orderId: token },
          });

          if (error) throw error;

          if (data?.success) {
            toast({
              title: language === 'fr' ? '🎉 Paiement Réussi !' : 
                     language === 'ar' ? '🎉 تم الدفع بنجاح!' : 
                     '🎉 Payment Successful!',
              description: language === 'fr' ? 'Votre challenge est maintenant actif. Bonne chance !' :
                          language === 'ar' ? 'تحديك نشط الآن. حظاً موفقاً!' :
                          'Your challenge is now active. Good luck!',
            });
          }
        } catch (error) {
          console.error('Capture error:', error);
          toast({
            title: 'Payment Error',
            description: 'Failed to complete payment. Please contact support.',
            variant: 'destructive',
          });
        } finally {
          // Clear URL params
          setSearchParams({});
          setIsCapturing(false);
        }
      }
    };

    capturePayment();
  }, [searchParams]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isRTL = language === 'ar';

  // Show last 10 trades (closed ones first)
  const recentTrades = trades
    .sort((a, b) => {
      // Open trades first, then by date
      if (a.is_open !== b.is_open) return a.is_open ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 10);

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Header />

      <main className="pt-20 pb-16 px-4 md:px-6 lg:px-8">
        <div className="container mx-auto max-w-[1600px]">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 animate-fade-in">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                {txt.titlePrefix} <span className="gradient-text">{txt.title}</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                {challenge ? txt.welcome : txt.welcomeNoChallenge}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-card border border-border/50 shadow-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-mono font-medium">{txt.session}: 4h 23m</span>
              </div>
              <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-profit/10 border border-profit/20 text-profit shadow-sm">
                <div className="relative">
                  <Activity className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-profit rounded-full animate-pulse" />
                </div>
                <span className="text-sm font-semibold">{txt.marketsOpen}</span>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Chart & Trade Panel - Takes 8 columns */}
            <div className="lg:col-span-8 space-y-6">
              {/* Chart Card */}
              <div className="bg-card rounded-3xl p-5 md:p-6 border border-border/50 shadow-lg overflow-hidden animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
                      <BarChart2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">BTC/USD</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          btcPrice?.change24h && btcPrice.change24h >= 0 
                            ? 'bg-profit/15 text-profit' 
                            : 'bg-loss/15 text-loss'
                        }`}>
                          {btcPrice?.change24h ? `${btcPrice.change24h >= 0 ? '↑' : '↓'} ${Math.abs(btcPrice.change24h).toFixed(2)}%` : '---'}
                        </span>
                      </div>
                      <span className="text-3xl font-bold font-mono tracking-tight">
                        ${btcPrice?.price ? btcPrice.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 p-1.5 bg-muted/50 rounded-xl">
                    {(["1m", "5m", "15m", "1h", "4h", "1D"] as TimeFrame[]).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setSelectedTimeframe(tf)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                          selectedTimeframe === tf 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "text-muted-foreground hover:text-foreground hover:bg-background"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[420px] rounded-2xl overflow-hidden bg-muted/20">
                  <TradingChart timeframe={selectedTimeframe} />
                </div>
              </div>

              {/* Trade Panel */}
              <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <TradePanel />
              </div>
            </div>

            {/* Sidebar - Takes 4 columns */}
            <div className="lg:col-span-4 space-y-6">
              {/* Challenge Status */}
              <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                <ChallengeStatus />
              </div>

              {/* AI Signals */}
              <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                <AISignals />
              </div>

              {/* Price Alerts */}
              <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
                <PriceAlerts />
              </div>
            </div>
          </div>

          {/* Recent Trades Table */}
          <div className="mt-8 bg-card rounded-3xl p-6 md:p-8 border border-border/50 shadow-lg animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold">{txt.recentTrades}</h3>
            </div>
            {recentTrades.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">{txt.noTrades}</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="text-start text-sm text-muted-foreground">
                      <th className="pb-4 font-semibold">{txt.date}</th>
                      <th className="pb-4 font-semibold">{txt.asset}</th>
                      <th className="pb-4 font-semibold">{txt.type}</th>
                      <th className="pb-4 font-semibold">{txt.price}</th>
                      <th className="pb-4 font-semibold">{txt.amount}</th>
                      <th className="pb-4 font-semibold">{txt.status}</th>
                      <th className="pb-4 font-semibold text-end">{txt.pnl}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {recentTrades.map((trade, index) => (
                      <tr 
                        key={trade.id} 
                        className="hover:bg-muted/30 transition-colors group"
                        style={{ animationDelay: `${350 + index * 50}ms` }}
                      >
                        <td className="py-5 text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                          {formatDate(trade.created_at)}
                        </td>
                        <td className="py-5">
                          <span className="font-mono font-bold text-foreground">{trade.asset_symbol}</span>
                        </td>
                        <td className="py-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                              trade.trade_type === "buy" 
                                ? "bg-profit/15 text-profit border border-profit/20" 
                                : "bg-loss/15 text-loss border border-loss/20"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${trade.trade_type === "buy" ? "bg-profit" : "bg-loss"}`} />
                            {trade.trade_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-5 font-mono">
                          <span className="font-semibold">${trade.entry_price.toFixed(2)}</span>
                          {trade.exit_price && (
                            <span className="text-muted-foreground text-sm ml-1">
                              → <span className="text-foreground">${trade.exit_price.toFixed(2)}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-5 font-mono font-medium">${trade.amount.toFixed(2)}</td>
                        <td className="py-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                              trade.is_open 
                                ? "bg-primary/15 text-primary border border-primary/20" 
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {trade.is_open && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                            {trade.is_open ? txt.open : txt.closed}
                          </span>
                        </td>
                        <td className={`py-5 font-mono font-bold text-end text-base ${
                          trade.pnl === null 
                            ? "text-muted-foreground" 
                            : trade.pnl >= 0 
                            ? "text-profit" 
                            : "text-loss"
                        }`}>
                          {trade.pnl === null 
                            ? "-" 
                            : `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}`
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
