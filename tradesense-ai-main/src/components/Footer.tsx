import { Link } from "react-router-dom";
import { TrendingUp, Twitter, Linkedin, Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t, language } = useLanguage();

  const texts = {
    en: {
      description: "The first AI-assisted Prop Firm, designed for African traders.",
      product: "Product",
      pricing: "Pricing",
      dashboard: "Dashboard",
      leaderboard: "Leaderboard",
      api: "API",
      legal: "Legal",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      riskWarning: "Risk Disclaimer",
      contact: "Contact",
      rights: "All rights reserved",
      tradingWarning: "⚠️ Trading involves risk of capital loss.",
    },
    fr: {
      description: "La première Prop Firm assistée par Intelligence Artificielle, conçue pour les traders africains.",
      product: "Produit",
      pricing: "Tarifs",
      dashboard: "Dashboard",
      leaderboard: "Classement",
      api: "API",
      legal: "Légal",
      terms: "Conditions d'utilisation",
      privacy: "Politique de confidentialité",
      riskWarning: "Avertissement sur les risques",
      contact: "Contact",
      rights: "Tous droits réservés",
      tradingWarning: "⚠️ Le trading comporte des risques de perte en capital.",
    },
    ar: {
      description: "أول شركة تداول مدعومة بالذكاء الاصطناعي، مصممة للمتداولين الأفارقة.",
      product: "المنتج",
      pricing: "الأسعار",
      dashboard: "لوحة التحكم",
      leaderboard: "المتصدرين",
      api: "API",
      legal: "قانوني",
      terms: "شروط الخدمة",
      privacy: "سياسة الخصوصية",
      riskWarning: "تحذير المخاطر",
      contact: "اتصل بنا",
      rights: "جميع الحقوق محفوظة",
      tradingWarning: "⚠️ التداول ينطوي على مخاطر خسارة رأس المال.",
    },
  };

  const txt = texts[language];

  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-bold gradient-text">TradeSense</span>
                <span className="text-xl font-light text-foreground ms-1">AI</span>
              </div>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              {txt.description}
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Send className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">{txt.product}</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">{txt.pricing}</Link></li>
              <li><Link to="/dashboard" className="hover:text-foreground transition-colors">{txt.dashboard}</Link></li>
              <li><Link to="/leaderboard" className="hover:text-foreground transition-colors">{txt.leaderboard}</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{txt.api}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{txt.legal}</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{txt.terms}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{txt.privacy}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{txt.riskWarning}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{txt.contact}</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 TradeSense AI. {txt.rights}.
          </p>
          <p className="text-xs text-muted-foreground">
            {txt.tradingWarning}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
