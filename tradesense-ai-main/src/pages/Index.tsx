import Header from "@/components/Header";
import PriceTicker from "@/components/PriceTicker";
import HeroSection from "@/components/HeroSection";
import NewsHub from "@/components/NewsHub";
import ChallengeRules from "@/components/ChallengeRules";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PriceTicker />
      <HeroSection />
      <NewsHub />
      <ChallengeRules />
      <Footer />
    </div>
  );
};

export default Index;
