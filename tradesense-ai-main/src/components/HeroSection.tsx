import { Button } from "./ui/button";
import { ArrowRight, Shield, Zap, Target, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const HeroSection = () => {
  const { t, language } = useLanguage();

  const stats = {
    en: [
      { value: "$2M+", label: "Capital Distributed" },
      { value: "5,000+", label: "Active Traders" },
      { value: "89%", label: "Success Rate" },
      { value: "24/7", label: "AI Support" },
    ],
    fr: [
      { value: "$2M+", label: "Capital Distribué" },
      { value: "5,000+", label: "Traders Actifs" },
      { value: "89%", label: "Taux de Réussite" },
      { value: "24/7", label: "Support IA" },
    ],
    ar: [
      { value: "$2M+", label: "رأس المال الموزع" },
      { value: "5,000+", label: "المتداولين النشطين" },
      { value: "89%", label: "معدل النجاح" },
      { value: "24/7", label: "دعم الذكاء الاصطناعي" },
    ],
  };

  const features = {
    en: [
      {
        icon: Shield,
        title: "Secure Challenge",
        description: "+10% profit target with strict risk management. Max -5% daily loss.",
      },
      {
        icon: Zap,
        title: "Real-Time AI Signals",
        description: "Our AI analyzes markets 24/7 and sends you trading alerts.",
      },
      {
        icon: Target,
        title: "African Markets",
        description: "Access Morocco, Nigeria markets, and global cryptocurrencies.",
      },
    ],
    fr: [
      {
        icon: Shield,
        title: "Challenge Sécurisé",
        description: "Objectif +10% de profit avec gestion du risque stricte. Max loss -5% journalier.",
      },
      {
        icon: Zap,
        title: "Signaux IA Temps Réel",
        description: "Notre IA analyse les marchés 24/7 et vous envoie des alertes de trading.",
      },
      {
        icon: Target,
        title: "Marchés Africains",
        description: "Accédez aux marchés Maroc, Nigeria, et aux cryptomonnaies globales.",
      },
    ],
    ar: [
      {
        icon: Shield,
        title: "تحدي آمن",
        description: "هدف ربح +10% مع إدارة صارمة للمخاطر. خسارة يومية قصوى -5%.",
      },
      {
        icon: Zap,
        title: "إشارات ذكاء اصطناعي فورية",
        description: "يحلل الذكاء الاصطناعي الأسواق على مدار الساعة ويرسل لك تنبيهات التداول.",
      },
      {
        icon: Target,
        title: "الأسواق الأفريقية",
        description: "الوصول إلى أسواق المغرب ونيجيريا والعملات المشفرة العالمية.",
      },
    ],
  };

  const headlines = {
    en: {
      badge: "Powered by Artificial Intelligence",
      title1: "The First",
      propFirm: "Prop Firm",
      title2: "AI-Assisted for",
      africa: "Africa",
      subtitle: "Access up to",
      amount: "$200,000",
      subtitleEnd: "in trading capital. Pass our challenge, prove your skills, and trade with our capital.",
      demo: "Watch Demo",
    },
    fr: {
      badge: "Propulsé par Intelligence Artificielle",
      title1: "La Première",
      propFirm: "Prop Firm",
      title2: "Assistée par IA pour",
      africa: "l'Afrique",
      subtitle: "Accédez à un capital de trading jusqu'à",
      amount: "$200,000",
      subtitleEnd: ". Passez notre challenge, prouvez vos compétences, et tradez avec notre capital.",
      demo: "Voir la Démo",
    },
    ar: {
      badge: "مدعوم بالذكاء الاصطناعي",
      title1: "أول",
      propFirm: "شركة تداول",
      title2: "مدعومة بالذكاء الاصطناعي في",
      africa: "أفريقيا",
      subtitle: "احصل على رأس مال تداول يصل إلى",
      amount: "$200,000",
      subtitleEnd: ". اجتز التحدي، أثبت مهاراتك، وتداول برأسمالنا.",
      demo: "شاهد العرض",
    },
  };

  const h = headlines[language];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 chart-grid opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/20 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-profit animate-pulse" />
            <span className="text-sm text-muted-foreground">{h.badge}</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {h.title1}{" "}
            <span className="gradient-text">{h.propFirm}</span>
            <br />
            {h.title2}{" "}
            <span className="gradient-text-gold">{h.africa}</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {h.subtitle} <span className="text-foreground font-semibold">{h.amount}</span>
            {h.subtitleEnd}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Link to="/pricing">
              <Button variant="hero" size="xl" className="group">
                {t.hero.cta}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="glass" size="xl" className="group">
              <Play className="w-5 h-5" />
              {h.demo}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {stats[language].map((stat, index) => (
              <div key={index} className="glass-card rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
          {features[language].map((feature, index) => (
            <div
              key={index}
              className="glass-card rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 group animate-fade-in"
              style={{ animationDelay: `${0.5 + index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
