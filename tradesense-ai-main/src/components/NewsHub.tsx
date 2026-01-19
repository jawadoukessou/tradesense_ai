import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper, TrendingUp, TrendingDown, Clock, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  sentiment: "positive" | "negative" | "neutral";
  category: string;
  url?: string;
}

const NewsHub = () => {
  const { language } = useLanguage();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const content = {
    en: {
      title: "Live Financial News",
      subtitle: "Stay updated with the latest market movements",
      categories: {
        all: "All",
        crypto: "Crypto",
        forex: "Forex",
        stocks: "Stocks",
        commodities: "Commodities"
      },
      loading: "Loading news...",
      noNews: "No news available",
      readMore: "Read more"
    },
    fr: {
      title: "Actualités Financières en Direct",
      subtitle: "Restez informé des derniers mouvements du marché",
      categories: {
        all: "Tout",
        crypto: "Crypto",
        forex: "Forex",
        stocks: "Actions",
        commodities: "Matières Premières"
      },
      loading: "Chargement des actualités...",
      noNews: "Aucune actualité disponible",
      readMore: "Lire plus"
    },
    ar: {
      title: "أخبار مالية مباشرة",
      subtitle: "ابق على اطلاع بآخر تحركات السوق",
      categories: {
        all: "الكل",
        crypto: "كريبتو",
        forex: "فوركس",
        stocks: "أسهم",
        commodities: "سلع"
      },
      loading: "جاري تحميل الأخبار...",
      noNews: "لا توجد أخبار متاحة",
      readMore: "اقرأ المزيد"
    }
  };

  const t = content[language as keyof typeof content] || content.en;

  // Mock financial news data - in production, this would come from a real API
  const mockNews: NewsItem[] = [
    {
      id: "1",
      title: "Bitcoin Surges Past $100K as Institutional Adoption Accelerates",
      summary: "Major financial institutions continue to add Bitcoin to their portfolios, driving unprecedented price action in the cryptocurrency market.",
      source: "CryptoNews",
      publishedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      sentiment: "positive",
      category: "crypto"
    },
    {
      id: "2",
      title: "EUR/USD Drops Following ECB Rate Decision",
      summary: "The European Central Bank maintained interest rates, causing the Euro to weaken against the US Dollar in early trading.",
      source: "ForexDaily",
      publishedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      sentiment: "negative",
      category: "forex"
    },
    {
      id: "3",
      title: "Gold Prices Steady Amid Global Economic Uncertainty",
      summary: "Safe-haven assets remain in demand as investors navigate ongoing geopolitical tensions and inflation concerns.",
      source: "MarketWatch",
      publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      sentiment: "neutral",
      category: "commodities"
    },
    {
      id: "4",
      title: "Tech Stocks Rally on Strong Q4 Earnings Reports",
      summary: "Leading technology companies beat analyst expectations, pushing major indices to new all-time highs.",
      source: "Bloomberg",
      publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      sentiment: "positive",
      category: "stocks"
    },
    {
      id: "5",
      title: "Ethereum 2.0 Staking Reaches New Milestone",
      summary: "Over 30 million ETH now staked on the network as the transition to proof-of-stake continues to mature.",
      source: "CoinDesk",
      publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      sentiment: "positive",
      category: "crypto"
    },
    {
      id: "6",
      title: "Oil Prices Volatile After OPEC+ Meeting",
      summary: "Crude oil futures swing as major producers discuss production quotas for the upcoming quarter.",
      source: "Reuters",
      publishedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      sentiment: "neutral",
      category: "commodities"
    }
  ];

  useEffect(() => {
    // Simulate API call
    const fetchNews = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNews(mockNews);
      setIsLoading(false);
    };

    fetchNews();
    
    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return language === "ar" ? `منذ ${diffMins} دقيقة` : 
             language === "fr" ? `il y a ${diffMins} min` : 
             `${diffMins}m ago`;
    }
    
    const diffHours = Math.floor(diffMins / 60);
    return language === "ar" ? `منذ ${diffHours} ساعة` :
           language === "fr" ? `il y a ${diffHours}h` :
           `${diffHours}h ago`;
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "negative":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "negative":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredNews = selectedCategory === "all" 
    ? news 
    : news.filter(item => item.category === selectedCategory);

  const categories = ["all", "crypto", "forex", "stocks", "commodities"];

  return (
    <section className="py-16 px-4 bg-muted/30" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Newspaper className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold">{t.title}</h2>
          </div>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {t.categories[category as keyof typeof t.categories]}
            </button>
          ))}
        </div>

        {/* News Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">{t.loading}</span>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {t.noNews}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((item) => (
              <Card 
                key={item.id} 
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card border-border"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${getSentimentColor(item.sentiment)} capitalize`}
                    >
                      {getSentimentIcon(item.sentiment)}
                      <span className="ml-1">
                        {t.categories[item.category as keyof typeof t.categories]}
                      </span>
                    </Badge>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimeAgo(item.publishedAt)}
                    </div>
                  </div>
                  <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {item.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.source}
                    </span>
                    <button className="text-xs text-primary hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.readMore}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsHub;
