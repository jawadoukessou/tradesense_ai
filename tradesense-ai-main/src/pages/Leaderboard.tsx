import { useEffect, useState, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Trophy, Medal, TrendingUp, Crown, Star, Flame, Loader2, Zap, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl: number;
  best_trade: number;
  worst_trade: number;
  profit_percent: number;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-6 h-6 text-yellow-400" />;
    case 2:
      return <Medal className="w-6 h-6 text-gray-300" />;
    case 3:
      return <Medal className="w-6 h-6 text-amber-600" />;
    default:
      return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30";
    case 2:
      return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30";
    case 3:
      return "bg-gradient-to-r from-amber-600/20 to-orange-600/10 border-amber-600/30";
    default:
      return "bg-secondary/30 border-border/50";
  }
};

const getBadge = (profitPercent: number) => {
  if (profitPercent >= 30) return "elite";
  if (profitPercent >= 15) return "pro";
  return null;
};

const Leaderboard = () => {
  const { language } = useLanguage();
  const [traders, setTraders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const texts = {
    en: {
      badge: "Monthly Ranking",
      title: "Top",
      titleHighlight: "Traders",
      subtitle: "Best performers of the month. Reach top 10 and win exclusive rewards.",
      activeTraders: "Active Traders",
      totalTrades: "Total Trades",
      totalProfit: "Total Profit",
      avgWinRate: "Avg Win Rate",
      rank: "Rank",
      trader: "Trader",
      profit: "Profit",
      trades: "Trades",
      winRate: "Win Rate",
      pnl: "PnL",
      showing: "Showing top 10 traders.",
      viewFull: "View full ranking →",
      noData: "No trading data available yet this month.",
      loading: "Loading leaderboard...",
      anonymous: "Anonymous Trader",
    },
    fr: {
      badge: "Classement Mensuel",
      title: "Top",
      titleHighlight: "Traders",
      subtitle: "Les meilleurs performers du mois. Atteignez le top 10 et gagnez des récompenses exclusives.",
      activeTraders: "Traders Actifs",
      totalTrades: "Total Trades",
      totalProfit: "Profit Total",
      avgWinRate: "Win Rate Moyen",
      rank: "Rang",
      trader: "Trader",
      profit: "Profit",
      trades: "Trades",
      winRate: "Win Rate",
      pnl: "PnL",
      showing: "Affichage des 10 meilleurs traders.",
      viewFull: "Voir le classement complet →",
      noData: "Aucune donnée de trading disponible ce mois-ci.",
      loading: "Chargement du classement...",
      anonymous: "Trader Anonyme",
    },
    ar: {
      badge: "التصنيف الشهري",
      title: "أفضل",
      titleHighlight: "المتداولين",
      subtitle: "أفضل الأداء هذا الشهر. احتل المراكز العشر الأولى واربح مكافآت حصرية.",
      activeTraders: "المتداولين النشطين",
      totalTrades: "إجمالي الصفقات",
      totalProfit: "إجمالي الربح",
      avgWinRate: "متوسط معدل الفوز",
      rank: "الترتيب",
      trader: "المتداول",
      profit: "الربح",
      trades: "الصفقات",
      winRate: "معدل الفوز",
      pnl: "الربح/الخسارة",
      showing: "عرض أفضل 10 متداولين.",
      viewFull: "عرض التصنيف الكامل ←",
      noData: "لا توجد بيانات تداول متاحة هذا الشهر.",
      loading: "جاري تحميل التصنيف...",
      anonymous: "متداول مجهول",
    },
  };

  const txt = texts[language];
  const channelRef = useRef<any>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      // First, try to get monthly leaderboard data
      const { data: monthlyData, error: monthlyError } = await supabase
        .from("monthly_leaderboard")
        .select("*");

      if (monthlyError) {
        console.error("Error fetching monthly leaderboard:", monthlyError);
        throw monthlyError;
      }

      // If monthly leaderboard is empty, fetch all-time leaderboard
      let leaderboardData = monthlyData as LeaderboardEntry[];
      
      if (!monthlyData || monthlyData.length === 0) {
        console.log("No monthly data found, fetching data from trades directly");
        
        // Fallback: get data by querying trades and profiles separately
        const { data: tradesData, error: tradesError } = await supabase
          .from('trades')
          .select('user_id, pnl, is_open')
          .eq('is_open', false)
          .limit(100); // Get recent closed trades
          
        if (!tradesError && tradesData && tradesData.length > 0) {
          // Group trades by user and calculate metrics
          const userMetricsMap = new Map();
          
          tradesData.forEach(trade => {
            if (!userMetricsMap.has(trade.user_id)) {
              userMetricsMap.set(trade.user_id, {
                total_trades: 0,
                winning_trades: 0,
                losing_trades: 0,
                total_pnl: 0,
                win_rate: 0,
                avg_pnl: 0,
                best_trade: -Infinity,
                worst_trade: Infinity
              });
            }
            
            const metrics = userMetricsMap.get(trade.user_id);
            metrics.total_trades++;
            const pnlValue = trade.pnl !== null ? parseFloat(trade.pnl.toString()) : 0;
            metrics.total_pnl += pnlValue;
            
            if (pnlValue > 0) {
              metrics.winning_trades++;
            } else {
              metrics.losing_trades++;
            }
            
            metrics.best_trade = Math.max(metrics.best_trade, pnlValue);
            metrics.worst_trade = Math.min(metrics.worst_trade, pnlValue);
          });
          
          // Convert map to array and sort by total_pnl
          const sortedUsers = Array.from(userMetricsMap.entries())
            .map(([user_id, metrics]) => ({
              user_id,
              ...metrics,
              win_rate: metrics.total_trades > 0 ? (metrics.winning_trades / metrics.total_trades) * 100 : 0,
              avg_pnl: metrics.total_trades > 0 ? metrics.total_pnl / metrics.total_trades : 0,
              full_name: null, // Will fetch separately
              avatar_url: null, // Will fetch separately
              profit_percent: 0 // Placeholder
            }))
            .sort((a, b) => b.total_pnl - a.total_pnl)
            .slice(0, 10);
          
          // Now fetch user profiles for the top users
          if (sortedUsers.length > 0) {
            const userIds = sortedUsers.map(u => u.user_id);
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .in('id', userIds);
            
            // Merge profile data with metrics
            leaderboardData = sortedUsers.map(user => {
              const profile = profilesData?.find(p => p.id === user.user_id);
              return {
                ...user,
                full_name: profile?.full_name || null,
                avatar_url: profile?.avatar_url || null,
              };
            });
          }
        }
      }
      
      setTraders(leaderboardData || []);
    } catch (err: any) {
      console.error("Error fetching leaderboard:", err);
      setError(err.message || "Failed to fetch leaderboard data");
      setTraders([]); // Ensure traders is reset on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial leaderboard
    fetchLeaderboard();

    // Set up real-time subscription to trades
    channelRef.current = supabase
      .channel('trades-leaderboard')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trades',
        },
        (payload) => {
          console.log('Trade updated:', payload);
          // Refresh leaderboard when a trade is updated (closed)
          setTimeout(() => fetchLeaderboard(), 1000); // Small delay to allow DB to update
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
        },
        (payload) => {
          console.log('New trade created:', payload);
          // Refresh leaderboard when a new trade is created
          setTimeout(() => fetchLeaderboard(), 1000);
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Calculate aggregate stats
  const totalTraders = traders.length;
  const totalTradesCount = traders.reduce((sum, t) => sum + t.total_trades, 0);
  const totalProfitSum = traders.reduce((sum, t) => sum + Number(t.total_pnl), 0);
  const avgWinRate = traders.length > 0
    ? (traders.reduce((sum, t) => sum + Number(t.win_rate), 0) / traders.length).toFixed(0)
    : "0";

  const stats = [
    { label: txt.activeTraders, value: totalTraders.toString(), icon: TrendingUp },
    { label: txt.totalTrades, value: totalTradesCount.toLocaleString(), icon: Flame },
    { label: txt.totalProfit, value: `$${totalProfitSum.toLocaleString()}`, icon: Trophy },
    { label: txt.avgWinRate, value: `${avgWinRate}%`, icon: Star },
  ];

  const currentMonth = new Date().toLocaleDateString(
    language === "ar" ? "ar-EG" : language === "fr" ? "fr-FR" : "en-US",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-card mb-6">
              <Trophy className="w-6 h-6 text-accent" />
              <span className="text-lg font-semibold">{txt.badge} - {currentMonth}</span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold">
                {txt.title} <span className="gradient-text-gold">{txt.titleHighlight}</span>
              </h1>
              <div className="flex items-center gap-2 text-green-500">
                <Zap className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-medium">{language === 'en' ? 'LIVE' : language === 'fr' ? 'EN DIRECT' : 'مباشر'}</span>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {txt.subtitle}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="glass-card rounded-xl p-4 text-center">
                <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">{txt.loading}</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-20">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && traders.length === 0 && (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">{txt.noData}</p>
            </div>
          )}

          {/* Leaderboard Table */}
          {!loading && !error && traders.length > 0 && (
            <div className="max-w-5xl mx-auto">
              <div className="glass-card rounded-2xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-secondary/50 text-sm font-medium text-muted-foreground border-b border-border/50">
                  <div className="col-span-1">{txt.rank}</div>
                  <div className="col-span-4">{txt.trader}</div>
                  <div className="col-span-2 text-end">{txt.profit}</div>
                  <div className="col-span-2 text-end">{txt.trades}</div>
                  <div className="col-span-2 text-end">{txt.winRate}</div>
                  <div className="col-span-1 text-end">{txt.pnl}</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-border/30">
                  {traders.map((trader, index) => {
                    const rank = index + 1;
                    const badge = getBadge(Number(trader.profit_percent));
                    
                    return (
                      <div
                        key={trader.user_id}
                        className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-secondary/30 transition-colors border-s-4 ${getRankStyle(rank)}`}
                      >
                        {/* Rank */}
                        <div className="col-span-1 flex items-center justify-center">
                          {getRankIcon(rank)}
                        </div>

                        {/* Trader Info */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
                            {trader.avatar_url ? (
                              <img 
                                src={trader.avatar_url} 
                                alt={trader.full_name || txt.anonymous}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-lg font-bold">
                                {(trader.full_name || "A")[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {trader.full_name || txt.anonymous}
                              </span>
                              {badge === "elite" && (
                                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-accent to-yellow-400 text-accent-foreground text-xs font-bold">
                                  ELITE
                                </span>
                              )}
                              {badge === "pro" && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                                  PRO
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Profit Percent */}
                        <div className="col-span-2 text-end">
                          <span className={`font-mono font-bold ${Number(trader.profit_percent) >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {Number(trader.profit_percent) >= 0 ? '+' : ''}{trader.profit_percent}%
                          </span>
                        </div>

                        {/* Trades */}
                        <div className="col-span-2 text-end font-mono">{trader.total_trades}</div>

                        {/* Win Rate */}
                        <div className="col-span-2 text-end">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full bg-profit"
                                style={{ width: `${trader.win_rate}%` }}
                              />
                            </div>
                            <span className="font-mono text-sm">{trader.win_rate}%</span>
                          </div>
                        </div>

                        {/* Total PnL */}
                        <div className="col-span-1 text-end">
                          <span className={`font-mono font-bold ${Number(trader.total_pnl) >= 0 ? 'text-profit' : 'text-loss'}`}>
                            ${Number(trader.total_pnl).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refresh button and pagination hint */}
              <div className="flex flex-col items-center mt-8 gap-4">
                <button 
                  onClick={() => fetchLeaderboard()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  {language === 'en' ? 'Refresh' : language === 'fr' ? 'Actualiser' : 'تحديث'}
                </button>
                <p className="text-muted-foreground text-sm">
                  {txt.showing}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Leaderboard;