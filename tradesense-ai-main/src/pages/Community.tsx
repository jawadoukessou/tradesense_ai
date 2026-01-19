import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CommunityChat from '@/components/CommunityChat';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, TrendingUp, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const Community = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            {t.community.zone}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.community.description}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">1,000+</p>
                <p className="text-sm text-muted-foreground">{t.community.activeTraders}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-sm text-muted-foreground">{t.community.successRate}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/20">
                <MessageSquare className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">24/7</p>
                <p className="text-sm text-muted-foreground">{t.community.liveSupport}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Section */}
        <div className="max-w-4xl mx-auto">
          <CommunityChat />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Community;
